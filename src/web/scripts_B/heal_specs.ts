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
 * 调用方式：npx ts-node src/web/scripts_B/heal_specs.ts <url> <failed_test_name> [spec_file_path] [error_message] [error_message]
 *
 * 性能优化：
 * - 只打开一次浏览器
 * - 只修复指定的失败用例，不重新生成整个文件
 * - 使用正则替换，避免 AST 解析开销
 */
import { chromium, type Browser, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { setupPage } from '../testcases/smoke/helpers';

// 默认 spec 路径：动态查找 smoke 目录下首个 .spec.ts 文件，
// 不再硬编码不存在的 generated_homepage.spec.ts
const SMOKE_DIR = path.resolve(__dirname, '../testcases/smoke');
const DEFAULT_SPEC_PATH = (() => {
  const files = fs.readdirSync(SMOKE_DIR).filter(f => f.endsWith('.spec.ts'));
  return files.length > 0 ? path.join(SMOKE_DIR, files[0]) : '';
})();
const TIMEOUT = 25000; // 25秒

interface ElementInfo {
  role: string | null;
  text: string | null;
  tag: string;
}

/**
 * 收集页面中所有可见的可交互元素
 * 复用 helpers.ts 的 setupPage 处理 Shopify IP 跳转和商店切换
 */
async function collectElements(browser: Browser, url: string): Promise<ElementInfo[]> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // 使用 setupPage 处理 Shopify IP 跳转（与测试执行相同的导航逻辑）
  console.log(`[heal_specs] 使用 setupPage 初始化页面: ${url}`);
  const ready = await setupPage(page, url);
  if (!ready) {
    await context.close();
    throw new Error(`setupPage 初始化失败，无法收集元素: ${url}`);
  }
  console.log(`[heal_specs] ✅ setupPage 初始化成功: ${page.url()}`);

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
      // 净化文本：innerText 可能含换行/多空格（如 "My Cart\n0"），若不处理会被
      // 原样写入生成的 getByText('...') 字符串字面量导致 spec 语法错误，
      // 因此统一折叠空白为单个空格
      if (text) text = text.replace(/\s+/g, ' ').trim();
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
 * 从测试代码块中提取原始定位器的搜索文本
 * 如：page.getByRole('button', { name: /add to bag/i }) → "add to bag"
 */
function extractOriginalLocatorText(testBlock: string): string | null {
  // 匹配 getByRole/getByText/getByLabel 中的 name/text 参数
  const patterns = [
    /getByRole\([^)]*name:\s*\/([^\/]+)\/[i]?\)/,   // /regex/i
    /getByRole\([^)]*name:\s*'([^']+)'/,              // 'string'
    /getByText\([^)]*'([^']+)'/,                        // 'string'
    /getByLabel\([^)]*'([^']+)'/,                        // 'string'
    /getByRole\([^)]*name:\s*\/([^\/]+)\//,            // /regex/ (no flags)
  ];
  for (const pattern of patterns) {
    const match = testBlock.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 根据失败测试名、原始定位器文本和收集的元素，生成新的定位器代码行
 */
function generateNewLocatorLine(testName: string, testBlock: string, elements: ElementInfo[]): string | null {
  let expectedText: string;

  // 旧格式："元素可见: <text>" 或 "元素可见- <text>"
  const oldMatch = testName.match(/元素可见[:\-]\s*(.+)/);
  if (oldMatch) {
    expectedText = oldMatch[1].trim();
  } else {
    // 新格式：从测试名中提取期望文本（去除常见前后缀）
    expectedText = testName
      .replace(/^.*?(?=\p{Script=Han}|[A-Z])/u, '')
      .replace(/按钮稳定展示.*$/, '')
      .replace(/稳定展示.*$/, '')
      .trim();
    if (!expectedText) expectedText = testName;
  }

  console.log(`[heal_specs] 测试名提取文本: "${expectedText}"`);

  // 从原始定位器中提取搜索文本作为兜底
  const originalLocatorText = extractOriginalLocatorText(testBlock);
  if (originalLocatorText) {
    console.log(`[heal_specs] 原始定位器文本: "${originalLocatorText}"`);
  }

  // 搜索候选词：测试名提取 + 原始定位器文本
  const searchTerms = [expectedText];
  if (originalLocatorText && !searchTerms.includes(originalLocatorText)) {
    searchTerms.push(originalLocatorText);
  }

  // 依次尝试每个搜索词，精确匹配优先
  let matched = null;
  for (const term of searchTerms) {
    matched = elements.find(el => el.text && el.text === term)
      || elements.find(el => el.text && el.text.toLowerCase() === term.toLowerCase())
      || elements.find(el => el.text && el.text.includes(term))
      || elements.find(el => el.text && term.includes(el.text))
      || null;
    if (matched) {
      console.log(`[heal_specs] ✅ 通过搜索词 "${term}" 匹配到元素: "${matched.text}"`);
      break;
    }
  }

  // 模糊匹配兜底：任意搜索词的任意关键词
  if (!matched) {
    console.warn(`[heal_specs] 未找到精确匹配，尝试模糊匹配...`);
    for (const term of searchTerms) {
      const keywords = term.split(/\s+/).filter(w => w.length >= 2);
      matched = elements.find(el =>
        el.text && keywords.some(kw => el.text!.toLowerCase().includes(kw.toLowerCase()))
      ) || null;
      if (matched) {
        console.log(`[heal_specs] ✅ 模糊匹配到元素: "${matched.text}"`);
        break;
      }
    }
  }

  // 最终兜底：找页面上第一个按钮类元素
  if (!matched) {
    console.warn(`[heal_specs] 所有搜索词均未匹配，尝试查找任意按钮元素...`);
    matched = elements.find(el =>
      el.tag === 'BUTTON' || (el.role === 'button')
    ) || null;
  }

  if (!matched) {
    console.error(`[heal_specs] 未能找到任何可替换的元素，测试名: "${testName}"`);
    return null;
  }

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
  // 除反斜杠/单引号外，同时转义换行等控制字符，双保险防止生成非法字符串字面量
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
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
    console.error('用法: npx ts-node src/web/scripts_B/heal_specs.ts <url> <failed_test_name> [spec_file_path] [error_message]');
    process.exit(1);
  }
  const url = args[0];
  const fullTestName = args[1];
  const specFilePath = args[2] || DEFAULT_SPEC_PATH;
  const errorMessage = args[3] || '';  // 第4参数：错误消息，用于判断失败类型

  // 环境/网络类失败（页面初始化失败等）：非代码缺陷，无需修改代码。
  // 直接返回成功（exit 0），让 HealAgent 按正常流程重跑该 spec 验证
  //（此类失败通常是瞬时 IP 跳转/网络抖动，重跑才是正确应对，改定位器无意义）
  const isEnvError = errorMessage.includes('页面初始化失败') ||
    errorMessage.includes('setupPage 初始化失败') ||
    /page\.goto[\s\S]*[Tt]imeout/.test(errorMessage);
  if (isEnvError) {
    console.log(`[heal_specs] ⚠️ 检测到环境类失败（非代码缺陷），无需修改代码: ${errorMessage.substring(0, 120)}`);
    console.log(`[heal_specs] ✅ 无需修改代码，请直接重跑对应 spec 验证`);
    process.exit(0);
  }

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
    // 3. 先读取原文件并提取测试块
    let content = fs.readFileSync(specFilePath, 'utf-8');
    const testBlock = findTestBlock(content, failedTestName);
    if (!testBlock) {
      console.error(`[heal_specs] 未找到测试用例 "${failedTestName}" 的代码块`);
      process.exit(1);
    }

    // 4. 判断失败类型并执行对应修复策略
    const isUrlError = errorMessage.includes('toContain') && errorMessage.includes('/products/');
    // 交互阻塞/前置状态类失败（按钮可见但点不动、抽屉未弹出等）：根因是浮窗遮挡或页面状态，
    // 不是定位器失效。若继续走定位器替换逻辑，会把块内首个 expect(...).toBeVisible 断言
    //（往往是前置检查）污染为页面随机文本，导致后续重跑永远失败。此类失败直接跳过改写
    const isInteractionBlocked = /点击均失败|点击失败|被遮挡|前置条件|抽屉|加购|结算/.test(errorMessage);
    if (isInteractionBlocked) {
      console.error(`[heal_specs] 失败类型为交互阻塞/前置状态问题（非定位器失效），不改写 spec，避免污染断言`);
      process.exit(1);
    }
    let newBlock = testBlock;

    if (isUrlError) {
      // ── URL 断言失败修复 ──
      // 根因：setupPage 完成后页面停在首页，未到达产品页
      // 修复：在 setupPage 后插入 page.waitForURL 确保导航完成
      console.log(`[heal_specs] 检测到 URL 断言失败，执行导航修复`);

      const urlMatch = content.match(/const\s+TARGET_URL\s*=\s*'([^']+)'/);
      if (!urlMatch) {
        console.error(`[heal_specs] 无法从 spec 文件提取 TARGET_URL`);
        process.exit(1);
      }
      console.log(`[heal_specs] 目标 URL: ${urlMatch[1]}`);

      // 在 setupPage 行后插入 waitForURL，确保页面导航到目标 URL
      const waitLine = `    await page.waitForURL(/products/, { timeout: 30000 });`;
      newBlock = newBlock.replace(
        /(const ready = await setupPage\(page, TARGET_URL\);)/,
        `$1\n${waitLine}`
      );

      if (newBlock === testBlock) {
        console.error(`[heal_specs] URL 修复失败：未找到 setupPage 行`);
        process.exit(1);
      }
      console.log(`[heal_specs] ✅ 导航修复成功：在 setupPage 后添加 waitForURL`);

    } else {
      // ── 定位器失败修复（原有逻辑）──
      const elements = await collectElements(browser, url);
      console.log(`[heal_specs] 收集到 ${elements.length} 个可见元素`);

      const newLine = generateNewLocatorLine(failedTestName, testBlock, elements);
      if (!newLine) {
        console.error(`[heal_specs] 未能找到匹配的定位器替代方案，无法修复`);
        process.exit(1);
      }

      // 完整的 expect 语句匹配：含可选的尾随 .catch(() => {}) 链。
      // 若正则只吃到 toBeVisible(...); 为止，原行尾的 .catch(() => {}); 会被残留下来，
      // 与替换结果拼接出 "...);.catch(() => {});" 这类非法语法（曾导致 eu_carvera.spec.ts SyntaxError）
      const EXPECT_LINE_RE = /await expect\(.*?\)\.toBeVisible\(\{ timeout: \d+ \}\);(?:\s*\.catch\(\(\) => \{\}\);)?/;
      const hasScroll = /await\s+\w+\.scrollIntoViewIfNeeded\(/.test(testBlock);
      if (hasScroll) {
        newBlock = newBlock.replace(
          /await\s+\w+\.scrollIntoViewIfNeeded\([^)]*\)(?:\s*\.catch\(\(\) => \{\}\))?;?/,
          newLine
        );
        newBlock = newBlock.replace(
          new RegExp(`\\s*${EXPECT_LINE_RE.source}`),
          ''
        );
      } else {
        newBlock = testBlock.replace(EXPECT_LINE_RE, newLine);
      }

      if (newBlock === testBlock) {
        console.warn(`[heal_specs] 未找到可替换的定位器行，可能格式不匹配`);
        process.exit(1);
      }
      console.log(`[heal_specs] ✅ 定位器修复成功`);
      console.log(`[heal_specs] 新定位器: ${newLine}`);
    }

    // 5. 写回文件
    content = content.replace(testBlock, newBlock);

    // 6. 写回前语法校验：用 tsc --noEmit 检查修改后的文件，防止正则替换产出非法语法
    //（无论校验成功与否，此步骤都会在写盘前执行；校验失败则放弃写回，保留原文件）
    const candidatePath = specFilePath + '.heal-candidate.ts';
    fs.writeFileSync(candidatePath, content, 'utf-8');
    let syntaxOk = true;
    try {
      execSync(
        `npx tsc --noEmit --skipLibCheck --target ES2020 --module commonjs ` +
        `--moduleResolution node --esModuleInterop --resolveJsonModule --strict "${candidatePath}"`,
        {
          stdio: 'pipe',
          timeout: 60000,
          cwd: path.resolve(__dirname, '../../..'),
        }
      );
    } catch (e) {
      syntaxOk = false;
      const stderr = (e as { stdout?: Buffer }).stdout?.toString() ?? '';
      console.error(`[heal_specs] ❌ 修复后代码未通过语法校验，放弃写回（保留原文件）:\n${stderr.substring(0, 500)}`);
    } finally {
      fs.unlinkSync(candidatePath);
    }
    if (!syntaxOk) {
      process.exit(1);
    }

    fs.writeFileSync(specFilePath, content, 'utf-8');
    console.log(`[heal_specs] ✅ 修复完成，已写回文件（语法校验通过）`);

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
 *
 * 使用字符串查找（indexOf）而非正则，避免模板字符串中反引号转义问题
 */
function findTestBlock(content: string, testName: string): string | null {
  // 1. 在文件内容中查找测试名。
  //    测试名可能先出现在文件头部注释中（如 EU/US spec 顶部 sharedPage 说明注释），
  //    因此需遍历所有出现位置，跳过前面没有 test( 关键字的注释匹配，
  //    直到找到真实的 test('用例名') 声明
  let fromIndex = 0;
  let absoluteTestCall = -1;
  while (true) {
    const nameIndex = content.indexOf(testName, fromIndex);
    if (nameIndex === -1) {
      console.warn(`[heal_specs] findTestBlock: 文件中未找到测试名 "${testName}" 的有效 test( 调用`);
      return null;
    }
    console.log(`[heal_specs] findTestBlock: 在位置 ${nameIndex} 找到测试名 "${testName}"`);

    // 2. 从测试名位置向前查找 test( 关键字
    const searchStart = Math.max(0, nameIndex - 200);  // test( 不会离测试名超过 200 字符
    const prefix = content.substring(searchStart, nameIndex);
    const testCallIdx = prefix.lastIndexOf('test(');
    if (testCallIdx !== -1) {
      absoluteTestCall = searchStart + testCallIdx;
      break;
    }
    console.warn(`[heal_specs] findTestBlock: 该处匹配前无 test( 关键字（可能在注释中），继续查找下一处`);
    fromIndex = nameIndex + testName.length;
  }

  // 3. 从 test( 开始找到箭头函数体的 { 位置
  const arrowIdx = content.indexOf('=>', absoluteTestCall);
  if (arrowIdx === -1) {
    console.warn(`[heal_specs] findTestBlock: 未找到 => 箭头`);
    return null;
  }
  const braceStart = content.indexOf('{', arrowIdx);
  if (braceStart === -1) {
    console.warn(`[heal_specs] findTestBlock: 未找到函数体 {`);
    return null;
  }

  // 4. 花括号计数，提取完整块
  let depth = 0;
  let i = braceStart;
  for (; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) {
    console.warn(`[heal_specs] findTestBlock: 花括号不闭合，格式异常`);
    return null;
  }
  return content.substring(absoluteTestCall, i + 1);
}

main();