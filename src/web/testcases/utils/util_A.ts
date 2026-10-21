// src/web/testcases/utils/dismissPopups.ts
/**
 * 弹窗关闭工具集 + 商店切换器
 *
 * 职责：
 * - 关闭 "New to CNC?" 新手引导弹窗
 * - 关闭 Google 翻译弹窗
 * - 移除第三方客服悬浮按钮
 * - 关闭顶部导航 hover 下拉面板
 * - 移除整页隐形拦截层（pt-experience）
 * - 关闭 Cookie 同意遮罩
 * - 关闭幸运转盘弹窗（放在最后，避免遮挡其他弹窗的关闭按钮）
 * - 通过商店切换器 UI 切换到目标站点
 */
import { Page } from '@playwright/test';

/**
 * 关闭 "Hi? New to CNC?" 新手引导弹窗（US 站右下角悬浮引导卡片）
 *
 * 该弹窗固定定位在页面右下角，会遮挡 Add to cart 等关键按钮导致点击失败。
 * 关闭方式：定位弹窗右上角 aria-label="Close" 的 button 并点击。
 * 找不到关闭按钮时兜底移除弹窗容器。
 */
export async function dismissGuidePopup(page: Page): Promise<void> {
  console.log(`[dismissPopups]   🔄 检查新手引导弹窗(New to CNC)...`);

  const closeSelectors = [
    '[data-silex-id] button[aria-label="Close" i]',
    '[class*="paged-element"] button[aria-label="Close" i]',
    'section[class*="page-page-"] button[aria-label="Close" i]',
  ];
  for (const selector of closeSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click({ timeout: 5000 }).catch(() => {});
      console.log(`[dismissPopups]   ✅ 已关闭新手引导弹窗（点击关闭按钮 ${selector}）`);
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
    console.log(`[dismissPopups]   ✅ 已移除新手引导弹窗容器（关闭按钮未找到，兜底移除）`);
    await page.waitForTimeout(200);
    return;
  }

  console.log(`[dismissPopups]   ℹ️ 未发现新手引导弹窗`);
}

/**
 * 循环关闭 "New to CNC?" 新手引导弹窗，直到页面上确认彻底消失
 *
 * 该弹窗由 Silex 脚本延迟注入且会反复重新显示，单次关闭不可靠。
 * @returns true = 弹窗已确认不存在/已关闭；false = rounds 轮后弹窗仍可见
 */
export async function dismissGuidePopupLoop(page: Page, rounds = 5): Promise<boolean> {
  const marker = page.locator('text=/New to CNC|CNC Basics 101/i').first();
  for (let round = 1; round <= rounds; round++) {
    const visible = await marker.isVisible({ timeout: 500 }).catch(() => false);
    if (!visible) {
      if (round === 1) console.log(`[dismissPopups]   ℹ️ 新手引导弹窗不存在，无需循环关闭`);
      else console.log(`[dismissPopups]   ✅ 第${round - 1}轮关闭后确认弹窗已消失`);
      return true;
    }
    console.log(`[dismissPopups]   🔄 第${round}/${rounds}轮循环关闭新手引导弹窗...`);
    await dismissGuidePopup(page);
    await page.waitForTimeout(500);
  }
  const stillVisible = await marker.isVisible({ timeout: 500 }).catch(() => false);
  if (stillVisible) console.warn(`[dismissPopups]   ⚠️ ${rounds}轮循环关闭后新手引导弹窗仍可见`);
  return !stillVisible;
}

/**
 * 关闭 Google 翻译弹窗（精确选择器优先，失败则暴力移除）
 */
async function dismissGoogleTranslate(page: Page): Promise<void> {
  console.log(`[dismissPopups]   🔄 检查 Google 翻译弹窗...`);
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
      await btn.click({ timeout: 5000 }).catch(() => {});
      console.log(`[dismissPopups]   ✅ 已关闭 Google 翻译弹窗（选择器: ${selector}）`);
      await page.waitForTimeout(300);
      return;
    }
  }

  try {
    await page.evaluate(() => {
      const elements = document.querySelectorAll(
        '.goog-te-balloon-frame, .goog-te-banner, .skiptranslate, ' +
        '#google_translate_element, [class*="translation"]'
      );
      elements.forEach(el => el.remove());
    });
  } catch {
    // 页面处于错误状态（about:blank 等）时 evaluate 可能失败，安全忽略
  }
  console.log(`[dismissPopups]   ✅ 已暴力移除 Google 翻译弹窗`);
}

/**
 * 移除第三方客服悬浮按钮（右下角对话气泡小部件）
 *
 * 该悬浮按钮固定定位在页面右下角，会遮挡 Add to cart 等按钮。
 * 策略：优先点击其关闭按钮，失败则 JS 暴力移除。
 */
export async function dismissChatWidget(page: Page): Promise<void> {
  console.log(`[dismissPopups]   🔄 检查客服悬浮按钮...`);
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
      console.log(`[dismissPopups]   ✅ 已点击客服悬浮部件关闭按钮（选择器: ${selector}）`);
      await page.waitForTimeout(300);
    }
  }

  await page.evaluate(() => {
    const removeBySelector = (sel: string) => {
      document.querySelectorAll(sel).forEach(el => (el as HTMLElement).remove());
    };
    removeBySelector(
      '[id*="chat-widget" i], [id*="chatwidget" i], [class*="chat-launcher" i], ' +
      '[class*="chatLauncher" i], [class*="messenger" i], [id*="intercom" i], ' +
      '[id*="crisp" i], [class*="crisp" i], [id*="tawk" i], [id*="lazychat" i], ' +
      '[id*="button-io" i], [id*="ButtonWidget" i], [class*="button-widget" i]'
    );
    const vw = window.innerWidth, vh = window.innerHeight;
    document.querySelectorAll('div, button, iframe').forEach(el => {
      const htmlEl = el as HTMLElement;
      const style = window.getComputedStyle(htmlEl);
      if (style.position !== 'fixed' || style.display === 'none' || style.visibility === 'hidden') return;
      const rect = htmlEl.getBoundingClientRect();
      if (rect.width > 0 && rect.width <= 120 && rect.height > 0 && rect.height <= 120 &&
          rect.left >= vw - 200 && rect.top >= vh - 200) {
        htmlEl.remove();
      }
    });
  }).catch(() => {});
  console.log(`[dismissPopups]   ✅ 客服悬浮按钮处理完成`);
}

/**
 * 关闭顶部导航 hover 下拉面板（megaMenu）
 *
 * 将鼠标移到下方阴影遮罩区域使其失去 hover 焦点自动收起；JS 兜底移除仍未收起的浮层。
 */
export async function dismissNavDropdown(page: Page): Promise<void> {
  console.log(`[dismissPopups]   🔄 检查顶部导航下拉...`);
  const vp = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.mouse.move(vp.width / 2, vp.height * 0.75, { steps: 5 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    document.querySelectorAll(
      '[class*="megaMenu" i], [class*="mega-menu" i], nav [class*="dropdown" i]'
    ).forEach(el => {
      const htmlEl = el as HTMLElement;
      const style = window.getComputedStyle(htmlEl);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (style.position !== 'fixed' && style.position !== 'absolute') return;
      const rect = htmlEl.getBoundingClientRect();
      if (rect.top < 200 && rect.height > 200 && rect.width > 300) {
        htmlEl.remove();
      }
    });
  }).catch(() => {});
  console.log(`[dismissPopups]   ✅ 顶部导航下拉处理完成`);
}

/**
 * 移除整页隐形拦截层（pt-experience 等体验脚本注入节点）
 *
 * 该层无视觉与交互价值，直接从 DOM 移除。
 */
export async function dismissExperienceOverlay(page: Page): Promise<void> {
  const removed = await page.evaluate(() => {
    const nodes = document.querySelectorAll('pt-experience, [class*="pt-experience"]');
    nodes.forEach((el) => el.remove());
    return nodes.length;
  }).catch(() => 0);
  if (removed > 0) console.log(`[dismissPopups]   ✅ 已移除 pt-experience 拦截层（${removed} 个节点）`);
}

/**
 * 关闭 Cookie 同意遮罩（Pandectes CMP 等）
 *
 * 点击 Accept 接受后即消失。
 */
export async function dismissCookieConsent(page: Page): Promise<void> {
  const acceptBtn = page
    .locator('pandectes-cmp, [aria-label="Cookie consent" i]')
    .getByRole('button', { name: /accept all|^accept$|agree|allow all/i })
    .first();
  const visible = await acceptBtn.isVisible({ timeout: 1500 }).catch(() => false);
  if (!visible) return;
  await acceptBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  console.log(`[dismissPopups]   ✅ 已关闭 Cookie 同意遮罩（点击 Accept）`);
}

/**
 * 关闭幸运转盘弹窗（精准选择器，仅针对幸运转盘）
 *
 * 放在 dismissAllPopups 最后执行，避免幸运转盘遮挡其他弹窗的关闭按钮。
 */
export async function dismissSpinPopup(page: Page): Promise<void> {
  console.log(`[dismissPopups]   🔄 检查幸运转盘...`);
  const closeSelectors = [
    'button.ecomsend-SpinWheel__Modal__CloseButton',
    'div.ecomsend-SpinWheel__Modal__CustomDialogWrapper button',
  ];
  for (const selector of closeSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 200 }).catch(() => false)) {
      await btn.click({ timeout: 5000 }).catch(() => {});
      console.log(`[dismissPopups]   ✅ 已关闭幸运转盘（选择器: ${selector}）`);
      await page.waitForTimeout(200);
      return;
    }
  }
  console.log(`[dismissPopups]   ℹ️ 未发现幸运转盘`);
}

/**
 * 通过商店切换器 UI 切换到目标站点（带循环重试）
 *
 * 依赖：dismissSpinPopup（已在本文件中定义）
 *
 * @param page Playwright 页面对象
 * @param targetUrl 目标 URL
 * @returns true=切换成功，false=失败
 */
export async function switchToTargetStore(page: Page, targetUrl: string): Promise<boolean> {
  console.log(`[storeSwitcher]  开始商店切换流程...`);
  const targetHost = new URL(targetUrl).hostname;
  const currentHost = new URL(page.url()).hostname;
  console.log(`[storeSwitcher]   当前 host: ${currentHost}, 目标 host: ${targetHost}`);

  // 根据目标网址确定选项文本（弹窗中选择目标商店）
  let targetStoreOption = 'US Store';
  if (targetHost.includes('eu')) {
    targetStoreOption = 'EU Store';
  } else if (targetHost.includes('global')) {
    targetStoreOption = 'Global Store';
  }

  console.log(`[storeSwitcher]   目标选项: "${targetStoreOption}"`);

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
  console.log(`[storeSwitcher]   ⏱️ 开始查找切换按钮（超时 30s）...`);

  // 循环查找切换按钮（超时 30 秒，每 2 秒重试）
  const buttonTimeout = 30000; // 30 秒超时
  const buttonStartTime = Date.now();
  let buttonFound = false;

  while (Date.now() - buttonStartTime < buttonTimeout) {
    const elapsed = Math.floor((Date.now() - buttonStartTime) / 1000);
    console.log(`[storeSwitcher]     🔍 第${Math.floor(elapsed/2)+1}次查找按钮（${elapsed}s/30s）`);

    // 每次查找前先关闭转盘，防止遮挡切换按钮
    await dismissSpinPopup(page);

    // 遍历所有候选按钮文本，逐一尝试查找
    let switcherButton = null;
    for (const btnText of buttonTextCandidates) {
      console.log(`[storeSwitcher]     🔄 尝试按钮文本: "${btnText}"`);
      const selectors = [
        `span:has-text("${btnText}")`,
        `.spicegems_switcher_list-flags`,
        `[class*="switcher"]`,
        `*:has-text("${btnText}"):not([target="_blank"])`,
        `button:has-text("${btnText}")`,
        `[aria-label*="store" i]`,
      ];
      for (const selector of selectors) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 300 }).catch(() => false)) {
          switcherButton = btn;
          console.log(`[storeSwitcher] ✅ 找到切换按钮（文本: "${btnText}", 选择器: ${selector}）`);
          break;
        }
      }
      if (switcherButton) break;
    }

    if (switcherButton) {
      buttonFound = true;
      console.log(`[storeSwitcher]     ✅ 找到按钮，点击打开弹窗...`);
      await switcherButton.click({ force: true, timeout: 5000 }); // force 点击，忽略转盘遮挡；显式超时防阻塞
      // 检测并关闭意外打开的新标签页（选择器可能匹配到带 target="_blank" 的链接）
      const pages = page.context().pages();
      if (pages.length > 1) {
        for (const p of pages) {
          if (p !== page) {
            await p.close().catch(() => {});
          }
        }
        console.log(`[storeSwitcher] ✅ 已关闭意外打开的标签页，回到主标签页`);
      }
      console.log(`[storeSwitcher]     等待 500ms 让弹窗渲染...`);
      await page.waitForTimeout(500); // 等弹窗渲染，立即进入查找
      console.log(`[storeSwitcher]     ✅ 弹窗已打开，进入选项查找`);
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
    console.log(`[storeSwitcher] 🔍 页面按钮(含store/country等关键词): ${JSON.stringify(debugInfo.buttons)}`);
    console.log(`[storeSwitcher]  切换器元素: ${JSON.stringify(debugInfo.switchers)}`);

    console.log(`[storeSwitcher]     ⚠️ 本轮未找到按钮，等待 2s 重试...`);
    await page.waitForTimeout(2000);
  }

  if (!buttonFound) {
    console.error(`[storeSwitcher] ❌ 30 秒超时仍未找到商店切换按钮`);
    return false;
  }

  console.log(`[storeSwitcher]   ⏱️ 开始查找商店选项（超时 15s）...`);
  const optionTimeout = 15000; // 15 秒超时
  const optionStartTime = Date.now();

  while (Date.now() - optionStartTime < optionTimeout) {
    const elapsed = Math.floor((Date.now() - optionStartTime) / 1000);
    console.log(`[storeSwitcher]     🔍 第${Math.floor(elapsed/0.5)+1}次查找选项: "${targetStoreOption}"（${elapsed}s/15s）`);

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
    console.log(`[storeSwitcher]     📋 navLink: ${JSON.stringify(popupDebug.navLinks)}`);
    console.log(`[storeSwitcher]     rule-name: ${JSON.stringify(popupDebug.ruleNames)}`);
    console.log(`[storeSwitcher]     🔄 尝试 4 种选择器...`);

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
        console.log(`[storeSwitcher] ✅ 找到商店选项（选择器: ${sel}，数量: ${count}）`);
        break;
      }
    }

    if (storeOption) {
      console.log(`[storeSwitcher] ✅ 点击商店选项 "${targetStoreOption}" 切换...`);

      let navigationSuccess = false;

      // 禁用直接导航策略：data-destination 方式不会改变浏览器 IP，
      // Shopify 服务端检测到是 US IP 会把 global.makera.com 重定向回 www.makera.com
      // 必须通过真实点击触发 JS 切换逻辑，让服务器端记录地域偏好 cookie
      console.log(`[storeSwitcher]     ⚠️ 跳过 data-destination 直接导航（会导致 IP 不匹配被重定向）`);

      // 回退策略：JS 派发 click（不受可见性限制）+ 常规点击重试，最多 3 次
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`[storeSwitcher]     🔄 第${attempt}次点击商店选项...`);
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
          console.log(`[storeSwitcher] ✅ 商店切换成功，URL: ${afterClickUrl}`);
          navigationSuccess = true;
          break;
        }
        console.log(`[storeSwitcher]     第${attempt}次点击后 URL 未变化: ${afterClickHost}，重试...`);
      }

      if (navigationSuccess) return true;

      // 3 次点击后仍未跳转，最后用 waitForURL 等 10s
      try {
        await page.waitForURL((url) => url.hostname === targetHost, { timeout: 10000 });
        console.log(`[storeSwitcher] ✅ 商店切换成功（延迟跳转），URL: ${page.url()}`);
        return true;
      } catch (err) {
        const currentUrl = page.url();
        const currentHost = new URL(currentUrl).hostname;
        if (currentHost === targetHost) {
          console.log(`[storeSwitcher] ✅ 商店切换成功（超时后确认），URL: ${currentUrl}`);
          return true;
        }
        console.error(`[storeSwitcher]  切换后 URL 未匹配目标: ${targetHost}，当前: ${currentUrl}`);
        return false;
      }
    }

    console.log(`[storeSwitcher]     ⚠️ 本轮未找到选项，等待 0.5s 重试...`);
    await page.waitForTimeout(500);
  }

  console.error(`[storeSwitcher] ❌ 15 秒超时仍未找到商店选项`);
  return false;
}

/**
 * 关闭所有已知弹窗
 *
 * 执行顺序：新手引导 → Google翻译 → 客服悬浮 → 导航下拉 → 拦截层 → Cookie同意 → 幸运转盘（最后）
 * 幸运转盘放在最后，避免其遮挡其他弹窗的关闭按钮导致关闭失败。
 */
export async function dismissAllPopups(page: Page): Promise<void> {
  console.log(`[dismissPopups]  开始关闭所有弹窗...`);
  await dismissGuidePopup(page);
  await dismissGoogleTranslate(page);
  await dismissChatWidget(page);
  await dismissNavDropdown(page);
  await dismissExperienceOverlay(page);
  await dismissCookieConsent(page);
  await dismissSpinPopup(page);
  await page.waitForTimeout(300);
  console.log(`[dismissPopups]   弹窗处理完成`);
}
