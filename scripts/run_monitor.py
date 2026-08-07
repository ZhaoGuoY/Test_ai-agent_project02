#!/usr/bin/env python3
# scripts/run_monitor.py
"""
Web Monitor 主入口（增量3：Agent 驱动版）

变更说明：
- 增量2：硬编码流程（generate → test → notify）
- 增量3：由 MonitorAgent 自主决策执行流程

执行方式：python scripts/run_monitor.py
"""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.core.config_loader import load_config
from src.core.logger import get_logger
from src.app.agents.base_agent import create_agent

logger = get_logger(__name__)


def main():
    logger.info("=" * 55)
    logger.info("Web Monitor 增量3 - Agent 自主编排")
    logger.info("=" * 55)

    # 1. 加载配置
    try:
        config = load_config()
        sites = config["target"]["sites"]
        site_names = ", ".join(s["name"] for s in sites)
        logger.info(f"目标站点: {site_names}")
    except Exception as e:
        logger.error(f"加载配置失败: {e}")
        sys.exit(1)

    # 2. 创建 MonitorAgent（工厂函数）
    #    内部会：
    #    - 初始化 LLM 模型（DeepSeek 等 OpenAI 兼容）
    #    - 装配工具：generate_test_specs, run_playwright_tests, read_junit_report, push_feishu_report
    #    - 设置 system_prompt 引导决策流程
    logger.info("创建 MonitorAgent...")
    try:
        agent = create_agent("monitor", config)
    except Exception as e:
        logger.error(f"Agent 创建失败: {e}")
        logger.error("请检查 config/settings.yaml 中的 llm 配置，并确保 langchain-openai 已安装")
        sys.exit(1)

    # 3. 启动 Agent，给定初始任务
    #    Agent 会根据 system_prompt 自主执行完整流程
    task = (
        f"请对以下站点执行完整的监控流程：\n"
        f"站点列表：{', '.join(s['name'] + '(' + s['url'] + ')' for s in sites)}\n"
        f"执行步骤（必须严格按顺序执行，不可跳过任何步骤）：\n"
        f"1. 调用 generate_test_specs() 检查并生成缺失的测试脚本\n"
        f"2. 调用 run_playwright_tests() 执行所有站点的测试\n"
        f"3. 调用 read_junit_report() 解析测试结果\n"
        f"4. 【关键步骤】如果 read_junit_report 返回的 failed_cases 不为空，"
        f"必须立即调用 trigger_healing(failures_json) 触发自愈流程，"
        f"将完整的 JSON 数据传入，不可跳过此步骤！\n"
        f"5. 调用 push_feishu_report() 推送飞书报告（需包含各站点结果和自愈结果）"
    )

    logger.info("Agent 开始执行任务...")
    try:
        # invoke 是同步阻塞调用，Agent 会自主进行多轮工具调用
        result = agent.invoke(
            {"messages": [{"role": "user", "content": task}]},
            config={"configurable": {"thread_id": "monitor_run_001"}}
        )

        # 提取 Agent 的最终回复
        final_message = result["messages"][-1]
        if hasattr(final_message, "content"):
            logger.info(f"Agent 执行完成:\n{final_message.content}")
        else:
            logger.info(f"Agent 执行完成: {final_message}")

        logger.info("=" * 55)
        logger.info("Web Monitor 增量3 执行成功")
        logger.info("=" * 55)
        sys.exit(0)

    except KeyboardInterrupt:
        logger.warning("用户中断 Agent 执行")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Agent 执行异常: {e}", exc_info=True)
        logger.error("Agent 执行异常，请检查 LLM 配置和网络连接")
        sys.exit(1)


if __name__ == "__main__":
    main()