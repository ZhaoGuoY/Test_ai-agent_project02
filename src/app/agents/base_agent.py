# src/app/agents/base_agent.py
"""
Agent 基类与工厂函数（增量3核心）

设计模式：工厂函数 + 基类 + 配置驱动
- BaseAgent: 抽象基类，定义所有 Agent 的统一接口和公共能力
- create_agent: 工厂函数，根据配置创建具体的 Agent 实例
- 高内聚低耦合：模型配置、工具集、技能目录均从 config/settings.yaml 驱动

上游：scripts/run_monitor.py 调用工厂函数创建 Agent
下游：monitor_agent.py / heal_agent.py（增量4）继承 BaseAgent
"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional

from deepagents import create_deep_agent
from deepagents.backends.filesystem import FilesystemBackend
from langchain_openai import ChatOpenAI

from src.core.config_loader import load_config
from src.core.logger import get_logger

logger = get_logger(__name__)

# 项目根目录（base_agent.py 位于 src/app/agents/，需上溯 4 级）
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class BaseAgent(ABC):
    """
    Agent 抽象基类

    所有具体 Agent（MonitorAgent、HealAgent 等）都应继承此类，
    实现 build_tools() 和 build_system_prompt() 两个抽象方法，
    由工厂函数统一调用 create_deep_agent 完成装配。
    """

    # 子类必须定义的属性
    agent_name: str = "base"
    agent_description: str = "Base agent"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初始化 Agent

        Args:
            config: 配置字典，默认从 config/settings.yaml 加载
        """
        self.config = config or load_config()
        self.project_root = PROJECT_ROOT
        self.target_url = self.config["target"]["url"]

        # 初始化模型（从配置读取，支持 DeepSeek 等 OpenAI 兼容模型）
        self.model = self._init_model()

        # 初始化文件系统后端（供 DeepAgents 的 skills 机制使用）
        # virtual_mode=True 避免直接操作系统文件系统
        self.backend = FilesystemBackend(
            root_dir=str(self.project_root),
            virtual_mode=True
        )

        # 技能目录：所有 Agent 共享项目级的 skills/ 目录
        self.skills_dir = (self.project_root / "src" / "web" / "skills" / "explore_home").as_posix()

        logger.info(f"[{self.agent_name}] Agent 初始化完成，模型: {self.config['llm']['model']}")

    def _init_model(self) -> ChatOpenAI:
        """
        从配置初始化 LLM 模型

        支持任意 OpenAI 兼容端点（DeepSeek、OpenAI、Azure 等）
        配置示例（config/settings.yaml）：
            llm:
              api_key: "sk-..."
              model: "deepseek-chat"
              base_url: "https://api.deepseek.com/v1"

        Returns:
            配置好的 ChatOpenAI 实例
        """
        llm_cfg = self.config["llm"]
        api_key = llm_cfg.get("api_key", "")
        # 兼容环境变量 ${DEEPSEEK_API_KEY} 已被 config_loader 解析
        if not api_key:
            import os
            api_key = os.getenv("DEEPSEEK_API_KEY", "")

        model = ChatOpenAI(
            model=llm_cfg.get("model", "deepseek-chat"),
            api_key=api_key,
            base_url=llm_cfg.get("base_url", "https://api.deepseek.com/v1"),
            temperature=0.1,  # 低温度，保证 Agent 决策稳定性
            timeout=120,  # 单次 LLM 调用超时
            max_retries=2,
        )
        return model

    @abstractmethod
    def build_tools(self) -> List[Any]:
        """
        构建 Agent 可调用的工具列表

        子类必须实现此方法，返回 LangChain 工具或 callable 列表。
        工具函数需满足 DeepAgents 规范：
        - 有清晰的 docstring（Agent 靠它理解工具用途）
        - 参数有类型注解
        - 返回字符串（Agent 易于解析）
        """
        raise NotImplementedError

    @abstractmethod
    def build_system_prompt(self) -> str:
        """
        构建 Agent 的 system prompt

        子类必须实现，定义 Agent 的角色、行为和决策流程。
        """
        raise NotImplementedError

    def build_skills(self) -> List[str]:
        """
        返回该 Agent 需要加载的技能目录

        默认加载项目级 skills/ 目录下的所有技能。
        子类可重写以筛选特定技能。
        """
        return [self.skills_dir]

    def create(self):
        """
        调用 DeepAgents 的 create_deep_agent 完成 Agent 装配

        Returns:
            编译后的 LangGraph StateGraph Agent 实例

        关键参数说明：
        - model: 预初始化的 ChatOpenAI 实例
        - tools: 业务工具（generate_specs, run_tests, notify 等）
        - system_prompt: 引导 Agent 按技能决策的指令
        - skills: 技能目录路径（SKILL.md 会被渐进式加载）
        - backend: 文件系统后端，供 skill 文件读写
        - middleware: 可扩展的中间件钩子（增量4将用到）
        """
        tools = self.build_tools()
        system_prompt = self.build_system_prompt()
        skills = self.build_skills()

        logger.info(f"[{self.agent_name}] 装配 Agent: tools={len(tools)}, skills={skills}")

        agent = create_deep_agent(
            model=self.model,
            tools=tools,
            system_prompt=system_prompt,
            skills=skills,
            backend=self.backend,
        )

        return agent


def create_agent(agent_type: str = "monitor", config: Optional[Dict[str, Any]] = None):
    """
    工厂函数：根据 agent_type 创建对应的 Agent 实例

    Args:
        agent_type: Agent 类型，"monitor" 或 "heal"
        config: 配置字典

    Returns:
        编译后的 Agent 实例
    """
    if agent_type == "monitor":
        from src.app.agents.monitor_agent import MonitorAgent
        return MonitorAgent(config).create()
    elif agent_type == "heal":
        from src.app.agents.heal_agent import HealAgent
        return HealAgent(config).create()
    else:
        raise ValueError(f"未知的 Agent 类型: {agent_type}，可选: monitor, heal")