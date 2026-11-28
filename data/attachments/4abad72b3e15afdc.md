# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: B_eu_search.spec.ts >> EU 站点 >> eu搜索功能测试
- Location: src/web/testcases/smoke/B_eu_search.spec.ts:15:7

# Error details

```
Error: [EU] 所有选择器均未找到商品，页面可能未正确加载搜索结果
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - heading "Quick security check" [level=1] [ref=e3]
    - status [ref=e4]: Confirm you’re human to continue.
  - contentinfo [ref=e9]:
    - text: Secured by
    - img "Shopify" [ref=e10]
```

# Test source

```ts
  31  |         await page.waitForTimeout(5000);
  32  |         await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  33  |       }
  34  |       await page.waitForTimeout(15000);
  35  |     });
  36  | 
  37  |     // 阶段2：检查当前网址是否等于目标，不等于则通过商店切换器切回
  38  |     await test.step('检查URL并切回目标网址', async () => {
  39  |       const currentHost = new URL(page.url()).hostname;
  40  |       if (currentHost !== targetHost) {
  41  |         console.log(`[EU] 当前 host "${currentHost}" 不匹配目标 "${targetHost}"，执行商店切换...`);
  42  |         const switched = await switchToTargetStore(page, TARGET_URL);
  43  |         if (!switched) console.warn(`[EU] ⚠️ 商店切换未成功，后续步骤可能受影响`);
  44  |       } else {
  45  |         console.log(`[EU] 当前 host 已匹配目标，无需切换`);
  46  |       }
  47  |     });
  48  | 
  49  |     // 阶段3：等待3s后重新进入目标测试网址，再等待15s
  50  |     await test.step('等待3s后重新进入搜索页并等待15s', async () => {
  51  |       await page.waitForTimeout(3000);
  52  |       try {
  53  |         await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  54  |       } catch (err) {
  55  |         console.log(`[EU] ⚠️ 阶段3导航失败，等待5s后重试: ${err}`);
  56  |         await page.waitForTimeout(5000);
  57  |         await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  58  |       }
  59  |       await page.waitForTimeout(15000);
  60  |     });
  61  | 
  62  |     // 阶段4：二次校验URL，不匹配则切换商店后等待5s再重新导航
  63  |     await test.step('二次校验URL并兜底切换', async () => {
  64  |       const currentHost = new URL(page.url()).hostname;
  65  |       if (currentHost === targetHost) {
  66  |         console.log(`[EU] 二次校验通过，当前 host 已匹配目标`);
  67  |       } else {
  68  |         console.log(`[EU] 二次校验失败: host "${currentHost}" 不匹配 "${targetHost}"，执行商店切换...`);
  69  |         const switched = await switchToTargetStore(page, TARGET_URL);
  70  |         if (!switched) console.warn(`[EU] ⚠️ 兜底商店切换未成功`);
  71  |         await page.waitForTimeout(5000);
  72  |         try {
  73  |           await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  74  |         } catch (err) {
  75  |           console.log(`[EU] ⚠️ 阶段4兜底导航失败，等待5s后重试: ${err}`);
  76  |           await page.waitForTimeout(5000);
  77  |           await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  78  |         }
  79  |         console.log(`[EU] 兜底切换完成，当前 URL: ${page.url()}`);
  80  |       }
  81  |     });
  82  | 
  83  |     // 阶段5：关闭弹窗
  84  |     await test.step('关闭弹窗', async () => {
  85  |       await dismissAllPopups(page);
  86  |     });
  87  | 
  88  |     // 阶段6：断言搜索结果前2个商品标题包含搜索关键词
  89  |     await test.step('断言搜索结果前2个商品标题包含关键词', async () => {
  90  |       // 验证当前在搜索页，不在则重新导航
  91  |       if (!page.url().includes('/search')) {
  92  |         console.log(`[EU] ⚠️ 当前不在搜索页: ${page.url()}，重新导航...`);
  93  |         await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  94  |         await page.waitForTimeout(10000);
  95  |         await dismissAllPopups(page);
  96  |       }
  97  | 
  98  |       // 多选择器尝试：覆盖不同可能的商品标题容器
  99  |       // EU 站点实际 DOM：商品标题是 <a class="product-card__title"> 而非 h3，
  100 |       // 每个 .product-card 内有 2 个 a（图片链接+标题链接），
  101 |       // 优先用精确选择器匹配标题链接，排除图片链接
  102 |       const productSelectors = [
  103 |         '.product-card a.product-card__title',
  104 |         '.product-card a:not([class*="media"]):not([class*="button"])',
  105 |         '.product-card a[href*="/products/"]',
  106 |         '.card a[href*="/products/"]',
  107 |         '[class*="product-card"] a',
  108 |         // 以下为兼容其他站点可能的 h3 结构
  109 |         'article h3.card__heading',
  110 |         'article .card__information h3',
  111 |         '.product-card h3',
  112 |         '[data-product-id] h3',
  113 |         '.grid__item h3',
  114 |         '.product-item h3',
  115 |         '[class*="product"] h3, [class*="Product"] h3',
  116 |       ];
  117 | 
  118 |       let productTitles: ReturnType<typeof page.locator> | null = null;
  119 |       for (const selector of productSelectors) {
  120 |         const count = await page.locator(selector).count().catch(() => 0);
  121 |         if (count > 0) {
  122 |           productTitles = page.locator(selector);
  123 |           console.log(`[EU] 找到 ${count} 个商品（选择器: ${selector}）`);
  124 |           break;
  125 |         }
  126 |       }
  127 |       if (!productTitles) {
  128 |         productTitles = page.locator('.product-card a, .card a, article h3, .card__heading, [class*="product"] a, [class*="product"] h3');
  129 |         const count = await productTitles.count().catch(() => 0);
  130 |         console.log(`[EU] 兜底选择器找到 ${count} 个商品`);
> 131 |         if (count === 0) throw new Error('[EU] 所有选择器均未找到商品，页面可能未正确加载搜索结果');
      |                                ^ Error: [EU] 所有选择器均未找到商品，页面可能未正确加载搜索结果
  132 |       } else {
  133 |         const count = await productTitles.count();
  134 |         if (count === 0) throw new Error(`[EU] 选择器匹配到 0 个商品，页面可能未正确加载搜索结果`);
  135 |       }
  136 | 
  137 |       // 滚动到可见：屏幕小看不到时向下滑动
  138 |       async function scrollToVisible(locator: ReturnType<typeof page.locator>): Promise<void> {
  139 |         if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) return;
  140 |         for (let i = 0; i < 10; i++) {
  141 |           await page.evaluate(() => window.scrollBy(0, 400));
  142 |           await page.waitForTimeout(600);
  143 |           if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) return;
  144 |         }
  145 |       }
  146 | 
  147 |       // 断言第1个商品标题包含关键词
  148 |       const firstProduct = productTitles.first();
  149 |       await scrollToVisible(firstProduct);
  150 |       const firstText = await firstProduct.textContent();
  151 |       console.log(`[EU]  第1个商品: ${firstText?.trim()}`);
  152 |       expect(firstText?.trim()).toContain(SEARCH_KEYWORD);
  153 | 
  154 |       // 断言第2个商品标题包含关键词
  155 |       const secondProduct = productTitles.nth(1);
  156 |       await scrollToVisible(secondProduct);
  157 |       const secondText = await secondProduct.textContent();
  158 |       console.log(`[EU] 📦 第2个商品: ${secondText?.trim()}`);
  159 |       expect(secondText?.trim()).toContain(SEARCH_KEYWORD);
  160 | 
  161 |       console.log(`[EU] ✅ 前2个商品标题均包含关键词 "${SEARCH_KEYWORD}"`);
  162 |     });
  163 |   });
  164 | 
  165 | });
  166 | 
```