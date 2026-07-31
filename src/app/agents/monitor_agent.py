# src/app/agents/monitor_agent.py
"""
MonitorAgent：Web 监控主 Agent（增量3）

职责：
1. 读取 explore_home 技能（SKILL.md）获取探索策略
2. 自主决策调用工具：生成测试脚本 → 执行测试 → 解析结果 → 推送飞书
3. 替代增量2中 scripts/run_monitor.py 的硬编码流程

上游：scripts/run_monitor.py 调用 create_agent("monitor")
下游：通过工具调用 PlaywrightRunner 和 FeishuNotifier
"""
import json
from typing import Any, List

from langchain_core.tools import tool

from src.app.agents.base_agent import BaseAgent
from src.core.logger import get_logger
from src.web.runners.playwright_runner import PlaywrightRunner
from src.web.runners.report_parser import parse_junit_failures, get_summary
from src.notifiers.feishu_notifier import FeishuNotifier

logger = get_logger(__name__)


class MonitorAgent(BaseAgent):
    """Web 监控 Agent"""

    agent_name = "monitor"
    agent_description = "自主执行 Web 监控：探索页面 → 生成脚本 → 执行测试 → 推送报告"

    def build_tools(self) -> List[Any]:
        """
        构建 MonitorAgent 的工具集

        工具设计原则（高内聚低耦合）：
        - 每个工具对应一个独立业务能力
        - 工具内部调用增量0-2已实现的方法，不重复逻辑
        - 工具返回字符串，便于 Agent 解析和决策
        """
        runner = PlaywrightRunner(project_root=self.project_root)
        notifier = FeishuNotifier()
        heal_result = ""  # 记录自愈结果，供飞书通知使用

        @tool
        def generate_test_specs() -> str:
            """
            探索目标 URL 并自动生成 Playwright 测试脚本。

            使用 Playwright 打开页面，收集可见的交互元素，
            生成使用语义定位器（getByRole/getByText）的 .spec.ts 文件。
            目标 URL 从配置自动读取，无需手动传入。

            重要：如果测试脚本已存在，会自动跳过生成（保留现有脚本）。
            只有当文件不存在时才会生成新脚本。
            不要尝试传入任何参数来强制重新生成。

            Returns:
                生成结果的文本描述，包含生成文件路径和用例数量
            """
            url = self.target_url
            logger.info(f"[工具] generate_test_specs 被调用，URL={url}")

            spec_path = self.project_root / "src" / "web" / "testcases" / "smoke" / "generated_homepage.spec.ts"
            if spec_path.exists():
                logger.info(f"[工具] ⏭️ 测试脚本已存在，跳过生成: {spec_path}")
                print(f"[MonitorAgent] ⏭️ 测试脚本已存在，跳过生成")
                return f"⏭️ 测试脚本已存在，跳过生成（保留现有脚本）"

            return_code, stdout, stderr = runner.generate_specs(url)
            if return_code == 0:
                return f"✅ 测试脚本生成成功\n{stdout}"
            else:
                return f"❌ 测试脚本生成失败\n错误: {stderr}\n输出: {stdout}"

        @tool
        def run_playwright_tests() -> str:
            """
            执行所有 Playwright 测试并生成 JUnit 报告。

            调用 `npx playwright test` 运行 playwright.config.ts 中配置的测试目录下的所有 .spec.ts 文件，
            报告输出到 workspace/test-results/junit.xml

            Returns:
                测试执行的返回码和摘要（0=全部通过，非0=存在失败）
            """
            logger.info("[工具] run_playwright_tests 被调用")
            return_code, stdout, stderr = runner.run_tests()
            summary = f"返回码: {return_code}\n"
            if stdout:
                # 只取最后20行，避免 context 过长
                summary += "\n".join(stdout.strip().split("\n")[-20:])
            return summary

        @tool
        def push_feishu_report() -> str:
            """
            解析最新的 JUnit 报告并推送飞书卡片到工作群。

            卡片包含：总用例数、通过数、失败数、跳过数。

            Returns:
                推送结果（成功/失败）
            """
            logger.info("[工具] push_feishu_report 被调用")
            junit_path = runner.get_junit_path()
            if not junit_path.exists():
                return "❌ JUnit 报告不存在，无法推送"
            try:
                success = notifier.notify_test_result(str(junit_path), heal_info=heal_result)
                return "✅ 飞书报告推送成功" if success else "❌ 飞书报告推送失败"
            except Exception as e:
                return f"❌ 飞书推送异常: {e}"

        @tool
        def read_junit_report() -> str:
            """
            读取并解析 JUnit XML 报告，返回失败的测试用例详情。

            用于 Agent 判断测试是否通过、识别失败原因。

            Returns:
                JSON 格式的测试统计和失败详情
            """
            logger.info("[工具] read_junit_report 被调用")
            junit_path = runner.get_junit_path()
            if not junit_path.exists():
                return json.dumps({"exists": False})

            # 复用 report_parser 统一解析，避免重复逻辑和异常穿透
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
        def trigger_healing(failures_json: str) -> str:
            """
            当测试存在失败时，调用 HealAgent 进行自愈修复。

            会创建一个 HealAgent 实例，让它自主执行修复流程。
            最多重试 3 次，返回最终修复结果。

            Args:
                failures_json: JSON 格式的失败用例列表（由 read_junit_report 返回）

            Returns:
                自愈结果描述，包含成功/失败和修复详情
            """
            logger.info(f"[工具] trigger_healing 被调用，失败数据: {failures_json[:200]}...")
            print("=" * 60)
            print("[MonitorAgent] 🔥 触发自愈流程！")
            print(f"[MonitorAgent] 失败用例: {failures_json}")
            print("=" * 60)
            try:
                from src.app.agents.heal_agent import HealAgent
                heal_agent_instance = HealAgent(self.config)
                agent = heal_agent_instance.create()

                task = (
                    f"以下测试用例失败，请执行自愈流程：\n"
                    f"{failures_json}\n"
                    f"目标 URL: {self.target_url}\n"
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
                return f"自愈 Agent 返回:\n{content}"
            except Exception as e:
                logger.error(f"调用 HealAgent 失败: {e}")
                return f"❌ 自愈 Agent 调用异常: {e}"

        # 返回工具列表（顺序无关，Agent 根据 docstring 自主选择）
        return [
            generate_test_specs,
            run_playwright_tests,
            read_junit_report,
            push_feishu_report,
            trigger_healing,
        ]

    def build_system_prompt(self) -> str:
        """
        构建 MonitorAgent 的 system prompt

        关键设计：
        - 明确 Agent 的角色和目标
        - 引导 Agent 读取 explore_home 技能获取探索策略
        - 规定决策流程：探索→生成→执行→判断→推送
        - 强调工具使用的顺序依赖
        """
        return """你是一个专业的 Web 监控 Agent，负责自动化监控 Makera 三个站点（WWW、Global、EU）的健康状态。

## 你的目标
通过自主决策完成以下完整流程：
1. **探索**：读取 `explore_home` 技能，了解如何探索目标页面
2. **执行**：调用 `run_playwright_tests` 工具运行测试（测试脚本已包含三个站点的用例）
3. **判断**：调用 `read_junit_report` 工具分析测试结果
4. **推送**：调用 `push_feishu_report` 工具将报告推送到飞书
5. **自愈**：如果测试有失败，调用 `trigger_healing` 触发 HealAgent 自动修复

## 工作流程（必须严格遵循）
1. 首先调用 `generate_test_specs()`（无参数）—— 如果脚本已存在会自动跳过
2. 然后调用 `run_playwright_tests()` 执行测试
3. 接着调用 `read_junit_report()` 读取结果
4. **关键**：如果 `read_junit_report` 返回的 `failed_cases` 不为空，必须调用 `trigger_healing()` 触发自愈
5. 调用 `push_feishu_report()` 推送飞书报告
6. 向用户简洁汇报执行结果

## 工具使用规则
- `generate_test_specs`：必须先于 `run_playwright_tests` 调用，确保有最新的测试脚本
- `run_playwright_tests`：执行测试，返回码 0 表示全部通过，非 0 表示有失败
- `read_junit_report`：用于详细分析失败用例，返回 JSON 格式的失败详情
- `trigger_healing`：当测试存在失败时调用，传入失败列表 JSON，HealAgent 会自动修复并重试
- `push_feishu_report`：始终在测试执行后调用，确保团队收到通知

## 输出要求
- 用中文汇报
- 包含：生成脚本数量、测试通过/失败数、自愈结果、飞书推送状态
- 如果测试失败，明确指出失败用例名称和可能原因
- 保持简洁，不超过 300 字

## 注意事项
- 每次执行都是独立的，不要假设上一次的状态
- 如果某个工具调用失败，记录错误并尝试继续执行后续步骤
- 探索策略详细步骤参见 `explore_home` 技能文件
"""