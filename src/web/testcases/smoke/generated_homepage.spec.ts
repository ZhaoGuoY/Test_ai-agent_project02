// Makera 多站点回归测试 — 3 站点 × 1 用例 = 3 条
import { test, expect, Page } from '@playwright/test';

// ─── 辅助函数 ──────────────────────────────────────────────

/** 关闭幸运转盘弹窗（点击 X 按钮） */
async function dismissPopup(page: Page) {
  for (const sel of [
    'button:has-text("×")', 'button:has-text("✕")',
    '[aria-label="Close"]', '[aria-label="close"]',
    'text="No thanks"', 'text="Close"',
  ]) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
      return;
    }
  }
  // 兜底：JS 移除弹窗 DOM + Escape
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      const t = (el as HTMLElement).textContent || '';
      if ((t.includes('Spin Your Luck') || t.includes('幸运转盘')) && el.children.length > 2) {
        let top: HTMLElement = el as HTMLElement;
        for (let i = 0; i < 5; i++) { if (top.parentElement && top.parentElement !== document.body) top = top.parentElement; }
        top.remove();
      }
    });
    document.querySelectorAll('*').forEach(el => {
      if (getComputedStyle(el).position === 'fixed' && parseInt(getComputedStyle(el).zIndex) > 999) el.remove();
    });
    document.body.style.overflow = 'auto';
  }).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
}

/** 切换站点：多种方式检测并切换到目标站点 */
async function ensureCorrectStore(page: Page, targetStore: string) {
  const target = targetStore.toUpperCase();

  // 方式1：检测 "Select the store" 弹窗（IP 跳转时 Shopify 弹出）
  const dialog = page.getByRole('dialog').filter({ hasText: /select.*store|choose.*store|select a store|pick a store/i });
  if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
    const option = dialog.getByText(targetStore, { exact: false }).first();
    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
      await option.click();
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
      await dismissPopup(page);
      return;
    }
  }

  // 方式2：检测 header 区域按钮（US/EU/Global），点击后选择目标站点
  const regionBtn = page.locator('header, [class*="header"], [class*="locale"], [class*="region"]')
    .getByText(/^(US|EU|Global|United States|Europe|International)/i).first();
  if (await regionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    const txt = (await regionBtn.textContent() || '').toUpperCase();
    const match = txt.includes(target) ||
                  (target === 'US' && (txt.includes('UNITED') || txt.includes('AMERICA'))) ||
                  (target === 'EU' && txt.includes('EUROPE'));
    if (!match) {
      await regionBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
      // 在弹出的下拉/弹窗中选择目标站点
      const option = page.getByText(targetStore, { exact: false }).first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
      }
      await dismissPopup(page);
      return;
    }
  }

  // 方式3：JS 兜底 — 遍历页面所有可点击元素，找包含目标站点名的链接/按钮
  const switched = await page.evaluate((storeName) => {
    const name = storeName.toUpperCase();
    const candidates = Array.from(document.querySelectorAll('a, button, [role="button"], [role="menuitem"], li, span'));
    for (const el of candidates) {
      const t = (el as HTMLElement).innerText || (el as HTMLElement).textContent || '';
      if (t.toUpperCase().includes(name) && (el as HTMLElement).offsetParent !== null) {
        (el as HTMLElement).click();
        return true;
      }
    }
    return false;
  }, targetStore).catch(() => false);

  if (switched) {
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await dismissPopup(page);
  }
}

/** 统一页面初始化：导航 → 关弹窗 → 验证域名 → 不匹配则重新导航（最多3次） */
async function setupPage(page: Page, url: string, targetStore: string) {
  const targetHost = new URL(url).hostname;
  for (let attempt = 0; attempt < 3; attempt++) {
    // 直接导航到目标URL（每次重试都重新导航，确保域名正确）
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await dismissPopup(page);

    // 检查当前域名是否匹配目标站点
    const currentHost = new URL(page.url()).hostname;
    if (currentHost === targetHost) {
      // 域名匹配，再尝试通过UI确认站点（处理页面内显示其他站点的情况）
      await ensureCorrectStore(page, targetStore);
      await dismissPopup(page);
      // 最终域名验证
      const finalHost = new URL(page.url()).hostname;
      if (finalHost === targetHost) break;
    } else {
      // 域名不匹配（IP跳转），尝试通过UI切换
      await ensureCorrectStore(page, targetStore);
      await dismissPopup(page);
      // 如果UI切换后域名仍不匹配，直接重新导航到目标URL
      const afterSwitchHost = new URL(page.url()).hostname;
      if (afterSwitchHost !== targetHost) {
        // UI切换失败，强制重新导航
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
        await dismissPopup(page);
        const retryHost = new URL(page.url()).hostname;
        if (retryHost === targetHost) break;
      } else {
        break;
      }
    }
    await page.waitForTimeout(2000);
  }
}

// ─── 测试配置（3 站点 × 1 用例 = 3 条） ───────────────────

const sites = [
  { name: 'US', url: 'https://www.makera.com/products/carvera', store: 'US' },
  { name: 'EU', url: 'https://eu.makera.com/products/carvera-air', store: 'EU' },
  { name: 'Global', url: 'https://global.makera.com/products/makera-z1-desktop-cnc', store: 'Global' },
];

// ─── 测试用例 ────────────────────────────────────────────

for (const site of sites) {
  test.describe(`${site.name} 站点`, () => {

    test('商品详情页 Add to cart 按钮稳定展示', async ({ page }) => {
      await setupPage(page, site.url, site.store);
      // 验证 URL 包含 /products/
      expect(page.url()).toContain('/products/');
      // 验证 Add to cart 按钮可见（.first() 解决多按钮严格模式冲突）
      const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
      await expect(addToCartBtn).toBeVisible({ timeout: 30000 });
    });

  });
}
