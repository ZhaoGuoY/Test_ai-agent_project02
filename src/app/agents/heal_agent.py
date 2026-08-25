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
import shutil
import subprocess
import sys
from pathlib import Path

from langchain_core.tools import tool

from src.app.agents.base_agent import BaseAgent
from src.core.logger import get_logger
from src.web.runners.playwright_runner import PlaywrightRunner
from src.web.runners.report_parser import parse_junit_failures, get_summary, merge_junit_files

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
        从 JUnit classname 解析出对应的 spec 文件路径

        classname 格式: src.web.testcases.smoke.us_carvera.spec
                     或: src.web.testcases.smoke.auth0_login.spec
        策略：优先精确匹配 classname 末段对应的 .spec.ts 文件，
        再回退到 _carvera 模式匹配，最终回退到遍历 spec_dir 查找。
        """
        spec_dir = self.project_root / "src" / "web" / "testcases" / "smoke"
        # 1. 从 classname 末段提取文件名（如 auth0_login.spec → auth0_login.spec.ts）
        parts = classname.replace(".", "/").split("/")
        last_part = parts[-1] if parts else ""
        if last_part:
            filename = last_part if last_part.endswith(".ts") else last_part + ".ts"
            spec_path = spec_dir / filename
            if spec_path.exists():
                return spec_path
        # 2. 兼容旧格式：查找含 "_carvera" 的文件
        for part in parts:
            if "_carvera" in part:
                filename = part if part.endswith(".ts") else part + ".ts"
                spec_path = spec_dir / filename
                if spec_path.exists():
                    return spec_path
        # 3. 最终回退：遍历 spec_dir 查找 classname 中包含的 spec 文件
        for f in spec_dir.glob("*.spec.ts"):
            if f.stem.replace(".spec", "") in classname:
                return f
        # 4. 兜底：返回第一个 spec 文件（不再硬编码不存在的 generated_homepage）
        specs = list(spec_dir.glob("*.spec.ts"))
        if specs:
            logger.warning(f"[heal] 无法从 classname '{classname}' 精确定位 spec，使用首个: {specs[0].name}")
            return specs[0]
        raise FileNotFoundError(f"spec 目录中未找到任何 .spec.ts 文件: {spec_dir}")

    def _resolve_url_from_classname(self, classname: str) -> str:
        """
        从 classname 推断站点名，匹配配置中的目标 URL

        如 classname 含 "us_" → 查找 sites 中 name=US 的 url
        auth0_login 固定使用 US 站点 URL（登录页面向往 USA Store）
        """
        classname_lower = classname.lower()
        # auth0_login 固定映射到 US 站点（登录页面为 Makera USA Store）
        if "auth0" in classname_lower or "auth0_login" in classname_lower:
            for site in self.target_sites:
                if site["name"].upper() == "US":
                    return site["url"]
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
                # 无 classname 时：遍历 spec_dir 查找包含 failed_test_name 的 spec 文件
                target_spec = None
                for f in spec_dir.glob("*.spec.ts"):
                    if f.stem.replace(".spec", "") in failed_test_name:
                        target_spec = f
                        break
                if not target_spec:
                    specs = list(spec_dir.glob("*.spec.ts"))
                    target_spec = specs[0] if specs else None
                if target_spec:
                    logger.info(f"[工具] 无 classname，自动定位 spec: {target_spec.name}")
            if not target_spec:
                return "❌ 无法定位 spec 文件，请检查 classname 或 spec 目录"
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
                str(target_spec),
                error_message  # 传给 heal_specs.ts 用于判断失败类型（URL断言/定位器失效）
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

            # 重跑前快照当前 junit.xml：Playwright 每次执行都会整体覆盖 junit.xml，
            # 若不合并，先前站点重跑通过的结果会被后续站点的重跑覆盖丢失
            #（飞书曾因此把已自愈成功的站点误报为失败）
            snapshot = junit_path.with_suffix('.xml.snapshot')
            if junit_path.exists():
                shutil.copy2(str(junit_path), str(snapshot))
            mtime_before = junit_path.stat().st_mtime if junit_path.exists() else 0

            return_code, stdout, stderr = runner.run_tests(spec_file=rel_path)

            mtime_after = junit_path.stat().st_mtime if junit_path.exists() else 0
            stale_warning = ""
            if return_code != 0 and mtime_after <= mtime_before:
                # junit 未更新 → 重跑未产生有效报告（典型原因：spec 文件语法/编译错误，用例根本没被执行）
                stale_warning = ("⚠️ 严重警告：return_code 非 0 但 JUnit 报告未更新（仍为旧数据）！"
                                 "说明本次重跑没有执行任何用例，最常见原因是 spec 文件存在语法/编译错误。"
                                 "绝对不能判定为通过！请先检查该 spec 文件语法（如自愈写入的定位器行是否合法），"
                                 "修复后重新调用 heal_single_case 再重跑。")
                logger.warning(f"[工具] {stale_warning}")
            elif return_code != 0 and get_summary(junit_path).get("tests", 0) == 0:
                # junit 被覆盖为空报告 → 恢复快照，防止空报告让 check_if_all_passed 误判全部通过
                if snapshot.exists():
                    shutil.copy2(str(snapshot), str(junit_path))
                stale_warning = ("⚠️ 严重警告：return_code 非 0 但 JUnit 为空（0 用例）！"
                                 "用例根本没被执行（疑似 spec 语法错误），已恢复重跑前的报告。"
                                 "绝对不能判定为通过！请检查 spec 文件语法后重试。")
                logger.warning(f"[工具] {stale_warning}")
            elif snapshot.exists():
                # 正常情况：将本次重跑结果增量合并回快照（保留其他站点的结果）
                merged = merge_junit_files(snapshot, junit_path, junit_path)
                logger.info(f"[工具] 重跑结果已合并回累积报告，替换 {merged} 个用例")

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
            if stale_warning:
                result["⚠️报告异常"] = stale_warning
            return json.dumps(result, ensure_ascii=False)

        @tool
        def check_if_all_passed() -> str:
            """
            检查当前 JUnit 报告中是否全部测试通过。

            Returns:
                "true" 或 "false" 以及简要统计
            """
            summary = get_summary(junit_path)
            # 防护：JUnit 为空（0 用例）不能视为全部通过——
            # 通常是 spec 编译失败导致用例根本没被执行，曾因此误判 Global 失败用例已全部通过
            if summary.get("tests", 0) == 0:
                return ("false (JUnit 报告为空/无有效用例，不能判定为通过！"
                        "通常是 spec 文件语法错误导致用例未执行，请检查 run_tests 的 return_code 和报告异常警告)")
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

        动态扫描 spec 目录，将站点名与实际存在的 spec 文件匹配，
        不再硬编码 _carvera 后缀。
        """
        spec_dir = self.project_root / "src" / "web" / "testcases" / "smoke"
        all_specs = {f.stem.replace(".spec", ""): f.name for f in spec_dir.glob("*.spec.ts")}
        lines = []
        for site in self.target_sites:
            name = site.get("name", "unknown")
            url = site.get("url", "")
            # 优先匹配 name_carvera，其次匹配 name，最后取首个 spec
            key = f"{name.lower()}_carvera"
            filename = all_specs.get(key) or all_specs.get(name.lower()) or (list(all_specs.values())[0] if all_specs else "unknown.spec.ts")
            lines.append(f"  - {name}: url={url}, spec={filename}")
        # 额外列出非站点 spec 文件（如 auth0_login）
        site_keys = {f"{s['name'].lower()}_carvera" for s in self.target_sites} | {s["name"].lower() for s in self.target_sites}
        for key, fname in all_specs.items():
            if key not in site_keys:
                lines.append(f"  - {key}: spec={fname}（非站点用例，需人工指定 URL）")
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
4. **批量修复所有失败用例**：对每个失败用例调用 `heal_single_case`（不要修一个就跑一次测试！），必须传入以下参数：
   - url: 从上方映射表中查找对应站点的 URL
   - failed_test_name: 失败用例的 name 字段（格式 "站点名 › 实际测试名"）
   - error_message: 失败用例的 message 字段
   - classname: 失败用例的 classname 字段（用于自动定位 spec 文件）
5. **所有失败用例修复完成后，只调用一次** `run_tests_and_get_failures(spec_file="站点spec文件名")` 验证
   - ️ **每个重试周期内绝对只允许调用一次 run_tests_and_get_failures**
   - 如 classname 含 "eu_" → spec_file="eu_carvera.spec.ts"
   - 如 classname 含 "us_" → spec_file="us_carvera.spec.ts"
   - 如 classname 含 "global_" → spec_file="global_carvera.spec.ts"
   - 如 classname 含 "auth0" → spec_file="auth0_login.spec.ts"
6. 调用 `check_if_all_passed` 检查是否全部通过
7. 如果仍有失败且重试次数 < {self.MAX_RETRIES}，**只对新 failures 数组中的用例**继续修复
8. 达到最大重试次数后，无论是否全部通过，返回最终结果

## 工作流程（必须严格遵循）
1. **阅读任务 prompt 中的「错误分析与修复建议」**，确定修复方向
2. 调用 `get_current_failures` 获取初始失败列表
3. 如果列表为空，直接报告"无需修复，全部通过"
4. **批量修复所有失败用例**：对 failures 数组中的每个用例调用 `heal_single_case`（不要修一个就跑一次测试！）
   - 从 classname 判断站点（如含 "us_" → US，含 "eu_" → EU，含 "global_" → Global，含 "auth0" → auth0_login.spec.ts）
   - 从上方映射表获取对应 URL
   - 务必传入 classname 参数
   - **根据错误分析中的建议修改代码**（如添加 dismissSpinPopup、使用 force: true 等）
5. **批量修复完成后，只调用一次** `run_tests_and_get_failures(spec_file="对应站点的spec文件名")` 验证
   - ⚠️ **每个重试周期内绝对只允许调用一次 run_tests_and_get_failures**
   - 环境类失败不修改代码也返回 ✅，同样必须重跑验证
   - 如 classname 含 "auth0" → spec_file="auth0_login.spec.ts"
6. 调用 `check_if_all_passed` 判断结果
7. 如果还有失败且重试次数 < {self.MAX_RETRIES}，回到步骤4
8. 达到最大重试次数后，报告最终状态

## 重跑次数限制（极其重要）
- **最大自愈周期数：{self.MAX_RETRIES} 次**
- **每个周期内只允许调用 1 次 run_tests_and_get_failures**（批量修复所有失败用例后再统一验证）
- **总重跑次数上限 = {self.MAX_RETRIES} 次**，绝对不允许超过
- 禁止行为：修一个用例就跑一次测试、重复验证、无意义的多次重跑

## 输出要求
- 用中文汇报
- 包含：修复的用例数（按站点）、重试次数、最终通过/失败情况
- 如果最终全部通过，标记"自愈成功"
- 如果仍有失败，标记"自愈失败，需人工介入"并列出失败站点
- 简洁明了，不超过 300 字

## 注意事项
- **只修复失败用例，已通过的用例不要触碰**
- **只修复现有失败用例的定位器，禁止探索新测试点、禁止新增 test() 用例、禁止扩大测试范围**
- **优先使用任务 prompt 中的错误分析指导修复，不要盲目尝试**
- **重跑次数限制**：每个自愈周期内只允许调用 1 次 run_tests_and_get_failures，总重跑次数不超过 {self.MAX_RETRIES} 次
- **heal_single_case 返回失败/超时时，绝对不允许直接调用 run_tests_and_get_failures**
  - 必须先分析错误原因（如 ts-node 不存在、超时、脚本异常等），尝试解决后重新调用 heal_single_case
  - 只有 heal_single_case 返回 ✅ 修复成功 后，才能调用 run_tests_and_get_failures 验证
- **报告一致性判定（重要）**：若 run_tests_and_get_failures 返回的 return_code 非 0，
  即使 failures 为空也绝对不能判定为通过（说明用例根本没被执行，常见于 spec 语法错误）；
  返回结果中如出现「⚠️报告异常」字段，必须按其指示检查 spec 文件语法后重试修复
- 不要重复修复同一个用例超过一次（除非它在重新测试后仍然失败）
- **绝对不要使用测试用例名称作为 run_tests_and_get_failures 的参数，必须使用 spec 文件名**
"""