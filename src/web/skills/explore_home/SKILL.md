---
name: explore_home
description: 探索 Makera 首页并生成 Playwright 测试脚本的策略和最佳实践
---

# Explore Home 技能

当需要对 https://eu.makera.com/ 进行自动化测试探索时，遵循以下策略。

## 何时使用此技能
- 目标：为 Makera 首页生成稳定、可维护的 Playwright 测试脚本
- 触发：MonitorAgent 开始执行 Web 监控任务时

## 探索策略

### 1. 页面关键区域识别
Makera 首页包含以下核心区域（根据页面内容分析）：
- **Hero Section**：包含产品名 "Carvera" 和 "Makera CAM" 的标题区
- **产品特性区**：Auto tool changing、Auto probing 等创新点
- **CTA 按钮**：多个 "Learn More" 链接，指向不同产品页
- **客户案例区**：Red 5 Watch、STEM Racing 等案例链接
- **导航栏**：网站主导航

### 2. 测试脚本生成原则
使用 `generate_test_specs` 工具生成脚本时，工具会自动：
- 收集页面所有可见的交互元素（a, button, input, h1-h3, p）
- 优先使用语义定位器：
  - `page.getByRole('link', { name: 'Learn More' })` — 用于链接
  - `page.getByRole('button', { name: '...' })` — 用于按钮
  - `page.getByText('Carvera')` — 用于文本断言
- 每个元素生成独立的 `expect(...).toBeVisible()` 测试
- 最多生成 10 个元素测试 + 1 个标题测试

### 3. 稳定性保障
- **语义定位器优先**：避免使用 XPath 或 CSS 选择器，它们脆弱
- **文本截断处理**：长文本自动截断到 77 字符，避免匹配失败
- **超时设置**：单个断言超时 5 秒，避免无限等待
- **去重**：相同文本+角色的元素只生成一个测试

### 4. 已知页面元素参考
以下元素在 Makera 首页稳定存在，可作为测试断言锚点：
- 页面标题包含 "Makera"
- 可见文本包含 "Carvera"（核心产品名）
- 至少存在一个 "Learn More" 链接
- "Makera CAM" 作为 CAM 软件名称出现
- 客户案例链接："Learn More" 出现多次

### 5. 失败排查指引
当生成的测试失败时，检查：
- 定位器文本是否与页面实际文本完全一致（注意大小写、空格）
- 元素是否在视口内可见（未被遮挡或 display:none）
- 页面是否需要滚动才能触发元素渲染（SPA 场景）

## 最佳实践
1. 生成的测试应专注于**冒烟级别**验证：关键元素可见、核心文本存在
2. 避免生成过于具体的交互测试（点击、填写表单），这些留给增量6的回归测试
3. 每次生成前，旧的 generated_homepage.spec.ts 会被覆盖，这是预期行为
4. 如果生成失败，检查目标 URL 是否可访问、Playwright 浏览器是否正常安装