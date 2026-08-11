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


def merge_junit_files(base_path: str | Path, overlay_path: str | Path, output_path: str | Path) -> int:
    """
    合并两份 JUnit XML：以 base 为基础，用 overlay 中同名用例的结果覆盖旧结果

    背景：自愈过程按站点逐个重跑 spec，每次重跑都会整体覆盖 junit.xml，
    导致先前站点重跑通过的结果丢失（飞书统计因此误报失败）。
    本函数将每次重跑结果增量合并进累积报告，使最终 JUnit 反映全部站点的最新状态。

    匹配规则：classname + name 相同视为同一用例。
    合并后重新计算每个 testsuite 的 tests/failures/errors/skipped 属性。
    任一文件不存在或解析失败时不写入，返回 0（不抛异常，避免阻断主流程）。

    Args:
        base_path: 基础报告（含全部站点的旧结果）
        overlay_path: 新报告（仅含本次重跑站点的结果）
        output_path: 合并结果输出路径（可与 base_path 相同，原地更新）

    Returns:
        被替换的用例数
    """
    base_path = Path(base_path)
    overlay_path = Path(overlay_path)
    output_path = Path(output_path)
    if not base_path.exists() or not overlay_path.exists():
        logger.warning(f"[merge_junit] 跳过合并：文件不存在 (base={base_path.exists()}, overlay={overlay_path.exists()})")
        return 0
    try:
        backup_tree = ET.parse(str(base_path))
        backup_root = backup_tree.getroot()
        healed_root = ET.parse(str(overlay_path)).getroot()
    except ET.ParseError as e:
        logger.warning(f"[merge_junit] 跳过合并：XML 解析失败: {e}")
        return 0

    # 构建 overlay 用例索引：(classname, name) → testcase 元素
    healed_index: Dict[tuple, ET.Element] = {}
    for tc in healed_root.iter("testcase"):
        healed_index[(tc.get("classname", ""), tc.get("name", ""))] = tc
    if not healed_index:
        logger.warning("[merge_junit] 跳过合并：overlay 中无任何 testcase（可能是 spec 编译失败导致的空报告）")
        return 0

    # 遍历 base 的所有 testsuite，替换匹配的用例
    replaced_count = 0
    for ts in backup_root.findall("testsuite") or backup_root.findall(".//testsuite"):
        for tc in ts.findall("testcase"):
            key = (tc.get("classname", ""), tc.get("name", ""))
            if key in healed_index:
                healed_tc = healed_index[key]
                tc.clear()
                tc.attrib = healed_tc.attrib
                for child in healed_tc:
                    tc.append(child)
                replaced_count += 1

    # 重新计算每个 testsuite 的统计属性（testcase 已被替换，但 suite 属性仍是旧值）
    for ts in backup_root.findall("testsuite") or backup_root.findall(".//testsuite"):
        ts_tests = len(ts.findall("testcase"))
        ts_failures = sum(1 for tc in ts.findall("testcase") if tc.find("failure") is not None)
        ts_errors = sum(1 for tc in ts.findall("testcase") if tc.find("error") is not None)
        ts_skipped = sum(1 for tc in ts.findall("testcase") if tc.find("skipped") is not None)
        ts.set("tests", str(ts_tests))
        ts.set("failures", str(ts_failures))
        ts.set("errors", str(ts_errors))
        ts.set("skipped", str(ts_skipped))

    backup_tree.write(str(output_path), encoding="utf-8", xml_declaration=True)
    logger.info(f"[merge_junit] 合并完成：替换 {replaced_count} 个用例结果 → {output_path}")
    return replaced_count