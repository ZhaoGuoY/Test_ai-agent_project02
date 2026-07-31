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
        f"请对以下三个站点执行完整的监控流程：\n"
        f"站点列表：{', '.join(f'{s['name']}({s['url']})' for s in sites)}\n"
        f"1. 读取 explore_home 技能了解探索策略\n"
        f"2. 执行测试脚本（已包含三个站点的用例）\n"
        f"3. 分析结果\n"
        f"4. 推送飞书报告（需包含各站点结果）"
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