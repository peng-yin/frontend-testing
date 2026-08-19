# 贡献指南

感谢你帮助改进 Frontend Testing Blueprint。本仓库强调可复制、可验证和最小重复，
任何改动都应说明它改善了哪一层测试或哪一项工程门禁。

## 开发环境

- Node.js 24+
- Corepack
- pnpm 11.17+

```bash
corepack enable
pnpm install
pnpm exec playwright install chromium
pnpm verify
pnpm test:e2e:pr
```

## 提交改动

1. 从 `main` 创建功能分支。
2. 保持改动范围单一，并为行为变化补充相应层级的测试。
3. 创建或更新 `.testing/plans/*.json`，运行
   `pnpm test:impact -- --working-tree`，确认行为、源码与测试证据一一对应。
4. 使用 Conventional Commits，例如 `feat: add visual regression gate`。
5. 提交 PR，并完成 PR 模板中的检查项。
6. 等待 `Quality gate` 通过和至少一名维护者批准。

如果需要 AI 自动补齐受影响测试，由可信维护者为同仓库 PR 添加
`ai-test-completion` 标签。自动生成内容仍须经过全量门禁与人工评审。

## 测试层级选择

- 纯函数和业务分支：Vitest 单元测试。
- React 用户行为与请求状态：Testing Library + MSW。
- 组件状态、交互和无障碍：Storybook `play()` 测试。
- 所有 Story 的构建后可挂载性：Storybook 静态冒烟。
- 跨页面或生产构建关键路径：Playwright E2E。
- 测试有效性：Stryker 变异测试。

不要在多个层级重复同一组断言。优先选择能够稳定发现缺陷的最低测试层级。

## 质量要求

PR 必须通过需求影响检查、类型检查、ESLint、格式检查、覆盖率、Storybook 浏览器测试、
Storybook 静态冒烟、变更行 Stryker、生产构建和 Chromium E2E。涉及测试关键逻辑的改动
还应手动运行：

```bash
pnpm test:mutation
pnpm test:e2e
pnpm test:e2e:coverage
```

禁止通过增加无意义断言、排除业务文件或降低阈值来绕过质量门禁。
