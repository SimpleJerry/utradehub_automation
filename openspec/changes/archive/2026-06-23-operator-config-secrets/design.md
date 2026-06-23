## Context

当前 web 应用(`web/src/App.tsx` + Fastify `src/app/server/*`)的配置流:供应商映射是粘贴 textarea(`mappingCsv`),`/api/preview` 收 `{ mappingCsv, pdfs }`;LLM 配置仅由 `src/app/server/deps.ts` 的 `loadLlmConfig()` 从 `process.env.LLM_*` 读取,在 `createProductionDeps()` 里一次性构建 `LlmExtractor`。登录凭据(账号/密码)已是界面每会话输入、随 `/api/run` 传入、仅内存。`SITE_BASE_URL` 在前端已是硬编码默认值,界面无编辑入口。`SITE_*` 仅 gated 集成测试经 `credentialsFromEnv()` 使用。

约束:不持久化任何密钥(设计决策);provider 保持 OpenAI 兼容、不锁单一供应商;人工闸与站点驱动逻辑不动。

## Goals / Non-Goals

**Goals:**
- 供应商映射经文件上传录入。
- LLM API Key 经界面录入、仅内存、绝不落盘;非敏感项(model/baseUrl)有默认值且可覆盖。
- app 运行时不再从 `.env` 读取任何密钥。
- 保持 `batch-orchestration` 与端口契约不变。

**Non-Goals:**
- 不引入密钥落盘 / OS keychain。
- 不改打包/交付(Change B)、不改 `run.bat`(Change B 退役)。
- 不改人工闸、站点契约、驱动流程。

## Decisions

- **LLM 配置随 `/api/preview` 请求传入,服务端按请求构建抽取器**。备选(服务端 set-config 端点持有于内存)被否决:更有状态、与现有“凭据随请求传入”的无状态模式不一致。前端在 React state 持有 API Key(刷新即清),每次 preview 携带。
  - DTO:`PreviewRequest` 增 `llm: { apiKey: string; model?: string; baseUrl?: string }`。
  - 服务端:用请求的 `llm`(缺省合并默认 `LLM_DEFAULTS`)构建 `AiSdkLlmProvider` → `LlmExtractor`,仅用于该请求;不再在 `createProductionDeps` 固定持有抽取器。`ServerDeps` 改为提供 `makeExtractor(llm)` 工厂(或在路由内构建),`driver`/`parseMapping`/`detectEnvironment` 不变。
- **默认值集中**:在代码定义 `LLM_DEFAULTS = { model: "deepseek-v4-flash", baseUrl: <默认> }`;请求未给 model/baseUrl 时回退默认。apiKey 无默认(必填,操作员录入)。
- **环境检查调整**:`checkEnvironment` 不再依赖 `process.env.LLM_API_KEY`;环境阻断项聚焦系统 Chrome。LLM Key/映射改为界面校验(预览前要求齐备),不计入 `detectEnvironment`。`GET /api/environment` 仅报 Chrome 等环境项。
- **前端**:配置页:映射改 `<input type=file accept=".csv">`(读 `file.text()` 存入 `mappingCsv` state);新增 API Key 输入(type=password)与可折叠“高级”里的 model/baseUrl;只读显示 uTradeHub 网址。预览按钮在缺 API Key/映射/PDF 时禁用。
- **`start` 去 `--env-file`**:LLM 配置不再来自 env,终端用户无需 `.env`;gated 测试仍用 `node --env-file=.env ...`(测试命令本就显式带,不依赖 start)。
- **凭据/密钥安全**:API Key 与登录密码一样,仅内存、错误信息脱敏、绝不写盘/日志。

## Risks / Trade-offs

- [每次开 app 要重填 API Key] → 已与用户确认接受(仅内存、换取不落盘);Key 在浏览器 state 持有至刷新/关闭,非每次预览重填。
- [服务端每请求构建抽取器的开销] → 构建 provider 是轻量对象创建,无网络;可接受。
- [移除 env LLM 检查后,缺 Key 的失败前移到 preview 时] → 前端在预览前强制要求 API Key 字段非空,给出清晰提示,避免发出无意义请求。
- [开发者习惯被改(start 不再加载 .env)] → 文档与提案标注;gated 测试命令仍显式 `--env-file`,不受影响。

## Migration Plan

1. DTO 加 `llm` 字段;服务端路由按请求构建抽取器;`deps.ts` 去 `loadLlmConfig`/env 读取,加 `LLM_DEFAULTS` 与工厂。
2. 调整 `checkEnvironment` 与 `/api/environment`(去 LLM env 项)。
3. 前端:映射上传、API Key + 高级字段、只读网址、按钮禁用条件。
4. `package.json` `start` 去 `--env-file`。
5. 更新服务端/前端测试。
6. `npm run verify` 全绿;手动起 app 自测一遍配置→预览路径(可选,真实抽取需真 Key)。
7. 回滚:本变更纯应用层,`git revert` 即可。
