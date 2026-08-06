# src/app/agents/heal_agent.py
"""
HealAgent：自愈 Agent（增量4 + 多站点分离架构）

职责：
1. 读取失败测试用例列表（从 report_parser 获取）
2. 根据 classname 自动定位对应站点的 spec 文件
3. 对每个失败用例调用 heal_specs.ts 修复定位器
4. 重新执行 Playwright 测试
5. 最多重试 3 次，返回最终状态

多站点适配：
- 从 classname（如 src.web.testcases.smoke.us_carvera.spec）提取站点名
- 自动匹配 config/settings.yaml 中对应站点的 URL
- heal_specs.ts 接收正确的 spec 文件路径

上游：MonitorAgent 检测到测试失败后调用 HealAgent
下游：调用 PlaywrightRunner 和 heal_specs.ts
"""
from typing import Any, List, Dict, Optional
import json
import subprocess
import sys
from pathlib import Path

from langchain_core.tools import tool

from src.app.agents.base_agent import BaseAgent
from src.core.logger import get_logger
from src.web.runners.playwright_runner import PlaywrightRunner
from src.web.runners.report_parser import parse_junit_failures, get_summary

logger = get_logger(__name__)


class HealAgent(BaseAgent):
    """自愈 Agent：分析失败原因、修复定位器、重试测试（多站点感知）"""

    agent_name = "heal"
    agent_description = "自动修复失败的 Playwright 测试用例，最多重试 3 次"

    # 最大重试次数
    MAX_RETRIES = 3

    # ── 多站点辅助方法 ────────────────────────────────────

    def _resolve_spec_from_classname(self, classname: str) -> Path:
        """
        从 JUnit classname 解析出对应站点的 spec 文件路径

        classname 格式: src.web.testcases.smoke.us_carvera.spec
        提取文件名: us_carvera.spec.ts
        """
        spec_dir = self.project_root / "src" / "web" / "testcases" / "smoke"
        # 从 classname 最后一段提取文件名（如 us_carvera.spec → us_carvera.spec.ts）
        parts = classname.replace(".", "/").split("/")
        # 找到包含 "_carvera" 的部分
        for part in parts:
            if "_carvera" in part:
                filename = part if part.endswith(".ts") else part + ".ts"
                spec_path = spec_dir / filename
                if spec_path.exists():
                    return spec_path
        # 回退：遍历目录查找匹配的 spec 文件
        for f in spec_dir.glob("*_carvera.spec.ts"):
            if f.stem.replace(".spec", "") in classname:
                return f
        # 最终回退：返回默认文件（兼容旧格式）
        return spec_dir / "generated_homepage.spec.ts"

    def _resolve_url_from_classname(self, classname: str) -> str:
        """
        从 classname 推断站点名，匹配配置中的目标 URL

        如 classname 含 "us_" → 查找 sites 中 name=US 的 url
        """
        classname_lower = classname.lower()
        for site in self.target_sites:
            site_key = site["name"].lower()
            if site_key in classname_lower:
                return site["url"]
        # 回退：返回第一个站点 URL
        return self.target_url

    # ── 工具构建 ──────────────────────────────────────────

    def build_tools(self) -> List[Any]:
        """
        构建 HealAgent 的工具集（多站点感知）

        工具说明：
        - heal_single_case: 修复单个失败用例，自动从 classname 定位 spec 文件
        - run_tests_and_get_failures: 执行测试并返回失败列表
        - check_if_all_passed: 判断是否全部通过
        - get_current_failures: 获取当前 JUnit 报告中的失败列表
        """
        runner = PlaywrightRunner(project_root=self.project_root)
        junit_path = runner.get_junit_path()
        spec_dir = self.project_root / "src" / "web" / "testcases" / "smoke"

        # 代码级防护：维护当前失败用例白名单，heal_single_case 只允许修复白名单中的用例
        _failed_names: set = set()

        def _refresh_failure_whitelist():
            """从 JUnit XML 刷新失败用例白名单"""
            nonlocal _failed_names
            try:
                failures = parse_junit_failures(junit_path)
                _failed_names = {f["name"] for f in failures}
                logger.info(f"[heal] 失败白名单已刷新: {_failed_names}")
            except Exception as e:
                logger.warning(f"[heal] 刷新失败白名单异常: {e}")
                _failed_names = set()

        # 初始化白名单
        _refresh_failure_whitelist()

        @tool
        def heal_single_case(url: str, failed_test_name: str, error_message: str = "", classname: str = "") -> str:
            """
            修复单个失败测试用例的定位器。

            调用 heal_specs.ts 脚本，重新探索页面并用新的语义定位器替换失败的定位器。
            所有失败用例都会尝试自愈，无法修复时由脚本自行退出。
            自动根据 classname 定位对应站点的 spec 文件。

            ⚠️ 代码级防护：只允许修复当前 JUnit 报告中实际失败的用例，
            已通过或用例名不在失败列表中的请求将被直接拒绝。

            Args:
                url: 目标页面 URL（从站点 URL 映射表获取）
                failed_test_name: 失败测试用例名称（JUnit name，格式 "站点名 › 实际测试名"）
                error_message: 错误消息（用于判断失败类型）
                classname: 测试类名（如 src.web.testcases.smoke.us_carvera.spec），用于定位 spec 文件

            Returns:
                修复结果描述
            """
            logger.info(f"[工具] heal_single_case: url={url}, test='{failed_test_name}', classname='{classname}'")

            # 代码级防护：检查用例是否在失败白名单中
            _refresh_failure_whitelist()
            if failed_test_name not in _failed_names:
                logger.warning(f"[工具] 拒绝修复非失败用例: '{failed_test_name}'（不在失败白名单中）")
                return f"⛔ 拒绝修复：'{failed_test_name}' 不是当前失败的用例，禁止触碰已通过用例！"

            # 所有失败用例都尝试自愈，不再用关键词过滤
            # heal_specs.ts 会重新探索页面并生成正确的定位器，无法修复时由脚本自行退出

            # 根据 classname 解析对应站点的 spec 文件路径
            if classname:
                target_spec = self._resolve_spec_from_classname(classname)
            else:
                # 无 classname 时回退：遍历查找
                target_spec = spec_dir / "generated_homepage.spec.ts"
            logger.info(f"[工具] 目标 spec 文件: {target_spec}")

            script_path = self.project_root / "src" / "web" / "scripts_B" / "heal_specs.ts"

            # 跨平台兼容：Windows 用 ts-node.cmd，Linux/Mac 用 ts-node
            ts_node_name = "ts-node.cmd" if sys.platform == "win32" else "ts-node"
            ts_node_path = self.project_root / "node_modules" / ".bin" / ts_node_name
            cmd = [
                str(ts_node_path),
                str(script_path),
                url,
                failed_test_name,
                str(target_spec)
            ]
            logger.info(f"[工具] 执行自愈命令: {' '.join(cmd)}")

            try:
                result = subprocess.run(
                    cmd,
                    cwd=str(self.project_root),
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    errors='replace',
                    timeout=180,
                )
                logger.info(f"[工具] heal_specs.ts 返回码: {result.returncode}")
                if result.stdout:
                    logger.info(f"[工具] heal_specs.ts stdout:\n{result.stdout[:2000]}")
                if result.stderr:
                    logger.warning(f"[工具] heal_specs.ts stderr:\n{result.stderr[:2000]}")
                if result.returncode == 0:
                    return f"✅ 修复成功: {failed_test_name}\n{result.stdout}"
                else:
                    return f"❌ 修复失败: {failed_test_name}\n错误: {result.stderr}\n输出: {result.stdout}"
            except subprocess.TimeoutExpired:
                logger.error(f"[工具] heal_specs.ts 执行超时(180s): {failed_test_name}")
                return f"⏰ 修复超时(180s): {failed_test_name}，heal_specs.ts 未在规定时间内完成"
            except FileNotFoundError:
                logger.error(f"[工具] ts-node 不存在: {ts_node_path}")
                return f"❌ 修复异常: ts-node 不存在于 {ts_node_path}，请确认 npm install 已执行"
            except Exception as e:
                logger.error(f"[工具] heal_specs.ts 执行异常: {e}", exc_info=True)
                return f"❌ 修复异常: {failed_test_name}\n{e}"

        @tool
        def run_tests_and_get_failures(spec_file: str = "") -> str:
            """
            执行 Playwright 测试，并返回失败用例列表。

            ️ 重要：
            - 如果传入了 spec_file，只运行该 spec 文件中的用例（不跑全部测试）
            - 如果不传 spec_file，运行全部测试
            - 返回结果中 failures 数组只包含失败用例，pass 数组是通过的用例
            - 代码层已加防护：heal_single_case 会拒绝修复不在失败列表中的用例

            Args:
                spec_file: spec 文件名（如 eu_carvera.spec.ts），为空则运行全部

            Returns:
                JSON 格式，包含 failures（失败列表）和 pass（通过列表）
            """
            logger.info(f"[工具] run_tests_and_get_failures 被调用，spec_file='{spec_file}'")
            # 使用相对路径（如 src/web/testcases/smoke/eu_carvera.spec.ts），避免 Windows 绝对路径问题
            if spec_file:
                rel_path = f"src/web/testcases/smoke/{spec_file}"
            else:
                rel_path = None
            return_code, stdout, stderr = runner.run_tests(spec_file=rel_path)

            # 解析失败列表并刷新白名单
            failures = parse_junit_failures(junit_path)
            _refresh_failure_whitelist()
            summary = get_summary(junit_path)

            result = {
                "return_code": return_code,
                "summary": summary,
                "failures": failures,
                "passed_count": summary.get("pass", 0),
                "⚠️警告": "只修复 failures 数组中的用例，pass 数组中的用例已通过，禁止触碰！"
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

    def _build_site_url_map(self) -> str:
        """
        构建站点→URL→spec 映射表（供 system prompt 使用）

        Returns:
            格式化的站点映射字符串
        """
        lines = []
        for site in self.target_sites:
            name = site.get("name", "unknown")
            url = site.get("url", "")
            filename = f"{name.lower()}_carvera.spec.ts"
            lines.append(f"  - {name}: url={url}, spec={filename}")
        return "\n".join(lines)

    def build_system_prompt(self) -> str:
        """
        构建 HealAgent 的 system prompt

        核心逻辑：
        1. 读取任务中的错误分析，基于已知原因修复（不要盲目猜测）
        2. 只对失败用例执行修复，已通过的跳过
        3. 使用 spec 文件路径重跑验证
        4. 最多重试 3 次，返回最终状态
        """
        site_url_map = self._build_site_url_map()
        return f"""你是一个专业的自愈 Agent，负责自动修复失败的 Playwright 测试用例。

## 站点→spec 文件映射
{site_url_map}

## 多站点说明
每个站点对应独立的 spec 文件，失败用例的 classname 字段包含文件名信息
（如 classname=smoke\\eu_carvera.spec.ts 表示 EU 站点，对应 spec 文件 eu_carvera.spec.ts）。
调用 heal_single_case 时请传入 classname，工具会自动定位正确的 spec 文件。

## 修复策略（重要）
任务 prompt 中的「错误分析与修复建议」部分已经包含了已知问题的原因和解决方案。
**你必须优先参考该部分的建议进行修复，不要盲目猜测或尝试无关的修复方案。**

常见已知问题与解决方案：
- **Element is not visible**：元素被幸运转盘弹窗遮挡 → 在点击前调用 `dismissSpinPopup(page)` 关闭转盘，并使用 `{{ force: true }}` 点击
- **Timeout / Timed out**：元素加载慢或被遮挡 → 增加等待时间或使用 `{{ force: true }}` 点击
- **商店切换失败**：切换按钮被遮挡 → 使用 `{{ force: true }}` 点击切换按钮和商店选项

## 你的目标
当 MonitorAgent 检测到测试失败后，你将被调用。你需要：
1. **首先阅读任务 prompt 中的「错误分析与修复建议」**，理解失败原因
2. 读取失败用例列表（调用 `get_current_failures`）
3. **只对失败的用例执行自愈，已通过的用例绝对不要重跑或修改**
4. 对每个失败用例调用 `heal_single_case`，必须传入以下参数：
   - url: 从上方映射表中查找对应站点的 URL
   - failed_test_name: 失败用例的 name 字段（格式 "站点名 › 实际测试名"）
   - error_message: 失败用例的 message 字段
   - classname: 失败用例的 classname 字段（用于自动定位 spec 文件）
5. **检查 heal_single_case 返回值**：
   - 如果返回 ✅ 修复成功 → 调用 `run_tests_and_get_failures(spec_file="站点spec文件名")` 验证
   - 如果返回 ❌ 修复失败 / ⏰ 超时 → **禁止调用 run_tests**，必须分析错误原因并重试 heal_single_case
   - 如 classname 含 "eu_" → spec_file="eu_carvera.spec.ts"
   - 如 classname 含 "us_" → spec_file="us_carvera.spec.ts"
   - 如 classname 含 "global_" → spec_file="global_carvera.spec.ts"
6. 调用 `check_if_all_passed` 检查是否全部通过
7. 如果仍有失败且重试次数 < {self.MAX_RETRIES}，**只对新 failures 数组中的用例**继续修复
8. 达到最大重试次数后，无论是否全部通过，返回最终结果

## 工作流程（必须严格遵循）
1. **阅读任务 prompt 中的「错误分析与修复建议」**，确定修复方向
2. 调用 `get_current_failures` 获取初始失败列表
3. 如果列表为空，直接报告"无需修复，全部通过"
4. **只遍历 failures 数组中的用例**（pass 数组中的用例已通过，绝对禁止触碰），对每个失败用例调用 `heal_single_case`：
   - 从 classname 判断站点（如含 "us_" → US，含 "eu_" → EU，含 "global_" → Global）
   - 从上方映射表获取对应 URL
   - 务必传入 classname 参数
   - **根据错误分析中的建议修改代码**（如添加 dismissSpinPopup、使用 force: true 等）
5. **检查 heal_single_case 返回值**：
   - ✅ 修复成功 → 调用 `run_tests_and_get_failures(spec_file="对应站点的spec文件名")` 验证
   - ❌ 失败 / ⏰ 超时 → **禁止调用 run_tests**，分析错误后重试 heal_single_case
6. 调用 `check_if_all_passed` 判断结果
7. 如果还有失败且重试次数 < {self.MAX_RETRIES}，回到步骤4
8. 达到最大重试次数后，报告最终状态

## 输出要求
- 用中文汇报
- 包含：修复的用例数（按站点）、重试次数、最终通过/失败情况
- 如果最终全部通过，标记"自愈成功"
- 如果仍有失败，标记"自愈失败，需人工介入"并列出失败站点
- 简洁明了，不超过 300 字

## 注意事项
- **只修复失败用例，已通过的用例不要触碰**
- **优先使用任务 prompt 中的错误分析指导修复，不要盲目尝试**
- 修复后调用 `run_tests_and_get_failures(spec_file="eu_carvera.spec.ts")` **只重跑该站点用例**，不要跑全部测试
- **heal_single_case 返回失败/超时时，绝对不允许直接调用 run_tests_and_get_failures**
  - 必须先分析错误原因（如 ts-node 不存在、超时、脚本异常等），尝试解决后重新调用 heal_single_case
  - 只有 heal_single_case 返回 ✅ 修复成功 后，才能调用 run_tests_and_get_failures 验证
- 不要重复修复同一个用例超过一次（除非它在重新测试后仍然失败）
- **绝对不要使用测试用例名称作为 run_tests_and_get_failures 的参数，必须使用 spec 文件名**
"""