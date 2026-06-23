## Why

uTradeHub 구매확인서 自动化工具要用 TypeScript 从零重建，并在 OpenSpec + superpowers 下以 100% vibecoding 的方式开发。旧项目的病根在结构：零自动化测试、字符串袋式数据、脆弱的解析与选择器、且没有规格——任何改动都只能对着真实网站手工跑才能验证。agent 无法在这种环境里安全工作。在写任何产品代码（抽取、浏览器自动化、Web 界面）之前，仓库需要一套**验证 harness**——类型、测试、lint、CI——外加规格基线，让后续每次改动都落在紧致、自动化的反馈回路里。本变更先建这张安全网，因为变更②③④都依赖它。

## What Changes

- 新增 TypeScript 工程骨架：`package.json`（npm 脚本）、严格 `tsconfig.json`、面向 Node 24 的 `src/` 布局。
- 新增代码质量工具：ESLint + Prettier（lint/格式化）、严格 TypeScript 类型检查、Vitest 单元测试（含覆盖率）。
- 定义单一入口 `verify`（typecheck + lint + format-check + test），开发者与 CI 用完全相同的命令。
- 新增 CI 工作流（GitHub Actions），每次 push 与 PR 都跑 `verify`，**失败即拦截合并**。
- 确立后续变更必须遵守的仓库约定：functional-core / imperative-shell 分层、对外部依赖（LLM provider、浏览器驱动、文件系统、时钟）的 ports-and-adapters 接缝、密钥不入库、golden-file 夹具约定。
- 为 `engineering-harness` 能力建立 OpenSpec 规格基线。
- 旧 Python 实现保留在 git 历史中但已被取代；本变更**不删除**它（移除/隔离另开变更，避免混淆关注点）。

本变更**不引入任何产品行为**——没有 PDF 抽取、供应商映射、浏览器自动化或 UI。它纯粹是地基。

## Capabilities

### New Capabilities
- `engineering-harness`：仓库的质量闸门与结构约定——严格类型、自动化测试、lint/format、统一的 `verify` 命令、CI 强制，以及后续每个变更都要满足的分层/端口约定。

### Modified Capabilities
<!-- 无。openspec/specs/ 为空，这是全新重写。 -->

## Impact

- **新增文件**：`package.json`、`tsconfig.json`、ESLint + Prettier 配置、`vitest.config.ts`、`.github/workflows/ci.yml`、最小 `src/` 骨架、新应用的 `.env.example`、`.gitignore`（追加 `node_modules/`、覆盖率产物）。
- **依赖**：Node 24（已装）与 npm（已装）；开发依赖 `typescript`、`tsx`、`@types/node`、`vitest`、`@vitest/coverage-v8`、`eslint`、`typescript-eslint`、`prettier`、`eslint-config-prettier`。（开发机未装 pnpm，统一用 npm。）
- **共存**：新 TS 工程与旧 Python 树并存，直到变更②③④取代它；本变更不改动或删除任何 Python 文件。
- **风险**：低——地基且增量。主要风险是范围膨胀；本变更刻意只限于工具、约定与 harness 规格。
