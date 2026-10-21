# src/notifiers/feishu_notifier.py
"""
飞书通知模块
作用：解析 JUnit XML 并向飞书群发送测试报告卡片
参考：飞书自定义机器人文档
https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot
https://open.feishu.cn/document/feishu-cards/quick-start/send-message-cards-with-custom-bot
"""
import os
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any

import requests

from src.core.config_loader import load_config
from src.core.logger import get_logger

logger = get_logger(__name__)


class FeishuNotifier:
    """
    飞书消息推送器
    """

    def __init__(self, webhook_url: str | None = None):
        """
        初始化

        Args:
            webhook_url: 飞书机器人 webhook 地址，
                        若不传则从 config/settings.yaml 读取
        """
        if webhook_url is None:
            config = load_config()
            webhook_url = config["feishu"]["webhook_url"]

        if not webhook_url:
            raise ValueError(
                "飞书 webhook 地址未配置！请在 config/settings.yaml 中设置 "
                "feishu.webhook_url 或设置环境变量 FEISHU_WEBHOOK_URL"
            )

        self.webhook_url = webhook_url

        # Allure 详细报告链接：环境变量 ALLURE_REPORT_URL 优先（CI 注入 GitHub Pages 地址），
        # 其次取 settings.yaml 的 feishu.report_url；为空时卡片不显示报告按钮
        config_for_report = load_config()
        self.report_url = (
            os.environ.get("ALLURE_REPORT_URL", "")
            or config_for_report.get("feishu", {}).get("report_url", "")
            or ""
        ).strip()

    def parse_junit(self, junit_path: str | Path) -> Dict[str, Any]:
        """
        解析 JUnit XML 报告

        Args:
            junit_path: junit.xml 文件路径

        Returns:
            测试统计字典，包含 tests, failures, errors, skipped, pass, site_stats 等
        """
        junit_path = Path(junit_path)
        if not junit_path.exists():
            logger.warning(f"JUnit 报告不存在: {junit_path}")
            return {"tests": 0, "failures": 0, "errors": 0, "skipped": 0, "pass": 0, "site_stats": {}}

        tree = ET.parse(junit_path)
        root = tree.getroot()

        # 从子 testsuite 元素聚合统计（根 testsuites 属性可能为空或不准确）
        # 与 report_parser.py 的 get_summary 保持一致
        tests = failures = errors = skipped = 0
        suites = root.findall("testsuite") or root.findall(".//testsuite")
        for ts in suites:
            tests += int(ts.get("tests", 0))
            failures += int(ts.get("failures", 0))
            errors += int(ts.get("errors", 0))
            skipped += int(ts.get("skipped", 0))

        # 计算通过数 = 总数 - 失败 - 错误 - 跳过
        passed = tests - failures - errors - skipped

        # 有效失败数（skipped 通常由前置用例失败导致，视为失败）
        effective_failures = failures + errors + skipped

        # 按站点分组统计（从 testcase name 提取站点名）
        site_stats: Dict[str, Dict[str, int]] = {}
        for tc in root.iter("testcase"):
            name = tc.get("name", "")
            # Playwright JUnit: name 格式为 "站点名 › 用例名"
            site_name = name.split("›")[0].strip() if "›" in name else "未知站点"
            if site_name not in site_stats:
                site_stats[site_name] = {"total": 0, "passed": 0, "failed": 0}
            site_stats[site_name]["total"] += 1
            # 检查是否有 failure 或 error 子元素
            has_failure = tc.find("failure") is not None or tc.find("error") is not None
            is_skipped = tc.find("skipped") is not None
            if has_failure:
                site_stats[site_name]["failed"] += 1
            elif is_skipped:
                # skipped 通常由同 worker 前置用例失败导致，视为失败
                site_stats[site_name]["failed"] += 1
            else:
                # 只有既非失败也非跳过的才算真正通过
                site_stats[site_name]["passed"] += 1

        # 逐用例明细（供卡片「各站点结果」和「测试用例」动态展示）
        case_details: Dict[str, list] = {}
        for tc in root.iter("testcase"):
            self._categorize_case(tc, case_details)

        stats = {
            "tests": tests,
            "failures": failures,
            "errors": errors,
            "skipped": skipped,
            "pass": passed,
            "effective_failures": effective_failures,
            "site_stats": site_stats,
            "case_details": case_details,
        }

        logger.info(f"测试统计: {stats}")
        return stats

    @staticmethod
    def _categorize_case(tc: ET.Element, case_details: Dict[str, list]) -> None:
        """
        从 testcase 元素提取站点和用例类别，归类到 case_details

        类别映射：
        - 加入购物车 ← name 含 "加入购物车"
        - 进入结算页 ← name 含 "结算" 或 "checkout"（不区分大小写）
        - 搜索功能 ← name 含 "搜索"
        """
        name = tc.get("name", "")
        site_name = name.split("›")[0].strip() if "›" in name else ""
        case_name = name.split("›")[1].strip() if "›" in name else name

        if not site_name:
            return

        has_failure = tc.find("failure") is not None or tc.find("error") is not None
        is_skipped = tc.find("skipped") is not None
        passed = not has_failure and not is_skipped

        if "加入购物车" in case_name:
            category = "加入购物车"
        elif "结算" in case_name or "checkout" in case_name.lower():
            category = "进入结算页"
        elif "搜索" in case_name:
            category = "搜索功能"
        else:
            return

        if site_name not in case_details:
            case_details[site_name] = []
        case_details[site_name].append({"category": category, "passed": passed})

    def _build_site_detail(self, case_details: Dict[str, list]) -> str:
        """
        构建「各站点结果」明细文本

        格式：✅ **US站** 加入购物车 / ✅  进入结算页 / ✅  搜索功能
        """
        if not case_details:
            return "无站点明细"

        site_order = ["US 站点", "EU 站点", "Global 站点"]
        category_order = ["加入购物车", "进入结算页", "搜索功能"]
        lines = []

        for site_name in site_order:
            if site_name not in case_details:
                continue
            site_label = site_name.replace(" 站点", "站")
            cases = {c["category"]: c["passed"] for c in case_details[site_name]}
            parts = []
            all_pass = True
            for cat in category_order:
                if cat in cases:
                    icon = "✅" if cases[cat] else "❌"
                    parts.append(f"{cat} / {icon}")
                    if not cases[cat]:
                        all_pass = False
            if parts:
                site_icon = "✅" if all_pass else "❌"
                lines.append(f"{site_icon} **{site_label}** " + "  ".join(parts))

        # 处理未预定义站点的兜底
        for site_name, cases_list in case_details.items():
            if site_name in site_order:
                continue
            site_label = site_name.replace(" 站点", "站")
            cases = {c["category"]: c["passed"] for c in cases_list}
            parts = []
            all_pass = True
            for cat in category_order:
                if cat in cases:
                    icon = "✅" if cases[cat] else "❌"
                    parts.append(f"{cat} / {icon}")
                    if not cases[cat]:
                        all_pass = False
            if parts:
                site_icon = "✅" if all_pass else "❌"
                lines.append(f"{site_icon} **{site_label}** " + "  ".join(parts))

        return "\n".join(lines) if lines else "无站点明细"

    def _build_test_case_list(self, case_details: Dict[str, list]) -> str:
        """
        构建「测试用例」明细文本，各用例结果从参数动态获取

        格式：
        1. auth0登录是否成功(shopify安全拦截暂时停止)
        2. 美国站加入购物车 / ✅
        3. 美国站进入结算页 / ✅
        ...
        """
        site_stats = {"US 站点": "美国站", "EU 站点": "欧洲站", "Global 站点": "全球站"}
        lines = ["1. auth0登录是否成功(shopify安全拦截暂时停止)"]
        num = 2
        for site_key, site_label in site_stats.items():
            cases = {c["category"]: c["passed"] for c in case_details.get(site_key, [])}
            for cat in ["加入购物车", "进入结算页", "搜索功能"]:
                if cat in cases:
                    icon = "✅" if cases[cat] else "❌"
                    lines.append(f"{num}. {site_label}{cat} / {icon}")
                else:
                    lines.append(f"{num}. {site_label}{cat}")
                num += 1
        return "\n".join(lines)

    def send_card(self, stats: Dict[str, Any], title: str = "独立站监控测试报告", heal_info: str = "") -> bool:
        """
        发送飞书卡片消息

        Args:
            stats: parse_junit 返回的测试统计字典
            title: 卡片标题
            heal_info: 自愈结果说明（如“自愈成功 2 条”），为空则不显示

        Returns:
            是否发送成功
        """
        # 构建飞书卡片 JSON
        # 卡片结构参考飞书官方文档
        total = stats["tests"]
        passed = stats["pass"]
        failed = stats["failures"] + stats["errors"]
        skipped = stats.get("skipped", 0)
        effective_failures = stats.get("effective_failures", failed + skipped)

        # 根据测试结果决定卡片颜色
        # skipped 通常由前置用例失败导致，视为失败
        if effective_failures == 0:
            header_color = "green"
            header_text = f"✅ {title} - 全部通过 - Makera"
        elif skipped > 0 and stats["failures"] + stats["errors"] == 0:
            # 仅有 skipped 无实际 failure（罕见情况，如手动跳过）
            header_color = "yellow"
            header_text = f"\u26a0\ufe0f {title} - 部分跳过 - Makera"
        else:
            header_color = "red"
            header_text = f"\u274c {title} - \u5b58\u5728\u5931\u8d25 - Makera"

        site_detail = self._build_site_detail(stats.get("case_details", {}))
        test_case_list = self._build_test_case_list(stats.get("case_details", {}))

        card = {
            "config": {"wide_screen_mode": True},
            "header": {
                "template": header_color,
                "title": {
                    "content": header_text,
                    "tag": "plain_text"
                }
            },
            "elements": [
                {
                    "tag": "div",
                    "fields": [
                        {
                            "is_short": True,
                            "text": {
                                "content": f"**总用例数**: {total}",
                                "tag": "lark_md"
                            }
                        },
                        {
                            "is_short": True,
                            "text": {
                                "content": f"**通过**: {passed}",
                                "tag": "lark_md"
                            }
                        },
                        {
                            "is_short": True,
                            "text": {
                                "content": f"**失败**: {failed}",
                                "tag": "lark_md"
                            }
                        },
                        {
                            "is_short": True,
                            "text": {
                                "content": f"**跳过**: {stats['skipped']}",
                                "tag": "lark_md"
                            }
                        }
                    ]
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "div",
                    "text": {
                        "content": f"**各站点结果**\n{site_detail}",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "div",
                    "text": {
                        "content": f"**自愈结果**: {heal_info}" if heal_info else "**自愈结果**: 未触发自愈",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "div",
                    "text": {
                        "content": f"**测试用例**\n{test_case_list}",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "note",
                    "elements": [
                        {
                            "content": "由 Web Monitor Agent 自动推送",
                            "tag": "plain_text"
                        }
                    ]
                }
            ]
        }

        # Allure 详细报告按钮：仅在配置了报告链接时显示（CI 环境注入 GitHub Pages 地址，
        # 本地未配置时不显示，其余卡片内容不受影响）
        if self.report_url:
            # 插入到 note 备注之前，作为卡片底部的行动按钮
            card["elements"].insert(-1, {
                "tag": "action",
                "actions": [
                    {
                        "tag": "button",
                        "text": {
                            "content": "查看详细测试报告",
                            "tag": "plain_text"
                        },
                        "type": "primary",
                        "url": self.report_url
                    }
                ]
            })

        # 构建请求体
        payload = {
            "msg_type": "interactive",
            "card": card
        }

        headers = {"Content-Type": "application/json"}

        try:
            response = requests.post(
                self.webhook_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            result = response.json()
            if result.get("code") == 0:
                logger.info("飞书卡片发送成功")
                return True
            else:
                logger.error(f"飞书卡片发送失败: {result}")
                return False
        except requests.RequestException as e:
            logger.error(f"飞书请求异常: {e}")
            return False

    def notify_test_result(self, junit_path: str | Path, heal_info: str = "") -> bool:
        """
        完整的通知流程：解析 XML → 发送卡片

        Args:
            junit_path: junit.xml 文件路径
            heal_info: 自愈结果说明（如“自愈成功 2 条”），为空则不显示

        Returns:
            是否发送成功
        """
        stats = self.parse_junit(junit_path)
        return self.send_card(stats, heal_info=heal_info)


# 便捷函数
def send_feishu_report(junit_path: str | Path) -> bool:
    """模块级便捷函数：直接发送飞书报告"""
    notifier = FeishuNotifier()
    return notifier.notify_test_result(junit_path)