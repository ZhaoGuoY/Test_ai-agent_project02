---
name: explore_home
description: 探索 Makera 首页并生成 Playwright 测试脚本的策略和最佳实践
---

# Explore Home 技能

当需要对 Makera 站点进行自动化测试探索时，遵循以下策略。

## 何时使用此技能
- 目标：为 Makera 首页生成稳定、可维护的 Playwright 测试脚本
- 触发：MonitorAgent 开始执行 Web 监控任务时

## 测试目标站点与用例（固定，共 3 条）

| 站点 | 商品详情页 URL | 验证目标 |
|------|---------------|----------|
| US   | https://www.makera.com/products/carvera | Add to cart 按钮 |
| EU   | https://eu.makera.com/products/carvera-air | Add to cart 按钮 |
| Global | https://global.makera.com/products/makera-z1-desktop-cnc | Add to cart 按钮 |

**禁止生成超过 3 条用例。**

## 前置处理（每次导航后必须执行）

### 1. 幸运转盘弹窗 — 点击 X 关闭
页面加载后左侧弹出"幸运转盘"抽屉，**直接点击 X 按钮关闭**：
```typescript
// 优先点击 X / Close 按钮
for (const sel of ['button:has-text("×")', '[aria-label="Close"]', 'text="No thanks"']) {
  const btn = page.locator(sel).first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click({ force: true });
    break;
  }
}
```

### 2. IP 跳转 — 右上角切换站点
页面加载后检测右上角区域按钮，若不在目标站点则点击切换：
```typescript
const regionBtn = page.locator('header').getByText(/^(US|EU|Global)/i).first();
// 若当前站点不匹配，点击后选择目标站点
```

### 3. 超时保护
```typescript
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await expect(element).toBeVisible({ timeout: 30000 });
```

## 探索策略

### 页面关键区域
- **轮播图**：`getByRole('button', { name: /pause slideshow/i })`
- **商品模块**：`main a[href*="/products/"]` 动态提取商品链接

### 商品详情页
- **URL 已固定**（见上表），直接导航到指定商品页
- 导航后验证 `page.url()` 包含 `/products/`
- 验证目标：`getByRole('button', { name: /add to cart/i })` 可见

### 测试脚本生成原则
- 优先语义定位器：`getByRole`、`getByText`、`getByLabel`
- 每个用例独立，不依赖执行顺序
- 所有 `page.goto()` 带 `{ waitUntil: 'domcontentloaded', timeout: 60000 }`
- 每个测试开头：关闭弹窗 + 切换站点 + 等待加载
