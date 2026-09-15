// Auth0 登录冒烟测试 — 验证账号密码登录流程及登录成功后的账号页面
// 步骤：从商店账号页发起登录（站点自带新鲜 state 事务）→ 输入邮箱 → 勾选协议 → 继续 → 输入密码 → 勾选协议 → 继续 → 固定等待 20s（期间脚本不发起任何跳转）→ 页面加载完毕后轮询观察重定向链自然落到商店页（排除未登录弹回页 /account/login）→ 若已直接落在 /account 则跳过点击 → 否则等账号图标出现 + 导航静默 → 点击图标（重试 5 次，每次先清弹窗与拦截层，奇偶次普通/JS 点击互补）→ 被弹回登录页则原地重登一次 → 失败直接导航兜底 → 断言邮箱
import { test, expect, Page } from '@playwright/test';
import { parameter } from 'allure-js-commons';
import { dismissGuidePopup, dismissSpinPopup, dismissCloudflareChallenge, dismissExperienceOverlay, dismissCookieConsent } from './helpers';

// 登录入口 = 商店账号页（未登录时站点会自带新鲜 state + 事务 cookie 跳转到 Auth0 登录页）。
// ⚠️ 不再硬编码带 state 的 Auth0 深链：旧 state 是一次性事务，商店回调校验事务 cookie 失败时
// 会话根本不建立（实测 EU 回调链确定性失败、www 偶然容忍，表现为随机 flaky）；
// 锁定 www 入口同时避开 EU 站 SSO 链路与深链不兼容的问题
const STORE_ENTRY_URL = 'https://www.makera.com/account';
const LOGIN_EMAIL = 'PeterZz1@protonmail.com';
const LOGIN_PASSWORD = '-gKrQzj4xEZ-piL';

// 登录落地标记选择器：Cloudflare 边缘拦截页的文本特征，
// 覆盖 Turnstile 验证页（"Verify you are human" / "Just a moment"）与 403 硬拦截页两种文案
const CF_CHALLENGE_SELECTOR = 'text=/Verify you are human|Just a moment|Sorry, you have been blocked|Attention Required|Checking your browser/i';

// 竞态等待登录落地标记：返回先出现的标记（welcome=登录页 / challenge=Cloudflare 验证或拦截页），
// 15s 内两者都没出现返回 none（由阶段1决定自动过验证或 dump 页面摘要）
async function raceLoginMarkers(page: Page): Promise<'welcome' | 'challenge' | 'none'> {
  return Promise.race([
    page.getByText('Welcome').first().waitFor({ state: 'visible', timeout: 15000 }).then(() => 'welcome' as const),
    page.locator(CF_CHALLENGE_SELECTOR).first().waitFor({ state: 'visible', timeout: 15000 }).then(() => 'challenge' as const),
  ]).catch(() => 'none' as const);
}

// goto 网络层重试包装：net::ERR_TIMED_OUT 等瞬时网络失败属环境抖动
// （实测本地网络间歇性抖动：Chromium/OS 层同时不通、窗口期数十秒后自愈），
// 指数退避重试 4 次（3s/6s/12s/15s，跨度约 40s）覆盖抖动窗口；
// 非网络类错误立即抛出不掩盖真问题
async function gotoWithNetworkRetry(page: Page, url: string, retries = 4): Promise<void> {
  for (let i = 0; ; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      return;
    } catch (error) {
      const message = (error as Error).message;
      if (i >= retries || !/net::ERR_/.test(message)) throw error;
      const delay = Math.min(3000 * 2 ** i, 15000);
      console.warn(`[Auth0] ⚠️ goto 网络层失败（${message.split('\n')[0]}），${delay / 1000}s 后原地重试 ${i + 1}/${retries}...`);
      await page.waitForTimeout(delay);
    }
  }
}

// Auth0 账号密码登录全流程（阶段1-4）：登录页 → 邮箱 → 密码 → 跳回商店页。
// 抽成函数：阶段5 被弹回登录页时（站点未建立/清除了商店会话）可原地再调一次自愈
async function performAuth0Login(page: Page): Promise<void> {
  // ========== 阶段1：从商店账号页发起登录并输入邮箱 ==========
  await test.step('打开 Auth0 登录页并输入邮箱', async () => {
    // 未登录时 /account 会被站点 302 到 Auth0 登录页（自带新鲜 state），
    // goto 自动跟随重定向链，最终文档即登录页
    await gotoWithNetworkRetry(page, STORE_ENTRY_URL);
    // 落地后有两种结局：直接渲染登录页，或被 auth0.makera.com 前置的 Cloudflare 边缘拦截
    // （GitHub Actions 数据中心 IP 信任度低易命中；拦截页没有 Welcome 标题，直接断言必然超时）。
    // 因此对两个标记做 15s 竞态等待：登录页先出现则零额外开销；验证页先出现则自动过验证；
    // 两者都没出现则重新导航一次（边缘瞬时拦截/TLS 抖动重试可恢复），
    // 重试后仍没出现则立即 dump 页面摘要（URL/标题/正文前 500 字）便于 CI 日志定位拦截页或错误页。
    const welcome = page.getByText('Welcome').first();
    let firstHit = await raceLoginMarkers(page);
    if (firstHit === 'none') {
      console.log(`[Auth0] ⚠️ 登录页首次未渲染（疑似边缘瞬时拦截），重新导航一次...`);
      await gotoWithNetworkRetry(page, STORE_ENTRY_URL).catch(() => {});
      firstHit = await raceLoginMarkers(page);
    }

    if (firstHit === 'challenge') {
      console.log(`[Auth0] ⚠️ 命中 Cloudflare 验证页，尝试自动通过...`);
      const passed = await dismissCloudflareChallenge(page);
      if (!passed) console.error(`[Auth0] ❌ Cloudflare 验证未通过，当前 URL: ${page.url()}`);
    } else if (firstHit === 'none') {
      const dump = await page.evaluate(() => ({
        url: location.href,
        title: document.title,
        body: (document.body?.innerText ?? '').slice(0, 500),
      })).catch(() => null);
      throw new Error(`登录页 15s 内未渲染（Welcome 与 Cloudflare 验证页均未出现），页面摘要: ${JSON.stringify(dump)}`);
    }

    // 等待邮箱页渲染（Welcome 标题可见）
    await expect(welcome).toBeVisible({ timeout: 15000 });
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
    console.log(`[Auth0] ✅ 已点击 Continue（密码页），固定等待 20s（期间脚本不发起任何跳转）...`);

    // 固定等待 20s：云端更换执行网络后，登录重定向链（Auth0 → auto0 回调 → multipass → 商店）
    // 推进明显变慢；点击后立即轮询判定会把中间 hop（如根 `/`）误报为完成，
    // 随后阶段 5 的自行导航（点头像/兜底 goto）会打断进行中的回调链，会话建立失败
    // （实测回调链会在根与 /account/login 间振荡数十秒才自然落定）。
    // 期间脚本只等待：不 goto、不点击、不做任何会触发跳转的操作
    await page.waitForTimeout(20000);

    // 20s 期满后等当前文档加载完毕再继续下一步操作（回调中间页可能仍在加载）
    await page.waitForLoadState('domcontentloaded');
    console.log(`[Auth0] ✅ 20s 等待结束且页面加载完毕，当前 URL: ${page.url()}`);

    // 再页内轮询观察 URL 自然落到真正商店页：跳过 auth0 域与 /pages/auto0 中间回调页，
    // 并排除未登录弹回页 /account/login（旧判据把它误判为"登录跳转完成"，
    // 阶段 5/6 会对着空登录表单操作直至邮箱断言失败）；轮询只观察、不导航。
    // ⚠️ 不能用 waitForURL(/makera\.com/)：无锚正则调用时会立即命中中间页域名，
    // 使 waitForURL 退化为"等当前文档 load 事件"（Playwright Frame.waitForURL 实现），
    // 而商店首页 load 被第三方资源（pixel/iframe）拖很久不触发，造成假超时（本地与 CI 均实测命中）
    const landed = await page.waitForFunction(
      () => /^(www|eu|global)\.makera\.com$/.test(location.hostname)
        && !location.pathname.startsWith('/pages/auto0')
        && !location.pathname.startsWith('/account/login'),
      undefined,
      { timeout: 60000, polling: 500 },
    ).then(() => true).catch(() => false);
    await page.waitForLoadState('domcontentloaded');
    if (landed) {
      console.log(`[Auth0] ✅ 登录跳转完成，当前 URL: ${page.url()}`);
    } else {
      console.warn(`[Auth0] ⚠️ 观察 60s 重定向链仍未落到商店账号页（当前 URL: ${page.url()}），交由阶段 5 判定会话状态`);
    }
  });
}

// 阶段5 主体：等账号图标 → 等导航静默 → 最多 5 次点击头像（每次先清弹窗与拦截层、
// 奇偶次普通/JS 点击互补）。返回 'ok'=已到达 /account；'bounced'=被弹回 Auth0 登录页
// （站点未建立/清除商店会话，需调用方重新登录）；'failed'=点击均无效且未被弹回。
async function enterAccountByClicks(page: Page): Promise<'ok' | 'bounced' | 'failed'> {
  // 从商店 /account 发起的登录，回调后可能直接落回 /account（return_url），
  // 此时无需再点头像，直接视为成功
  if (/^https:\/\/(www|eu|global)\.makera\.com\/account(?!\/login)/.test(page.url())) {
    console.log(`[Auth0]   ✅ 登录后已直接落在账号页面，无需点击头像`);
    await page.waitForLoadState('domcontentloaded');
    return 'ok';
  }
  // 落在 /account/login = 未登录弹回页（会话未建立），与弹回 Auth0 同等对待交由调用方重登
  if (/^https:\/\/(www|eu|global)\.makera\.com\/account\/login/.test(page.url())) {
    console.warn(`[Auth0]   ⚠️ 登录后落在未登录弹回页 /account/login（会话未建立）`);
    return 'bounced';
  }

  // 导航栏账号图标：登录成功后任一商店 host 都会出现，但未登录态也存在，
  // 故图标只说明导航栏已渲染（不是会话凭证，会话以落地 /account 为准）。
  // 回调可能经中间页落地且首页水合慢，直接等图标出现：出现即继续、会话未建立即明确失败，
  // 替代原"固定 20s 盲等 + 3s 可见性探测"，不再盲等浪费时间也不再误报"找不到图标"。
  const accountIcon = page.locator('svg.icon-account');
  const iconVisible = await accountIcon.waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false);
  if (!iconVisible) {
    if (/^https:\/\/auth0\./.test(page.url())) return 'bounced';
    if (/^https:\/\/(www|eu|global)\.makera\.com\/account\/login/.test(page.url())) return 'bounced';
    throw new Error(`登录后 60s 内账号图标未出现，会话可能未建立，当前 URL: ${page.url()}`);
  }
  console.log(`[Auth0]   ✅ 账号图标已出现（仅说明导航栏已渲染，会话以落地 /account 为准），当前 URL: ${page.url()}`);

  // 等 URL 进入静默期（连续 5s 无导航）再点击：登录落地后站点自身还有
  // SPA 重定向链（utm/地域处理），导航期间派发的点击会被节点替换吞掉
  // （实测第 1 次点击必然无效、站点落定后点击才生效）。每 1s 轮询、
  // 最多等 30s；超时也直接继续，后面的 5 次重试循环与直接导航兜底仍会兜底
  const quietDeadline = Date.now() + 30000;
  let lastUrl = page.url();
  let quietMs = 0;
  while (Date.now() < quietDeadline && quietMs < 5000) {
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    if (currentUrl === lastUrl) {
      quietMs += 1000;
    } else {
      quietMs = 0;
      lastUrl = currentUrl;
    }
  }
  console.log(`[Auth0]   ✅ 页面导航已静默，当前 URL: ${page.url()}`);

  for (let attempt = 1; attempt <= 5; attempt++) {
    console.log(`[Auth0]   🔄 第${attempt}/5次尝试点击头像...`);

    // 点击前确认图标仍在 DOM：站点可能在此期间把页面弹回 Auth0 登录页（会话被清除），
    // 图标在登录页不存在，旧版会对着空 locator 空等到测试超时（实测 150s 空等）
    const iconAttached = await accountIcon.waitFor({ state: 'attached', timeout: 3000 }).then(() => true).catch(() => false);
    if (!iconAttached) {
      if (/^https:\/\/auth0\./.test(page.url())) {
        console.warn(`[Auth0]   ⚠️ 页面已被弹回 Auth0 登录页（会话被站点清除）`);
        return 'bounced';
      }
      console.warn(`[Auth0]   ⚠️ 第${attempt}次账号图标不在 DOM，进入下次重试`);
      continue;
    }

    // 每次点击前：先清除 CNC 弹窗
    await dismissGuidePopup(page);
    // 再关闭幸运转盘
    await dismissSpinPopup(page);
    // 再关闭 pandectes-cmp Cookie 同意遮罩：实测它罩住整页拦截 pointer events，
    // 点头像会被遮罩吞掉（Global 结算点击同因失败过）
    await dismissCookieConsent(page);
    // 再移除 pt-experience 隐形拦截层：实测它罩住导航栏，
    // 普通点击会被 "pt-experience intercepts pointer events" 反复重试直至超时
    await dismissExperienceOverlay(page);
    await page.waitForTimeout(500);

    // 滚动到顶部确保导航栏可见
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // 点击头像：奇数次普通点击（校验真实可点击）；偶数次 JS 派发点击——
    // 拦截层残留或导航栏节点重渲染时普通点击会被拦截/落在旧节点上不触发跳转，
    // JS 点击直接触发元素自身 click 事件，与普通点击互补。
    try {
      if (attempt % 2 === 1) {
        await accountIcon.click({ timeout: 5000 });
      } else {
        // JS 点击：优先点图标所属的祖先 a/button（SVG 元素自身没有 click 方法，
        // 直接 el.click() 会抛 TypeError）；无祖先容器时派发冒泡 click 事件触发祖先层监听
        await accountIcon.evaluate((el) => {
          const anchor = el.closest('a, button');
          if (anchor) {
            (anchor as HTMLElement).click();
          } else {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          }
        }, undefined, { timeout: 5000 });
      }
      console.log(`[Auth0]   ✅ 已点击头像图标（${attempt % 2 === 1 ? '普通点击' : 'JS 点击'}），等待 /account 导航...`);
    } catch (error) {
      console.warn(`[Auth0]   ⚠️ 第${attempt}次点击异常（进入下次重试）: ${(error as Error).message.split('\n')[0]}`);
      continue;
    }

    // 页内轮询等待导航结果：到达 /account = 成功；URL 被站点自跳转
    // （utm/地域处理）带走 = 点击导航被中止，立即失败进入下次重试；
    // 落到 auth0 域 = 会话被清除弹回登录页，立即返回由调用方重登——
    // 替代旧版"点击被吞后傻等 15s 超时"，把单次无效重试的代价从 15s 降到 1-2s
    const startHref = page.url();
    const outcome = await page.waitForFunction(
      (start: string) => {
        if (/^https:\/\/(www|eu|global)\.makera\.com\/account(?!\/login)/.test(location.href)) return 'account';
        // 点头像落到 /account/login = 未登录态被弹回（会话未建立），交由调用方重登
        if (/^https:\/\/(www|eu|global)\.makera\.com\/account\/login/.test(location.href)) return 'bounced';
        if (/^https:\/\/auth0\./.test(location.href)) return 'bounced';
        if (location.href !== start) return 'diverted';
        return null;
      },
      startHref,
      { timeout: 15000, polling: 300 },
    ).then((h) => h.jsonValue()).catch(() => 'timeout');

    if (outcome === 'account') {
      await page.waitForLoadState('domcontentloaded');
      return 'ok';
    }
    if (outcome === 'bounced') {
      console.warn(`[Auth0]   ⚠️ 第${attempt}次点击后被弹回 Auth0 登录页（会话被站点清除）`);
      return 'bounced';
    }
    console.warn(`[Auth0]   ⚠️ 第${attempt}次未到达 /account（导航结果: ${outcome}），进入下次重试`);
    if (outcome === 'diverted') {
      // 站点自跳转正在进行，等它落定再点，避免点击再次被吞
      await page.waitForTimeout(3000);
    }
  }
  return 'failed';
}

test.describe('Auth0 登录', () => {

  test('账号密码登录并验证账号页面', async ({ page }) => {
    // 登录链含重定向链固定 20s 等待 + 观察落定 + 一次自愈重登，默认超时不够，放宽 3 倍；
    // 无论成功与否都会生效，不影响其他用例
    test.slow();

    // ─ Allure 报告信息：运行参数 ──
    parameter('STORE_ENTRY_URL', STORE_ENTRY_URL);
    parameter('LOGIN_EMAIL', LOGIN_EMAIL);

    // 阶段1-4：完成 Auth0 账号密码登录并跳回商店页
    await performAuth0Login(page);

    // ========== 阶段5：点击账号图标进入我的账户（重试5次，每次先清弹窗与拦截层，奇偶次普通/JS点击互补，失败直接导航兜底）==========
    await test.step('点击头像图标进入我的账户', async () => {
      let enterResult = await enterAccountByClicks(page);
      if (enterResult === 'bounced') {
        // 被弹回 Auth0 登录页 = 站点未建立/清除了商店会话（EU 站实测：点击头像后页面
        // 弹回登录页、图标不再存在）。属站点侧会话问题而非脚本错误：
        // 原地重跑一次登录流程重建会话，再重新进入账号页
        console.warn(`[Auth0] ⚠️ 被弹回 Auth0 登录页（商店会话未建立/被清除），原地重跑一次登录流程...`);
        await performAuth0Login(page);
        enterResult = await enterAccountByClicks(page);
      }

      if (enterResult !== 'ok') {
        // 点击仍失败的兜底：直接导航 /account（会话 cookie 才是登录态的真正判据）；
        // 若会话真未建立，/account 会被服务端弹回登录页，下面的等待与邮箱断言仍会照常失败，不会误报通过
        const host = new URL(page.url()).hostname;
        const accountUrl = /(www|eu|global)\.makera\.com/.test(host) ? `https://${host}/account` : 'https://www.makera.com/account';
        console.warn(`[Auth0]   ⚠️ 点击仍未到达 /account（结果: ${enterResult}），尝试直接导航兜底: ${accountUrl}`);
        await page.goto(accountUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      }

      // ⚠️ 失败必须抛错：旧版此处静默 return 会跳过邮箱断言，把失败误报为通过
      try {
        await page.waitForURL(/^https:\/\/(www|eu|global)\.makera\.com\/account(?!\/login)/, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
      } catch {
        throw new Error(`点击头像与直接导航兜底后仍未到达 /account，会话可能未建立，当前 URL: ${page.url()}`);
      }
      console.log(`[Auth0] ✅ 已进入账号页面: ${page.url()}`);
    });

    // ========== 阶段6：断言账号页面显示登录邮箱 ==========
    await test.step('断言账号页面显示登录邮箱', async () => {
      const emailOnPage = page.getByText(LOGIN_EMAIL.toLowerCase()).first();
      await expect(emailOnPage).toBeVisible({ timeout: 10000 });
      console.log(`[Auth0] ✅ 账号页面显示登录邮箱: ${LOGIN_EMAIL.toLowerCase()}`);
    });
  });

});
