// US 站点 — Add to cart 按钮冒烟测试1
import { test, expect } from '@playwright/test';
import { setupPage } from './helpers';

const TARGET_URL = 'https://www.makera.com/products/carvera';

test.describe('US 站点', () => {

  // 站点专属 geolocation，避免 Shopify IP 跨区域跳转
  test.use({
    geolocation: { longitude: -122.4194, latitude: 37.7749 },  // 旧金山
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
  });

  test('商品详情页 Add to cart 按钮稳定展示', async ({ page }) => {
    const ready = await setupPage(page, TARGET_URL);
    // setup 失败视为测试失败（触发自愈），不允许跳过
    expect(ready, `[US] 页面初始化失败，URL: ${page.url()}`).toBe(true);
    // 验证 URL 包含 /products/
    expect(page.url()).toContain('/products/');
    // 验证 Add to cart 按钮可见（.first() 解决多按钮严格模式冲突）
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
    await expect(addToCartBtn).toBeVisible({ timeout: 15000 });
  });

});
