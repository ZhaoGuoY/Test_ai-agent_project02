# src/app/agents/monitor_agent.py
"""
MonitorAgent：Web 监控主 Agent（增量3 + 多站点分离架构）

职责：
1. 读取 explore_home 技能（SKILL.md）获取探索策略
2. 按站点遍历：检查脚本 → 缺失则生成 → 执行测试 → 解析结果 → 自愈 → 推送飞书
3. 每个站点独立 spec 文件（us/eu/global_carvera.spec.ts），故障隔离

上游：scripts/run_monitor.py 调用 create_agent("monitor")
下游：通过工具调用 PlaywrightRunner 和 FeishuNotifier
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from langchain_core.tools import tool

from src.app.agents.base_agent import BaseAgent
from src.core.logger import get_logger
from src.web.runners.playwright_runner import PlaywrightRunner
from src.web.runners.report_parser import parse_junit_failures, get_summary, merge_junit_files
from src.notifiers.feishu_notifier import FeishuNotifier

logger = get_logger(__name__)


class MonitorAgent(BaseAgent):
    """Web 监控 Agent — 多站点分离架构"""

    agent_name = "monitor"
    agent_description = "自主执行 Web 监控：按站点遍历 → 生成脚本 → 执行测试 → 自愈 → 推送报告"

    # ── 辅助方法 ──────────────────────────────────────────

    def _merge_junit(self, backup_path: Path, healed_path: Path, output_path: Path) -> None:
        """
        合并 JUnit XML：将自愈重跑的结果合并回初始备份

        自愈过程中只重跑了失败站点的 spec，healed_path 仅含该站点结果；
        backup_path 含全部站点的初始结果（含失败）。
        合并策略：以 backup 为基础，用 healed 中匹配的 testcase 替换旧结果，
        使最终 JUnit 反映自愈后的真实状态。

        实际逻辑已下沉到 report_parser.merge_junit_files（heal_agent 重跑时的
        增量合并也复用同一实现，避免两处逻辑不一致）。
        """
        merge_junit_files(backup_path, healed_path, output_path)

    def _get_spec_filename(self, site_name: str) -> str:
        """根据站点名生成对应的 spec 文件名，如 US → us_carvera.spec.ts"""
        return f"{site_name.lower()}_carvera.spec.ts"

    def _get_spec_path(self, site_name: str) -> Path:
        """获取站点对应的 spec 文件完整路径"""
        return self.project_root / "src" / "web" / "testcases" / "smoke" / self._get_spec_filename(site_name)

    def _get_site_url_map(self) -> str:
        """构建站点→URL 映射字符串，供 HealAgent 使用"""
        lines = []
        for site in self.target_sites:
            name = site.get("name", "unknown")
            url = site.get("url", "")
            filename = self._get_spec_filename(name)
            lines.append(f"  {name}: url={url}, spec={filename}")
        return "\n".join(lines)

    # ── 工具构建 ──────────────────────────────────────────

    def build_tools(self) -> List[Any]:
        """
        构建 MonitorAgent 的工具集（多站点感知）

        工具设计原则：
        - 每个工具内部遍历所有站点，对 LLM 暴露为原子操作
        - 减少 LLM 决策负担，将循环逻辑下沉到工具层
        """
        runner = PlaywrightRunner(project_root=self.project_root)
        notifier = FeishuNotifier()
        heal_result = ""  # 记录自愈结果，供飞书通知使用
        initial_junit_backup: Optional[Path] = None  # 初始测试结果备份（自愈前）

        @tool
        def generate_test_specs() -> str:
            """
            遍历所有目标站点，对缺失 spec 文件的站点自动生成 Playwright 测试脚本。

            目标站点从配置自动读取，无需手动传入。
            每个站点对应独立的 spec 文件（如 us_carvera.spec.ts），
            已存在的文件会自动跳过，不重复生成。

            不要尝试传入任何参数来强制重新生成。

            Returns:
                各站点生成结果的汇总文本
            """
            logger.info("[工具] generate_test_specs 被调用（多站点模式）")
            results: List[str] = []

            for site in self.target_sites:
                site_name = site["name"]
                url = site["url"]
                spec_filename = self._get_spec_filename(site_name)
                spec_path = self._get_spec_path(site_name)

                if spec_path.exists():
                    logger.info(f"[工具] ⏭️ {site_name} 脚本已存在，跳过: {spec_filename}")
                    results.append(f"⏭️ {site_name}：脚本已存在，跳过生成")
                    continue

                logger.info(f"[工具] 🚀 为 {site_name} 生成脚本: {spec_filename}")
                try:
                    return_code, stdout, stderr = runner.generate_specs(url, spec_filename)
                    if return_code == 0:
                        results.append(f"✅ {site_name}：生成成功 → {spec_filename}")
                    else:
                        results.append(f"❌ {site_name}：生成失败 → {stderr[:200]}")
                except Exception as e:
                    logger.error(f"[工具] {site_name} 生成异常: {e}")
                    results.append(f"❌ {site_name}：生成异常 → {e}")

            return "\n".join(results) if results else "所有站点脚本均已存在，无需生成"

        @tool
        def run_playwright_tests() -> str:
            """
            执行所有站点的 Playwright 测试并生成 JUnit 报告。

            Playwright 自动发现 testDir 下所有 .spec.ts 文件，
            每个 test() 获得独立浏览器上下文（故障隔离）。
            串行执行（workers=1），报告输出到 workspace/test-results/junit.xml

            Returns:
                测试执行的返回码和摘要（0=全部通过，非0=存在失败）
            """
            logger.info("[工具] run_playwright_tests 被调用（多站点模式）")
            return_code, stdout, stderr = runner.run_tests()
            summary = f"返回码: {return_code}\n"
            if stdout:
                # 只取最后20行，避免 context 过长
                summary += "\n".join(stdout.strip().split("\n")[-20:])
            return summary

        @tool
        def read_junit_report() -> str:
            """
            读取并解析 JUnit XML 报告，返回失败的测试用例详情。

            用于 Agent 判断测试是否通过、识别失败原因。

            Returns:
                JSON 格式的测试统计和失败详情（含 classname 可定位到具体站点文件）
            """
            logger.info("[工具] read_junit_report 被调用")
            junit_path = runner.get_junit_path()
            if not junit_path.exists():
                return json.dumps({"exists": False})

            summary = get_summary(junit_path)
            failed_cases = parse_junit_failures(junit_path)

            result = {
                "exists": True,
                "tests": summary["tests"],
                "failures": summary["failures"],
                "errors": summary["errors"],
                "skipped": summary["skipped"],
                "failed_cases": failed_cases,
            }
            return json.dumps(result, ensure_ascii=False)

        @tool
        def push_feishu_report() -> str:
            """
            推送飞书卡片到工作群。

            推送前先生成 Allure 详细报告（失败不阻断推送）；
            自愈成功后使用当前 JUnit（反映修复后结果），自愈失败或数据被破坏时使用备份。
            卡片包含：总用例数、各站点通过/失败明细、自愈结果、详细报告按钮。

            Returns:
                推送结果（成功/失败）
            """
            logger.info("[工具] push_feishu_report 被调用")

            # 推送前生成 Allure 详细报告（无论测试成功与否都会执行，
            # 失败时仅告警，不阻断飞书推送，此时卡片不带报告按钮链接）
            allure_rc, _, _ = runner.generate_allure_report()
            if allure_rc == 0:
                logger.info("[MonitorAgent] Allure 报告已就绪，飞书卡片将包含详细报告按钮")

            current_junit = runner.get_junit_path()
            # 自愈成功：当前 JUnit 有有效数据（tests > 0）→ 用新数据
            # 自愈失败/数据被破坏：当前 JUnit 为空 → 用备份
            use_backup = False
            if initial_junit_backup and initial_junit_backup.exists():
                if current_junit.exists():
                    try:
                        summary = get_summary(current_junit)
                        if summary.get("tests", 0) == 0:
                            use_backup = True
                            logger.info("[MonitorAgent] 当前 JUnit 为空，使用备份数据推送")
                    except Exception:
                        use_backup = True
                else:
                    use_backup = True

            report_path = str(initial_junit_backup) if use_backup else str(current_junit)
            if not Path(report_path).exists():
                return "❌ JUnit 报告不存在，无法推送"
            try:
                success = notifier.notify_test_result(report_path, heal_info=heal_result)
                return "✅ 飞书报告推送成功" if success else "❌ 飞书报告推送失败"
            except Exception as e:
                return f"❌ 飞书推送异常: {e}"

        @tool
        def trigger_healing(failures_json: str) -> str:
            """
            当测试存在失败时，调用 HealAgent 进行自愈修复。

            HealAgent 会根据失败用例的 classname 自动定位到对应站点的 spec 文件，
            并使用站点 URL 映射表匹配正确的目标 URL 进行修复。
            最多重试 3 次，返回最终修复结果。

            Args:
                failures_json: JSON 格式的失败用例列表（由 read_junit_report 返回）

            Returns:
                自愈结果描述，包含成功/失败和修复详情
            """
            nonlocal initial_junit_backup
            # 备份初始 JUnit XML（自愈过程会覆盖它）
            junit_path = runner.get_junit_path()
            if junit_path.exists():
                initial_junit_backup = junit_path.with_suffix('.xml.initial')
                import shutil
                shutil.copy2(str(junit_path), str(initial_junit_backup))
                logger.info(f"[MonitorAgent] 已备份初始 JUnit XML → {initial_junit_backup}")

            logger.info(f"[工具] trigger_healing 被调用，失败数据: {failures_json[:200]}...")
            print("=" * 60)
            print("[MonitorAgent] 🔥 触发自愈流程！")
            print(f"[MonitorAgent] 失败用例: {failures_json}")
            print("=" * 60)
            try:
                from src.app.agents.heal_agent import HealAgent
                site_url_map = self._get_site_url_map()
                heal_agent_instance = HealAgent(self.config)
                agent = heal_agent_instance.create()

                # 解析失败用例的错误信息，为 Agent 提供修复线索
                failed_cases = json.loads(failures_json).get("failed_cases", [])
                error_hints = []
                for fc in failed_cases:
                    msg = fc.get("message", "")
                    name = fc.get("name", "")
                    classname = fc.get("classname", "")
                    # 从 classname 推断 spec 文件名，明确告诉 HealAgent 该改哪个文件
                    spec_file = ""
                    if "us_" in classname.lower():
                        spec_file = "us_carvera.spec.ts"
                    elif "eu_" in classname.lower():
                        spec_file = "eu_carvera.spec.ts"
                    elif "global_" in classname.lower():
                        spec_file = "global_carvera.spec.ts"
                    file_hint = f"（对应文件: {spec_file}）" if spec_file else ""

                    if "toContain" in msg and "/products/" in msg:
                        error_hints.append(
                            f"【{name}】{file_hint} 错误: URL 断言失败，页面未导航到产品页。"
                            f"已知原因：商店切换后重定向到首页，导航超时。"
                            f"修复方案：heal_specs.ts 会在 setupPage 后添加 page.waitForURL 确保导航完成。"
                        )
                    elif "not visible" in msg or "Element is not visible" in msg:
                        error_hints.append(
                            f"【{name}】{file_hint} 错误: Element is not visible。"
                            f"已知原因：元素被幸运转盘弹窗遮挡。"
                            f"修复方案：在点击目标元素前，先调用 dismissSpinPopup(page) 关闭幸运转盘，并使用 {{ force: true }} 进行点击。"
                        )
                    elif "timeout" in msg.lower() or "Timed out" in msg or "exceeded" in msg:
                        error_hints.append(
                            f"【{name}】{file_hint} 错误: 超时。可能原因：元素加载慢或被遮挡。"
                            f"修复方案：增加等待时间或使用 {{ force: true }} 点击。"
                        )
                    else:
                        error_hints.append(f"【{name}】{file_hint} 错误: {msg[:200]}")

                error_context = "\n".join(error_hints) if error_hints else "无额外错误上下文"

                task = (
                    f"以下测试用例失败，请执行自愈流程：\n"
                    f"{failures_json}\n\n"
                    f"## 核心约束\n"
                    f"只修复上述失败用例的定位器，禁止探索新测试点、禁止新增 test() 用例、禁止扩大测试范围。\n\n"
                    f"## 错误分析与修复建议\n"
                    f"{error_context}\n\n"
                    f"## 站点 URL 映射（用于修复时匹配正确的目标 URL）\n"
                    f"{site_url_map}\n\n"
                    f"最大重试次数: {HealAgent.MAX_RETRIES}"
                )
                result = agent.invoke(
                    {"messages": [{"role": "user", "content": task}]},
                    config={"configurable": {"thread_id": "heal_run_001"}}
                )
                final_msg = result["messages"][-1]
                content = final_msg.content if hasattr(final_msg, "content") else str(final_msg)
                nonlocal heal_result
                heal_result = content  # 记录自愈结果

                # 自愈完成后合并 JUnit：把自愈重跑的结果合并回初始备份
                # （自愈只重跑了失败站点 spec，healed 数据不完整；
                #  合并后 JUnit 包含全部站点且反映自愈后的最终状态）
                if initial_junit_backup and initial_junit_backup.exists() and junit_path.exists():
                    self._merge_junit(initial_junit_backup, junit_path, junit_path)
                    logger.info(f"[MonitorAgent] 已合并自愈结果到 JUnit → {junit_path}")

                return f"自愈 Agent 返回:\n{content}"
            except Exception as e:
                logger.error(f"调用 HealAgent 失败: {e}")
                # 异常时也恢复备份，确保飞书数据完整
                if initial_junit_backup and initial_junit_backup.exists():
                    import shutil
                    shutil.copy2(str(initial_junit_backup), str(junit_path))
                    logger.info(f"[MonitorAgent] 异常后已恢复初始 JUnit XML 备份")
                return f"❌ 自愈 Agent 调用异常: {e}"

        return [
            generate_test_specs,
            run_playwright_tests,
            read_junit_report,
            push_feishu_report,
            trigger_healing,
        ]

    def build_system_prompt(self) -> str:
        """
        构建 MonitorAgent 的 system prompt（多站点分离架构）

        核心变化：
        - 工具内部已处理多站点遍历，Agent 无需关心站点数量
        - generate_test_specs 自动检查所有站点，缺失才生成
        - HealAgent 根据 classname 定位对应站点 spec 文件进行修复
        """
        site_names = ", ".join(s["name"] for s in self.target_sites)
        return f"""你是一个专业的 Web 监控 Agent，负责自动化监控 Makera 多个站点（{site_names}）的健康状态。

## 架构说明
每个站点对应独立的测试脚本文件（如 us_carvera.spec.ts、eu_carvera.spec.ts），
各站点故障隔离，一个站点失败不影响其他站点的测试执行和报告。

## 工作流程（必须严格按顺序执行，绝对不可跳过任何步骤）
1. 调用 `generate_test_specs()` —— 内部遍历所有站点，缺失的自动生成，已有的跳过
2. 调用 `run_playwright_tests()` —— Playwright 自动发现并串行执行所有 spec 文件
3. 调用 `read_junit_report()` —— 解析测试结果，获取各站点通过/失败明细
4. **【最关键步骤 - 绝对不可跳过】** 检查 `read_junit_report` 的返回值：
   - 如果 `failed_cases` 数组不为空（有任何失败用例），**必须立即调用** `trigger_healing(failures_json)` 触发自愈
   - 将 `read_junit_report` 返回的完整 JSON 字符串直接传入 `trigger_healing` 的 `failures_json` 参数
   - **绝对不允许在存在失败用例时跳过自愈直接推送报告**
5. 调用 `push_feishu_report()` —— 推送飞书卡片（含各站点明细和自愈结果）
6. 向用户简洁汇报各站点执行结果

## 工具使用规则
- `generate_test_specs`：必须先于 `run_playwright_tests` 调用
- `run_playwright_tests`：返回码 0=全部通过，非0=存在失败
- `read_junit_report`：failed_cases 中包含 classname 字段，可定位到具体站点文件
- `trigger_healing`：**存在失败用例时必须调用**，传入 read_junit_report 返回的完整 JSON，HealAgent 自动匹配站点 URL 并修复定位器
- `push_feishu_report`：始终在最后调用，确保团队收到通知

## 输出要求
- 用中文汇报
- 包含：各站点生成/跳过状态、测试通过/失败数（按站点）、自愈结果、飞书推送状态
- 如果某站点失败，明确指出站点名和失败用例
- 保持简洁，不超过 400 字

## 注意事项
- 每次执行独立，不假设上次状态
- 某工具调用失败时记录错误并继续后续步骤（如生成失败仍尝试执行已有脚本）
- **绝对禁止在有失败用例时跳过 trigger_healing 直接推送报告**
- 探索策略详见 `explore_home` 技能文件
"""