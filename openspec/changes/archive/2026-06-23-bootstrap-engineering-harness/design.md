## Context

仓库当前是一套遗留的 Python/Playwright 工具：零测试、字符串袋式数据、脆弱的解析与选择器、且无规格。团队要用 TypeScript 重建它，并在 OpenSpec + superpowers 下以 100% vibecoding 开发（见项目 memory 中的 [[utradehub-rewrite-architecture]] 与 `proposal.md`）。在写任何产品代码之前，agent 循环需要紧致的自动化反馈回路与明确的约定。

开发机为 Node v24.17.0、npm 11.13.0（pnpm 未装）。仓库托管在 GitHub（`SimpleJerry/utradehub_automation`），因此可用 GitHub Actions 做 CI。本变更只建立 harness；产品能力在后续变更落地（② 核心、③ 浏览器外壳、④ Web 应用）。

## Goals / Non-Goals

**Goals:**
- 单一 `verify` 命令（typecheck + lint + format-check + test），作为"代码是否健康"的唯一事实来源，人与 CI 用同一个。
- 严格 TypeScript 与快速、ESM 原生的测试运行器，让 agent 立即拿到红/绿反馈。
- 让后续代码"天生可测"的约定：functional-core / imperative-shell，以及对每个外部依赖（LLM provider、浏览器、文件系统、时钟、网络）的 ports-and-adapters 接缝。
- CI 在 `verify` 失败时拦截合并。
- 用于确定性转换测试的 golden-file 夹具约定。

**Non-Goals:**
- 任何产品行为（PDF 抽取、供应商映射、浏览器自动化、Web UI）——它们属于变更②③④。
- 移除或迁移遗留 Python 代码（后续清理）。
- 最终应用的打包/分发。
- 选定 LLM provider 或浏览器驱动的实现细节（这里只在约定层面隐含 *port* 形状，不做实现）。

## Decisions

**语言与运行时：TypeScript on Node 24（ESM, `NodeNext`）。**
理由：后端与后续 Web UI 用同一种语言、Playwright 一等支持、LLM 访问厂商无关。备选 Python——已在头脑风暴中否决，因为重写想要单一全栈语言与更干净的打包/UI 路线。

**包管理器：npm。**（已敲定）
理由：已安装、对个人/内部项目零摩擦。备选 pnpm（更快更严）——开发机未装，暂缓以免增加前置依赖；若日后出现 workspaces 再议。

**测试运行器：Vitest。**
理由：ESM 原生、watch 快、内置覆盖率、对 golden-file 快照友好。备选：Jest（更重、ESM 较弱）、`node:test`（更精简但功能与覆盖率体验少）。

**lint 与格式化：ESLint（flat config, `typescript-eslint`）+ Prettier。**（已敲定）
理由：TS 规则生态最成熟；format-check 接入 `verify`。备选 Biome（单一快工具）——可行且诱人，但目前 ESLint 的类型感知规则更完整，可后续再议。

**工程位置：新 TS 工程置于仓库根。**（已敲定）
建议结构：
```
src/
  core/      # 纯领域逻辑（无 I/O）——全单元测试
  ports/     # 外部依赖的接口（LlmProvider、BrowserDriver、FileStore、Clock）
  adapters/  # ports 的具体实现（后续变更加入）
  app/       # 组装根 / 装配
test/
  fixtures/  # golden-file 输入/输出
```
理由：新工程是仓库的未来；遗留 Python 并存直至被移除。备选：嵌入 `apps/` 或 `ts/` 完全隔离 Python——否决，对单一且将长存的应用是多余的间接层。

**文档语言：中文为主、英文为辅。**（已敲定）
OpenSpec 工件正文用中文以便阅读理解；结构关键字与技术名词保留英文（`Requirement`/`Scenario`/`WHEN`/`THEN`、`SHALL`/`MUST`、npm 脚本名与文件名）。

**`verify` 脚本聚合闸门。**
`verify` = `tsc --noEmit` + `eslint .` + `prettier --check .` + `vitest run`。CI 恰好运行 `npm ci && npm run verify`。

**密钥处理。**
真实 `.env` 继续被 git 忽略（已是）。已提交的 `.env.example` 记录新应用的配置键（LLM `base_url`/`model`/`apiKey` 占位；uTradeHub 凭据永不入库）。

## Risks / Trade-offs

- **两套工具链（Python + Node）在过渡期并存** → manifest 各自独立；CI 只构建 TS 工程；Python 移除另排一个变更，避免在此混淆关注点。
- **工具选型纠结（Biome vs ESLint+Prettier、npm vs pnpm）** → 现在取合理默认（ESLint+Prettier、npm）；两者都是可逆的配置改动，只在真有摩擦时再议。
- **地基范围膨胀** → 本变更严格限于工具、约定与 harness 规格；不实现 `ports/`，不写产品代码。
- **个人仓库上的 CI 噪音** → 单一工作流，快（`npm ci && npm run verify`）；未需要前不上 matrix。

## Migration Plan

增量且低风险。在仓库根引入 TS 骨架；遗留 Python 树原封不动并继续运行，直到被取代。回滚 = 删除新增文件。不涉及数据或运行时迁移。

## 已敲定（原 Open Questions）

- 包管理器：**npm**。
- 文档语言：**中文为主、英文为辅**。
- 工程位置：**仓库根**。
- lint 栈：**ESLint + Prettier**。
