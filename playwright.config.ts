// =============================================================================
// playwright.config.ts — Playwright Test Runner 核心配置文件
// =============================================================================
// 作用：
//   定义 Web 自动化测试的全局行为，包括：
//   1. 测试用例扫描目录（testDir）
//   2. 超时、重试、并行执行策略
//   3. 多格式报告器输出（终端 list / JUnit XML / HTML 网页报告）
//      - JUnit XML 供后续 Python 解析并推送飞书通知
//      - HTML 报告供人工查看测试详情
//   4. 浏览器运行参数（无头模式、视口、失败截图/录屏/trace）
//   5. 目标浏览器项目（当前仅 Chromium）
// 参考：https://playwright.dev/docs/test-configuration
// =============================================================================
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 测试文件目录：所有 .spec.ts 文件存放位置
  testDir: './src/web/testcases',

  // 超时设置（毫秒）— Makera 网站加载较慢，适当放宽
  timeout: 300_000,
  expect: { timeout: 30_000 },

  // 串行执行（避免多站点并发导致网络/IP跳转冲突）
  fullyParallel: false,

  // 单工作进程（保证测试稳定性，避免资源竞争）
  workers: 1,

  // CI 环境下重试次数（本地不重试）
  retries: process.env.CI ? 2 : 0,

  // 报告器配置：同时使用 list（终端）+ junit（XML）+ html（网页报告）
  // junit.xml 供后续 Python 解析并推送飞书
  // html 报告供人工查看测试详情
  reporter: [
    ['list'],
    ['junit', { outputFile: 'workspace/test-results/junit.xml' }],
    ['html', { outputFolder: 'workspace/test-results/html', open: 'never' }],
  ],

  // 全局测试设置
  use: {
    // 目标测试网站（来自增量需求）
    baseURL: 'https://eu.makera.com/',

    // 无头模式运行（CI 环境必须为 true）
    headless: true,

    // 视口大小
    viewport: { width: 1280, height: 720 },

    // 失败时截图和录像
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  // 浏览器项目配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});