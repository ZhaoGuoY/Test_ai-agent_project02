# src/app/agents/base_agent.py
"""
Agent 基类与工厂函数（增量3核心）

设计模式：工厂函数 + 基类 + 配置驱动
- BaseAgent: 抽象基类，定义所有 Agent 的统一接口和公共能力
- create_agent: 工厂函数，根据配置创建具体的 Agent 实例
- 高内聚低耦合：模型配置、工具集均从 config/settings.yaml 驱动

上游：scripts/run_monitor.py 调用工厂函数创建 Agent
下游：monitor_agent.py / heal_agent.py（增量4）继承 BaseAgent
"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, ToolMessage
from langchain_openai import ChatOpenAI

from src.core.config_loader import load_config
from src.core.logger import get_logger

logger = get_logger(__name__)

# 项目根目录（base_agent.py 位于 src/app/agents/，需上溯 4 级）
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class _SimpleAgent:
    """
    最小 Agent 封装：基于 LangChain bind_tools + 工具调用循环

    替代原 deepagents 的 create_deep_agent，提供相同的 .invoke() 接口。
    内部自动处理工具调用循环：模型决策 → 执行工具 → 返回结果 → 直到无工具调用。
    """

    def __init__(self, model_with_tools: Any, system_prompt: str, tools: Optional[List[Any]] = None):
        self.model_with_tools = model_with_tools
        self.system_prompt = system_prompt
        self._tools = tools or []  # 保存原始工具列表，供 _execute_tool 查找

    def invoke(self, inputs: Dict[str, Any], config: Optional[Dict] = None) -> Dict[str, Any]:
        """
        执行 Agent 任务

        Args:
            inputs: 包含 "messages" 键的字典，值为消息列表
            config: 可选配置（保留接口兼容性）

        Returns:
            包含 "messages" 键的字典，值为完整消息历史
        """
        messages = inputs.get("messages", [])

        # 构建消息列表：system prompt + 历史消息
        chat_messages = [{"role": "system", "content": self.system_prompt}]
        chat_messages.extend(messages)

        max_iterations = 20  # 防止无限循环
        for iteration in range(max_iterations):
            response = self.model_with_tools.invoke(chat_messages)
            chat_messages.append(response)

            # 检查是否有工具调用
            if not hasattr(response, "tool_calls") or not response.tool_calls:
                break

            # 执行所有工具调用
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                tool_id = tool_call["id"]

                logger.info(f"[Agent] 调用工具: {tool_name}({tool_args})")

                # 查找并执行工具
                tool_result = self._execute_tool(tool_name, tool_args)
                chat_messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_id))

        return {"messages": chat_messages}

    def _execute_tool(self, tool_name: str, tool_args: dict) -> str:
        """根据工具名查找并执行对应工具"""
        for t in self._tools:
            name = getattr(t, 'name', None) or getattr(t, '__name__', None)
            if name == tool_name:
                return t.invoke(tool_args) if hasattr(t, 'invoke') else t(**tool_args)
        return f"未找到工具: {tool_name}"


class BaseAgent(ABC):
    """
    Agent 抽象基类

    所有具体 Agent（MonitorAgent、HealAgent 等）都应继承此类，
    实现 build_tools() 和 build_system_prompt() 两个抽象方法，
    由工厂函数统一完成装配。
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
        # 兼容新配置结构：target.sites 列表
        sites = self.config["target"].get("sites", [])
        self.target_sites = sites
        self.target_url = sites[0]["url"] if sites else ""

        # 初始化模型（从配置读取，支持 DeepSeek 等 OpenAI 兼容模型）
        self.model = self._init_model()

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
        工具函数需满足 LangChain 工具规范：
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

    def create(self):
        """
        使用 LangChain bind_tools 完成 Agent 装配

        Returns:
            _SimpleAgent 实例，支持 .invoke() 接口

        关键步骤：
        - 获取子类定义的工具列表
        - 将工具绑定到 LLM 模型
        - 封装为可执行的 Agent 实例
        """
        tools = self.build_tools()
        system_prompt = self.build_system_prompt()

        logger.info(f"[{self.agent_name}] 装配 Agent: tools={len(tools)}")

        # 绑定工具到模型，使用 LangChain 原生 bind_tools
        model_with_tools = self.model.bind_tools(tools)

        return _SimpleAgent(model_with_tools, system_prompt, tools)


def create_agent(agent_type: str = "monitor", config: Optional[Dict[str, Any]] = None):
    """
    工厂函数：根据 agent_type 创建对应的 Agent 实例

    Args:
        agent_type: Agent 类型，"monitor" 或 "heal"
        config: 配置字典

    Returns:
        可执行的 Agent 实例（支持 .invoke() 接口）
    """
    if agent_type == "monitor":
        from src.app.agents.monitor_agent import MonitorAgent
        return MonitorAgent(config).create()
    elif agent_type == "heal":
        from src.app.agents.heal_agent import HealAgent
        return HealAgent(config).create()
    else:
        raise ValueError(f"未知的 Agent 类型: {agent_type}，可选: monitor, heal")
