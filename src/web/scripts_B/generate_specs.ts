// src/web/scripts_B/generate_specs.ts
/**
 * 自动生成 Playwright 测试脚本
 *
 * 功能：使用 Playwright 打开目标页面，抓取可见元素，生成包含语义定位器的 .spec.ts 文件
 *
 * 调用方式：npx ts-node src/web/scripts_B/generate_specs.ts <url> [output_file]
 *
 * 输出：默认生成 src/web/testcases/smoke/generated_homepage.spec.ts
 *       可通过第二个参数指定输出文件名（如 us_carvera.spec.ts）
 *
 * 性能优化：
 * - 单次页面访问，一次性收集所有需要测试的元素
 * - 限制生成的测试数量（最多x个），避免脚本过长
 * - 使用 Promise.all 并发收集元素信息
 */
import { chromium, Browser, Page, ElementHandle } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const OUTPUT_DIR = path.resolve(__dirname, '../testcases/smoke');
const DEFAULT_OUTPUT_FILE = 'generated_homepage.spec.ts';
const MAX_TESTS = 5;             // 最多收集5个元素
const MAX_ELEMENT_TESTS = 4;   // 最多生成4个元素测试（+1标题测试=共5条）
const TIMEOUT = 100000;         // 页面加载超时100秒

interface ElementInfo {
  tag: string;
  role: string | null;
  text: string | null;
  selector: string | null;   // 备用选择器（仅当无法生成语义定位器时）
}

async function collectElements(page: Page): Promise<ElementInfo[]> {
  // 获取所有可见的、可交互的元素
  const elements = await page.evaluate(() => {
    const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'H1', 'H2', 'H3', 'P'];
    const allElements = document.querySelectorAll('*');
    const results: Array<{tag: string; role: string|null; text: string|null}> = [];

    for (const el of allElements) {
      // 只关心特定标签
      if (!interactiveTags.includes(el.tagName)) continue;

      // 检查是否可见
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      // 获取文本（优先 aria-label，其次 innerText）
      let text = (el as HTMLElement).innerText?.trim() || null;
      if (!text) {
        text = el.getAttribute('aria-label') || null;
      }
      // 移除换行符和多余空白，避免生成代码时语法错误
      if (text) {
        text = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      }
      // 对于链接和按钮，过滤掉过长的文本
      if (text && text.length > 80) text = text.substring(0, 77) + '...';
      // 过滤掉纯数字或过短的无意义文本
      if (text && text.length < 2) text = null;

      const role = el.getAttribute('role') || null;

      results.push({ tag: el.tagName, role, text });
    }
    return results;
  });

  // 去重：相同文本和角色的只保留一个
  const seen = new Set<string>();
  const unique: ElementInfo[] = [];
  for (const item of elements) {
    const key = `${item.tag}:${item.text}:${item.role}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ ...item, selector: null });
    }
  }

  return unique.slice(0, MAX_TESTS);
}

function generateTestCode(url: string, elements: ElementInfo[]): string {
  const lines: string[] = [];
  lines.push(`// 自动生成的测试脚本 - ${new Date().toISOString()}`);
  lines.push(`// 目标 URL: ${url}`);
  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push('');
  lines.push(`test.describe('自动生成 - 首页冒烟测试', () => {`);
  lines.push('');

  // 1. 标题测试
  lines.push(`  test('页面标题不为空', async ({ page }) => {`);
  lines.push(`    await page.goto('${url}', { waitUntil: 'domcontentloaded' });`);
  lines.push(`    const title = await page.title();`);
  lines.push(`    expect(title).toBeTruthy();`);
  lines.push(`  });`);
  lines.push('');

  // 2. 为每个元素生成测试（最多 MAX_ELEMENT_TESTS 个）
  let testCount = 0;
  for (const el of elements) {
    if (testCount >= MAX_ELEMENT_TESTS) break;  // 限制元素测试数量

    const testName = el.text
      ? `元素可见: ${el.text.substring(0, 40)}`
      : `元素可见: <${el.tag.toLowerCase()}>`;

    lines.push(`  test('${escapeTestName(testName)}', async ({ page }) => {`);
    lines.push(`    await page.goto('${url}', { waitUntil: 'domcontentloaded' });`);

    // 生成语义定位器
    let locator: string;
    if (el.role && el.text) {
      locator = `page.getByRole('${el.role}', { name: '${escapeStr(el.text)}' })`;
    } else if (el.text) {
      locator = `page.getByText('${escapeStr(el.text)}')`;
    } else {
      // fallback: 使用标签名
      locator = `page.locator('${el.tag.toLowerCase()}')`;
    }

    lines.push(`    await expect(${locator}.first()).toBeVisible({ timeout: 5000 });`);
    lines.push(`  });`);
    lines.push('');
    testCount++;
  }

  lines.push('});');
  return lines.join('\n');
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n]+/g, ' ');
}

function escapeTestName(s: string): string {
  return s.replace(/['"]/g, '').replace(/[:]/g, '-').replace(/[\r\n]+/g, ' ');
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
  if (args.length < 1) {
    console.error('用法: npx ts-node src/web/scripts/generate_specs.ts <url> [output_file]');
    process.exit(1);
  }
  const url = args[0];
  // 第二个参数为可选输出文件名（仅文件名，不含路径，如 us_carvera.spec.ts）
  const outputFileName = args[1] || DEFAULT_OUTPUT_FILE;
  const outputFile = path.join(OUTPUT_DIR, outputFileName);

  console.log(`[generate_specs] 开始生成测试脚本，目标 URL: ${url}`);
  console.log(`[generate_specs] 输出文件: ${outputFile}`);

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 清理残留浏览器进程，防止阻塞启动
  killLingeringChromium();

  console.log(`[generate_specs] 正在启动浏览器...`);
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
    setTimeout(() => reject(new Error('浏览器启动超时（20秒），可能有残留进程占用')), 20000)
  );
  const browser: Browser = await Promise.race([launchPromise, launchTimeout]);
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // 设置超时并导航
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

    // 等待 10 秒让 Shopify IP 跳转完成
    await page.waitForTimeout(10_000);
    console.log('[generate_specs] 页面加载完成，IP 跳转等待结束');
    console.log(`[generate_specs] 目标主机: ${new URL(url).hostname}, 当前主机: ${new URL(page.url()).hostname}`);

    // 收集元素
    const elements = await collectElements(page);
    console.log(`[generate_specs] 收集到 ${elements.length} 个可见元素`);

    // 生成测试代码
    const code = generateTestCode(url, elements);

    // 写入文件
    fs.writeFileSync(outputFile, code, 'utf-8');
    console.log(`[generate_specs] 测试脚本已生成: ${outputFile}`);
    const actualTestCount = Math.min(elements.length, MAX_ELEMENT_TESTS) + 1; // +1 for title test
    console.log(`[generate_specs] 共生成 ${actualTestCount} 个测试用例（1 个标题测试 + ${Math.min(elements.length, MAX_ELEMENT_TESTS)} 个元素测试）`);

  } catch (err) {
    console.error('[generate_specs] 生成失败:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();