---
name: heal_strategy
description: 测试失败时的自愈策略
---

# Heal Strategy

测试失败时 HealAgent 按此策略修复。

## 用例数量限制

共 3 条用例（US/EU/Global 各 1 条），自愈重新生成时不得超出此限制。

## 失败类型与处理

| 类型 | 错误关键词 | 处理 |
|------|-----------|------|
| 定位器失效 | `toBeVisible`、`not visible`、`Unable to locate` | 调用 `heal_single_case` 重新探索生成新定位器 |
| 超时 | `Timeout.*exceeded` | 直接重试，不修复定位器 |
| 断言失败 | `Expected.*but` | 记录不修复，交人工 |
| IP 跳转 | URL 不包含目标站点 | 点击页面右上角区域按钮，切换回目标站点后重试 |
| 弹窗遮挡 | `not visible`、`intercept clicks` | 点击弹窗 X 按钮关闭后重试 |
| 导航失败 | URL 不包含 `/products/` | 从首页动态提取商品链接 href 后重试 |

## 前置处理（每次导航后执行）

1. **关闭弹窗**：点击幸运转盘抽屉的 X 按钮
2. **切换站点**：检测页面右上角区域按钮，切换到目标站点
3. **等待加载**：`waitUntil: 'domcontentloaded'`，超时 60 秒
4. **导航验证**：商品详情页需验证 `page.url()` 包含 `/products/`

## 流程

1. 解析 JUnit 报告提取失败用例
2. 执行前置处理（关闭弹窗 + 切换站点 + 等待加载）
3. 按失败类型处理（见上表）
4. 重新执行全部测试
5. 最多重试 3 次，全部通过则"自愈成功"，否则"自愈失败，需人工介入"
