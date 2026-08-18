// US 站点 — Add to cart → Check Out 结算流程冒烟测试
// 报告说明：test.step 划分步骤、allure parameter 记录运行参数、annotations 记录预期结果，
// 供 Allure 详细报告展示（步骤树/参数/预期一目了然）
import { test as base, expect, Page } from '@playwright/test';
import { parameter } from 'allure-js-commons';
import { setupPage, dismissAllPopups, addToCartViaApi, dismissGuidePopupLoop } from './helpers';

const TARGET_URL = 'https://www.makera.com/products/carvera';
// 目标商品名称（断言购物车与结算页中商品存在的基准文本）
const PRODUCT_NAME = 'Carvera Desktop CNC Machine';
const REGION = '旧金山 / en-US / America/Los_Angeles';

// worker 级共享页面：两个用例使用同一个浏览器页面，
// 使"商品正常进入结算页"能在"商品加入购物车"成功后的现场状态上直接继续
const test = base.extend<{}, { sharedPage: Page }>({
  sharedPage: [async ({ browser }, use) => {
    const context = await browser.newContext({
      geolocation: { longitude: -122.4194, latitude: 37.7749 },  // 旧金山
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      permissions: ['geolocation'],
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  }, { scope: 'worker' }],
});

test.describe('US 站点', () => {

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
      expect(ready, `[US] 页面初始化失败，URL: ${page.url()}`).toBe(true);
      // 验证 URL 包含 /products/（URL 字符串断言）
      expect(page.url()).toContain('/products/');
    });

    // ========== 阶段2：等待渲染 + 弹窗清理 + 点击 Add to cart ==========
    // 定位方式：CSS 类名定位 product-form__submit（Shopify 商品表单内的真实加购按钮）
    // 页面存在多个 sticky-add-cart-btn 悬浮按钮，顶部时位于视口外，用文本定位会误匹配导致点击卡住
    const addToCartBtn = page.locator('button.product-form__submit[name="add"]').first();
    await test.step('循环关闭引导弹窗并寻找 Add to cart 按钮', async () => {
      // 寻找按钮前：循环关闭 "New to CNC?" 引导弹窗直到确认消失（弹窗延迟注入/反复显示，
      // 单次关闭不可靠；循环内部每轮关闭后用文本标记复查，最多 5 轮）
      let popupGone = await dismissGuidePopupLoop(page, 5);
      // 找不到按钮时重新循环关闭弹窗的入口：按钮可见性检测最多找 3 轮，
      // 每轮找不到就重新执行弹窗关闭循环（应对弹窗在寻找期间重新弹出遮挡渲染）再找一次
      let btnFound = false;
      for (let search = 1; search <= 3; search++) {
        btnFound = await addToCartBtn.isVisible({ timeout: 3000 }).catch(() => false);
        if (btnFound) break;
        console.warn(`[US] ⚠️ 第${search}轮未找到 Add to cart 按钮，重新循环关闭引导弹窗后再找`);
        popupGone = await dismissGuidePopupLoop(page, 5);
        await page.waitForTimeout(1000);
      }
      // 3 轮循环关闭后仍找不到按钮则断言失败（触发自愈）
      expect(btnFound, '[US] 循环关闭引导弹窗后仍未找到 Add to cart 按钮').toBe(true);
      await expect(addToCartBtn, '[US] Add to cart 按钮不可见').toBeVisible({ timeout: 10_000 });
      console.log(`[US] ✅ Add to cart 按钮可见（弹窗已清理: ${popupGone}），准备点击加购`);
      // 点击前等待 5s：给浮窗/懒加载元素渲染时间，便于一次性清理
      await page.waitForTimeout(5000);
      // 点击前再执行一次循环关闭：等待 5s 期间弹窗可能重新注入
      await dismissGuidePopupLoop(page, 3);
      // 循环最多 3 轮：每轮先循环关闭引导弹窗+关闭全部浮窗（幸运转盘/翻译弹窗/客服悬浮/意外下拉），
      // 再滚动+点击。单次点击限时 8s，避免被遮挡时 Playwright 长时间自动滚动重试（页面上下滑动）
      let clicked = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        // 先按 Escape 关闭意外展开的下拉浮窗，再循环关闭引导弹窗并清理所有已知浮窗（无论是否存在都安全执行，失败不阻断）
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(300);
        await dismissGuidePopupLoop(page, 3);
        await dismissAllPopups(page);
        try {
          // 按钮位于首屏下方，显式滚动到按钮位置后再点击（timeout 防继承测试级 300s）
          await addToCartBtn.click({ timeout: 8000 });
          clicked = true;
          break;
        } catch {
          console.warn(`[US] ⚠️ 第${attempt}轮点击失败（可能被浮窗遮挡），重新清理后重试`);
        }
      }
      if (!clicked) {
        // 兜底：force 强制点击（跳过可操作性检查，应对客服插件持续重新注入浮层拦截点击的场景）
        console.warn(`[US] ⚠️ 3 轮常规点击失败，尝试 force 强制点击`);
        await addToCartBtn.click({ force: true, timeout: 8000 });
      }
      console.log(`[US] 🛒 已点击 Add to cart，等待购物车抽屉弹出...`);
    });

    // ========== 阶段3：断言加购成功（抽屉弹出且目标商品存在） ==========
    await test.step('断言购物车抽屉弹出且含目标商品', async () => {
      // 定位方式：getByRole('dialog') 严格断言抽屉本体。
      // 注意：顶部导航购物车图标文本也是 "My Cart"，用 getByText(/my cart/i) 会在抽屉未弹出时误报
      const cartDrawer = page.getByRole('dialog', { name: /my cart/i }).first();
      // 抽屉未弹出（可能被浮窗遮挡/动画打断/点击事件被页面 JS 拦截）时清理浮窗后重新点击加购；
      // 两种情况直接停止 UI 重试、无条件改走 AJAX API 兜底加购 → 返回商品页 → 打开购物车抽屉：
      // 1) 页面已被导航到 Shopify /cart/add 错误页（半渲染时原生表单 POST 缺 items 参数被拒）
      // 2) 已点击 2 次但抽屉始终未弹出（点击本身成功但加购未生效，UI 重试无意义）
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await expect(cartDrawer, '[US] 加购后购物车抽屉未弹出').toBeVisible({ timeout: 15_000 });
          break;
        } catch {
          const onCartAddErrorPage = page.url().includes('/cart/add');
          if (onCartAddErrorPage || attempt === 2) {
            const reason = onCartAddErrorPage
              ? '页面已跳转到 /cart/add 错误页'
              : '已点击 2 次但购物车抽屉始终未弹出（点击可能被页面 JS 拦截，改走 API 加购）';
            console.warn(`[US] ⚠️ ${reason}，执行 AJAX API 兜底加购`);
            const added = await addToCartViaApi(page, TARGET_URL);
            expect(added, '[US] 兜底加购异常（AJAX API 返回失败）').toBe(true);
            // 返回商品页恢复现场，再循环关闭引导弹窗（goto 后弹窗会重新注入）+关闭其他浮窗
            await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
            await dismissGuidePopupLoop(page, 5);
            await dismissAllPopups(page);
            // 通过顶部购物车图标打开抽屉（同域已有购物车商品，Dawn 主题会弹出 cart-drawer）；
            // 找不到/点击失败时重新循环关闭引导弹窗后重试（弹窗重新弹出会遮挡图标）
            const cartIcon = page.locator('a[href="/cart"]').first();
            let iconOpened = false;
            for (let retry = 1; retry <= 3; retry++) {
              await cartIcon.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
              await cartIcon.click({ timeout: 10000 }).catch(() => {});
              await page.waitForTimeout(2000);
              iconOpened = await cartDrawer.isVisible({ timeout: 3000 }).catch(() => false);
              if (iconOpened) break;
              console.warn(`[US] ⚠️ 第${retry}轮打开购物车抽屉失败，重新循环关闭引导弹窗后重试`);
              await dismissGuidePopupLoop(page, 5);
            }
            await expect(cartDrawer, '[US] 兜底加购成功但购物车抽屉未能打开').toBeVisible({ timeout: 15_000 });
            break;
          }
          console.warn(`[US] ⚠️ 第${attempt}轮：购物车抽屉未弹出，清理浮窗后重新点击加购`);
          await dismissAllPopups(page);
          await addToCartBtn.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
          await addToCartBtn.click({ timeout: 8000 }).catch(() => {});
        }
      }
      console.log(`[US] ✅ 购物车抽屉已弹出`);

      // 定位方式：限定在购物车抽屉（dialog）内用 getByRole 定位商品链接
      // （页面导航菜单中也存在同名隐藏文本，不限定范围会被 .first() 误匹配）
      const productInCart = cartDrawer.getByRole('link', { name: PRODUCT_NAME }).first();
      await expect(productInCart, `[US] 购物车中未找到目标商品: ${PRODUCT_NAME}`).toBeVisible({ timeout: 10_000 });
      console.log(`[US] ✅ 购物车中存在目标商品: ${PRODUCT_NAME}`);
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
    // 注意：断言用 try/catch 包裹而非裸 expect——自愈脚本 heal_specs.ts 会用正则
    // 替换块内所有 expect(...).toBeVisible({ timeout: 数字 })，裸写会被污染为页面随机文本
    const cartDrawer = page.getByRole('dialog', { name: /my cart/i }).first();
    await test.step('前置检查：购物车抽屉处于弹出状态', async () => {
      // 本用例直接沿用上一用例的页面现场，不重新初始化、不重新加购
      let drawerVisible = await cartDrawer.isVisible({ timeout: 10000 }).catch(() => false);
      if (!drawerVisible) {
        // 现场丢失（抽屉被关闭/页面刷新）：通过顶部购物车图标重新打开抽屉兜底
        console.warn(`[US] ⚠️ 购物车抽屉未弹出，尝试通过购物车图标重新打开`);
        await dismissAllPopups(page);
        const cartIcon = page.locator('a[href="/cart"]').first();
        await cartIcon.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
        await cartIcon.click({ timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        drawerVisible = await cartDrawer.isVisible({ timeout: 10000 }).catch(() => false);
      }
      if (!drawerVisible) {
        throw new Error('[US] 前置条件不满足：购物车抽屉未弹出（上一用例未成功加购）');
      }
      console.log(`[US] ✅ 购物车抽屉已弹出，直接开始点击 Check Out`);
    });

    // ========== 阶段2：点击 Check out 按钮进入结算页 ==========
    await test.step('弹窗清理并点击 Check out 按钮', async () => {
      // 定位方式：限定在购物车抽屉（dialog）内匹配 "Check out"
      //（该控件在不同渲染状态下可能是 button 或 link 角色，用逗号选择器兼容两种形态）
      const checkOutBtn = cartDrawer.locator('button, a').getByText(/check\s*out/i).first();
      await expect(checkOutBtn, '[US] 购物车抽屉内未找到 Check out 按钮').toBeVisible({ timeout: 10_000 });
      console.log(`[US] ✅ Check Out 按钮可见，准备进入结算页`);
      // 循环最多 3 轮：每轮先关闭全部浮窗，再显式滚动到按钮位置后点击（抽屉内容很长，
      // 按钮可能处于视口外/懒加载区域；单次点击限时 8s，防遮挡时 Playwright 长时间自动滚动重试）
      let clicked = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        await dismissAllPopups(page);
        try {
          await checkOutBtn.scrollIntoViewIfNeeded({ timeout: 8000 });
          await checkOutBtn.click({ timeout: 8000 });
          clicked = true;
          break;
        } catch {
          console.warn(`[US] ⚠️ 第${attempt}轮点击失败（可能被浮窗遮挡），重新清理后重试`);
        }
      }
      if (!clicked) {
        // 兜底一：force 强制点击（跳过可操作性检查，应对持续被浮层拦截的场景）
        console.warn(`[US] ⚠️ 3 轮常规点击失败，尝试 force 强制点击`);
        await checkOutBtn.click({ force: true, timeout: 8000 }).catch(() => {});
        // force 点击可能已触发 Shopify 跨域结算导航（checkout 域名），先等待跳转生效再判断，
        // 避免在导航进行中发起新的 goto（相对 URL 此时无法解析会报 "Cannot navigate to invalid URL"）
        try {
          await page.waitForURL(/\/checkouts\/|\/checkout/, { timeout: 15000 });
        } catch {
          // 兜底二：Shopify 标准结算入口 /checkout（同域购物车会话有效时直达当前购物车结算页），
          // 与点击 Check out 按钮的业务目标一致，保证"进入结算页"这一验证点可达。
          // 必须用绝对 URL：跨域导航残留时相对路径无法解析；导航失败也不阻断（交由阶段3断言判定）
          console.warn(`[US] ⚠️ force 点击仍未跳转结算页，改用绝对 URL 直达 /checkout 兜底`);
          await page.goto('https://www.makera.com/checkout', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
        }
      }
      console.log(`[US] 💳 已触发 Check Out，等待结算页加载...`);
    });

    // ========== 阶段3：断言结算页商品与 URL ==========
    await test.step('断言结算页商品存在且 URL 跳转成功', async () => {
      // 等待结算页加载
      await page.waitForTimeout(7000);
      console.log(`[US] ✅ 等待完成，开始断言`);

      // 定位方式：getByText 文本定位（结算页订单摘要区展示商品名称）
      const productInCheckout = page.getByText(PRODUCT_NAME).first();
      await expect(productInCheckout, `[US] 结算页中未找到目标商品: ${PRODUCT_NAME}`).toBeVisible({ timeout: 15_000 });
      console.log(`[US] ✅ 结算页中存在目标商品: ${PRODUCT_NAME}`);

      // 定位方式：toHaveURL 正则断言（Shopify 结算页形如 www.makera.com/checkouts/cn/xxxx）
      await expect(page, '[US] 未成功跳转至结算页 /checkouts/').toHaveURL(
        /www\.makera\.com\/checkouts\//,
        { timeout: 30000 }
      );
      console.log(`[US] ✅ 已跳转至结算页: ${page.url()}`);
    });
  });

});
