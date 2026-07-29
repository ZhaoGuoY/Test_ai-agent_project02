# src/core/logger.py
"""
日志模块
作用：提供统一的日志记录器，所有模块共用
用法：from src.core.logger import get_logger
      logger = get_logger(__name__)
"""
import logging
import sys
from pathlib import Path


def get_logger(name: str = "web-monitor") -> logging.Logger:
    """
    获取配置好的 logger

    Args:
        name: logger 名称，通常使用 __name__

    Returns:
        配置好的 Logger 实例
    """
    logger = logging.getLogger(name)

    # 避免重复添加 handler
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    # 格式化器
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 控制台 handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 文件 handler（日志写入 workspace/logs/）
    project_root = Path(__file__).resolve().parent.parent.parent
    log_dir = project_root / "workspace" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    file_handler = logging.FileHandler(
        log_dir / "monitor.log",
        encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger