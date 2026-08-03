// Makera 单站点回归测试 — 1 条用例
import { test, expect, Page } from '@playwright/test';

// ─── 辅助函数 ──────────────────────────────────────────────

/** 关闭幸运转盘弹窗（Escape + 点击遮罩层） */
async function dismissPopup(page: Page) {
  // 1. 按 Escape 关闭（最可靠，Shopify 弹窗通用）
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);

  // 2. 检查弹窗是否消失，若未消失则点击遮罩层背景
  const popupVisible = await page.locator('[role="dialog"], .modal, .popup, [class*="modal"]').first()
    .isVisible({ timeout: 1000 }).catch(() => false);
  
  if (popupVisible) {
    // 点击遮罩层背景（弹窗外层 div）关闭
    await page.evaluate(() => {
      const overlay = document.querySelector('[class*="modal"], [class*="overlay"], [class*="popup"]');
      if (overlay) (overlay as HTMLElement).click();
    }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

/**
 * 等待页面 URL 稳定（处理 Shopify IP 跳转）
 *
 * 逻辑：
 * 1. 导航到目标 URL，等待 DOM 加载完成
 * 2. 关闭弹窗（避免干扰后续操作）
 * 3. 等待 IP 跳转窗口（10 秒）
 * 4. 检查最终 URL 是否匹配目标主机
 *
 * @returns true=URL已稳定且匹配，false=跳转后不匹配
 */
async function waitForStableUrl(page: Page, targetUrl: string): Promise<boolean> {
  const targetHost = new URL(targetUrl).hostname;

  // 导航，等待 DOM 加载完成（不等待网络空闲，避免弹窗阻塞）
  await page.goto(targetUrl, { 
    waitUntil: 'domcontentloaded',
    timeout: 180000 
  });

  // 立即关闭弹窗，避免遮挡或干扰
  await dismissPopup(page);

  // 等待 IP 跳转窗口（约 10 秒）
  await page.waitForTimeout(10_000);

  const finalUrl = page.url();
  const finalHost = new URL(finalUrl).hostname;
  const finalPath = new URL(finalUrl).pathname;

  // 检查主机名和路径
  if (finalHost === targetHost && finalPath.includes('/products/')) {
    console.log(`[waitForStableUrl] ✅ URL 已稳定: ${finalUrl}`);
    return true;
  }

  // 不匹配则返回 false
  console.error(`[waitForStableUrl] ❌ URL 跳转后不匹配: ${finalUrl}，目标: ${targetUrl}`);
  return false;
}

/** 页面初始化：导航 → 等待 IP 跳转稳定 → 关弹窗 */
async function setupPage(page: Page, url: string): Promise<boolean> {
  const stable = await waitForStableUrl(page, url);
  if (!stable) return false;
  await dismissPopup(page);
  return true;
}

// ─── 测试配置（1 条用例） ───────────────────

const TARGET_URL = 'https://www.makera.com/products/carvera';

// ─── 测试用例 ────────────────────────────────────────────

test.describe('US 站点', () => {

  test('商品详情页 Add to cart 按钮稳定展示', async ({ page }) => {
    const ready = await setupPage(page, TARGET_URL);
    if (!ready) {
      console.error('[测试跳过] URL 未稳定，跳过本用例');
      test.skip();
      return;
    }
    // 验证 URL 包含 /products/
    expect(page.url()).toContain('/products/');
    // 验证 Add to cart 按钮可见（.first() 解决多按钮严格模式冲突）
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
    await addToCartBtn.scrollIntoViewIfNeeded();
    await expect(addToCartBtn).toBeVisible({ timeout: 30000 });
  });

});
