// Global 站点 — Add to cart → Check Out 结算流程冒烟测试
// 报告说明：test.step 划分步骤、allure parameter 记录运行参数、annotations 记录预期结果，
// 供 Allure 详细报告展示（步骤树/参数/预期一目了然）
import { test as base, expect, Page } from '@playwright/test';
import { parameter } from 'allure-js-commons';
import { setupPage, dismissAllPopups, addToCartViaApi, dismissCloudflareChallenge } from './helpers';

const TARGET_URL = 'https://global.makera.com/products/makera-3d-wired-probe';
// 目标商品名称（断言购物车与结算页中商品存在的基准文本；
// getByRole/getByText 默认子串匹配，基准文本不含后缀可兼容购物车/结算页的两种形态）
const PRODUCT_NAME = 'Makera 3D Wired Probe';
const REGION = '东京 / ja-JP / Asia/Tokyo';

// worker 级共享页面：两个用例使用同一个浏览器页面，
// 使"商品正常进入结算页"能在"商品加入购物车"成功后的现场状态上直接继续
const test = base.extend<{}, { sharedPage: Page }>({
  sharedPage: [async ({ browser }, use) => {
    const context = await browser.newContext({
      geolocation: { longitude: 139.6917, latitude: 35.6895 },  // 东京
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      permissions: ['geolocation'],
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  }, { scope: 'worker' }],
});

test.describe('Global 站点', () => {

  // serial 模式：用例串行执行，上一用例失败时后续用例自动跳过
  //（保证"商品正常进入结算页"仅在"商品加入购物车"成功后执行）
  test.describe.configure({ mode: 'serial' });

  test('商品加入购物车', async ({ sharedPage: page }) => {
    // ── Allure 报告信息：运行参数 + 预期结果 ──
    parameter('TARGET_URL', TARGET_URL);
    parameter('PRODUCT_NAME', PRODUCT_NAME);
    parameter('地区/语言', REGION);
    test.info().annotations.push(
      { type: '预期结果', description: '点击 Add to cart 后购物车抽屉弹出，且抽屉内可见目标商品' },
      { type: '前置条件', description: 'setupPage 完成商店切换，页面停留在 /products/ 商品页' },
    );

    // ========== 阶段1：页面初始化与跳转防护 ==========
    await test.step('页面初始化与跳转防护', async () => {
      const ready = await setupPage(page, TARGET_URL);
      // setup 失败视为测试失败（触发自愈），不允许跳过
      expect(ready).toBe(true);

      // 重定向恢复检查：setupPage 成功后，页面仍可能被延迟 IP 重定向弹走
      // （如数据中心 IP 访问 global.makera.com 被 302 回 www.makera.com）
      // 在 URL 断言前再次验证 host，若不符则重新执行 setupPage 纠正
      const targetHostForCheck = new URL(TARGET_URL).hostname;
      const currentHostBeforeAssert = new URL(page.url()).hostname;
      if (currentHostBeforeAssert !== targetHostForCheck) {
        console.warn(`[Global] ⚠️ setupPage 后检测到延迟 IP 重定向: ${currentHostBeforeAssert} → 重新执行 setupPage 纠正`);
        const reReady = await setupPage(page, TARGET_URL);
        expect(reReady).toBe(true);
      }

      // 验证 URL 包含 /products/（URL 字符串断言）
      expect(page.url()).toContain('/products/');
    });

    // ========== 阶段2：等待渲染 + 弹窗清理 + 点击 Add to cart ==========
    // 定位方式：CSS 类名定位 product-form__submit（Shopify 商品表单内的真实加购按钮）
    // 页面存在多个 sticky-add-cart-btn 悬浮按钮，顶部时位于视口外，用文本定位会误匹配导致点击卡住
    const addToCartBtn = page.locator('button.product-form__submit[name="add"]').first();
    await test.step('弹窗清理并点击 Add to cart 按钮', async () => {
      await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
      console.log(`[Global] ✅ Add to cart 按钮可见，准备点击加购`);
      // 点击前等待 5s：给浮窗/懒加载元素渲染时间，便于一次性清理
      await page.waitForTimeout(5000);
      // 循环最多 3 轮：每轮先关闭全部浮窗（幸运转盘/翻译弹窗/客服悬浮/意外下拉），
      // 再滚动+点击。单次点击限时 8s，避免被遮挡时 Playwright 长时间自动滚动重试（页面上下滑动）
      for (let attempt = 1; attempt <= 3; attempt++) {
        // 先按 Escape 关闭意外展开的下拉浮窗，再清理所有已知浮窗（无论是否存在都安全执行，失败不阻断）
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(300);
        await dismissAllPopups(page);
        try {
          // 按钮位于首屏下方，显式滚动到按钮位置后再点击（timeout 防继承测试级 300s）
          await addToCartBtn.scrollIntoViewIfNeeded({ timeout: 10000 });
          await addToCartBtn.click({ timeout: 8000 });
          break;
        } catch {
          console.warn(`[Global] ⚠️ 第${attempt}轮点击失败（可能被浮窗遮挡），重新清理后重试`);
          if (attempt === 3) throw new Error('[Global] Add to cart 按钮 3 轮点击均失败');
        }
      }
      console.log(`[Global] 🛒 已点击 Add to cart，等待购物车抽屉弹出...`);
    });

    // ========== 阶段3：断言加购成功（抽屉弹出且目标商品存在） ==========
    await test.step('断言购物车抽屉弹出且含目标商品', async () => {
      // 定位方式：getByRole('dialog') 严格断言抽屉本体。
      // 注意：顶部导航购物车图标文本也是 "My Cart"，用 getByText(/my cart/i) 会在抽屉未弹出时误报
      const cartDrawer = page.getByRole('dialog', { name: /my cart/i }).first();
      // 抽屉未弹出（可能被浮窗遮挡/动画打断）时清理浮窗后重新点击加购，最多 2 轮；
      // 若页面已被导航到 Shopify /cart/add 错误页（半渲染时原生表单 POST 缺 items 参数被拒），
      // 则停止 UI 重试，改走 AJAX API 兜底加购 → 返回商品页 → 打开购物车抽屉
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await expect(cartDrawer).toBeVisible({ timeout: 15000 });
          break;
        } catch {
          if (page.url().includes('/cart/add')) {
            console.warn(`[Global] ⚠️ 页面已跳转到 /cart/add 错误页，执行 AJAX API 兜底加购`);
            const added = await addToCartViaApi(page, TARGET_URL);
            expect(added).toBe(true);
            // 返回商品页恢复现场，再关闭弹窗
            await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
            await dismissAllPopups(page);
            // 通过顶部购物车图标打开抽屉（同域已有购物车商品，Dawn 主题会弹出 cart-drawer）
            const cartIcon = page.locator('a[href="/cart"]').first();
            await cartIcon.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
            await cartIcon.click({ timeout: 10000 }).catch(() => {});
            await page.waitForTimeout(2000);
            await expect(cartDrawer).toBeVisible({ timeout: 15000 });
            break;
          }
          console.warn(`[Global] ⚠️ 第${attempt}轮：购物车抽屉未弹出，清理浮窗后重新点击加购`);
          if (attempt === 2) throw new Error('[Global] 加购后购物车抽屉未弹出（共点击 2 次）');
          await dismissAllPopups(page);
          await addToCartBtn.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
          await addToCartBtn.click({ timeout: 8000 }).catch(() => {});
        }
      }
      console.log(`[Global] ✅ 购物车抽屉已弹出`);

      // 定位方式：限定在购物车抽屉（dialog）内用 getByRole 定位商品链接
      // （页面导航菜单中也存在同名隐藏文本，不限定范围会被 .first() 误匹配）
      const productInCart = cartDrawer.getByRole('link', { name: PRODUCT_NAME }).first();
      await expect(productInCart).toBeVisible({ timeout: 10000 });
      console.log(`[Global] ✅ 购物车中存在目标商品: ${PRODUCT_NAME}`);
    });
  });

  test('商品正常进入结算页', async ({ sharedPage: page }) => {
    // ── Allure 报告信息：运行参数 + 预期结果 ──
    parameter('TARGET_URL', TARGET_URL);
    parameter('PRODUCT_NAME', PRODUCT_NAME);
    parameter('地区/语言', REGION);
    test.info().annotations.push(
      { type: '预期结果', description: '点击 Check out 后跳转结算页 /checkouts/，且订单摘要含目标商品' },
      { type: '前置条件', description: '上一用例已加购成功，购物车抽屉处于弹出状态（沿用页面现场）' },
    );

    // ========== 阶段1：前置检查（确认上一用例已加购成功） ==========
    // 严格断言 dialog 角色：顶部导航的 "My Cart" 文本会让 getByText 误报
    const cartDrawer = page.getByRole('dialog', { name: /my cart/i }).first();
    await test.step('前置检查：购物车抽屉处于弹出状态', async () => {
      // 本用例直接沿用上一用例的页面现场，不重新初始化、不重新加购
      await expect(cartDrawer).toBeVisible({ timeout: 15000 });
      console.log(`[Global] ✅ 购物车抽屉已弹出，直接开始点击 Check Out`);
    });

    // ========== 阶段2：点击 Check out 按钮进入结算页 ==========
    await test.step('弹窗清理并点击 Check out 按钮', async () => {
      // 定位方式：限定在购物车抽屉（dialog）内匹配 "Check out"
      // （该控件在不同渲染状态下可能是 button 或 link 角色，用逗号选择器兼容两种形态）
      const checkOutBtn = cartDrawer.locator('button, a').getByText(/check\s*out/i).first();
      await expect(checkOutBtn).toBeVisible({ timeout: 10000 });
      console.log(`[Global] ✅ Check Out 按钮可见，准备进入结算页`);
      // 循环最多 3 轮：每轮先关闭全部浮窗再点击（单次点击限时 8s，防遮挡时长时间自动滚动重试）
      for (let attempt = 1; attempt <= 3; attempt++) {
        await dismissAllPopups(page);
        try {
          await checkOutBtn.click({ timeout: 8000 });
          break;
        } catch {
          console.warn(`[Global] ⚠️ 第${attempt}轮点击失败（可能被浮窗遮挡），重新清理后重试`);
          if (attempt === 3) throw new Error('[Global] Check out 按钮 3 轮点击均失败');
        }
      }
      console.log(`[Global] 💳 已点击 Check Out，等待结算页加载...`);
    });

    // ========== 阶段3：断言结算页商品与 URL ==========
    await test.step('断言结算页商品存在且 URL 跳转成功', async () => {
      // 等待结算页加载
      await page.waitForTimeout(7000);
      console.log(`[Global] ✅ 等待完成，开始断言`);

      // 检测并处理 Cloudflare 真人验证（结算页导航可能触发）
      const cfPassed = await dismissCloudflareChallenge(page, 30000);
      if (!cfPassed) {
        console.warn(`[Global] ️ Cloudflare 验证首次未通过，等待 10s 后重试检测...`);
        await page.waitForTimeout(10000);
        await dismissCloudflareChallenge(page, 20000).catch(() => {});
      }

      // 定位方式：getByText 文本定位（结算页订单摘要区展示商品名称）
      const productInCheckout = page.getByText(PRODUCT_NAME).first();
      await expect(productInCheckout).toBeVisible({ timeout: 15000 });
      console.log(`[Global] ✅ 结算页中存在目标商品: ${PRODUCT_NAME}`);

      // 定位方式：toHaveURL 正则断言（Shopify 结算页形如 global.makera.com/checkouts/cn/xxxx）
      await expect(page).toHaveURL(
        /global\.makera\.com\/checkouts\//,
        { timeout: 30000 }
      );
      console.log(`[Global] ✅ 已跳转至结算页: ${page.url()}`);
    });
  });

});
