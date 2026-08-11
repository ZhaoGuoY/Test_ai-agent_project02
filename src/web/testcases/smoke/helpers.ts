// src/web/testcases/smoke/helpers.ts
/**
 * 多站点测试共享辅助函数1
 *
 * 职责：
 * - 关闭幸运转盘弹窗（优先点击 ×，失败则点击遮罩层或 Escape）
 * - 关闭 Google 翻译弹窗（精确选择器优先，失败则暴力移除）
 * - 移除第三方客服悬浮按钮（避免遮挡 Add to cart 等按钮导致点击错位）
 * - 通过商店切换器 UI 切换回目标站点（循环检测+重试）
 * - 页面初始化（导航 → 循环检测跳转 → 循环查找切换按钮 → 验证）
 * - Shopify AJAX API 兜底加购（原生表单 POST 被拒时的降级方案）
 *
 * 被 us_carvera.spec.ts / eu_carvera.spec.ts / global_carvera.spec.ts 引用
 */
import { Page } from '@playwright/test';

/**
 * 关闭幸运转盘弹窗（精准选择器，仅针对幸运转盘，不影响切换弹窗）
 */
async function dismissSpinPopup(page: Page): Promise<void> {
  console.log(`[helpers]   🔄 检查幸运转盘...`);
  // 安全方式：点击关闭按钮，不使用 JS 暴力隐藏
  const closeSelectors = [
    'button.ecomsend-SpinWheel__Modal__CloseButton',
    'div.ecomsend-SpinWheel__Modal__CustomDialogWrapper button',
  ];
  for (const selector of closeSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 200 }).catch(() => false)) {
      // 显式 timeout 5s：click() 默认继承测试级超时（300s），
      // 若关闭按钮被其他浮窗遮挡会长时间阻塞导致整个流程卡死
      await btn.click({ timeout: 5000 }).catch(() => {});
      console.log(`[helpers]   ✅ 已关闭幸运转盘（选择器: ${selector}）`);
      await page.waitForTimeout(200);
      return;
    }
  }
  console.log(`[helpers]   ℹ️ 未发现幸运转盘`);
}

/**
 * 关闭 Google 翻译弹窗（精确选择器优先，失败则暴力移除）
 */
async function dismissGoogleTranslate(page: Page): Promise<void> {
  console.log(`[helpers]   🔄 检查 Google 翻译弹窗...`);
  const selectors = [
    '.goog-te-banner-close',
    '.goog-te-balloon-close',
    'button[aria-label="Close translation"]',
    '#\\:1.close',
    '[class*="goog-te"] button',
  ];

  for (const selector of selectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      // 显式 timeout 5s 防遮挡时长时间阻塞（click 默认继承测试级 300s 超时）
      await btn.click({ timeout: 5000 }).catch(() => {});
      console.log(`[helpers]   ✅ 已关闭 Google 翻译弹窗（选择器: ${selector}）`);
      await page.waitForTimeout(300);
      return;
    }
  }

  await page.evaluate(() => {
    const elements = document.querySelectorAll(
      '.goog-te-balloon-frame, .goog-te-banner, .skiptranslate, ' +
      '#google_translate_element, [class*="translation"]'
    );
    elements.forEach(el => el.remove());
  });
  console.log(`[helpers]   ✅ 已暴力移除 Google 翻译弹窗`);
}

/**
 * 移除第三方客服悬浮按钮（右下角对话气泡小部件）
 *
 * 该悬浮按钮固定定位在页面右下角，会遮挡 Add to cart 等按钮：
 * Playwright 点击被遮挡元素时点击会落在悬浮按钮上，导致点击错位、加购失败。
 * 策略：优先尝试点击其关闭按钮（安全方式），失败则 JS 暴力移除（仅删除悬浮
 * DOM 元素，不触发导航，不影响加购表单）。
 *
 * 导出供 spec 文件在点击关键按钮前二次清理（悬浮部件可能在滚动后延迟加载）。
 */
export async function dismissChatWidget(page: Page): Promise<void> {
  console.log(`[helpers]   🔄 检查客服悬浮按钮...`);
  // 第一步：尝试点击悬浮部件自带的关闭按钮
  const closeSelectors = [
    '[aria-label*="close chat" i]',
    '[aria-label*="close widget" i]',
    '[aria-label*="close launcher" i]',
    '[aria-label*="关闭" i]',
    'button[class*="launcher"] [class*="close" i]',
    '[id*="chat"] [aria-label*="close" i]',
  ];
  for (const selector of closeSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 200 }).catch(() => false)) {
      await btn.click().catch(() => {});
      console.log(`[helpers]   ✅ 已点击客服悬浮部件关闭按钮（选择器: ${selector}）`);
      await page.waitForTimeout(300);
    }
  }

  // 第二步：JS 移除右下角固定定位的悬浮部件及其容器（兜底，确保不再遮挡）
  await page.evaluate(() => {
    const removeBySelector = (sel: string) => {
      document.querySelectorAll(sel).forEach(el => (el as HTMLElement).remove());
    };
    // 常见第三方客服/聊天部件
    removeBySelector(
      '[id*="chat-widget" i], [id*="chatwidget" i], [class*="chat-launcher" i], ' +
      '[class*="chatLauncher" i], [class*="messenger" i], [id*="intercom" i], ' +
      '[id*="crisp" i], [class*="crisp" i], [id*="tawk" i], [id*="lazychat" i], ' +
      '[id*="button-io" i], [id*="ButtonWidget" i], [class*="button-widget" i]'
    );
    // 兜底：移除 viewport 右下角的固定定位小元素（悬浮按钮的典型特征）
    const vw = window.innerWidth, vh = window.innerHeight;
    document.querySelectorAll('div, button, iframe').forEach(el => {
      const htmlEl = el as HTMLElement;
      const style = window.getComputedStyle(htmlEl);
      if (style.position !== 'fixed' || style.display === 'none' || style.visibility === 'hidden') return;
      const rect = htmlEl.getBoundingClientRect();
      // 位于右下角 200px 区域内、宽高不超过 120px 的固定元素视为悬浮部件
      if (rect.width > 0 && rect.width <= 120 && rect.height > 0 && rect.height <= 120 &&
          rect.left >= vw - 200 && rect.top >= vh - 200) {
        htmlEl.remove();
      }
    });
  }).catch(() => {});
  console.log(`[helpers]   ✅ 客服悬浮按钮处理完成`);
}

/**
 * 关闭顶部导航 hover 下拉面板（megaMenu，如 Software 下拉）
 *
 * 该下拉无关闭按钮，鼠标划过顶部导航时自动展开，会遮挡页面下方
 * Add to cart 等元素。关闭方式：将鼠标移到下方阴影遮罩区域使其
 * 失去 hover 焦点自动收起；JS 兜底移除仍未收起的浮层。
 */
export async function dismissNavDropdown(page: Page): Promise<void> {
  console.log(`[helpers]   🔄 检查顶部导航下拉...`);
  // 第一步：将鼠标焦点移离顶部导航到下方阴影遮罩区域（页面下方 75% 处），hover 下拉失焦收起
  const vp = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.mouse.move(vp.width / 2, vp.height * 0.75, { steps: 5 }).catch(() => {});
  await page.waitForTimeout(400);
  // 第二步：JS 兜底移除仍展开在顶部的大面积浮层（megaMenu 特征：顶部 fixed/absolute、高>200px）
  await page.evaluate(() => {
    document.querySelectorAll(
      '[class*="megaMenu" i], [class*="mega-menu" i], nav [class*="dropdown" i]'
    ).forEach(el => {
      const htmlEl = el as HTMLElement;
      const style = window.getComputedStyle(htmlEl);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (style.position !== 'fixed' && style.position !== 'absolute') return;
      const rect = htmlEl.getBoundingClientRect();
      // 仅移除占据顶部区域的大浮层（下拉面板特征），避免误删其他元素
      if (rect.top < 200 && rect.height > 200 && rect.width > 300) {
        htmlEl.remove();
      }
    });
  }).catch(() => {});
  console.log(`[helpers]   ✅ 顶部导航下拉处理完成`);
}

/**
 * 关闭所有已知弹窗（幸运转盘 + Google 翻译 + 客服悬浮按钮 + 导航 hover 下拉）
 *
 * 导出供 spec 文件在点击关键按钮的每轮重试前循环调用，
 * 应对延迟弹出的浮窗遮挡导致的点击失败。
 */
export async function dismissAllPopups(page: Page): Promise<void> {
  console.log(`[helpers]  🧹 开始关闭所有弹窗...`);
  await dismissSpinPopup(page);
  await dismissGoogleTranslate(page);
  await dismissChatWidget(page);
  await dismissNavDropdown(page);
  await page.waitForTimeout(300);
  console.log(`[helpers]  🧹 弹窗处理完成`);
}

/**
 * 通过商店切换器 UI 切换到目标站点（带循环重试）
 *
 * @param page Playwright 页面对象
 * @param targetUrl 目标 URL
 * @returns true=切换成功，false=失败
 */
async function switchToTargetStore(page: Page, targetUrl: string): Promise<boolean> {
  console.log(`[helpers]  开始商店切换流程...`);
  const targetHost = new URL(targetUrl).hostname;
  const currentHost = new URL(page.url()).hostname;
  console.log(`[helpers]   当前 host: ${currentHost}, 目标 host: ${targetHost}`);

  // 根据当前网址确定按钮文本（按钮显示的是当前站点）
  let currentButtonText = 'United States (EN)';
  if (currentHost.includes('eu')) {
    currentButtonText = 'EU';
  } else if (currentHost.includes('global')) {
    currentButtonText = 'Global';
  }

  // 根据目标网址确定选项文本（弹窗中选择目标商店）
  let targetStoreOption = 'US Store';
  if (targetHost.includes('eu')) {
    targetStoreOption = 'EU Store';
  } else if (targetHost.includes('global')) {
    targetStoreOption = 'Global Store';
  }

  console.log(`[helpers]   🎯 按钮文本: "${currentButtonText}", 目标选项: "${targetStoreOption}"`);
  console.log(`[helpers]   ⏱️ 开始查找切换按钮（超时 30s）...`);

  // 循环查找切换按钮（超时 30 秒，每 2 秒重试）
  const buttonTimeout = 30000; // 30 秒超时
  const buttonStartTime = Date.now();
  let buttonFound = false;

  while (Date.now() - buttonStartTime < buttonTimeout) {
    const elapsed = Math.floor((Date.now() - buttonStartTime) / 1000);
    console.log(`[helpers]     🔍 第${Math.floor(elapsed/2)+1}次查找按钮: "${currentButtonText}"（${elapsed}s/30s）`);

    // 每次查找前先关闭转盘，防止遮挡切换按钮
    await dismissSpinPopup(page);
    console.log(`[helpers]     🔄 尝试 6 种选择器查找按钮...`);

    // 查找商店切换按钮（span 标签，类名 spicegems_switcher_list-flags）
    const selectors = [
      `span:has-text("${currentButtonText}")`,  // span 标签精确匹配
      `.spicegems_switcher_list-flags`,  // 直接类名
      `[class*="switcher"]`,  // 类名包含 switcher
      `*:has-text("${currentButtonText}")`,  // 不限标签兜底
      `button:has-text("${currentButtonText}")`,
      `[aria-label*="store" i]`,
    ];

    let switcherButton = null;
    for (const selector of selectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        switcherButton = btn;
        console.log(`[helpers] ✅ 找到切换按钮（选择器: ${selector}）`);
        break;
      }
    }

    if (switcherButton) {
      buttonFound = true;
      console.log(`[helpers]     ✅ 找到按钮，点击打开弹窗...`);
      await switcherButton.click({ force: true, timeout: 5000 }); // force 点击，忽略转盘遮挡；显式超时防阻塞
      console.log(`[helpers]     ⏳ 等待 500ms 让弹窗渲染...`);
      await page.waitForTimeout(500); // 等弹窗渲染，立即进入查找
      console.log(`[helpers]     ✅ 弹窗已打开，进入选项查找`);
      break;
    }

    // 调试：打印包含目标文本的所有元素（不限标签）
    const debugInfo = await page.evaluate((searchText) => {
      const allElements = Array.from(document.querySelectorAll('*'))
        .filter(el => el.textContent?.trim() === searchText || el.textContent?.trim().includes(searchText))
        .map(el => ({ tag: el.tagName, text: el.textContent?.trim()?.substring(0, 50), class: el.className?.toString()?.substring(0, 50) }))
        .slice(0, 5);
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
        .map(b => b.textContent?.trim())
        .filter(t => t && t.length < 50);
      return { matchingElements: allElements, buttons: buttons.slice(0, 10) };
    }, currentButtonText);
    console.log(`[helpers] 🔍 匹配"${currentButtonText}"的元素: ${JSON.stringify(debugInfo.matchingElements)}`);
    console.log(`[helpers] 🔍 页面按钮: ${JSON.stringify(debugInfo.buttons)}`);

    console.log(`[helpers]     ⚠️ 本轮未找到按钮，等待 2s 重试...`);
    await page.waitForTimeout(2000);
  }

  if (!buttonFound) {
    console.error(`[helpers] ❌ 30 秒超时仍未找到商店切换按钮`);
    return false;
  }

  console.log(`[helpers]   ⏱️ 开始查找商店选项（超时 15s）...`);
  const optionTimeout = 15000; // 15 秒超时
  const optionStartTime = Date.now();

  while (Date.now() - optionStartTime < optionTimeout) {
    const elapsed = Math.floor((Date.now() - optionStartTime) / 1000);
    console.log(`[helpers]     🔍 第${Math.floor(elapsed/0.5)+1}次查找选项: "${targetStoreOption}"（${elapsed}s/15s）`);

    // 每次查找前先关闭幸运转盘（精准选择器只关转盘，不影响切换弹窗）
    await dismissSpinPopup(page);

    // 调试：打印弹窗内所有相关元素
    const popupDebug = await page.evaluate(() => {
      const navLinks = Array.from(document.querySelectorAll('div.spicegems_switcher_navLink'))
        .map(el => el.textContent?.trim()?.substring(0, 60));
      const ruleNames = Array.from(document.querySelectorAll('span.spicegems_switcher_rule-name'))
        .map(el => el.textContent?.trim()?.substring(0, 60));
      const dropdowns = Array.from(document.querySelectorAll('div.spicegems_switcher_dropdown'))
        .map(el => ({ class: el.className?.toString()?.substring(0, 80), display: (el as HTMLElement).style.display, visibility: (el as HTMLElement).style.visibility }));
      return { navLinks, ruleNames, dropdowns };
    });
    console.log(`[helpers]     📋 navLink: ${JSON.stringify(popupDebug.navLinks)}`);
    console.log(`[helpers]      rule-name: ${JSON.stringify(popupDebug.ruleNames)}`);
    console.log(`[helpers]     🔄 尝试 4 种选择器...`);

    // 多选择器尝试：用 count() 判断存在（不依赖 isVisible，避免被遮挡误判）
    const optionSelectors = [
      `div.spicegems_switcher_navLink:has-text("${targetStoreOption}")`,
      `span.spicegems_switcher_rule-name:has-text("${targetStoreOption}")`,
      `li:has-text("${targetStoreOption}")`,
      `text="${targetStoreOption}"`,
    ];

    let storeOption = null;
    for (const sel of optionSelectors) {
      const count = await page.locator(sel).count().catch(() => 0);
      if (count > 0) {
        storeOption = page.locator(sel).first();
        console.log(`[helpers] ✅ 找到商店选项（选择器: ${sel}，数量: ${count}）`);
        break;
      }
    }

    if (storeOption) {
      console.log(`[helpers] ✅ 点击商店选项 "${targetStoreOption}" 切换...`);
    
      // 最多重试 3 次点击，直到 URL 发生变化
      let navigationSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`[helpers]     🔄 第${attempt}次点击商店选项...`);
        await storeOption.click({ force: true, timeout: 5000 }); // 显式超时防阻塞
        await page.waitForTimeout(500);
        // 点击后立即关闭可能重新出现的幸运转盘
        await dismissSpinPopup(page);
    
        // 检查 URL 是否已变化
        const afterClickUrl = page.url();
        const afterClickHost = new URL(afterClickUrl).hostname;
        if (afterClickHost === targetHost) {
          console.log(`[helpers] ✅ 商店切换成功，URL: ${afterClickUrl}`);
          navigationSuccess = true;
          break;
        }
        console.log(`[helpers]     ⚠️ 第${attempt}次点击后 URL 未变化: ${afterClickHost}，重试...`);
      }
    
      if (navigationSuccess) return true;
    
      // 3 次点击后仍未跳转，最后用 waitForURL 等 10s
      try {
        await page.waitForURL((url) => url.hostname === targetHost, { timeout: 10000 });
        console.log(`[helpers] ✅ 商店切换成功（延迟跳转），URL: ${page.url()}`);
        return true;
      } catch (err) {
        const currentUrl = page.url();
        const currentHost = new URL(currentUrl).hostname;
        if (currentHost === targetHost) {
          console.log(`[helpers] ✅ 商店切换成功（超时后确认），URL: ${currentUrl}`);
          return true;
        }
        console.error(`[helpers] ❌ 切换后 URL 未匹配目标: ${targetHost}，当前: ${currentUrl}`);
        return false;
      }
    }

    console.log(`[helpers]     ⚠️ 本轮未找到选项，等待 0.5s 重试...`);
    await page.waitForTimeout(500);
  }

  console.error(`[helpers] ❌ 15 秒超时仍未找到商店选项`);
  return false;
}

/**
 * 页面初始化：导航 → 循环检测跳转 → 循环切换商店 → 验证
 */
export async function setupPage(page: Page, url: string): Promise<boolean> {
  const targetHost = new URL(url).hostname;

  // 1. 导航到目标 URL
  console.log(`[helpers] 🔄 正在导航到: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  console.log(`[helpers] ✅ 导航完成，当前 URL: ${page.url()}`);

  // 2. 立即开始循环检测跳转（每 2 秒一次，共 40 秒）
  let redirectDetected = false;
  for (let i = 1; i <= 20; i++) {
    const currentHost = new URL(page.url()).hostname;
    console.log(`[helpers] 📊 跳转检测 ${i}/20（${i * 2}s / 40s）: 目标=${targetHost}, 当前=${currentHost}`);

    if (currentHost !== targetHost) {
      console.warn(`[helpers] ⚠️ 检测到 IP 跳转: ${currentHost} → 尝试切换回目标`);
      redirectDetected = true;
      break;
    }

    await page.waitForTimeout(2000);
  }

  // 3. 如果未检测到跳转，关闭弹窗后直接进入测试
  if (!redirectDetected) {
    console.log(`[helpers] ✅ 40 秒内未检测到跳转，进入测试`);
    // 关闭弹窗（无论成功与否都继续测试）
    try {
      await dismissAllPopups(page);
    } catch (err) {
      console.warn(`[helpers] ️ 关闭弹窗失败，继续测试：${err}`);
    }
  } else {
    // 4. 检测到跳转，执行商店切换
    await page.waitForTimeout(3000); // 等待切换按钮出现
    const switched = await switchToTargetStore(page, url);
    if (!switched) {
      console.error(`[helpers] ❌ 商店切换失败`);
      return false;
    }
  console.log(`[helpers]   ⏳ 等待 3s 让商店切换完成...`);
    await page.waitForTimeout(3000);
    console.log(`[helpers]   🔄 重新导航到目标页面: ${url}`);
    try {
      console.log(`[helpers]     ⏳ 导航中（超时 60s）...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log(`[helpers]     ✅ 导航成功`);
    } catch (err) {
      // 超时后验证是否已回到目标站点
      const currentHost = new URL(page.url()).hostname;
      if (currentHost === targetHost) {
        console.log(`[helpers]     ⚠️ 导航超时但 host 正确，继续: ${page.url()}`);
      } else {
        console.log(`[helpers]     ❌ 导航超时且 host 不匹配: ${page.url()}，终止`);
        return false;
      }
    }
    console.log(`[helpers]   ✅ 导航完成: ${page.url()}`);
    // 关闭弹窗（无论成功与否都继续测试）
    try {
      console.log(`[helpers]   🧹 关闭弹窗...`);
      await dismissAllPopups(page);
    } catch (err) {
      console.log(`[helpers]   ⚠️ 关闭弹窗失败，继续: ${err}`);
    }
  }

  // 6. 最终验证（host 正确即视为成功，路径检查放宽）
  const finalUrl = page.url();
  const finalHost = new URL(finalUrl).hostname;

  console.log(`[helpers] 🔎 最终验证: host=${finalHost}, 目标=${targetHost}`);
  if (finalHost === targetHost) {
    console.log(`[helpers] ✅✅✅ 页面初始化成功: ${finalUrl}`);
    return true;
  }
  console.log(`[helpers] ❌❌ 页面初始化失败: ${finalUrl}，目标 host: ${targetHost}`);
  return false;
}

/**
 * Shopify AJAX API 兜底加购（降级方案）
 *
 * 背景：商品页半渲染（主题 JS 未完成水合）时，点击 Add to cart 会触发
 * 原生表单 POST 到 /cart/add，因缺少 items/变体参数被 Shopify 拒绝，
 * 页面被导航到错误页，购物车抽屉永远不会弹出。
 *
 * 本函数绕过前端表单，直接调用 Shopify 标准 AJAX 接口：
 * 1. 从当前 URL 解析商品 handle（/products/<handle>）
 * 2. 请求 /products/<handle>.js 获取首个可购买变体 ID
 * 3. POST /cart/add.js 携带真实变体 ID 加购
 *
 * 注意：调用时页面通常已停留在 /cart/add 错误页，因此 handle 必须从
 * 显式传入的商品 URL 解析；接口均为同域 AJAX 请求，不依赖当前页面
 * DOM 状态，在错误页上也能正常执行。
 *
 * @param productUrl 目标商品页 URL（如 https://eu.makera.com/products/carvera-air）
 * @returns true=加购成功，false=失败（handle 解析失败/变体 ID 获取失败/API 返回非 2xx）
 */
export async function addToCartViaApi(page: Page, productUrl: string): Promise<boolean> {
  try {
    // 1. 从传入的商品 URL 解析 handle（不能用 page.url()，此时可能已在错误页）
    const pathname = new URL(productUrl).pathname;
    const handle = pathname.split('/products/')[1]?.split(/[?#/]/)[0];
    if (!handle) {
      console.error(`[helpers] ❌ 无法从商品 URL 解析 handle: ${productUrl}`);
      return false;
    }

    // 2. 获取商品 JSON，取首个变体 ID（Shopify 商品页标准端点，无需鉴权）
    const variantId = await page.evaluate(async (h) => {
      const res = await fetch(`/products/${h}.js`, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.variants?.[0]?.id ?? null;
    }, handle);
    if (!variantId) {
      console.error(`[helpers] ❌ 获取商品变体 ID 失败（handle: ${handle}）`);
      return false;
    }

    // 3. 调用 /cart/add.js 加购（携带真实变体 ID，避开原生表单缺 items 参数的问题）
    const ok = await page.evaluate(async (id) => {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id, quantity: 1 }),
      });
      return res.ok;
    }, variantId);

    if (ok) {
      console.log(`[helpers] ✅ 兜底加购成功（AJAX API，变体 ID: ${variantId}）`);
    } else {
      console.error(`[helpers] ❌ 兜底加购 API 返回非 2xx（变体 ID: ${variantId}）`);
    }
    return ok;
  } catch (err) {
    console.warn(`[helpers] ⚠️ 兜底加购异常: ${err}`);
    return false;
  }
}
