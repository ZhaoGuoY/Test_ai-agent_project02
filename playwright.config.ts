// =============================================================================
// playwright.config.ts — Playwright Test Runner 核心配置文件
// =============================================================================
// 作用：
//   定义 Web 自动化测试的全局行为，包括：
//   1. 测试用例扫描目录（testDir）—— 自动发现所有 .spec.ts 文件
//   2. 超时、重试、并行执行策略（串行 workers=1，站点间故障隔离）
//   3. 多格式报告器输出（终端 list / JUnit XML / HTML 网页报告）
//      - JUnit XML 供后续 Python 解析并推送飞书通知
//      - HTML 报告供人工查看测试详情
//   4. 浏览器运行参数（无头模式、视口、失败截图/录屏/trace）
//   5. 目标浏览器项目（当前仅 Chromium）
//
// 多站点架构说明：
//   - 每站点独立 spec 文件（us/eu/global_carvera.spec.ts），各自声明 TARGET_URL
//   - baseURL 不再全局设定，避免跨站点 URL 冲突
//   - geolocation 设为 US 作为默认（各 spec 可按需覆盖）
// 参考：https://playwright.dev/docs/test-configuration
// =============================================================================
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 测试文件目录：通过 TEST_DIR 环境变量切换执行范围
  // - 不设置或 TEST_DIR=smoke  → 执行全量用例（src/web/testcases/smoke/）
  // - TEST_DIR=debug          → 仅执行调试用例（src/web/testcases/debug/）
  // 用法：
  //   Linux/macOS: TEST_DIR=debug npx playwright test
  //   PowerShell:  $env:TEST_DIR="debug"; npx playwright test
  testDir: `./src/web/testcases/${process.env.TEST_DIR || 'smoke'}`,

  // 失败产物输出目录（截图/录屏/trace/.last-run.json）：
  // 统一收敛到 workspace 下（已被 .gitignore 忽略且 CI 会上传），
  // 避免默认在项目根目录生成杂乱的 test-results/
  outputDir: 'workspace/test-results/artifacts',

  // 超时设置（毫秒）— Makera 网站加载较慢，适当放宽
  // 全局超时：动态计算，单轮约 12min × (retries+1) + 20% 余量
  // CI: 12×3×1.2 ≈ 43min；本地: 12×1×1.2 ≈ 15min
  globalTimeout: process.env.CI ? 45 * 60 * 1000 : 15 * 60 * 1000,
  // 单用例超时：150s，基于最长用例结算页流程(112s)留 30% 余量
  timeout: 150_000,
  expect: { timeout: 15_000 },

  // 串行执行（避免多站点并发导致网络/IP跳转冲突）
  fullyParallel: false,

  // 单工作进程（保证测试稳定性，避免资源竞争）
  workers: 1,

  // CI 环境下重试次数（本地不重试）
  // Playwright 原生重试：失败后重新执行同一测试文件，不修改代码
  retries: process.env.CI ? 3 : 0,

  // 报告器配置：同时使用 list（终端）+ junit（XML）+ html（网页报告）+ allure（详细报告）
  // junit.xml 供后续 Python 解析并推送飞书
  // html 报告供人工查看测试详情
  // allure-results 供生成 Allure 详细报告（步骤/参数/附件），CI 部署到 GitHub Pages
  // 输出目录通过 ALLURE_RESULTS 环境变量区分：全量跑与自愈重跑写入不同目录，避免互相污染
  reporter: [
    ['list'],
    ['junit', { outputFile: 'workspace/test-results/junit.xml' }],
    ['html', { outputFolder: 'workspace/test-results/html', open: 'never' }],
    // ⚠️ 选项名必须是 resultsDir（allure-playwright v3 起更名）：
    // 旧名 outputFolder 在 v3 中会被静默忽略，导致结果落入默认目录 ./allure-results（项目根目录），
    // workspace 下的结果目录为空 → Allure 报告无内容（曾因此导致 CI 报告 0 用例）
    ['allure-playwright', {
      resultsDir: process.env.ALLURE_RESULTS || 'workspace/allure-results',
      detail: true,
      suiteTitle: true,
    }],
  ],

  // 全局测试设置
  use: {
    // 多站点架构：各 spec 文件自行声明 TARGET_URL，不再使用全局 baseURL

    // 有头模式运行（本地调试可见浏览器，CI 环境自动无头）
    headless: process.env.CI ? true : false,

    // 视口大小
    viewport: { width: 1280, height: 720 },

    // 各站点在 spec 文件中通过 test.use() 自行设置 geolocation/locale/timezoneId

    // 失败时截图和录像
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // 浏览器启动参数：优化磁盘使用和性能
    launchOptions: {
      // 禁用 DevTools、禁用扩展，减少资源占用
      args: [
        '--disable-dev-shm-usage',  // 禁用 /dev/shm，避免内存不足
        '--disable-gpu',            // 禁用 GPU 加速（无头模式不需要）
        '--no-sandbox',             // 禁用沙箱（CI 环境需要）
      ],
    },
  },

  // 浏览器项目配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});