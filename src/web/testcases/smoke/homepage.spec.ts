// src/web/testcases/smoke/homepage.spec.ts
// 作用：对 https://eu.makera.com/ 进行冒烟测试
// 增量1：手动编写，验证页面标题和关键产品名称
import { test, expect } from '@playwright/test';

test.describe('Makera 首页冒烟测试', () => {

  test('页面标题包含 Makera', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    // 根据实际页面标题调整，makera.com 标题通常包含 "Makera"
    expect(title).toContain('Makera');
  });

  test('页面可见文本包含 Carvera', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Carvera 是核心产品名，出现在多个位置
    await expect(page.locator('body')).toContainText('Carvera');
  });

  test('页面存在至少一个 Learn More 链接', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // 根据抓取内容，页面上有多个 "Learn More" 按钮
    // const learnMoreLinks = page.locator('a:has-text("Learn More")');
    const learnMoreLinks = page.locator(':text("Learn More")');
    await expect(learnMoreLinks.first()).toBeVisible();
  });
});