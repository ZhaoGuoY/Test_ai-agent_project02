# src/app/agents/heal_agent.py
"""
HealAgent：自愈 Agent（增量4）专注自愈，传入失败列表，专属 prompt，LLM 注意力更集中，修复成功率更高

职责：
1. 读取失败测试用例列表（从 report_parser 获取）
2. 对每个失败用例调用 heal_specs.ts 修复定位器
3. 重新执行 Playwright 测试
4. 最多重试 3 次，记录每次结果
5. 返回最终状态（成功/失败）

设计原则：
- 继承 BaseAgent，复用模型初始化、工具装配等公共逻辑
- 工具粒度细化：修复单个用例、重新测试、判断是否通过
- 与 MonitorAgent 解耦，通过工厂函数统一创建

上游：MonitorAgent 检测到测试失败后调用 HealAgent
下游：调用 PlaywrightRunner 和 heal_specs.ts
"""
from typing import Any, List, Dict, Optional
import json
import subprocess
from pathlib import Path

from langchain_core.tools import tool

from src.app.agents.base_agent import BaseAgent
from src.core.logger import get_logger
from src.web.runners.playwright_runner import PlaywrightRunner
from src.web.runners.report_parser import parse_junit_failures, get_summary

logger = get_logger(__name__)


class HealAgent(BaseAgent):
    """自愈 Agent：分析失败原因、修复定位器、重试测试"""

    agent_name = "heal"
    agent_description = "自动修复失败的 Playwright 测试用例，最多重试 3 次"

    # 最大重试次数
    MAX_RETRIES = 3

    def build_tools(self) -> List[Any]:
        """
        构建 HealAgent 的工具集

        工具说明：
        - heal_single_case: 修复单个失败用例的定位器
        - run_tests_and_get_failures: 执行测试并返回失败列表
        - check_if_all_passed: 判断是否全部通过
        - get_current_failures: 获取当前 JUnit 报告中的失败列表
        """
        runner = PlaywrightRunner(project_root=self.project_root)
        junit_path = runner.get_junit_path()
        spec_dir = self.project_root / "src" / "web" / "testcases" / "smoke"
        default_spec = spec_dir / "generated_homepage.spec.ts"

        @tool
        def heal_single_case(url: str, failed_test_name: str, error_message: str = "") -> str:
            """
            修复单个失败测试用例的定位器。

            调用 heal_specs.ts 脚本，重新探索页面并用新的语义定位器替换失败的定位器。
            仅修复定位器失效类错误（toBeVisible、not visible、Unable to locate）。

            Args:
                url: 目标页面 URL，例如 "https://www.makera.com/"
                failed_test_name: 失败测试用例的名称，例如 "元素可见: Learn More"
                error_message: 错误消息（用于判断失败类型）

            Returns:
                修复结果描述
            """
            logger.info(f"[工具] heal_single_case: url={url}, test='{failed_test_name}'")

            # 判断是否为定位器失效（只有这类可以自动修复）
            locator_keywords = ["toBeVisible", "not visible", "Unable to locate", "getByText", "getByRole", "getByLabel"]
            is_locator_failure = any(kw in error_message for kw in locator_keywords) if error_message else True

            if not is_locator_failure:
                logger.info(f"[工具] 跳过非定位器失败: {failed_test_name}")
                return f"⏭️ 跳过修复（非定位器失效）: {failed_test_name}\n错误类型: {error_message[:100]}"

            script_path = self.project_root / "src" / "web" / "scripts_B" / "heal_specs.ts"

            # 使用 node_modules/.bin/ts-node.cmd 而非 npx（npx 在 Windows 上可能不可用）
            ts_node_path = self.project_root / "node_modules" / ".bin" / "ts-node.cmd"
            cmd = [
                str(ts_node_path),
                str(script_path),
                url,
                failed_test_name,
                str(default_spec)
            ]

            try:
                result = subprocess.run(
                    cmd,
                    cwd=str(self.project_root),
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    errors='replace',
                    timeout=60,
                )
                if result.returncode == 0:
                    return f"✅ 修复成功: {failed_test_name}\n{result.stdout}"
                else:
                    return f"❌ 修复失败: {failed_test_name}\n错误: {result.stderr}\n输出: {result.stdout}"
            except subprocess.TimeoutExpired:
                return f"⏰ 修复超时: {failed_test_name}"
            except Exception as e:
                return f"❌ 修复异常: {failed_test_name}\n{e}"

        @tool
        def run_tests_and_get_failures() -> str:
            """
            执行所有 Playwright 测试，并返回失败用例列表。

            Returns:
                JSON 格式的失败用例列表和汇总统计
            """
            logger.info("[工具] run_tests_and_get_failures 被调用")
            return_code, stdout, stderr = runner.run_tests()

            # 解析失败列表
            failures = parse_junit_failures(junit_path)
            summary = get_summary(junit_path)

            result = {
                "return_code": return_code,
                "summary": summary,
                "failures": failures,
            }
            return json.dumps(result, ensure_ascii=False)

        @tool
        def check_if_all_passed() -> str:
            """
            检查当前 JUnit 报告中是否全部测试通过。

            Returns:
                "true" 或 "false" 以及简要统计
            """
            summary = get_summary(junit_path)
            total_failures = summary["failures"] + summary["errors"]
            if total_failures == 0:
                return f"true (全部通过: {summary['pass']}/{summary['tests']})"
            else:
                return f"false (失败: {total_failures}, 通过: {summary['pass']}/{summary['tests']})"

        @tool
        def get_current_failures() -> str:
            """
            获取当前 JUnit 报告中的失败用例详情。

            Returns:
                JSON 格式的失败用例列表
            """
            failures = parse_junit_failures(junit_path)
            return json.dumps(failures, ensure_ascii=False)

        return [
            heal_single_case,
            run_tests_and_get_failures,
            check_if_all_passed,
            get_current_failures,
        ]

    def build_system_prompt(self) -> str:
        """
        构建 HealAgent 的 system prompt

        核心逻辑：
        1. 获取失败用例列表
        2. 逐个修复（调用 heal_single_case）
        3. 重新测试
        4. 判断是否全部通过，若否且未达最大重试次数，继续修复
        5. 返回最终结果
        """
        return f"""你是一个专业的自愈 Agent，负责自动修复失败的 Playwright 测试用例。

## 你的目标
当 MonitorAgent 检测到测试失败后，你将被调用。你需要：
1. 读取失败用例列表（调用 `get_current_failures`）
2. 对每个失败用例调用 `heal_single_case` 修复定位器
3. 调用 `run_tests_and_get_failures` 重新执行测试
4. 调用 `check_if_all_passed` 检查是否全部通过
5. 如果仍有失败且重试次数 < {self.MAX_RETRIES}，继续修复
6. 达到最大重试次数后，无论是否全部通过，返回最终结果

## 工作流程（必须严格遵循）
1. 调用 `get_current_failures` 获取初始失败列表
2. 如果列表为空，直接报告"无需修复"
3. 否则，遍历每个失败用例，调用 `heal_single_case(url="{self.target_url}", failed_test_name="...", error_message="...")`
   - error_message 从失败用例的 message 字段获取，用于判断失败类型
   - 非定位器失效的错误会被自动跳过
4. 全部修复后，调用 `run_tests_and_get_failures` 重新测试
5. 调用 `check_if_all_passed` 判断结果
6. 如果还有失败且重试次数 < {self.MAX_RETRIES}，回到步骤3
7. 达到最大重试次数后，报告最终状态

## 输出要求
- 用中文汇报
- 包含：修复的用例数、重试次数、最终通过/失败情况
- 如果最终全部通过，标记"自愈成功"
- 如果仍有失败，标记"自愈失败，需人工介入"
- 简洁明了，不超过 300 字

## 注意事项
- 每次修复后都要重新运行测试，因为修复可能影响其他用例
- 如果 `heal_single_case` 返回失败，记录该用例无法修复
- 不要重复修复同一个用例超过一次（除非它在重新测试后仍然失败）
- 目标 URL 固定为 {self.target_url}
"""