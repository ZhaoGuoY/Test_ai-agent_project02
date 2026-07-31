# src/web/runners/playwright_runner.py
"""
Playwright Runner（增量2：增加 generate_specs 方法）
"""
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

    def run_tests(self, test_dir: Optional[str] = None) -> Tuple[int, str, str]:
        """执行 Playwright 测试（串行单进程，避免多站点并发冲突）"""
        npx = self.npx_path or "npx"
        cmd = [npx, "playwright", "test", "--workers=1"]
        if test_dir:
            cmd.append(test_dir)

        logger.info(f"执行命令: {' '.join(cmd)}")
        logger.info(f"工作目录: {self.project_root}")

        try:
            result = subprocess.run(
                cmd,
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                timeout=420,
                shell=True if sys.platform == 'win32' else False
            )
            logger.info(f"命令执行完成，返回码: {result.returncode}")
            if result.stdout:
                logger.info(f"STDOUT:\n{result.stdout}")
            if result.stderr:
                logger.warning(f"STDERR:\n{result.stderr}")
            return result.returncode, result.stdout, result.stderr

        except subprocess.TimeoutExpired as e:
            logger.error(f"命令执行超时: {e}")
            return -1, "", "TimeoutExpired"
        except FileNotFoundError as e:
            logger.error(f"未找到 npx 命令: {e}")
            return -1, "", str(e)

    def generate_specs(self, url: str) -> Tuple[int, str, str]:
        """
        调用 TypeScript 脚本自动生成测试用例

        Args:
            url: 目标页面 URL

        Returns:
            (return_code, stdout, stderr)
        """
        script_path = self.project_root / "src" / "web" / "scripts_B" / "generate_specs.ts"
        npx = self.npx_path or "npx"
        cmd = [npx, "ts-node", str(script_path), url]

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