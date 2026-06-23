## Context

变更①（harness）、②（纯核心，产出 `SubmissionRecord`）、③（`BrowserDriver` 驱动到 임시저장）均已落地并 `verify` 全绿。本变更把它们串成端到端工作流，并交付给非技术操作员。决策依据见项目 memory 的 [[utradehub-rewrite-architecture]]——尤其"必须人工闸、绝不全自动"与"凭据不落盘"。

## Goals / Non-Goals

**Goals:**
- 端到端编排：`摄入 → 抽取 → 映射 → 分组 → 校验 → 干跑预览 →（人工确认）→ 逐组驱动 → 报告`，依赖端口、可测。
- 非技术操作员的本地 Web 应用（配置/上传/预览/凭据/运行/进度/报告）。
- 凭据每会话输入、仅内存态、绝不写盘或记日志。
- 一键 `.bat` 启动器。
- `verify` 同时覆盖前端（含 JSX）与后端。

**Non-Goals:**
- 多租户/云端/鉴权（本地单人用）。
- 凭据持久化。
- 替代人工最终 발급（永远是人的活）。
- 安装包/exe 打包（内部用 `.bat` 启动器即可）。

## Decisions

**两段式编排编码人工闸。**
`previewBatch(inputs, ports) => PreviewResult`：抽取+映射+分组+校验，**不碰浏览器**，产出"每组将填什么"。`submitBatch(approvedGroups, credentials, driver, onProgress) => BatchReport`：仅对**人工确认过**的组逐个 `createDraft`。两段都经端口注入 → 用伪造件完全单测。预览与提交分离 = 干跑预览 + 人工闸天然成立。

**后端：Fastify。** TS 优先、轻、快。开发期 Vite dev server 代理 `/api` 到 Fastify；生产期 `vite build` 产出静态资源由 Fastify 托管。备选 Express（更常见但更重），选 Fastify 取其 TS 体验。

**前端：React + Vite。** 单语言贯穿前后端。界面极简：配置页、干跑预览页、凭据输入 + 运行 + 进度、报告页。前端复用 `src/core` 的领域类型与 `src/app/dto.ts` 的 API DTO（避免重复定义）。

**仓库布局。** 后端在 `src/app/`（`orchestrator.ts`、`server/`、`dto.ts`、`environment.ts`）；前端在 `web/`（自带 `index.html`、`src/`）。

**`verify` 扩展覆盖前后端。** tsconfig 纳入 `web/`（`jsx: react-jsx`）；ESLint 加 `eslint-plugin-react-hooks`；Vitest 后端/编排用 node 环境，少量前端组件测试用 jsdom（按文件 `// @vitest-environment jsdom`）。

**凭据处理。** `POST /api/run` 在请求体携带凭据，仅在该请求内存中持有并传给 `BrowserDriver`；**不写盘、不入日志（错误中脱敏）**、无存储层。

**进度传输：SSE。** 运行进度经 Server-Sent Events 单向推给前端（比轮询干净）。

**运行前环境检查。** `checkEnvironment()` 汇总阻断项（系统 Chrome 缺失、LLM 配置缺失、映射文件缺失），运行前在界面提示。

**启动器。** `run.bat`：`node` 起已构建的服务并打开浏览器到 `localhost`。内部交付：一次 `npm install && npm run build`，之后双击 `run.bat`。

## Risks / Trade-offs

- **前端工具链抬高复杂度** → 界面保持极简、UI 逻辑薄；业务判断全在已测的编排/核心；React 只做展示与表单。
- **真实驱动无法进 CI** → 编排用伪造件测；真站点运行靠操作员本机（人工）。
- **前后端跨根 TS 配置摩擦** → 单一 tsconfig 同纳 `src` 与 `web`，或 project references；`verify` 必须覆盖两者。
- **凭据泄露** → 绝不持久化/记日志，错误信息脱敏；无存储层从根上杜绝。

## Migration Plan

纯增量。新目录 `web/` 与 `src/app/server`。旧 Python 不动。回滚 = 删除新增文件与依赖。

## 待你拍（默认值）

- 后端框架：**Fastify**（默认）vs Express。
- PDF 输入：**界面上传**（默认）vs 读取本地文件夹路径。
- 进度传输：**SSE**（默认）vs 轮询。
