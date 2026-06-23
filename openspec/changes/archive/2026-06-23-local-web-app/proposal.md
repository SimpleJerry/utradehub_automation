## Why

变更①②③产出了 harness、纯核心（PDF→校验、分组的 `SubmissionRecord`）与浏览器外壳（驱动到 임시저장）。变更④是**交付**：把它们串成端到端工作流，并包成一个**非技术操作员一键就能用的本地 Web 应用**——摄入 PDF、看一份**干跑预览**、当场输入本次会话的登录凭据、逐个供应商组驱动出 임시저장 草稿、看结果报告。这才让真正的操作员用得上，也兑现了"极简前后端系统"的交付形态。**人工闸（预览→确认→才驱动）**与**凭据仅内存态**是一等公民。

## What Changes

- **批处理编排**：一个把核心与适配器经端口串起来的工作流——`摄入 → LLM 抽取 → CSV 映射 → 分组 → 校验 → 干跑预览 →（人工确认）→ 逐组驱动到 임시저장 → 报告`。编排依赖端口，可用伪造件完全单测。
- **本地 Web 应用**：Fastify HTTP API + React（Vite）界面，面向非技术操作员：配置（LLM 可选、供应商映射 CSV、PDF 上传）、干跑预览视图、**每会话凭据输入**、运行 + 实时进度、草稿结果报告。
- **一键启动器**：`.bat`/快捷方式启动本地服务并自动打开浏览器。
- **凭据仅内存**：界面每会话输入，后端仅在本次运行的内存中持有，**绝不写盘、不记日志**。
- **运行前环境检查**：系统 Chrome（`channel:"chrome"`）是否就绪、LLM 配置、映射文件是否齐备。
- 向 harness 增补前端工具链（Vite/React），`verify` 扩展为同时覆盖前后端 TS。

## Capabilities

### New Capabilities
- `batch-orchestration`：端到端工作流的纯编排——摄入、抽取、映射、分组、校验、**干跑预览**、人工确认后逐组驱动、汇总报告；依赖端口、以伪造件可测；**严格在预览确认后才驱动**。
- `operator-web-app`：本地 Fastify API + React 界面 + 一键启动器，供非技术操作员日常使用；凭据每会话输入、仅内存态、绝不落盘。

### Modified Capabilities
<!-- 无。 -->

## Impact

- **新增代码**：`src/app/orchestrator.ts`（编排，用端口）、`src/app/server/`（Fastify API）、`web/`（React + Vite 前端）、`run.bat`/启动脚本、`vite.config.ts`（前端构建）、相应 `test/`。
- **新增依赖**：`fastify`；`react`、`react-dom`、`vite`、`@vitejs/plugin-react`、`@types/react`、`@types/react-dom`；前端 lint/测试（`eslint-plugin-react-hooks`、`jsdom`、`@testing-library/react`，按需）。
- **配置**：`LLM_*`（已有）、供应商映射 CSV、PDF 输入；**凭据不入配置**。
- **`verify` 扩展**：typecheck/lint/test 覆盖前端（含 JSX）与后端；前端组件测试用 jsdom。
- **风险**：前端工具链使复杂度上升 → 界面保持极简、UI 逻辑薄、业务判断留在已测的编排/核心；真实驱动仍需操作员本机 + Chrome + 真实凭据（人工）。本变更体量较大，tasks 内部按"编排（可测）→ API → 前端 → 启动器"排序，必要时可再拆。
