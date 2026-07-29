# src/web/runners/report_parser.py
"""
JUnit XML 报告解析器（增量4）
 
职责：
- 解析 workspace/test-results/junit.xml
- 提取失败用例的详细信息（名称、类名、错误消息）
- 供 HealAgent 使用，确定需要修复的测试

上游：HealAgent 调用 parse_junit_failures()
下游：heal_specs.ts 接收失败测试名进行修复
"""
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any

from src.core.logger import get_logger

logger = get_logger(__name__)


def _parse_testsuites(junit_path: Path) -> List[ET.Element]:
    """
    安全解析 JUnit XML，返回所有 testsuite 元素列表
    文件不存在或 XML 损坏时返回空列表并记录警告
    """
    if not junit_path.exists():
        logger.warning(f"JUnit 报告不存在: {junit_path}")
        return []
    try:
        tree = ET.parse(junit_path)
    except ET.ParseError as e:
        logger.warning(f"JUnit XML 解析失败（文件损坏或格式错误）: {junit_path}, 错误: {e}")
        return []
    root = tree.getroot()
    # 兼容单 testsuite 和多 testsuite（含 testsuites 包裹层）
    suites = root.findall("testsuite") or root.findall(".//testsuite")
    if not suites:
        logger.warning("JUnit XML 中未找到 testsuite 节点")
    return suites


def parse_junit_failures(junit_path: str | Path) -> List[Dict[str, Any]]:
    """
    解析 JUnit XML，返回失败测试用例列表

    Args:
        junit_path: junit.xml 文件路径

    Returns:
        失败用例列表，每项包含：
        - name: 测试用例名称（用于定位 spec 文件中的对应测试）
        - classname: 测试类名（通常是文件名）
        - message: 错误消息（前 500 字符）
        - type: 失败类型（failure / error）

    示例返回：
    [
        {
            "name": "元素可见: Learn More",
            "classname": "src.web.testcases.smoke.generated_homepage.spec",
            "message": "Timed out 5000ms waiting for expect(locator).toBeVisible...",
            "type": "failure"
        }
    ]
    """
    suites = _parse_testsuites(Path(junit_path))
    if not suites:
        return []

    failures = []
    for testsuite in suites:
        for testcase in testsuite.findall("testcase"):
            # 检查 failure 和 error 子元素
            for fail_type in ["failure", "error"]:
                fail_elem = testcase.find(fail_type)
                if fail_elem is not None:
                    failures.append({
                        "name": testcase.get("name", ""),
                        "classname": testcase.get("classname", ""),
                        "message": (fail_elem.get("message", "") or "")[:500],
                        "type": fail_type,
                    })
                    break  # 一个用例只记录一个失败

    logger.info(f"解析到 {len(failures)} 个失败用例")
    return failures


def get_summary(junit_path: str | Path) -> Dict[str, int]:
    """
    获取测试汇总统计（聚合所有 testsuite）

    Args:
        junit_path: junit.xml 文件路径

    Returns:
        包含 tests, failures, errors, skipped, pass 的字典
    """
    suites = _parse_testsuites(Path(junit_path))
    if not suites:
        return {"tests": 0, "failures": 0, "errors": 0, "skipped": 0, "pass": 0}

    tests = failures = errors = skipped = 0
    for ts in suites:
        tests += int(ts.get("tests", 0))
        failures += int(ts.get("failures", 0))
        errors += int(ts.get("errors", 0))
        skipped += int(ts.get("skipped", 0))

    passed = tests - failures - errors - skipped

    return {
        "tests": tests,
        "failures": failures,
        "errors": errors,
        "skipped": skipped,
        "pass": passed,
    }