# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: global_carvera.spec.ts >> Global 站点 >> 商品加入购物车
- Location: src/web/testcases/smoke/global_carvera.spec.ts:38:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button.product-form__submit[name="add"]').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('button.product-form__submit[name="add"]').first()

```

```yaml
- main:
  - heading "Quick security check" [level=1]
  - status: Confirm you’re human to continue.
- contentinfo:
  - text: Secured by
  - img "Shopify"
```

# Test source

```ts
  1   | // Global 站点 — Add to cart → Check Out 结算流程冒烟测试
  2   | // 报告说明：test.step 划分步骤、allure parameter 记录运行参数、annotations 记录预期结果，
  3   | // 供 Allure 详细报告展示（步骤树/参数/预期一目了然）
  4   | import { test as base, expect, Page } from '@playwright/test';
  5   | import { parameter } from 'allure-js-commons';
  6   | import { setupPage, dismissAllPopups, addToCartViaApi, dismissCloudflareChallenge } from './helpers';
  7   | 
  8   | const TARGET_URL = 'https://global.makera.com/products/makera-essential-milling-bit-set';
  9   | // 目标商品名称（断言购物车与结算页中商品存在的基准文本；
  10  | // getByRole/getByText 默认子串匹配，基准文本不含前缀可兼容购物车/结算页的两种形态）
  11  | // 注意：Global 站点购物车显示 "Essential Milling Bit Set"（无 Makera 前缀），
  12  | // 结算页可能显示完整名称，用短名作为子串匹配基准
  13  | const PRODUCT_NAME = 'Essential Milling Bit Set';
  14  | const REGION = '东京 / ja-JP / Asia/Tokyo';
  15  | 
  16  | // worker 级共享页面：两个用例使用同一个浏览器页面，
  17  | // 使"商品正常进入结算页"能在"商品加入购物车"成功后的现场状态上直接继续
  18  | const test = base.extend<{}, { sharedPage: Page }>({
  19  |   sharedPage: [async ({ browser }, use) => {
  20  |     const context = await browser.newContext({
  21  |       geolocation: { longitude: 139.6917, latitude: 35.6895 },  // 东京
  22  |       locale: 'ja-JP',
  23  |       timezoneId: 'Asia/Tokyo',
  24  |       permissions: ['geolocation'],
  25  |     });
  26  |     const page = await context.newPage();
  27  |     await use(page);
  28  |     await context.close();
  29  |   }, { scope: 'worker' }],
  30  | });
  31  | 
  32  | test.describe('Global 站点', () => {
  33  | 
  34  |   // serial 模式：用例串行执行，上一用例失败时后续用例自动跳过
  35  |   //（保证"商品正常进入结算页"仅在"商品加入购物车"成功后执行）
  36  |   test.describe.configure({ mode: 'serial' });
  37  | 
  38  |   test('商品加入购物车', async ({ sharedPage: page }) => {
  39  |     // ── Allure 报告信息：运行参数 + 预期结果 ──
  40  |     parameter('TARGET_URL', TARGET_URL);
  41  |     parameter('PRODUCT_NAME', PRODUCT_NAME);
  42  |     parameter('地区/语言', REGION);
  43  |     test.info().annotations.push(
  44  |       { type: '预期结果', description: '点击 Add to cart 后购物车抽屉弹出，且抽屉内可见目标商品' },
  45  |       { type: '前置条件', description: 'setupPage 完成商店切换，页面停留在 /products/ 商品页' },
  46  |     );
  47  | 
  48  |     // ========== 阶段1：页面初始化与跳转防护 ==========
  49  |     await test.step('页面初始化与跳转防护', async () => {
  50  |       const ready = await setupPage(page, TARGET_URL);
  51  |       // setup 失败视为测试失败（触发自愈），不允许跳过
  52  |       expect(ready).toBe(true);
  53  | 
  54  |       // 重定向恢复检查：setupPage 成功后，页面仍可能被延迟 JS 重定向弹走
  55  |       // Shopify 地域检测脚本通常在 DOMContentLoaded 后 15-20s 触发，需等待足够时间让重定向发生
  56  |       await page.waitForTimeout(10000);
  57  |       const targetHostForCheck = new URL(TARGET_URL).hostname;
  58  |       const currentUrlBeforeAssert = page.url();
  59  |       const currentHostBeforeAssert = new URL(currentUrlBeforeAssert).hostname;
  60  |       const hasProductPath = currentUrlBeforeAssert.includes('/products/');
  61  |       if (currentHostBeforeAssert !== targetHostForCheck || !hasProductPath) {
  62  |         console.warn(`[Global] ⚠️ setupPage 后检测到延迟重定向: ${currentUrlBeforeAssert} → 重新执行 setupPage 纠正（最多 1 次）`);
  63  |         const reReady = await setupPage(page, TARGET_URL);
  64  |         expect(reReady).toBe(true);
  65  |         // 不再进行二次检查，避免无限循环：setupPage 内部已有完整兜底机制
  66  |       }
  67  | 
  68  |       // 验证 URL 包含 /products/（URL 字符串断言）
  69  |       expect(page.url()).toContain('/products/');
  70  |     });
  71  | 
  72  |     // ========== 阶段2：等待渲染 + 弹窗清理 + 点击 Add to cart ==========
  73  |     // 定位方式：CSS 类名定位 product-form__submit（Shopify 商品表单内的真实加购按钮）
  74  |     // 页面存在多个 sticky-add-cart-btn 悬浮按钮，顶部时位于视口外，用文本定位会误匹配导致点击卡住
  75  |     const addToCartBtn = page.locator('button.product-form__submit[name="add"]').first();
  76  |     await test.step('弹窗清理并点击 Add to cart 按钮', async () => {
> 77  |       await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
      |                                  ^ Error: expect(locator).toBeVisible() failed
  78  |       console.log(`[Global] ✅ Add to cart 按钮可见，准备点击加购`);
  79  |       // 点击前等待 5s：给浮窗/懒加载元素渲染时间，便于一次性清理
  80  |       await page.waitForTimeout(5000);
  81  |       // 循环最多 3 轮：每轮先关闭全部浮窗（幸运转盘/翻译弹窗/客服悬浮/意外下拉），
  82  |       // 再滚动+点击。单次点击限时 8s，避免被遮挡时 Playwright 长时间自动滚动重试（页面上下滑动）
  83  |       for (let attempt = 1; attempt <= 3; attempt++) {
  84  |         // 先按 Escape 关闭意外展开的下拉浮窗，再清理所有已知浮窗（无论是否存在都安全执行，失败不阻断）
  85  |         await page.keyboard.press('Escape').catch(() => {});
  86  |         await page.waitForTimeout(300);
  87  |         await dismissAllPopups(page);
  88  |         try {
  89  |           // 按钮位于首屏下方，显式滚动到按钮位置后再点击（timeout 防继承测试级 300s）
  90  |           await addToCartBtn.scrollIntoViewIfNeeded({ timeout: 10000 });
  91  |           await addToCartBtn.click({ timeout: 8000 });
  92  |           break;
  93  |         } catch {
  94  |           console.warn(`[Global] ⚠️ 第${attempt}轮点击失败（可能被浮窗遮挡），重新清理后重试`);
  95  |           if (attempt === 3) throw new Error('[Global] Add to cart 按钮 3 轮点击均失败');
  96  |         }
  97  |       }
  98  |       console.log(`[Global] 🛒 已点击 Add to cart，等待购物车抽屉弹出...`);
  99  |     });
  100 | 
  101 |     // ========== 阶段3：断言加购成功（抽屉弹出且目标商品存在） ==========
  102 |     await test.step('断言购物车抽屉弹出且含目标商品', async () => {
  103 |       // 定位方式：getByRole('dialog') 严格断言抽屉本体。
  104 |       // 注意：顶部导航购物车图标文本也是 "My Cart"，用 getByText(/my cart/i) 会在抽屉未弹出时误报
  105 |       const cartDrawer = page.getByRole('dialog', { name: /my cart/i }).first();
  106 |       // 抽屉未弹出（可能被浮窗遮挡/动画打断）时清理浮窗后重新点击加购，最多 2 轮；
  107 |       // 若页面已被导航到 Shopify /cart/add 错误页（半渲染时原生表单 POST 缺 items 参数被拒），
  108 |       // 则停止 UI 重试，改走 AJAX API 兜底加购 → 返回商品页 → 打开购物车抽屉
  109 |       for (let attempt = 1; attempt <= 2; attempt++) {
  110 |         try {
  111 |           await expect(cartDrawer).toBeVisible({ timeout: 15000 });
  112 |           break;
  113 |         } catch {
  114 |           if (page.url().includes('/cart/add')) {
  115 |             console.warn(`[Global] ⚠️ 页面已跳转到 /cart/add 错误页，执行 AJAX API 兜底加购`);
  116 |             const added = await addToCartViaApi(page, TARGET_URL);
  117 |             expect(added).toBe(true);
  118 |             // 返回商品页恢复现场，再关闭弹窗
  119 |             await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  120 |             await dismissAllPopups(page);
  121 |             // 通过顶部购物车图标打开抽屉（同域已有购物车商品，Dawn 主题会弹出 cart-drawer）
  122 |             const cartIcon = page.locator('a[href="/cart"]').first();
  123 |             await cartIcon.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  124 |             await cartIcon.click({ timeout: 10000 }).catch(() => {});
  125 |             await page.waitForTimeout(2000);
  126 |             await expect(cartDrawer).toBeVisible({ timeout: 15000 });
  127 |             break;
  128 |           }
  129 |           console.warn(`[Global] ⚠️ 第${attempt}轮：购物车抽屉未弹出，清理浮窗后重新点击加购`);
  130 |           if (attempt === 2) throw new Error('[Global] 加购后购物车抽屉未弹出（共点击 2 次）');
  131 |           await dismissAllPopups(page);
  132 |           await addToCartBtn.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  133 |           await addToCartBtn.click({ timeout: 8000 }).catch(() => {});
  134 |         }
  135 |       }
  136 |       console.log(`[Global] ✅ 购物车抽屉已弹出`);
  137 | 
  138 |       // 定位方式：限定在购物车抽屉（dialog）内用 getByRole 定位商品链接
  139 |       // （页面导航菜单中也存在同名隐藏文本，不限定范围会被 .first() 误匹配）
  140 |       const productInCart = cartDrawer.getByRole('link', { name: PRODUCT_NAME }).first();
  141 |       await expect(productInCart).toBeVisible({ timeout: 10000 });
  142 |       console.log(`[Global] ✅ 购物车中存在目标商品: ${PRODUCT_NAME}`);
  143 |     });
  144 |   });
  145 | 
  146 |   test('商品正常进入结算页', async ({ sharedPage: page }) => {
  147 |     // ── Allure 报告信息：运行参数 + 预期结果 ──
  148 |     parameter('TARGET_URL', TARGET_URL);
  149 |     parameter('PRODUCT_NAME', PRODUCT_NAME);
  150 |     parameter('地区/语言', REGION);
  151 |     test.info().annotations.push(
  152 |       { type: '预期结果', description: '点击 Check out 后跳转结算页 /checkouts/，且订单摘要含目标商品' },
  153 |       { type: '前置条件', description: '上一用例已加购成功，购物车抽屉处于弹出状态（沿用页面现场）' },
  154 |     );
  155 |   
  156 |     // ========== 阶段 1：前置检查（确认上一用例已加购成功） ==========
  157 |     // 严格断言 dialog 角色：顶部导航的 "My Cart" 文本会让 getByText 误报
  158 |     const cartDrawer = page.getByRole('dialog', { name: /my cart/i }).first();
  159 |     await test.step('前置检查：购物车抽屉处于弹出状态', async () => {
  160 |       // 本用例直接沿用上一用例的页面现场，不重新初始化、不重新加购
  161 |       // Shopify 购物车抽屉可能在两用例间隙自动关闭，需要兜底重新打开
  162 |       let drawerVisible = await cartDrawer.isVisible({ timeout: 5000 }).catch(() => false);
  163 |       if (!drawerVisible) {
  164 |         console.warn(`[Global] ⚠️ 购物车抽屉已关闭（Shopify 自动收起），通过购物车图标重新打开`);
  165 |         const cartIcon = page.locator('a[href="/cart"]').first();
  166 |         await cartIcon.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  167 |         await cartIcon.click({ timeout: 10000 });
  168 |         await page.waitForTimeout(3000);
  169 |         drawerVisible = await cartDrawer.isVisible({ timeout: 10000 }).catch(() => false);
  170 |         if (!drawerVisible) {
  171 |           throw new Error('[Global] 前置条件不满足：重新打开购物车抽屉后仍不可见');
  172 |         }
  173 |         console.log(`[Global] ✅ 购物车抽屉已重新打开`);
  174 |       }
  175 |       console.log(`[Global] ✅ 购物车抽屉已弹出，直接开始点击 Check Out`);
  176 |     });
  177 |   
```