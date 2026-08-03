// 探索页面内容脚本
import { chromium } from 'playwright';
import { execSync } from 'child_process';

/**
 * 清理残留的 Chromium 进程，防止阻塞新浏览器启动
 * 无论是否有残留进程，都会静默处理，不影响后续流程
 */
function killLingeringChromium(): void {
  const isWindows = process.platform === 'win32';
  const cmd = isWindows
    ? 'taskkill /F /IM chrome.exe 2>nul & taskkill /F /IM chromium.exe 2>nul'
    : 'pkill -f chromium 2>/dev/null';
  try {
    execSync(cmd, { stdio: 'ignore', timeout: 5000 });
  } catch {
    // 无残留进程时命令会返回非零，静默忽略
  }
}

async function main() {
  const url = 'https://www.makera.com/products/carvera';

  // 清理残留浏览器进程，防止阻塞启动
  killLingeringChromium();

  console.log(`[explore_page] 正在启动浏览器...`);
  const launchPromise = chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--no-zygote', '--disable-dev-shm-usage'],
  });
  const launchTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('浏览器启动超时（20秒），可能有残留进程占用')), 20000)
  );
  const browser = await Promise.race([launchPromise, launchTimeout]);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });

  // 等待 10 秒让 Shopify IP 跳转完成
  await page.waitForTimeout(10_000);
  console.log(`\n=== URL 稳定性检查 ===`);
  console.log(`目标主机: ${new URL(url).hostname}`);
  console.log(`当前主机: ${new URL(page.url()).hostname}`);
  console.log(`匹配: ${new URL(page.url()).hostname === new URL(url).hostname ? '✅' : '❌'}`);

  // 获取页面标题
  const title = await page.title();
  console.log('=== 页面标题 ===');
  console.log(title);

  // 获取页面完整文本内容
  const bodyText = await page.evaluate(() => {
    return document.body.innerText;
  });
  console.log('\n=== 页面可见文本内容 ===');
  console.log(bodyText);

  // 获取所有链接文本
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText?.trim() || '',
      href: a.getAttribute('href') || '',
      ariaLabel: a.getAttribute('aria-label') || '',
    })).filter(l => l.text || l.ariaLabel);
  });
  console.log('\n=== 所有链接 ===');
  links.forEach(l => console.log(`  text="${l.text}" href="${l.href}" aria-label="${l.ariaLabel}"`));

  // 获取所有按钮文本
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText?.trim() || '',
      ariaLabel: b.getAttribute('aria-label') || '',
    })).filter(b => b.text || b.ariaLabel);
  });
  console.log('\n=== 所有按钮 ===');
  buttons.forEach(b => console.log(`  text="${b.text}" aria-label="${b.ariaLabel}"`));

  // 获取所有标题元素
  const headings = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
      tag: (h as HTMLElement).tagName,
      text: (h as HTMLElement).innerText?.trim() || '',
    })).filter(h => h.text);
  });
  console.log('\n=== 所有标题 ===');
  headings.forEach(h => console.log(`  ${h.tag}: "${h.text}"`));

  // 检查是否有 "Skip to content" 或 "English"
  console.log('\n=== 搜索特定文本 ===');
  const hasSkipToContent = await page.getByText('Skip to content').count();
  console.log(`"Skip to content" 元素数量: ${hasSkipToContent}`);
  const hasEnglish = await page.getByText('English').count();
  console.log(`"English" 元素数量: ${hasEnglish}`);

  // 检查导航栏
  const nav = await page.evaluate(() => {
    const navs = document.querySelectorAll('nav, [role="navigation"], header');
    return Array.from(navs).map(n => {
      const el = n as HTMLElement;
      return {
        tag: el.tagName,
        id: el.id,
        class: el.className,
        text: el.innerText?.trim()?.substring(0, 500) || '',
      };
    });
  });
  console.log('\n=== 导航/头部区域 ===');
  nav.forEach(n => console.log(`  tag=${n.tag} id="${n.id}" class="${n.class}"\n  text="${n.text}"`));

  // 获取页面 HTML 的前 5000 字符
  const html = await page.evaluate(() => document.documentElement.outerHTML.substring(0, 8000));
  console.log('\n=== 页面 HTML (前8000字符) ===');
  console.log(html);

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
