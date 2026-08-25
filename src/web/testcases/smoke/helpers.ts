// src/web/testcases/smoke/helpers.ts
/**
 * 多站点测试共享辅助函数1
 *
 * 职责：
 * - 关闭幸运转盘弹窗（优先点击 ×，失败则点击遮罩层或 Escape）
 * - 关闭 "New to CNC?" 新手引导弹窗（US 站右下角，遮挡 Add to cart）
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
 * 关闭 "Hi? New to CNC?" 新手引导弹窗（US 站右下角悬浮引导卡片）
 *
 * 该弹窗固定定位在页面右下角，会遮挡 Add to cart 等关键按钮导致点击失败。
 *
 * 关闭方式（简单直接）：弹窗右上角的关闭 X 就是一个 <button> 元素，
 * 特征为 aria-label="Close"。直接定位这个 button 并点击即可关闭，
 * 限定在弹窗容器（data-silex-id / paged-element 特征）内查找，
 * 避免误点页面上其他的 Close 按钮。
 *
 * 弹窗由站点脚本延迟注入且可能反复重新弹出，因此点击关键按钮前
 * 由 dismissGuidePopupLoop 循环调用本函数；找不到关闭按钮时
 * 兜底移除弹窗容器（仅删含特征文本的 Silex 容器，不做几何暴力删除）。
 *
 * 该弹窗目前仅在 US 站（www.makera.com）出现，EU/Global 未来也可能启用，
 * 因此封装在共享 helpers 中由 dismissAllPopups 统一调用；
 * 其他站点不存在时安全跳过（无匹配元素即无操作，无副作用）。
 */
export async function dismissGuidePopup(page: Page): Promise<void> {
  console.log(`[helpers]   🔄 检查新手引导弹窗(New to CNC)...`);

  // 定位弹窗关闭按钮：元素类型就是 button，aria-label="Close"；
  // 优先限定在弹窗容器特征内查找，找不到再放宽到全页面
  const closeSelectors = [
    '[data-silex-id] button[aria-label="Close" i]',
    '[class*="paged-element"] button[aria-label="Close" i]',
    'section[class*="page-page-"] button[aria-label="Close" i]',
  ];
  for (const selector of closeSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click({ timeout: 5000 }).catch(() => {});
      console.log(`[helpers]   ✅ 已关闭新手引导弹窗（点击关闭按钮 ${selector}）`);
      await page.waitForTimeout(300);
      return;
    }
  }

  // 兜底：关闭按钮未找到但弹窗本体可见时，移除含特征文本的弹窗容器
  const marker = page.locator('text=/New to CNC|CNC Basics 101/i').first();
  if (await marker.isVisible({ timeout: 500 }).catch(() => false)) {
    await page.evaluate(() => {
      for (const child of Array.from(document.body.children).reverse()) {
        const el = child as HTMLElement;
        if (!/New to CNC|CNC Basics 101/i.test(el.innerText ?? '')) continue;
        const hasSilexMark =
          el.matches('[data-silex-id], [class*="paged-element"], section[class*="page-page-"]') ||
          el.querySelector('[data-silex-id], [class*="paged-element"]') !== null;
        if (!hasSilexMark) continue;
        el.remove();
        break;
      }
    }).catch(() => {});
    console.log(`[helpers]   ✅ 已移除新手引导弹窗容器（关闭按钮未找到，兜底移除）`);
    await page.waitForTimeout(200);
    return;
  }

  console.log(`[helpers]   ℹ️ 未发现新手引导弹窗`);
}

/**
 * 循环关闭 "New to CNC?" 新手引导弹窗，直到页面上确认彻底消失
 *
 * 背景：该弹窗由 Silex 脚本延迟注入且会反复重新显示，单次关闭不可靠；
 * 因此在寻找 Add to cart 等关键按钮前用本函数循环清理——每轮执行一次
 * dismissGuidePopup 后立即用文本标记检测弹窗是否仍可见，可见则等待后
 * 再关一轮，最多 rounds 轮；找不到弹窗立即返回 true。
 *
 * @returns true = 弹窗已确认不存在/已关闭；false = rounds 轮后弹窗仍可见
 *          （调用方可据此决定重新调用本函数再次循环关闭）
 */
export async function dismissGuidePopupLoop(page: Page, rounds = 5): Promise<boolean> {
  // 弹窗可见性标记：特征文本定位（Silex/非 Silex 两种形态通用）
  const marker = page.locator('text=/New to CNC|CNC Basics 101/i').first();
  for (let round = 1; round <= rounds; round++) {
    // 先检测：弹窗不存在则无需关闭，直接返回
    const visible = await marker.isVisible({ timeout: 500 }).catch(() => false);
    if (!visible) {
      if (round === 1) console.log(`[helpers]   ℹ️ 新手引导弹窗不存在，无需循环关闭`);
      else console.log(`[helpers]   ✅ 第${round - 1}轮关闭后确认弹窗已消失`);
      return true;
    }
    console.log(`[helpers]   🔄 第${round}/${rounds}轮循环关闭新手引导弹窗...`);
    await dismissGuidePopup(page);
    // 关闭动作后留 500ms 给关闭动画/DOM 收尾，下一轮开头再确认
    await page.waitForTimeout(500);
  }
  const stillVisible = await marker.isVisible({ timeout: 500 }).catch(() => false);
  if (stillVisible) console.warn(`[helpers]   ⚠️ ${rounds}轮循环关闭后新手引导弹窗仍可见`);
  return !stillVisible;
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
 * 关闭所有已知弹窗（幸运转盘 + 新手引导 + Google 翻译 + 客服悬浮按钮 + 导航 hover 下拉）
 *
 * 导出供 spec 文件在点击关键按钮的每轮重试前循环调用，
 * 应对延迟弹出的浮窗遮挡导致的点击失败。
 */
export async function dismissAllPopups(page: Page): Promise<void> {
  console.log(`[helpers]  🧹 开始关闭所有弹窗...`);
  await dismissSpinPopup(page);
  await dismissGuidePopup(page);
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

  console.log(`[helpers]    按钮文本: "${currentButtonText}", 目标选项: "${targetStoreOption}"`);

  // 按钮文本候选列表：页面被 IP 重定向后，切换按钮显示的文本可能与预期不同，
  // 因此准备多个候选文本依次尝试，提高查找成功率
  const buttonTextCandidates = currentHost.includes('eu')
    ? ['EU', 'Europe', 'EU Store', 'European Union']
    : currentHost.includes('global')
    ? ['Global', 'Global Store', 'International', 'Rest of World']
    : [
        // www.makera.com 可能被重定向到任意地区，需要覆盖所有可能的按钮文本
        'United States (EN)', 'US', 'US Store', 'United States', 'America',
        'Global', 'Global Store', 'International', 'Rest of World',
        'EU', 'Europe', 'EU Store', 'European Union'
      ];
  console.log(`[helpers]   ⏱️ 开始查找切换按钮（超时 30s）...`);

  // 循环查找切换按钮（超时 30 秒，每 2 秒重试）
  const buttonTimeout = 30000; // 30 秒超时
  const buttonStartTime = Date.now();
  let buttonFound = false;

  while (Date.now() - buttonStartTime < buttonTimeout) {
    const elapsed = Math.floor((Date.now() - buttonStartTime) / 1000);
    console.log(`[helpers]     🔍 第${Math.floor(elapsed/2)+1}次查找按钮（${elapsed}s/30s）`);

    // 每次查找前先关闭转盘，防止遮挡切换按钮
    await dismissSpinPopup(page);

    // 遍历所有候选按钮文本，逐一尝试查找
    let switcherButton = null;
    let matchedText = '';
    for (const btnText of buttonTextCandidates) {
      console.log(`[helpers]     🔄 尝试按钮文本: "${btnText}"`);
      const selectors = [
        `span:has-text("${btnText}")`,
        `.spicegems_switcher_list-flags`,
        `[class*="switcher"]`,
        `*:has-text("${btnText}")`,
        `button:has-text("${btnText}")`,
        `[aria-label*="store" i]`,
      ];
      for (const selector of selectors) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 300 }).catch(() => false)) {
          switcherButton = btn;
          matchedText = btnText;
          console.log(`[helpers] ✅ 找到切换按钮（文本: "${btnText}", 选择器: ${selector}）`);
          break;
        }
      }
      if (switcherButton) break;
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

    // 调试：打印页面所有按钮文本，帮助排查按钮文本不匹配问题
    const debugInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], span, a'))
        .map(b => b.textContent?.trim())
        .filter(t => t && t.length < 50 && /store|country|region|united|global|eu|europe|america/i.test(t));
      const switchers = Array.from(document.querySelectorAll('[class*="switcher"], [class*="spicegems"]'))
        .map(el => ({ tag: el.tagName, text: el.textContent?.trim()?.substring(0, 60), class: el.className?.toString()?.substring(0, 60) }))
        .slice(0, 5);
      return { buttons: [...new Set(buttons)].slice(0, 15), switchers };
    });
    console.log(`[helpers] 🔍 页面按钮(含store/country等关键词): ${JSON.stringify(debugInfo.buttons)}`);
    console.log(`[helpers] 🔍 切换器元素: ${JSON.stringify(debugInfo.switchers)}`);

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

      let navigationSuccess = false;

      // 优先策略：navLink 自带 data-destination 目标 URL，且该元素默认隐藏、
      // 仅在 hover 时渲染（曾导致 locator.click: Element is not visible，
      // Playwright 在点击瞬间仍会校验可见性，force 也无法绕过），
      // 因此直接读取目标 URL 导航，最可靠地绕开点击可见性问题
      const destination = await storeOption.getAttribute('data-destination').catch(() => null);
      if (destination && new URL(destination).hostname === targetHost) {
        console.log(`[helpers]     🔗 读取到 data-destination，直接导航: ${destination}`);
        try {
          await page.goto(destination, { waitUntil: 'domcontentloaded', timeout: 60000 });
          const afterGotoHost = new URL(page.url()).hostname;
          if (afterGotoHost === targetHost) {
            console.log(`[helpers] ✅ 商店切换成功（直接导航），URL: ${page.url()}`);
            navigationSuccess = true;
          } else {
            console.warn(`[helpers]     ⚠️ 直接导航后 host 不符: ${afterGotoHost}`);
          }
        } catch (gotoErr) {
          console.warn(`[helpers]     ⚠️ 直接导航失败，回退点击方式: ${gotoErr}`);
        }
      }

      // 回退策略：JS 派发 click（不受可见性限制）+ 常规点击重试，最多 3 次
      if (!navigationSuccess) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`[helpers]     🔄 第${attempt}次点击商店选项...`);
          if (attempt % 2 === 1) {
            // JS click：元素已定位但隐藏/被遮挡时依然可触发其点击事件
            await storeOption.evaluate((el) => (el as HTMLElement).click()).catch(() => {});
          } else {
            await storeOption.click({ timeout: 5000 }).catch(() => {});
          }
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
 * 检测并自动通过 Cloudflare Turnstile 真人验证
 *
 * GitHub Actions 数据中心 IP 易触发 Cloudflare 验证页（"Verify you are human"），
 * 该函数检测验证页 → 点击 checkbox → 等待自动通过。
 * Turnstile 在浏览器指纹正常时通常点击即可通过；若要求额外挑战则无法自动通过，
 * 返回 false 但不阻断流程，由调用方决定是否终止。
 *
 * @returns true=验证通过或未遇到验证页；false=遇到验证页但未能通过
 */
export async function dismissCloudflareChallenge(page: Page, maxWaitMs = 30000): Promise<boolean> {
  console.log(`[helpers]   🔄 检查 Cloudflare 真人验证...`);

  // 检测是否在 Cloudflare 验证页（通过页面特征文本判断，timeout 放宽到 5s 确保 DOM 渲染完成）
  const isChallengePage = await page.locator('text=Verify you are human').first()
    .isVisible({ timeout: 5000 }).catch(() => false);

  if (!isChallengePage) {
    console.log(`[helpers]   ℹ️ 未检测到 Cloudflare 验证页`);
    return true;
  }

  console.log(`[helpers]   ️ 检测到 Cloudflare 验证页，尝试自动通过...`);

  // 策略1：直接点击页面中的 checkbox（Turnstile 新版直接渲染在页面 DOM 中，不在 iframe 内）
  let clicked = false;
  try {
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.click({ timeout: 10000 });
    clicked = true;
    console.log(`[helpers]   ✅ 已点击页面 checkbox`);
  } catch {
    console.log(`[helpers]   ℹ️ 页面 checkbox 点击失败，尝试 iframe 方式...`);
  }

  // 策略2：兜底 — 通过 Turnstile iframe 定位 checkbox
  if (!clicked) {
    try {
      const iframeLocator = page.frameLocator('iframe[src*="challenges.cloudflare.com"]');
      const checkbox = iframeLocator.locator('input[type="checkbox"], [role="checkbox"]');
      await checkbox.first().click({ timeout: 10000 });
      clicked = true;
      console.log(`[helpers]   ✅ 已点击 Turnstile iframe 内 checkbox`);
    } catch {
      console.log(`[helpers]   ℹ️ iframe 内点击也失败，尝试 force 点击...`);
    }
  }

  // 策略3：兜底 — force 强制点击（绕过可见性限制）
  if (!clicked) {
    await page.locator('input[type="checkbox"]').first()
      .click({ force: true, timeout: 5000 }).catch(() => {});
    console.log(`[helpers]   ✅ 已 force 点击页面 checkbox`);
  }

  // 等待验证通过（验证页消失或跳转到目标页面）
  try {
    await page.waitForFunction(() => {
      return !document.body.innerText.includes('Verify you are human');
    }, { timeout: maxWaitMs });
    console.log(`[helpers]   ✅ Cloudflare 验证已通过`);
    return true;
  } catch {
    console.warn(`[helpers]   ⚠️ Cloudflare 验证超时未通过（${maxWaitMs}ms），可能需要人工介入`);
    return false;
  }
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

  // 1.5 检测并处理 Cloudflare 真人验证（GitHub Actions 数据中心 IP 易触发）
  const cfPassed = await dismissCloudflareChallenge(page);
  if (!cfPassed) {
    console.warn(`[helpers] ⚠️ Cloudflare 验证未通过，后续测试可能受影响`);
  }

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
    //    IP 地域跳转是服务端行为：单次切换成功后 goto 目标 URL 可能再次被弹回
    //    （如欧洲 IP 访问 www.makera.com 被 302 回 eu.makera.com），
    //    因此"切换+重新导航"整体最多重试 2 轮，第二轮时切换写入的地域偏好
    //    cookie 已生效，goto 通常不会再被弹回
    for (let round = 1; round <= 2; round++) {
      await page.waitForTimeout(3000); // 等待切换按钮出现
      const switched = await switchToTargetStore(page, url);
      if (!switched) {
        console.error(`[helpers] ❌ 商店切换失败（第${round}轮）`);
        if (round === 2) {
          // 商店切换器完全失败时，尝试直接导航到目标 URL（带缓存破坏参数）
          // 有时 Shopify 的地域 cookie 已在切换过程中设置，直接导航可能成功
          console.warn(`[helpers] ⚠️ 商店切换器失败，尝试直接导航兜底...`);
          const cacheBustUrl = `${url}?_t=${Date.now()}`;
          try {
            await page.goto(cacheBustUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await dismissCloudflareChallenge(page).catch(() => {});
            const directHost = new URL(page.url()).hostname;
            const directHasProductPath = page.url().includes('/products/');
            if (directHost === targetHost && directHasProductPath) {
              console.log(`[helpers] ✅ 直接导航兜底成功: ${page.url()}`);
              await dismissAllPopups(page).catch(() => {});
              return true;
            }
          } catch (directErr) {
            console.warn(`[helpers] ️ 直接导航兜底也失败: ${directErr}`);
          }
          return false;
        }
        continue;
      }
      console.log(`[helpers]   ⏳ 等待 3s 让商店切换完成...`);
      await page.waitForTimeout(3000);
      console.log(`[helpers]   🔄 重新导航到目标页面（第${round}轮）: ${url}`);
      try {
        console.log(`[helpers]     ⏳ 导航中（超时 60s）...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log(`[helpers]     ✅ 导航成功`);
        // 重新导航后也可能触发 Cloudflare 验证
        await dismissCloudflareChallenge(page).catch(() => {});
      } catch (err) {
        // 超时后验证是否已回到目标站点（host 正确且含 /products/）
        const currentUrl = page.url();
        const currentHost = new URL(currentUrl).hostname;
        const currentHasProductPath = currentUrl.includes('/products/');
        if (currentHost === targetHost && currentHasProductPath) {
          console.log(`[helpers]     ️ 导航超时但 host 和路径正确，继续: ${currentUrl}`);
        } else if (round === 2) {
          console.log(`[helpers]     ❌ 导航超时且 host 或路径不匹配: ${currentUrl}，终止`);
          return false;
        } else {
          console.warn(`[helpers]     ⚠️ 导航超时且 host 或路径不匹配，进入下一轮切换重试`);
          continue;
        }
      }
      // 导航后若再次被 IP 跳转弹回（host 不符或缺少 /products/），进入下一轮重新切换
      const afterNavUrl = page.url();
      const afterNavHost = new URL(afterNavUrl).hostname;
      const afterNavHasProductPath = afterNavUrl.includes('/products/');
      if (afterNavHost !== targetHost || !afterNavHasProductPath) {
        console.warn(`[helpers]     ⚠️ 重新导航后再次被 IP 跳转或路径不对: ${afterNavUrl}，进入第${round + 1}轮商店切换重试`);
        continue;
      }
      console.log(`[helpers]   ✅ 导航完成: ${page.url()}`);
      // 关闭弹窗（无论成功与否都继续测试）
      try {
        console.log(`[helpers]   🧹 关闭弹窗...`);
        await dismissAllPopups(page);
      } catch (err) {
        console.log(`[helpers]   ⚠️ 关闭弹窗失败，继续: ${err}`);
      }
      break;
    }
  }

  // 6. 最终验证（host 正确 且 URL 包含 /products/ 才视为成功）
  const finalUrl = page.url();
  const finalHost = new URL(finalUrl).hostname;
  const hasProductPath = finalUrl.includes('/products/');

  console.log(`[helpers]  最终验证: host=${finalHost}, 目标=${targetHost}, 含/products/=${hasProductPath}`);
  if (finalHost === targetHost && hasProductPath) {
    console.log(`[helpers] ✅✅✅ 页面初始化成功: ${finalUrl}`);
    return true;
  }

  // 7. 最终验证失败兜底：再走一轮商店切换 + 导航（此时切换 cookie 已存在，成功率高）
  console.warn(`[helpers] ⚠️ 最终验证失败（host=${finalHost}, 含/products/=${hasProductPath}），执行兜底重试`);
  const retried = await switchToTargetStore(page, url);
  if (retried) {
    await page.waitForTimeout(3000);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    // 兜底导航后也可能触发 Cloudflare 验证
    await dismissCloudflareChallenge(page).catch(() => {});
    const retryUrl = page.url();
    const retryHost = new URL(retryUrl).hostname;
    const retryHasProductPath = retryUrl.includes('/products/');
    if (retryHost === targetHost && retryHasProductPath) {
      console.log(`[helpers]   🧹 关闭弹窗...`);
      await dismissAllPopups(page).catch(() => {});
      console.log(`[helpers] ✅✅✅ 页面初始化成功（兜底重试）: ${retryUrl}`);
      return true;
    }
  }
  // 兜底2：商店切换器也失败时，尝试直接导航（带缓存破坏参数）
  console.warn(`[helpers] ⚠️ 商店切换兜底也失败，尝试直接导航...`);
  try {
    const cacheBustUrl = `${url}?_t=${Date.now()}`;
    await page.goto(cacheBustUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await dismissCloudflareChallenge(page).catch(() => {});
    const directUrl = page.url();
    const directHost = new URL(directUrl).hostname;
    const directHasProductPath = directUrl.includes('/products/');
    if (directHost === targetHost && directHasProductPath) {
      await dismissAllPopups(page).catch(() => {});
      console.log(`[helpers] ✅✅✅ 页面初始化成功（直接导航兜底）: ${directUrl}`);
      return true;
    }
  } catch (directErr) {
    console.warn(`[helpers] ⚠️ 直接导航兜底也失败: ${directErr}`);
  }
  console.log(`[helpers] ❌❌ 页面初始化失败: ${page.url()}，目标 host: ${targetHost}，期望含 /products/`);
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
