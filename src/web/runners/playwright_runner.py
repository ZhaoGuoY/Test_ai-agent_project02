# src/web/runners/playwright_runner.py
"""
Playwright Runner（增量2：增加 generate_specs 方法）
"""
import os
import subprocess
import shutil
import sys
from pathlib import Path
from typing import Optional, Tuple

from src.core.logger import get_logger

logger = get_logger(__name__)


class PlaywrightRunner:
    """
    Playwright 测试执行器
    """

    def __init__(self, project_root: Optional[Path] = None):
        if project_root is None:
            project_root = Path(__file__).resolve().parent.parent.parent
        self.project_root = project_root
        self.npx_path = shutil.which("npx")
        if self.npx_path is None:
            logger.warning("未在 PATH 中找到 npx，尝试使用默认命令")

    def run_tests(self, test_dir: Optional[str] = None, spec_file: Optional[str] = None) -> Tuple[int, str, str]:
        """执行 Playwright 测试（串行单进程，避免多站点并发冲突）
        
        Args:
            test_dir: 指定测试目录，为空则运行 testDir 下所有测试
            spec_file: 指定单个 spec 文件路径，只运行该文件中的用例（比 -g 更可靠）

        Allure 结果目录策略（通过 ALLURE_RESULTS 环境变量注入子进程）：
        - 全量跑 → workspace/allure-results（执行前清空两个结果目录，避免旧数据污染）
        - 自愈重跑（指定 spec_file）→ workspace/allure-heal-results（不清空，
          保留同一轮监控内其他站点的重跑结果，生成报告时以最新一次为准）
        """
        npx = self.npx_path or "npx"
        cmd = [npx, "playwright", "test", "--workers=1"]
        if spec_file:
            cmd.append(spec_file)
        elif test_dir:
            cmd.append(test_dir)

        # Allure 结果目录注入：全量跑与自愈重跑分开存放
        # 历史故障根因（已修复）：playwright.config.ts 曾使用 allure-playwright v2 的
        # 选项名 outputFolder，v3 中已更名为 resultsDir，旧名被静默忽略，
        # 导致结果全部落入默认目录 ./allure-results（项目根目录），
        # workspace 下目录为空 → Allure 报告无内容。环境变量传递本身无问题。
        env = os.environ.copy()
        full_results_dir = self.project_root / "workspace" / "allure-results"
        heal_results_dir = self.project_root / "workspace" / "allure-heal-results"
        if spec_file:
            env["ALLURE_RESULTS"] = "workspace/allure-heal-results"
        else:
            env["ALLURE_RESULTS"] = "workspace/allure-results"
            # 全量跑前清空两个结果目录（无论是否有残留文件都会执行），
            # 确保本轮报告不含上一轮监控的旧数据
            for d in (full_results_dir, heal_results_dir):
                if d.exists():
                    shutil.rmtree(str(d), ignore_errors=True)
            # 清理历史遗留的根目录 allure-results/（早期 outputFolder 选项名 bug 误写的产物），
            # 防止与正确目录混淆；无论是否存在都安全执行，失败不阻断
            legacy_dir = self.project_root / "allure-results"
            if legacy_dir.exists():
                shutil.rmtree(str(legacy_dir), ignore_errors=True)
                logger.warning("[Allure] 已清理根目录遗留的 allure-results/（历史选项名 bug 产物）")

        logger.info(f"执行命令: {' '.join(cmd)}")
        logger.info(f"工作目录: {self.project_root}")
        logger.info(f"Allure 结果目录: {env['ALLURE_RESULTS']}")

        try:
            # 实时流式输出，让执行过程日志可见
            process = subprocess.Popen(
                cmd,
                cwd=str(self.project_root),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='replace',
                shell=True if sys.platform == 'win32' else False,
            )

            stdout_lines = []
            stderr_lines = []

            # 实时打印 stdout
            for line in process.stdout:
                logger.info(f"[playwright] {line.rstrip()}")
                stdout_lines.append(line)

            # 实时打印 stderr
            for line in process.stderr:
                logger.warning(f"[playwright] {line.rstrip()}")
                stderr_lines.append(line)

            process.wait(timeout=420)
            stdout_text = ''.join(stdout_lines)
            stderr_text = ''.join(stderr_lines)
            logger.info(f"命令执行完成，返回码: {process.returncode}")
            return process.returncode, stdout_text, stderr_text

        except subprocess.TimeoutExpired as e:
            logger.error(f"命令执行超时: {e}")
            # 强制清理残留进程，无论成功与否都会执行
            try:
                if sys.platform == 'win32':
                    subprocess.run(['taskkill', '/F', '/IM', 'chrome.exe'], capture_output=True, timeout=5)
                    subprocess.run(['taskkill', '/F', '/IM', 'chromium.exe'], capture_output=True, timeout=5)
                else:
                    subprocess.run(['pkill', '-f', 'chromium'], capture_output=True, timeout=5)
            except Exception:
                pass
            return -1, "", "TimeoutExpired"
        except FileNotFoundError as e:
            logger.error(f"未找到 npx 命令: {e}")
            return -1, "", str(e)

    def generate_specs(self, url: str, output_filename: str = "") -> Tuple[int, str, str]:
        """
        调用 TypeScript 脚本自动生成测试用例

        Args:
            url: 目标页面 URL
            output_filename: 可选输出文件名（仅文件名，如 us_carvera.spec.ts），
                           为空则使用默认文件名 generated_homepage.spec.ts

        Returns:
            (return_code, stdout, stderr)
        """
        script_path = self.project_root / "src" / "web" / "scripts_B" / "generate_specs.ts"
        npx = self.npx_path or "npx"
        cmd = [npx, "ts-node", str(script_path), url]
        if output_filename:
            cmd.append(output_filename)

        logger.info(f"生成测试脚本命令: {' '.join(cmd)}")
        try:
            result = subprocess.run(
                cmd,
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                timeout=240,
            )
            logger.info(f"生成脚本完成，返回码: {result.returncode}")
            if result.stdout:
                logger.info(f"STDOUT:\n{result.stdout}")
            if result.stderr:
                logger.warning(f"STDERR:\n{result.stderr}")
            return result.returncode, result.stdout, result.stderr

        except subprocess.TimeoutExpired as e:
            logger.error(f"生成脚本超时: {e}")
            return -1, "", "TimeoutExpired"
        except FileNotFoundError as e:
            logger.error(f"未找到 npx 或 ts-node: {e}")
            return -1, "", str(e)

    def get_junit_path(self) -> Path:
        """获取 JUnit XML 报告路径"""
        return self.project_root / "workspace" / "test-results" / "junit.xml"

    def generate_allure_report(self) -> Tuple[int, str, str]:
        """
        生成 Allure 静态报告：合并全量跑与自愈重跑两个结果目录

        同一用例在两个目录中都有结果时（自愈后重跑），Allure 以最新一次为准，
        旧结果显示为 retry 记录，报告反映的是最终真实状态。
        失败仅告警不阻断主流程（报告生成失败不影响飞书推送）。

        Returns:
            (return_code, stdout, stderr)；无结果数据时返回 (-1, "", "无 Allure 结果数据")
        """
        report_dir = self.project_root / "workspace" / "allure-report"
        results_dirs = [
            d for d in (
                self.project_root / "workspace" / "allure-results",
                self.project_root / "workspace" / "allure-heal-results",
            )
            if d.exists() and any(d.iterdir())
        ]
        if not results_dirs:
            logger.warning("[Allure] 无结果数据目录，跳过报告生成")
            return -1, "", "无 Allure 结果数据"

        npx = self.npx_path or "npx"
        cmd = [npx, "allure", "generate"] + [str(d) for d in results_dirs] + [
            "-o", str(report_dir), "--clean"
        ]
        logger.info(f"生成 Allure 报告命令: {' '.join(cmd)}")
        try:
            result = subprocess.run(
                cmd,
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                timeout=120,
            )
            logger.info(f"Allure 报告生成完成，返回码: {result.returncode}")
            if result.returncode == 0:
                logger.info(f"[Allure] 报告已生成 → {report_dir}")
            else:
                logger.warning(f"[Allure] 报告生成失败（不阻断主流程）: {result.stderr[:300]}")
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired as e:
            logger.warning(f"[Allure] 报告生成超时（不阻断主流程）: {e}")
            return -1, "", "TimeoutExpired"
        except Exception as e:
            logger.warning(f"[Allure] 报告生成异常（不阻断主流程）: {e}")
            return -1, "", str(e)