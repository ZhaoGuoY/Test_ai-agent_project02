# src/notifiers/feishu_notifier.py
"""
飞书通知模块
作用：解析 JUnit XML 并向飞书群发送测试报告卡片
参考：飞书自定义机器人文档
https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot
https://open.feishu.cn/document/feishu-cards/quick-start/send-message-cards-with-custom-bot
"""
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

    def parse_junit(self, junit_path: str | Path) -> Dict[str, Any]:
        """
        解析 JUnit XML 报告

        Args:
            junit_path: junit.xml 文件路径

        Returns:
            测试统计字典，包含 tests, failures, errors, skipped, pass 等
        """
        junit_path = Path(junit_path)
        if not junit_path.exists():
            logger.warning(f"JUnit 报告不存在: {junit_path}")
            return {"tests": 0, "failures": 0, "errors": 0, "skipped": 0, "pass": 0}

        tree = ET.parse(junit_path)
        root = tree.getroot()

        # testsuite 节点包含汇总信息
        testsuite = root.find("testsuite")
        if testsuite is not None:
            tests = int(testsuite.get("tests", 0))
            failures = int(testsuite.get("failures", 0))
            errors = int(testsuite.get("errors", 0))
            skipped = int(testsuite.get("skipped", 0))
        else:
            tests = failures = errors = skipped = 0

        # 计算通过数 = 总数 - 失败 - 错误 - 跳过
        passed = tests - failures - errors - skipped

        stats = {
            "tests": tests,
            "failures": failures,
            "errors": errors,
            "skipped": skipped,
            "pass": passed,
        }

        logger.info(f"测试统计: {stats}")
        return stats

    def send_card(self, stats: Dict[str, Any], title: str = "Web 监控测试报告", heal_info: str = "") -> bool:
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

        # 根据测试结果决定卡片颜色
        if failed == 0:
            header_color = "green"
            header_text = f"✅ {title} - 全部通过 - Makera"
        else:
            header_color = "red"
            header_text = f"❌ {title} - 存在失败 - Makera"

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
                        "content": f"**自愈结果**: {heal_info}" if heal_info else "**自愈结果**: 未触发自愈",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "hr"
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