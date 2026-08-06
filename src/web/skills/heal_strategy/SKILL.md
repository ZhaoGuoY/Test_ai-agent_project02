---
name: heal_strategy
description: 测试失败时的自愈策略（多站点分离架构）
---

# Heal Strategy

测试失败时 HealAgent 按此策略修复。

## 多站点说明
- 每站点独立 spec 文件（us/eu/global_carvera.spec.ts）
- 失败用例的 classname 字段可定位到具体站点文件
- HealAgent 自动匹配对应站点 URL 进行修复

## 用例数量限制

每站点 1 条用例（US/EU/Global），共 3 条。自愈重新生成时不得超出此限制。

## 修复策略（最高优先级）

任务 prompt 中的「错误分析与修复建议」是从实际错误日志中提取的已知原因和方案。
**必须优先按照这些建议修复，不要盲目猜测或重新探索页面。**

## 失败类型与处理

| 类型 | 错误关键词 | 处理 |
|------|-----------|------|
| 定位器失效 | `toBeVisible`、`not visible`、`Unable to locate` | 调用 `heal_single_case` 重新探索生成新定位器 |
| 元素不可见 | `Element is not visible` | 元素被幸运转盘遮挡 → 先 `dismissSpinPopup(page)` 关闭转盘，再用 `{ force: true }` 点击 |
| 超时 | `Timeout.*exceeded` | 增加等待时间，或使用 `{ force: true }` 点击 |
| 断言失败 | `Expected.*but` | 记录不修复，交人工 |
| IP 跳转 | URL 不包含目标站点 | 等待 10 秒后重新验证 URL，最多等待 2 分钟 |
| 弹窗遮挡 | `not visible`、`intercept clicks` | 点击弹窗 X 按钮关闭后重试 |
| 商店切换失败 | 切换按钮被遮挡 | 使用 `{ force: true }` 点击切换按钮和商店选项 |

## 前置处理（每次导航后执行）

1. **关闭弹窗**：点击幸运转盘抽屉的 X 按钮
2. **等待 IP 跳转**：导航后等待 10 秒，验证 URL 主机名匹配目标站点，不匹配则重新导航，最多等待 2 分钟
3. **等待加载**：`waitUntil: 'domcontentloaded'`，超时 180 秒
4. **导航验证**：商品详情页需验证 `page.url()` 包含 `/products/`

## 流程

1. **阅读任务 prompt 中的「错误分析与修复建议」**，确定修复方向
2. 解析 JUnit 报告提取失败用例
3. 执行前置处理（关闭弹窗 + 等待 IP 跳转稳定 + 等待加载）
4. 按失败类型处理（优先使用错误分析建议，其次查上表）
5. 重新执行该站点的 spec 文件（不跑全部测试）
6. 最多重试 3 次，全部通过则"自愈成功"，否则"自愈失败，需人工介入"
