// src/web/testcases/smoke/helpers.ts
/**
 * 多站点测试共享辅助函数1
 *
 * 职责：
 * - 关闭幸运转盘弹窗（优先点击 ×，失败则点击遮罩层或 Escape）
 * - 关闭 Google 翻译弹窗（精确选择器优先，失败则暴力移除）
 * - 通过商店切换器 UI 切换回目标站点（循环检测+重试）
 * - 页面初始化（导航 → 循环检测跳转 → 循环查找切换按钮 → 验证）
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
      await btn.click();
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
      await btn.click();
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
 * 关闭所有已知弹窗
 */
async function dismissAllPopups(page: Page): Promise<void> {
  console.log(`[helpers]  🧹 开始关闭所有弹窗...`);
  await dismissSpinPopup(page);
  await dismissGoogleTranslate(page);
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
      await switcherButton.click({ force: true }); // force 点击，忽略转盘遮挡
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
        await storeOption.click({ force: true });
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
