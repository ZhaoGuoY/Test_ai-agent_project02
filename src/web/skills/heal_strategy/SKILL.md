---
name: heal_strategy
description: 测试失败时的自愈策略
---

# Heal Strategy

测试失败时 HealAgent 按此策略修复。

## 失败类型与处理

| 类型 | 错误关键词 | 处理 |
|------|-----------|------|
| 定位器失效 | `toBeVisible`、`not visible`、`Unable to locate` | 调用 `heal_single_case` 重新探索生成新定位器 |
| 超时 | `Timeout.*exceeded` | 直接重试，不修复定位器 |
| 断言失败 | `Expected.*but` | 记录不修复，交人工 |

## 流程

1. 解析 JUnit 报告提取失败用例
2. 按上表判断类型并处理（定位器失效→修复，超时→重试，断言→跳过）
3. 重新执行全部测试
4. 最多重试 3 次，全部通过则"自愈成功"，否则"自愈失败，需人工介入"