// EU 站点 — Add to cart 按钮冒烟测试1
import { test, expect } from '@playwright/test';
import { setupPage } from './helpers';

const TARGET_URL = 'https://eu.makera.com/products/carvera-air';

test.describe('EU 站点', () => {

  // 覆盖全局 US geolocation，避免 Shopify 误跳转至 US 站
  test.use({
    geolocation: { longitude: 2.3522, latitude: 48.8566 },  // 巴黎
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });

  test('商品详情页 Add to cart 按钮稳定展示', async ({ page }) => {
    const ready = await setupPage(page, TARGET_URL);
    // setup 失败视为测试失败（触发自愈），不允许跳过
    expect(ready, `[EU] 页面初始化失败，URL: ${page.url()}`).toBe(true);
    // 验证 URL 包含 /products/
    expect(page.url()).toContain('/products/');
    // 验证 Add to cart 按钮可见（.first() 解决多按钮严格模式冲突）
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
    await addToCartBtn.scrollIntoViewIfNeeded({ timeout: 15000 });
    await expect(addToCartBtn).toBeVisible({ timeout: 15000 });
  });

});
