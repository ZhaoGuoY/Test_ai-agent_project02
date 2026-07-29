// src/web/scripts_B/heal_specs.ts
/**
 * 自愈脚本：根据失败信息重新探索页面并修复定位器
 *
 * 功能：
 * 1. 接收目标 URL 和失败测试用例的名称
 * 2. 重新用 Playwright 打开页面，收集可见元素
 * 3. 解析原测试文件，用新的语义定位器替换失败的定位器
 * 4. 写回修复后的 .spec.ts 文件
 *
 * 调用方式：npx ts-node src/web/scripts_B/heal_specs.ts <url> <failed_test_name> [spec_file_path]
 *
 * 性能优化：
 * - 只打开一次浏览器
 * - 只修复指定的失败用例，不重新生成整个文件
 * - 使用正则替换，避免 AST 解析开销
 */
import { chromium, Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const DEFAULT_SPEC_PATH = path.resolve(__dirname, '../testcases/smoke/generated_homepage.spec.ts');
const TIMEOUT = 25000; // 25秒

interface ElementInfo {
  role: string | null;
  text: string | null;
  tag: string;
}

/**
 * 收集页面中所有可见的可交互元素
 */
async function collectElements(browser: Browser, url: string): Promise<ElementInfo[]> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

  const elements = await page.evaluate(() => {
    const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'H1', 'H2', 'H3', 'P'];
    const all = document.querySelectorAll('*');
    const results: Array<{ tag: string; role: string | null; text: string | null }> = [];
    for (const el of all) {
      if (!interactiveTags.includes(el.tagName)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      let text = (el as HTMLElement).innerText?.trim() || null;
      if (!text) text = el.getAttribute('aria-label') || null;
      if (text && text.length > 100) text = text.substring(0, 97) + '...';
      const role = el.getAttribute('role') || null;
      results.push({ tag: el.tagName, role, text });
    }
    return results;
  });

  await context.close();
  return elements;
}

/**
 * 根据失败测试名和收集到的元素，生成新的定位器代码行
 */
function generateNewLocatorLine(testName: string, elements: ElementInfo[]): string | null {
  // 从测试名中提取期望的文本（测试名格式："元素可见: <text>" 或 "元素可见- <text>"）
  const match = testName.match(/元素可见[:\-]\s*(.+)/);
  if (!match) return null;
  const expectedText = match[1].trim();

  // 在元素列表中查找匹配的文本（精确匹配或包含匹配）
  const matched = elements.find(el => el.text && el.text.includes(expectedText));
  if (!matched) return null;

  // 生成语义定位器
  if (matched.role && matched.text) {
    return `await expect(page.getByRole('${matched.role}', { name: '${escapeStr(matched.text)}' }).first()).toBeVisible({ timeout: 5000 });`;
  } else if (matched.text) {
    return `await expect(page.getByText('${escapeStr(matched.text)}').first()).toBeVisible({ timeout: 5000 });`;
  } else {
    return `await expect(page.locator('${matched.tag.toLowerCase()}').first()).toBeVisible({ timeout: 5000 });`;
  }
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

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
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('用法: npx ts-node src/web/scripts/heal_specs.ts <url> <failed_test_name> [spec_file_path]');
    process.exit(1);
  }
  const url = args[0];
  const fullTestName = args[1];
  const specFilePath = args[2] || DEFAULT_SPEC_PATH;

  // JUnit 返回的测试名格式为 "套件名 › 实际测试名"，需要提取实际测试名
  const failedTestName = fullTestName.includes('›')
    ? fullTestName.split('›').pop()!.trim()
    : fullTestName;

  console.log(`[heal_specs] 开始修复，URL=${url}, 失败测试="${failedTestName}"`);
  console.log(`[heal_specs] 目标文件: ${specFilePath}`);

  // 1. 检查文件是否存在
  if (!fs.existsSync(specFilePath)) {
    console.error(`[heal_specs] 文件不存在: ${specFilePath}`);
    process.exit(1);
  }

  // 2. 清理残留浏览器进程，防止阻塞启动
  killLingeringChromium();

  // 3. 启动浏览器（跳过环境探测，防止端口/环境异常导致挂起）
  console.log(`[heal_specs] 正在启动浏览器...`);
  const launchPromise = chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-dev-shm-usage',
    ],
  });
  const launchTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('浏览器启动超时（20秒）')), 20000)
  );
  const browser = await Promise.race([launchPromise, launchTimeout]);
  try {
    const elements = await collectElements(browser, url);
    console.log(`[heal_specs] 收集到 ${elements.length} 个可见元素`);

    // 3. 生成新的定位器行
    const newLine = generateNewLocatorLine(failedTestName, elements);
    if (!newLine) {
      console.error(`[heal_specs] 未能找到匹配的定位器替代方案，无法修复`);
      process.exit(1);
    }

    // 4. 读取原文件内容
    let content = fs.readFileSync(specFilePath, 'utf-8');

    // 5. 查找该测试用例的代码块（基于花括号计数，支持嵌套块）
    const testBlock = findTestBlock(content, failedTestName);
    if (!testBlock) {
      console.error(`[heal_specs] 未找到测试用例 "${failedTestName}" 的代码块`);
      process.exit(1);
    }

    // 替换块内的 expect(...).toBeVisible() 行
    const newBlock = testBlock.replace(
      /await expect\(.*?\)\.toBeVisible\(\{ timeout: \d+ \}\);/,
      newLine
    );

    if (newBlock === testBlock) {
      console.warn(`[heal_specs] 未找到可替换的定位器行，可能格式不匹配`);
      process.exit(1);
    }

    // 6. 写回文件
    content = content.replace(testBlock, newBlock);
    fs.writeFileSync(specFilePath, content, 'utf-8');
    console.log(`[heal_specs] ✅ 修复成功，已将定位器替换为新行`);
    console.log(`[heal_specs] 新定位器: ${newLine}`);

  } catch (err) {
    console.error(`[heal_specs] 修复异常:`, err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

/**
 * 通过测试名定位 test 块，基于花括号计数提取完整代码块
 * 支持嵌套 {}（如 if/try/catch），确保提取完整的测试体
 */
function findTestBlock(content: string, testName: string): string | null {
  const escapedName = escapeRegExp(testName);
  // 匹配 test('name', async ({page}) => { 的起始位置
  const startRegex = new RegExp(
    `test\\(\\s*['"]${escapedName}['"]\\s*,\\s*async\\s*\\(\\s*\\{\\s*page\\s*\\}\\s*\\)\\s*=>\\s*\\{`,
    's'
  );
  const startMatch = content.match(startRegex);
  if (!startMatch || startMatch.index === undefined) return null;

  const startIndex = startMatch.index;
  // 找到箭头函数体开始的 '{' 位置
  const braceStart = startIndex + startMatch[0].length - 1;

  // 花括号计数，提取完整块
  let depth = 0;
  let i = braceStart;
  for (; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) return null; // 花括号不闭合，格式异常
  return content.substring(startIndex, i + 1);
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();