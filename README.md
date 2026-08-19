# Frontend Testing Blueprint

[![CI](https://github.com/peng-yin/frontend-testing/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/peng-yin/frontend-testing/actions/workflows/ci.yml)
[![Deploy Pages](https://github.com/peng-yin/frontend-testing/actions/workflows/deploy-pages.yml/badge.svg?branch=main)](https://github.com/peng-yin/frontend-testing/actions/workflows/deploy-pages.yml)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-339933?logo=node.js&logoColor=white)](./package.json)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

一套可直接运行、可增量迁入真实 React/Vite 仓库的前端测试参考实现。它把需求影响、
测试分层、变异测试、浏览器验证、标准报告和 CI/CD 串成一条可审计的测试证据链。

- [在线体验](https://peng-yin.github.io/frontend-testing/)
- [测试体系设计](./TESTING_STRATEGY.md)
- [AI 自动补测编排](./AI_TEST_AUTOMATION.md)
- [真实 GitHub 仓库案例](./REAL_REPOSITORIES.md)

版本组合于 2026-07-29 校验，覆盖：

- Vitest 4 + jsdom + Testing Library
- Storybook 10 + Vitest Browser Mode
- Stryker + Vitest Runner
- Playwright E2E
- MSW 2（Vitest Node 与 Storybook Browser）
- ESLint 10 + Husky + lint-staged + Commitlint
- GitHub Actions CI、夜间测试与 GitHub Pages CD
- 基于变更影响的 Codex 自动补测与验证后回写
- JUnit、JSON、HTML、LCOV、Cobertura 统一测试证据
- Storybook 静态产物全量冒烟、真实应用 E2E 覆盖率与变更行变异测试

## 整体流程

需求变化先形成测试计划，再由确定性门禁校验每一层测试证据。AI 只能生成候选修改，
不能绕过验证直接发布。

![从测试金字塔升级为测试证据链](./docs/images/testing-evidence-chain.png)

```text
需求变化 → 测试计划 → AI 补测 → Vitest / Storybook / Stryker / Playwright
        → 测试证据与回执 → Quality Gate → GitHub Pages CD
```

## 获取模板

创建新项目时可 Fork 或克隆本仓库：

```bash
git clone https://github.com/peng-yin/frontend-testing.git
cd frontend-testing
```

迁入已有项目时不要覆盖业务配置，按
[落地路线](./TESTING_STRATEGY.md#落地路线) 分阶段复制测试基建并逐步提高门禁。

## 快速运行

环境要求：Node.js 24+、Corepack。

```bash
corepack enable
pnpm install
pnpm exec playwright install chromium
pnpm verify
```

仓库已经包含 `public/mockServiceWorker.js`，正常安装不需要重复执行 `msw init`。只有升级
MSW 或 Worker 文件丢失时才需要重新生成。

`pnpm verify` 是常规本地校验，包含类型、格式、Lint、测试编排自测、单元覆盖率、
Storybook 浏览器组件测试、静态 stories 冒烟和生产构建。应用 E2E 与变异测试成本更高，
需要显式执行：

```bash
pnpm test:e2e:pr
pnpm test:mutation
```

常用命令：

| 目标                     | 命令                                                |
| ------------------------ | --------------------------------------------------- |
| Vitest 监听模式          | `pnpm test`                                         |
| 单元/集成测试            | `pnpm test:unit`                                    |
| 覆盖率门禁               | `pnpm test:coverage`                                |
| Storybook 浏览器组件测试 | `pnpm test:stories`                                 |
| Storybook 全量静态冒烟   | `pnpm build-storybook && pnpm test:storybook-smoke` |
| Storybook UI             | `pnpm storybook`                                    |
| PR 级 Chromium E2E       | `pnpm test:e2e:pr`                                  |
| 全浏览器 E2E             | `pnpm test:e2e`                                     |
| 真实应用 E2E 覆盖率      | `pnpm test:e2e:coverage`                            |
| Stryker 变异测试         | `pnpm test:mutation`                                |
| 变更行 Stryker           | `pnpm test:mutation:changed -- --base <ref>`        |
| CI 单测与标准报告        | `pnpm ci:test`                                      |
| 需求影响与测试计划门禁   | `pnpm test:impact -- --working-tree`                |
| 常规本地校验             | `pnpm verify`                                       |

## 质量门禁

| 层级               | PR / main 门禁                                | 定时深度验证                       |
| ------------------ | --------------------------------------------- | ---------------------------------- |
| 静态质量           | TypeScript、ESLint、Prettier、Commitlint      | Dependabot 持续更新                |
| 单元与集成测试     | 行/函数/语句 ≥ 85%，分支 ≥ 80%                | 标准报告持续归档                   |
| Storybook 组件测试 | Chromium Browser Mode + 静态 stories 全量冒烟 | 与主 CI 同步验证                   |
| 变异测试           | 只变异本次变更的可执行行，低于 70% 阻塞       | 工作日执行全量 Stryker             |
| 应用 E2E           | Chromium 关键路径                             | Chromium、Firefox、WebKit 全浏览器 |
| CD                 | 仅复用全绿 CI 生成的未插桩 `app-dist`         | 发布到 GitHub Pages                |

单元、Storybook、Playwright 证据默认保留 14 天，变异测试证据保留 30 天。最终
`Quality gate` 要求静态检查、单元/集成、Storybook、变异、构建和 E2E 全部成功。

## 产物导航

- [BLOG.md](./BLOG.md)：可直接发布的项目介绍与技术实践文章
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)：分层架构、质量门禁、CI/CD 和治理规则
- [REAL_REPOSITORIES.md](./REAL_REPOSITORIES.md)：真实 GitHub 仓库案例与可复用点
- [vitest.config.ts](./vitest.config.ts)：jsdom 与 Storybook Browser 双项目
- [stryker.config.mjs](./stryker.config.mjs)：变异测试配置
- [playwright.config.ts](./playwright.config.ts)：三浏览器、重试与 Trace
- [playwright.storybook.config.ts](./playwright.storybook.config.ts)：构建后全量 story 冒烟
- [.github/workflows/ci.yml](./.github/workflows/ci.yml)：PR 质量门禁
- [.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml)：复用已测试制品的 CD
- [AI_TEST_AUTOMATION.md](./AI_TEST_AUTOMATION.md)：每次需求变更自动补齐测试的安全编排
- [.github/workflows/ai-test-completion.yml](./.github/workflows/ai-test-completion.yml)：AI 补测工作流

## AI 自动补测

行为变化必须用 `.testing/plans/*.json` 建立“需求行为 → 源码 → 必需测试层 → 测试证据”
映射。CI 会根据 `.testing/policy.yml` 拒绝漏测变更。为可信的同仓库 PR 添加
`ai-test-completion` 标签后，Codex 会补齐受影响测试，并依次执行 Vitest、Storybook、
Stryker 和 Playwright；所有门禁通过后才通过 GitHub API 写回 PR 分支。

![AI 自动补测安全编排](./docs/images/ai-test-orchestration.png)

启用与观测：

1. 在 `Settings → Secrets and variables → Actions` 创建 `OPENAI_API_KEY` Repository
   Secret。
2. 为可信成员创建的同仓库 PR 添加 `ai-test-completion` 标签，或在 Actions 页面输入
   PR 编号手动运行 **AI test completion**。
3. 在 Actions 中观察 Resolve、Generate、Verify、Publish 四个阶段；Verify 会在没有
   OpenAI Secret 的独立 Job 中重跑全部测试层。
4. 成功后 PR 会收到测试回执和 `ai-test-complete` 标签；失败时会收到
   `ai-test-failed` 标签及对应的 Actions 链接。

`OPENAI_API_KEY` 只通过 GitHub Actions Secret 注入，不会写入代码、补丁、测试报告或
构建产物。Fork PR 在接触 Secret 之前会被拒绝；AI 生成的修改只有通过全部门禁后，才会
由 GitHub Contents API 写回同仓库 PR 分支。完整安全边界见
[AI_TEST_AUTOMATION.md](./AI_TEST_AUTOMATION.md)。

## 示例如何串起来

同一个 `UserProfile` 场景贯穿全部测试层：

1. `UserProfile.test.tsx` 在 jsdom 中通过 Testing Library 驱动用户行为，通过 MSW
   Node 拦截真实 `fetch`。
2. `UserProfile.stories.tsx` 定义成功、错误、加载三个 UI 状态；`play` 函数在
   Chromium 中执行。
3. `user-profile.spec.ts` 对生产构建执行 Playwright E2E。
4. Stryker 修改 API 与组件实现，确认这些测试能真正杀死错误实现。

在 CI 中还会额外生成两类证据：静态 Storybook 的所有 stories 都必须能独立挂载；夜间
Chromium 会对显式插桩的应用构建采集 `window.__coverage__`，合并多 worker 分片并输出
HTML、LCOV、JSON 与 Cobertura。部署仍复用正常的、未插桩 `app-dist`，不会发布测试构建。

这套模板刻意不让每一层重复同样的断言：jsdom 覆盖业务分支，Storybook 覆盖组件状态，
Playwright 只保留跨边界关键路径。

## 迁入真实仓库

先复制配置与 `test/setup.ts`，再按
[TESTING_STRATEGY.md 的落地路线](./TESTING_STRATEGY.md#落地路线) 分阶段启用门禁。
不要第一天把所有历史债务设为阻塞；先记录基线，再对新增代码执行不回退策略。

## 项目治理

- [CONTRIBUTING.md](./CONTRIBUTING.md)：开发、测试与 PR 贡献规范
- [SECURITY.md](./SECURITY.md)：漏洞报告和测试数据安全要求
- [LICENSE](./LICENSE)：MIT License
- [Issue 模板](./.github/ISSUE_TEMPLATE)：Bug 与通用能力建议
- [PR 模板](./.github/pull_request_template.md)：远程质量门禁检查清单

> 当前 `typescript-eslint@8.65.0` 的 TypeScript peer range 小于 6.1，因此模板固定
> TypeScript 6.0.3，而不是 npm 当前的 TypeScript 7。升级前先验证该兼容边界。
