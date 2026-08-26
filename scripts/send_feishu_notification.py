#!/usr/bin/env python3
"""
飞书通知发送脚本（CI 专用）
作用：解析 JUnit XML 并发送飞书卡片通知
调用方式：python scripts/send_feishu_notification.py
"""
import sys
from pathlib import Path

# 添加项目根目录到 sys.path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from src.notifiers.feishu_notifier import FeishuNotifier


def main():
    """主函数：解析 JUnit 报告并发送飞书通知"""
    # 解析 JUnit 报告
    junit_path = project_root / 'workspace/test-results/junit.xml'
    
    if not junit_path.exists():
        print(f"❌ JUnit 报告不存在: {junit_path}")
        sys.exit(1)
    
    notifier = FeishuNotifier()
    stats = notifier.parse_junit(junit_path)
    
    # 打印统计信息（便于调试）
    print(f" 测试统计:")
    print(f"   总用例数: {stats['tests']}")
    print(f"   通过: {stats['pass']}")
    print(f"   失败: {stats['failures'] + stats['errors']}")
    print(f"   跳过: {stats['skipped']}")
    
    # 发送飞书通知
    success = notifier.send_card(stats, title='独立站监控测试报告', heal_info='')
    
    if success:
        print('✅ 飞书通知发送成功')
        sys.exit(0)
    else:
        print('❌ 飞书通知发送失败')
        sys.exit(1)


if __name__ == "__main__":
    main()
