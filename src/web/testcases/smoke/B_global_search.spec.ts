// Global 站点 — 搜索功能冒烟测试
// 流程：进入搜索页 → 等待15s → 检查URL并切回 → 等待3s → 再进搜索页 → 等待10s → 二次校验URL并兜底切换 → 关闭弹窗 → 断言前2个商品标题含关键词
import { test, expect } from '@playwright/test';
import { parameter } from 'allure-js-commons';

import { dismissAllPopups, switchToTargetStore } from '../utils/util_A';

const TARGET_URL = 'https://global.makera.com/search?options%5Bprefix%5D=last&q=4th+Axis+Module';
const SEARCH_KEYWORD = '4th Axis Module';
const REGION = '全球 / en-Global / International';

test.describe('Global 站点', () => {

  test('global搜索功能测试', async ({ page }) => {
    parameter('TARGET_URL', TARGET_URL);
    parameter('SEARCH_KEYWORD', SEARCH_KEYWORD);
    parameter('地区/语言', REGION);
    test.info().annotations.push(
      { type: '预期结果', description: '搜索 4th Axis Module 后进入结果页，前2个商品标题均包含关键词' },
    );

    const targetHost = new URL(TARGET_URL).hostname;

    // 阶段1：进入目标测试链接并等待 15s
    await test.step('进入搜索列表页并等待 15s', async () => {
      try {
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      } catch (err) {
        console.log(`[Global] ️ 阶段1导航失败，等待5s后重试: ${err}`);
        await page.waitForTimeout(5000);
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      }
      await page.waitForTimeout(15000);
    });

    // 阶段2：检查当前网址是否等于目标，不等于则通过商店切换器切回
    await test.step('检查URL并切回目标网址', async () => {
      const currentHost = new URL(page.url()).hostname;
      if (currentHost !== targetHost) {
        console.log(`[Global] 当前 host "${currentHost}" 不匹配目标 "${targetHost}"，执行商店切换...`);
        const switched = await switchToTargetStore(page, TARGET_URL);
        if (!switched) console.warn(`[Global] ⚠️ 商店切换未成功，后续步骤可能受影响`);
      } else {
        console.log(`[Global] 当前 host 已匹配目标，无需切换`);
      }
    });

    // 阶段3：等待3s后重新进入目标测试网址，再等待10s
    await test.step('等待3s后重新进入搜索页并等待10s', async () => {
      await page.waitForTimeout(3000);
      try {
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      } catch (err) {
        console.log(`[Global] ⚠️ 阶段3导航失败，等待5s后重试: ${err}`);
        await page.waitForTimeout(5000);
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      }
      await page.waitForTimeout(10000);
    });

    // 阶段4：二次校验URL，不匹配则切换商店后等待5s再重新导航
    await test.step('二次校验URL并兜底切换', async () => {
      const currentHost = new URL(page.url()).hostname;
      if (currentHost === targetHost) {
        console.log(`[Global] 二次校验通过，当前 host 已匹配目标`);
      } else {
        console.log(`[Global] 二次校验失败: host "${currentHost}" 不匹配 "${targetHost}"，执行商店切换...`);
        const switched = await switchToTargetStore(page, TARGET_URL);
        if (!switched) console.warn(`[Global] ⚠️ 兜底商店切换未成功`);
        await page.waitForTimeout(5000);
        try {
          await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
        } catch (err) {
          console.log(`[Global] ⚠️ 阶段4兜底导航失败，等待5s后重试: ${err}`);
          await page.waitForTimeout(5000);
          await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
        }
        console.log(`[Global] 兜底切换完成，当前 URL: ${page.url()}`);
      }
    });

    // 阶段5：关闭弹窗
    await test.step('关闭弹窗', async () => {
      await dismissAllPopups(page);
    });

    // 阶段6：断言搜索结果前2个商品标题包含搜索关键词
    await test.step('断言搜索结果前2个商品标题包含关键词', async () => {
      // 验证当前在搜索页，不在则重新导航
      if (!page.url().includes('/search')) {
        console.log(`[Global] ⚠️ 当前不在搜索页: ${page.url()}，重新导航...`);
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForTimeout(10000);
        await dismissAllPopups(page);
      }

      // 多选择器尝试：覆盖不同可能的商品标题容器
      // Global 站点实际 DOM：商品标题是 <a class="product-card__title"> 而非 h3，
      // 每个 .product-card 内有 2 个 a（图片链接+标题链接），
      // 优先用精确选择器匹配标题链接，排除图片链接
      const productSelectors = [
        '.product-card a.product-card__title',
        '.product-card a:not([class*="media"]):not([class*="button"])',
        '.product-card a[href*="/products/"]',
        '.card a[href*="/products/"]',
        '[class*="product-card"] a',
        // 以下为兼容其他站点可能的 h3 结构
        'article h3.card__heading',
        'article .card__information h3',
        '.product-card h3',
        '[data-product-id] h3',
        '.grid__item h3',
        '.product-item h3',
        '[class*="product"] h3, [class*="Product"] h3',
      ];

      let productTitles: ReturnType<typeof page.locator> | null = null;
      for (const selector of productSelectors) {
        const count = await page.locator(selector).count().catch(() => 0);
        if (count > 0) {
          productTitles = page.locator(selector);
          console.log(`[Global] 找到 ${count} 个商品（选择器: ${selector}）`);
          break;
        }
      }
      if (!productTitles) {
        productTitles = page.locator('.product-card a, .card a, article h3, .card__heading, [class*="product"] a, [class*="product"] h3');
        const count = await productTitles.count().catch(() => 0);
        console.log(`[Global] 兜底选择器找到 ${count} 个商品`);
        if (count === 0) throw new Error('[Global] 所有选择器均未找到商品，页面可能未正确加载搜索结果');
      } else {
        const count = await productTitles.count();
        if (count === 0) throw new Error(`[Global] 选择器匹配到 0 个商品，页面可能未正确加载搜索结果`);
      }

      // 滚动到可见：屏幕小看不到时向下滑动
      async function scrollToVisible(locator: ReturnType<typeof page.locator>): Promise<void> {
        if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) return;
        for (let i = 0; i < 10; i++) {
          await page.evaluate(() => window.scrollBy(0, 400));
          await page.waitForTimeout(600);
          if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) return;
        }
      }

      // 断言第1个商品标题包含关键词
      const firstProduct = productTitles.first();
      await scrollToVisible(firstProduct);
      const firstText = await firstProduct.textContent();
      console.log(`[Global]  第1个商品: ${firstText?.trim()}`);
      expect(firstText?.trim()).toContain(SEARCH_KEYWORD);

      // 断言第2个商品标题包含关键词
      const secondProduct = productTitles.nth(1);
      await scrollToVisible(secondProduct);
      const secondText = await secondProduct.textContent();
      console.log(`[Global] 📦 第2个商品: ${secondText?.trim()}`);
      expect(secondText?.trim()).toContain(SEARCH_KEYWORD);

      console.log(`[Global] ✅ 前2个商品标题均包含关键词 "${SEARCH_KEYWORD}"`);
    });
  });

});
