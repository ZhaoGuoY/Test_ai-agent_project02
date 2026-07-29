// 自动生成的测试脚本 - 2026-07-29T04:00:57.524Z
// 目标 URL: https://eu.makera.com/
import { test, expect } from '@playwright/test';

test.describe('自动生成 - 首页冒烟测试', () => {

  test('页面标题不为空', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('元素可见- Skip to content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Skip to content').first()).toBeVisible({ timeout: 5000 });
  });

  test('元素可见- English', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('English').first()).toBeVisible({ timeout: 5000 });
  });

});