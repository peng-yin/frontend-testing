# 别再只看覆盖率：我把 Vitest、Storybook、Stryker、Playwright 和 AI 补测做成了一套前端测试蓝图

> 项目地址：[peng-yin/frontend-testing-blueprint](https://github.com/peng-yin/frontend-testing-blueprint)

很多前端项目并不是“没有测试”，而是测试之间没有形成体系：

- 单元测试覆盖率看起来不错，断言却无法发现错误实现；
- Storybook 有很多页面，但只是静态展示，不能证明交互正确；
- E2E 越写越多，运行越来越慢，失败后也很难定位；
- Mock 分散在不同工具里，同一个接口维护三份假数据；
- 每次需求变化，都依赖开发者记得同步补齐所有测试；
- CI 只负责执行命令，却不知道这次变更究竟应该影响哪些测试层。

于是我做了
[Frontend Testing Blueprint](https://github.com/peng-yin/frontend-testing-blueprint)：
一套可以直接运行、也可以裁剪迁入真实 React 项目的现代前端测试参考实现。

它不是又一个“安装 Vitest 的教程”，而是试图回答一个更实际的问题：

> 当需求持续变化时，怎样让单元测试、组件测试、变异测试、E2E 和 CI/CD
> 形成一条可验证、可追踪、可自动补全的证据链？

## 一套工具，不等于一套体系

项目选用的技术栈并不冷门：

- Vitest 4 + jsdom；
- Testing Library + user-event；
- MSW 2；
- Storybook 10 + Vitest Browser Mode；
- Stryker + Vitest Runner；
- Playwright；
- ESLint、Husky、lint-staged、Commitlint；
- GitHub Actions CI、夜间测试和 GitHub Pages CD。

真正重要的是每个工具的职责边界。

| 层级                  | 负责证明什么                                 |
| --------------------- | -------------------------------------------- |
| Vitest                | 纯逻辑、异常分支、状态变化和请求行为         |
| Testing Library + MSW | 用户可见行为以及成功、失败、加载等接口状态   |
| Storybook Browser     | 组件状态、真实浏览器交互和可访问性           |
| Playwright            | 生产构建上的跨页面关键路径                   |
| Stryker               | 测试是否真的能够杀死错误实现                 |
| CI/CD                 | 所有证据是否完整，以及部署的是否为已验证制品 |

这套设计刻意避免“每一层都重复同一组断言”。测试应该放在能够稳定发现问题的最低层，
高层测试只保留必须跨越边界的代表性路径。

## 从测试金字塔升级为测试证据链

Frontend Testing Blueprint 的整体流程如下：

**需求变化 → 影响分析 → 行为测试计划**

| 测试证据层     | 证明的行为                     |
| -------------- | ------------------------------ |
| Vitest         | 单元逻辑、状态变化和异常分支   |
| Storybook      | 组件状态与真实浏览器交互       |
| Stryker        | 测试能否发现被故意修改的实现   |
| Playwright E2E | 生产构建上的跨页面关键用户路径 |

**四类测试证据 → Quality Gate → 不可变构建制品 → 部署**

每一次行为变化，都必须建立下面这组映射：

```text
需求行为
  → 受影响源码
  → 必须覆盖的测试层
  → 同一个 PR 中变化的测试证据
  → 实际执行命令
```

这个映射保存在 `.testing/plans/*.json` 中，并由 `.testing/policy.yml` 分类。

例如：

- 修改 React 业务组件，需要单元测试、Storybook 和变异测试证据；
- 修改 API 层，需要单元测试和变异测试证据；
- 修改应用关键入口，需要单元测试和 E2E；
- 只改文档，不需要为了通过门禁制造无意义测试。

CI 不再只问“测试有没有跑”，还会问：

- 这次修改是否声明了可观察行为？
- 每个业务文件是否被测试计划覆盖？
- 策略要求的测试层是否全部存在？
- 测试证据是否真的随本次 PR 发生变化？

缺少任何一项，PR 都会在影响门禁阶段失败。

## 为什么覆盖率之外还需要 Stryker

覆盖率只能证明一行代码被执行过，不能证明断言有能力识别错误。

假设测试运行了下面这段代码：

```ts
setRequestVersion((version) => version + 1);
```

如果把 `+ 1` 改成 `- 1`，测试仍然通过，那么这条测试虽然产生了覆盖率，却没有真正保护行为。

Stryker 会自动制造这种错误实现，并检查测试能否杀死它们。因此，项目同时设置：

- Statements、Lines、Functions、Branches 覆盖率门禁；
- mutation score 的 `break` 与 `high` 阈值；
- 变异报告和增量缓存；
- 针对存活且非等价 mutant 的断言补强规则。

模板自带的 `UserProfile` 示例目前达到 Statements/Lines 100%，mutation score
73.08%，并通过 70% 的阻断阈值。它没有为了得到漂亮数字隐藏存活 mutant，而是保留报告，
让团队继续看到测试能力的真实边界。

## Storybook 不只是组件展厅

项目中的 Story 同时承担四种角色：

1. 组件开发夹具；
2. 产品和设计评审材料；
3. 成功、加载、错误等状态目录；
4. 在 Chromium 中执行的交互测试。

同一个 MSW handler 语义被复用到 Vitest Node 和 Storybook Browser：

```text
src/mocks/handlers.ts
  ├─ Vitest setupServer
  └─ Storybook MSW addon
```

这避免了单元测试说接口返回一种结构、Storybook 又维护另一种结构的漂移问题。

Storybook 的 `play()` 会使用真实浏览器完成点击和可访问性查询，而不是停留在
“Story 能渲染出来就算完成”。

## E2E 应该测试生产构建，而不是开发服务器

Playwright 在这套体系中只负责真正跨边界的关键路径。

PR 阶段：

- 运行 Chromium；
- 面向生产构建；
- 复用已经通过 Build Job 的 `dist`；
- 失败保留 Trace、截图、录像和 HTML report。

夜间阶段再扩展到 Chromium、Firefox、WebKit，避免每个 PR 都承担全部浏览器成本。

更重要的是，CD 不会重新构建一份“可能与测试时不同”的产物。CI 上传不可变制品，
部署流水线只接收已经通过 Quality Gate 的同一份制品。

## 每次需求变化，让 AI 自动补齐测试

这是项目最有实验性的部分。

为可信的同仓库 PR 添加 `ai-test-completion` 标签后，GitHub Actions 会启动 Codex：

| 阶段          | 自动化动作                                          | 输出                          |
| ------------- | --------------------------------------------------- | ----------------------------- |
| 1. 可信 PR    | 校验作者、同仓库来源和当前分支 SHA                  | 已授权的变更上下文            |
| 2. Codex 补测 | 分析完整 diff，补测试计划、单测、Story 和必要 E2E   | 候选变更包                    |
| 3. 独立验证   | 执行 Impact、Vitest、Storybook、Stryker、Playwright | 不持有 AI Key 的验证回执      |
| 4. 受控写回   | 再次校验分支 SHA，通过 GitHub API 写回              | `ai-test-complete` 或诊断信息 |

**全部通过 → 写回 PR；任一失败 → `ai-test-failed` + 诊断链接**

AI 不是门禁的替代品。它只能生成候选代码，不能自己宣布成功。

候选变更必须在不持有 OpenAI Secret 的独立 Job 中重新执行：

```bash
pnpm test:impact -- --working-tree
pnpm verify
pnpm test:mutation
pnpm test:e2e:pr
```

只有所有命令通过，工作流才会通过 GitHub API 写回 PR。分支 SHA 已经变化、候选路径不安全、
测试计划不完整或任何测试失败，发布都会停止。

## AI 编排也必须有安全边界

项目没有为了“自动化”而开放一个可以被任意人消耗的 AI 入口：

- 只接受 OWNER、MEMBER、COLLABORATOR 创建的同仓库 PR；
- Fork 和 Dependabot 不接触 OpenAI Secret；
- 不使用 `pull_request_target` 执行 PR 代码；
- GitHub Action 固定到完整 commit SHA；
- Codex 使用 workspace 权限和 `drop-sudo`；
- 生成、验证、发布拆成不同 Job；
- 发布 Job 只有 GitHub 写权限，没有 OpenAI API Key；
- 建议使用独立 OpenAI Project Key，并设置预算上限。

没有任何 Secret-bearing CI 能承诺绝对零风险，因此安全策略、最小权限、密钥轮换和费用上限
仍然是团队必须承担的工程责任。

## 一个真实场景如何贯穿全部层级

仓库用 `UserProfile` 展示同一个需求如何进入不同测试层：

- Vitest + Testing Library 验证加载、成功、错误、重试和切换用户；
- MSW 在 Node 中拦截真实 `fetch`；
- Storybook 展示 Success、Error、Loading，并运行 `play()`；
- Playwright 在生产构建中验证加载和刷新主路径；
- Stryker 修改 API 与组件实现，验证断言是否足够敏感。

这个示例规模不大，但目录结构、命令、报告、门禁和自动化都是真实可运行的，不是只展示配置
片段的“PPT 架构”。

## 五分钟跑起来

环境要求为 Node.js 24+ 和 Corepack：

```bash
git clone https://github.com/peng-yin/frontend-testing-blueprint.git
cd frontend-testing-blueprint

corepack enable
pnpm install
pnpm exec playwright install chromium

pnpm verify
pnpm test:e2e:pr
pnpm test:mutation
```

如果要启用 AI 自动补测，在 GitHub Actions 中配置具备可用额度的
`OPENAI_API_KEY` Repository Secret，然后为同仓库 PR 添加
`ai-test-completion` 标签。

## 如何迁入存量项目

不要第一天就让所有历史债务阻塞团队。

更稳妥的落地顺序是：

1. 先接入 TypeScript、ESLint、格式和提交规范；
2. 建立 Vitest、Testing Library、MSW 基线；
3. 为新增和修改组件补齐 Storybook 状态；
4. 将关键用户旅程迁到生产构建 E2E；
5. 记录当前 coverage 和 mutation 基线，要求新增代码不回退；
6. 最后启用影响计划与 AI 补测编排。

项目中的
[TESTING_STRATEGY.md](https://github.com/peng-yin/frontend-testing-blueprint/blob/main/TESTING_STRATEGY.md)
给出了更完整的分层原则、门禁阈值、CI/CD 和落地路线。

## 最后

好的测试体系，不是测试文件越多越好，也不是覆盖率越接近 100% 越好。

它应该让团队能够回答：

- 这次需求改变了什么行为？
- 哪一层测试最适合证明这个行为？
- 测试真的能发现错误实现吗？
- 浏览器和生产构建是否被验证？
- 部署出去的是不是测试过的同一份制品？
- 如果开发者漏补测试，CI 和 AI 能不能共同发现并补齐？

如果你也在建设前端测试基建，欢迎查看、试用和改造
[Frontend Testing Blueprint](https://github.com/peng-yin/frontend-testing-blueprint)。

如果它对你的团队有帮助，欢迎 Star、Fork，或者提交 Issue 分享你遇到的真实测试难题。

---

推荐标签：`前端工程化`、`Vitest`、`Storybook`、`Playwright`、`Stryker`、`MSW`、
`GitHub Actions`、`AI 编程`
