---
name: explore_home
description: 探索 Makera 商品详情页并生成 Playwright 测试脚本的策略和最佳实践（三站点分离架构）
---

# Explore Home 技能

当需要对 Makera 多站点进行自动化测试探索时，遵循以下策略。

## 何时使用此技能
- 目标：为 Makera 各站点商品详情页生成稳定、可维护的 Playwright 测试脚本
- 触发：MonitorAgent 开始执行 Web 监控任务时

## 测试目标（固定，每站点 1 条，共 3 条）

| 站点   | 商品详情页 URL                                           | spec 文件                  |
|--------|---------------------------------------------------------|---------------------------|
| US     | https://www.makera.com/products/carvera                  | us_carvera.spec.ts        |
| EU     | https://eu.makera.com/products/carvera-air              | eu_carvera.spec.ts        |
| Global | https://global.makera.com/products/makera-z1-desktop-cnc| global_carvera.spec.ts    |

**每站点固定 1 条用例：验证 Add to cart 按钮可见。禁止生成超过上限。**

## 架构说明
- 每站点独立 spec 文件，共享 `helpers.ts`（dismissPopup / waitForStableUrl / setupPage）
- 站点间故障隔离，一个站点 IP 跳转失败不影响其他站点
- Playwright 自动发现目录下所有 .spec.ts 串行执行（workers=1）

## 前置处理（每次导航后必须执行）

### 1. 幸运转盘弹窗 — 点击 X 关闭
页面加载后左侧弹出“幸运转盘”抽屉，**直接点击 X 按钮关闭**：
```typescript
for (const sel of ['button:has-text("×")', '[aria-label="Close"]', 'text="No thanks"']) {
  const btn = page.locator(sel).first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click({ force: true });
    break;
  }
}
```

### 2. IP 跳转等待 — 导航后等待 10 秒
Shopify 站点会根据 IP 自动跳转，**导航后必须等待 10 秒**让跳转完成：
```typescript
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(10_000);  // 等待 IP 跳转完成
// 验证当前 URL 主机名是否匹配目标
const targetHost = new URL(url).hostname;
const currentHost = new URL(page.url()).hostname;
if (currentHost !== targetHost) {
  // 不匹配则重新导航并继续等待，最多等待 2 分钟
}
```

### 3. 超时保护
```typescript
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
await expect(element).toBeVisible({ timeout: 30000 });
```

## 探索策略

### 商品详情页
- **URL 已固定**（见上表），直接导航到指定商品页
- 导航后等待 10 秒，确认 URL 主机名匹配目标站点
- 验证目标：`getByRole('button', { name: /add to cart/i })` 可见

### 测试脚本生成原则
- 优先语义定位器：`getByRole`、`getByText`、`getByLabel`
- 每个用例独立，不依赖执行顺序
- 所有 `page.goto()` 带 `{ waitUntil: 'domcontentloaded', timeout: 180000 }`
- 每个测试开头：关闭弹窗 + 等待 IP 跳转稳定（10秒） + 验证 URL
