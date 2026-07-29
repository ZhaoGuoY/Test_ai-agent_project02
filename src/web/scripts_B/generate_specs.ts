// src/web/scripts_B/generate_specs.ts
/**
 * 自动生成 Playwright 测试脚本
 *
 * 功能：使用 Playwright 打开目标页面，抓取可见元素，生成包含语义定位器的 .spec.ts 文件
 *
 * 调用方式：npx ts-node src/web/scripts_B/generate_specs.ts <url>
 *
 * 输出：生成 src/web/testcases/smoke/generated_homepage.spec.ts
 *
 * 性能优化：
 * - 单次页面访问，一次性收集所有需要测试的元素
 * - 限制生成的测试数量（最多x个），避免脚本过长
 * - 使用 Promise.all 并发收集元素信息
 */
import { chromium, Browser, Page, ElementHandle } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.resolve(__dirname, '../testcases/smoke');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'generated_homepage.spec.ts');
const MAX_TESTS = 3;             // 最多收集3个元素
const MAX_ELEMENT_TESTS = 2;   // 最多生成2个元素测试（+1标题测试=共3条）
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
  lines.push(`    await page.goto('/', { waitUntil: 'domcontentloaded' });`);
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
    lines.push(`    await page.goto('/', { waitUntil: 'domcontentloaded' });`);

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

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('用法: npx ts-node src/web/scripts/generate_specs.ts <url>');
    process.exit(1);
  }
  const url = args[0];

  console.log(`[generate_specs] 开始生成测试脚本，目标 URL: ${url}`);

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser: Browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // 设置超时并导航
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    console.log('[generate_specs] 页面加载完成');

    // 收集元素
    const elements = await collectElements(page);
    console.log(`[generate_specs] 收集到 ${elements.length} 个可见元素`);

    // 生成测试代码
    const code = generateTestCode(url, elements);

    // 写入文件
    fs.writeFileSync(OUTPUT_FILE, code, 'utf-8');
    console.log(`[generate_specs] 测试脚本已生成: ${OUTPUT_FILE}`);
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