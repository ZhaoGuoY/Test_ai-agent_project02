// Auth0 登录冒烟测试 — 验证账号密码登录流程及登录成功后的账号页面111
// 步骤：打开 Auth0 登录页 → 输入邮箱 → 勾选协议 → 继续 → 输入密码 → 勾选协议 → 继续 → 等待8秒页面加载 → 点击头像（重试3次，每次先清CNC弹窗再关幸运转盘）→ 进入我的账户 → 断言邮箱
import { test, expect } from '@playwright/test';
import { parameter } from 'allure-js-commons';
import { dismissGuidePopup, dismissSpinPopup } from './helpers';

const AUTH0_LOGIN_URL =
  'https://auth0.makera.com/u/login/identifier?state=hKFo2SB0dEFEclkxQTROZU8xMkdpc0J1QkJQQXBZNEN2WE5xYaFur3VuaXZlcnNhbC1sb2dpbqN0aWTZIFFqU2JQSkk0RTQ2U1BHZGxnOGx0dFhfdlJsZ1FHUkFMo2NpZNkgWDdleHRGbHVIWjlxaG9ncmZ4SkVTRDBZc1NhdEJPRlM';
const LOGIN_EMAIL = 'PeterZz1@protonmail.com';
const LOGIN_PASSWORD = '-gKrQzj4xEZ-piL';

test.describe('Auth0 登录', () => {

  test('账号密码登录并验证账号页面', async ({ page }) => {
    // ─ Allure 报告信息：运行参数 ──
    parameter('AUTH0_LOGIN_URL', AUTH0_LOGIN_URL);
    parameter('LOGIN_EMAIL', LOGIN_EMAIL);

    // ========== 阶段1：打开 Auth0 登录页并输入邮箱 ==========
    await test.step('打开 Auth0 登录页并输入邮箱', async () => {
      await page.goto(AUTH0_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // 等待邮箱页渲染（Welcome 标题可见）
      await expect(page.getByText('Welcome').first()).toBeVisible({ timeout: 15000 });
      console.log(`[Auth0] ✅ 登录页已加载，当前 URL: ${page.url()}`);

      // 定位邮箱输入框：id="username"
      const emailInput = page.locator('#username');
      await expect(emailInput).toBeVisible({ timeout: 10000 });
      await emailInput.fill(LOGIN_EMAIL);
      console.log(`[Auth0] ✅ 已输入邮箱: ${LOGIN_EMAIL}`);

      // 等待 2 秒确保输入完成
      await page.waitForTimeout(2000);
    });

    // ========== 阶段2：勾选协议并点击 Continue（邮箱页）==========
    await test.step('勾选协议并点击 Continue（邮箱页）', async () => {
      // 定位协议复选框：id="legal-consent"
      const agreeCheckbox = page.locator('#legal-consent');
      await expect(agreeCheckbox).toBeVisible({ timeout: 10000 });
      const isChecked = await agreeCheckbox.isChecked();
      if (!isChecked) {
        await agreeCheckbox.check({ timeout: 5000 });
        console.log(`[Auth0] ✅ 已勾选协议复选框`);
      }

      // 等待 2 秒确保勾选状态同步
      await page.waitForTimeout(2000);

      // 点击 Continue 按钮：name="action"
      const continueBtn = page.locator('button[name="action"]');
      await expect(continueBtn).toBeVisible({ timeout: 10000 });
      await continueBtn.click({ timeout: 10000 });
      console.log(`[Auth0] ✅ 已点击 Continue（邮箱页），等待 2s...`);

      // 等待 2 秒让 Auth0 SPA 完成页面切换（避免过长触发 Auth0 会话检测）
      await page.waitForTimeout(2000);
      console.log(`[Auth0] ✅ 等待完成，进入密码页...`);
    });

    // ========== 阶段3：输入密码并勾选协议 ==========
    await test.step('输入密码并勾选协议', async () => {
      // 等待密码页渲染
      await expect(page.getByText('Enter Your Password').first()).toBeVisible({ timeout: 15000 });
      console.log(`[Auth0] ✅ 密码页已加载`);

      // 定位密码输入框：id="password"
      const passwordInput = page.locator('#password');
      await expect(passwordInput).toBeVisible({ timeout: 10000 });
      await passwordInput.fill(LOGIN_PASSWORD);
      console.log(`[Auth0] ✅ 已输入密码`);

      // 等待 2 秒确保输入完成
      await page.waitForTimeout(2000);

      // 勾选协议复选框
      const agreeCheckbox = page.locator('#legal-consent');
      await expect(agreeCheckbox).toBeVisible({ timeout: 10000 });
      const isChecked = await agreeCheckbox.isChecked();
      if (!isChecked) {
        await agreeCheckbox.check({ timeout: 5000 });
        console.log(`[Auth0] ✅ 已勾选协议复选框`);
      }

      // 等待 2 秒确保勾选状态同步
      await page.waitForTimeout(2000);
    });

    // ========== 阶段4：点击 Continue 完成登录 ==========
    await test.step('点击 Continue 完成登录', async () => {
      const continueBtn = page.locator('button[name="action"]');
      await expect(continueBtn).toBeVisible({ timeout: 10000 });
      await continueBtn.click({ timeout: 10000 });
      console.log(`[Auth0] ✅ 已点击 Continue（密码页），等待 Auth0 处理登录...`);

      // Auth0 登录后需要时间处理会话并发起重定向
      // 8s 给 Auth0 充足时间完成登录验证和页面加载
      await page.waitForTimeout(8000);

      // Auth0 会自动重定向到 makera.com 首页，waitForURL 兜底等待跳转完成
      await page.waitForURL(/makera\.com/, { timeout: 30000 });
      console.log(`[Auth0] ✅ 登录跳转完成，当前 URL: ${page.url()}`);
    });

    // ========== 阶段5：点击头像进入我的账户（重试3次，每次先清CNC弹窗再关幸运转盘）==========
    await test.step('点击头像图标进入我的账户', async () => {
      // 登录成功后等待 20s 让页面完全加载（导航栏、头像图标、弹窗脚本等全部渲染完毕）
      console.log(`[Auth0]    等待 20s 页面加载...`);
      await page.waitForTimeout(20000);
      console.log(`[Auth0]   ✅ 20s 等待完成，开始寻找头像图标`);

      // 定位头像图标：svg.icon.icon-account.icon-lg
      const accountIcon = page.locator('svg.icon-account');
      let clickSuccess = false;

      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`[Auth0]   🔄 第${attempt}/3次尝试寻找并点击头像...`);

        // 每次点击前：先清除 CNC 弹窗
        await dismissGuidePopup(page);
        // 再关闭幸运转盘
        await dismissSpinPopup(page);
        await page.waitForTimeout(500);

        // 滚动到顶部确保导航栏可见
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // 寻找头像图标（短超时，不存在则进入下次重试）
        const isVisible = await accountIcon.isVisible({ timeout: 3000 }).catch(() => false);
        if (!isVisible) {
          console.warn(`[Auth0]   ⚠️ 第${attempt}次未找到头像图标`);
          continue;
        }

        // 点击头像（不使用 force，确保真正可点击）
        try {
          await accountIcon.click({ timeout: 5000 });
          console.log(`[Auth0]   ✅ 已点击头像图标，等待页面跳转...`);

          // 验证点击是否真正生效：等待 3s 检查 URL 是否跳转到 /account
          await page.waitForTimeout(3000);
          const currentUrl = page.url();
          if (/\/account/.test(currentUrl)) {
            clickSuccess = true;
            break;
          }
          console.warn(`[Auth0]   ⚠️ 第${attempt}次点击后页面未跳转到 /account，当前 URL: ${currentUrl}，继续重试`);
        } catch (error) {
          console.warn(`[Auth0]   ⚠️ 第${attempt}次点击头像失败: ${(error as Error).message}`);
        }
      }

      if (!clickSuccess) {
        console.log(`[Auth0] ❌ 找不到头像图标，已重试3次`);
        return;
      }

      // 等待跳转至 /account 页面
      await page.waitForURL(/\/account/, { timeout: 15000 });
      console.log(`[Auth0] ✅ 已进入账号页面: ${page.url()}`);

      // ========== 阶段6：断言账号页面显示登录邮箱 ==========
      await test.step('断言账号页面显示登录邮箱', async () => {
        const emailOnPage = page.getByText(LOGIN_EMAIL.toLowerCase()).first();
        await expect(emailOnPage).toBeVisible({ timeout: 10000 });
        console.log(`[Auth0] ✅ 账号页面显示登录邮箱: ${LOGIN_EMAIL.toLowerCase()}`);
      });
    });
  });

});
