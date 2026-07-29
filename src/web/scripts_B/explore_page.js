const { chromium } = require('playwright');

async function main() {
  const url = 'https://eu.makera.com/';
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--no-zygote', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

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
      tag: h.tagName,
      text: h.innerText?.trim() || '',
    })).filter(h => h.text);
  });
  console.log('\n=== 所有标题 ===');
  headings.forEach(h => console.log(`  ${h.tagName}: "${h.text}"`));

  // 检查是否有 "Skip to content" 或 "English"
  console.log('\n=== 搜索特定文本 ===');
  const hasSkipToContent = await page.getByText('Skip to content').count();
  console.log(`"Skip to content" 元素数量: ${hasSkipToContent}`);
  const hasEnglish = await page.getByText('English').count();
  console.log(`"English" 元素数量: ${hasEnglish}`);

  // 检查导航栏
  const nav = await page.evaluate(() => {
    const navs = document.querySelectorAll('nav, [role="navigation"], header');
    return Array.from(navs).map(n => ({
      tag: n.tagName,
      id: n.id,
      class: n.className,
      text: n.innerText?.trim()?.substring(0, 500) || '',
    }));
  });
  console.log('\n=== 导航/头部区域 ===');
  nav.forEach(n => console.log(`  tag=${n.tag} id="${n.id}" class="${n.className}"\n  text="${n.text}"`));

  // 获取页面 HTML 的前 8000 字符
  const html = await page.evaluate(() => document.documentElement.outerHTML.substring(0, 8000));
  console.log('\n=== 页面 HTML (前8000字符) ===');
  console.log(html);

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
