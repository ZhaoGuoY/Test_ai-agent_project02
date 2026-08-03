---
name: heal_strategy
description: 测试失败时的自愈策略
---

# Heal Strategy

测试失败时 HealAgent 按此策略修复。

## 用例数量限制

共 1 条用例（US 站点），自愈重新生成时不得超出此限制。

## 失败类型与处理

| 类型 | 错误关键词 | 处理 |
|------|-----------|------|
| 定位器失效 | `toBeVisible`、`not visible`、`Unable to locate` | 调用 `heal_single_case` 重新探索生成新定位器 |
| 超时 | `Timeout.*exceeded` | 直接重试，不修复定位器 |
| 断言失败 | `Expected.*but` | 记录不修复，交人工 |
| IP 跳转 | URL 不包含目标站点 | 等待 10 秒后重新验证 URL，最多等待 2 分钟 |
| 弹窗遮挡 | `not visible`、`intercept clicks` | 点击弹窗 X 按钮关闭后重试 |

## 前置处理（每次导航后执行）

1. **关闭弹窗**：点击幸运转盘抽屉的 X 按钮
2. **等待 IP 跳转**：导航后等待 10 秒，验证 URL 主机名匹配目标站点，不匹配则重新导航，最多等待 2 分钟
3. **等待加载**：`waitUntil: 'domcontentloaded'`，超时 180 秒
4. **导航验证**：商品详情页需验证 `page.url()` 包含 `/products/`

## 流程

1. 解析 JUnit 报告提取失败用例
2. 执行前置处理（关闭弹窗 + 等待 IP 跳转稳定 + 等待加载）
3. 按失败类型处理（见上表）
4. 重新执行全部测试
5. 最多重试 3 次，全部通过则“自愈成功”，否则“自愈失败，需人工介入”
