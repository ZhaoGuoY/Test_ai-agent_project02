# src/core/config_loader.py
"""
配置加载模块
作用：从 config/settings.yaml 读取配置，供其他模块使用
用法：from src.core.config_loader import load_config
"""
import os
import yaml
from pathlib import Path
from typing import Any, Dict

# 尝试加载 .env 文件（如果 python-dotenv 已安装）
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv 未安装，跳过 .env 加载


def load_config(config_path: str = "config/settings.yaml") -> Dict[str, Any]:
    """
    加载 YAML 配置文件

    Args:
        config_path: 配置文件路径，默认为 config/settings.yaml

    Returns:
        配置字典

    Raises:
        FileNotFoundError: 配置文件不存在时抛出
        yaml.YAMLError: YAML 解析失败时抛出
    """
    # 获取项目根目录（src/core/config_loader.py 的上三级目录）
    project_root = Path(__file__).resolve().parent.parent.parent
    config_file = project_root / config_path

    if not config_file.exists():
        raise FileNotFoundError(f"配置文件不存在: {config_file}")

    with open(config_file, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # 处理环境变量占位符 ${VAR_NAME}
    # 例如 feishu.webhook_url 中的 "${FEISHU_WEBHOOK_URL}" 会被替换为真实环境变量值
    _resolve_env_vars(config)
    return config


def _resolve_env_vars(obj: Any) -> None:
    """
    递归替换配置中的环境变量占位符
    形如 ${VAR_NAME} 的值会被环境变量 VAR_NAME 的值替换
    """
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, str) and value.startswith("${") and value.endswith("}"):
                env_var = value[2:-1]
                obj[key] = os.getenv(env_var, "")
            elif isinstance(value, (dict, list)):
                _resolve_env_vars(value)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            if isinstance(item, str) and item.startswith("${") and item.endswith("}"):
                env_var = item[2:-1]
                obj[i] = os.getenv(env_var, "")
            elif isinstance(item, (dict, list)):
                _resolve_env_vars(item)


# 模块级便捷函数，直接获取常用配置
def get_target_url() -> str:
    """获取目标测试 URL"""
    return load_config()["target"]["url"]


def get_feishu_webhook() -> str:
    """获取飞书 webhook 地址"""
    return load_config()["feishu"]["webhook_url"]