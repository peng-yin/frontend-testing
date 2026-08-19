# Frontend Testing Blueprint

一套可直接运行、可裁剪到真实 React/Vite 仓库的前端测试参考实现。版本组合于
2026-07-29 校验，覆盖：

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

## 快速运行

环境要求：Node.js 24+、Corepack。

```bash
corepack enable
pnpm install
pnpm exec msw init public --save
pnpm exec playwright install chromium
pnpm verify
pnpm test:e2e:pr
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
| 本地完整校验             | `pnpm verify`                                       |

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

启用前只需配置 `OPENAI_API_KEY` Repository Secret。完整机制、安全边界和操作方式见
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
