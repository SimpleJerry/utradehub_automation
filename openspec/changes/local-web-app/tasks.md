## 1. DTO 与编排（纯·端口注入）

- [x] 1.1 `src/app/dto.ts`：API 请求/响应 DTO（`PreviewResult`、`GroupPreview`、`BatchReport`、`GroupOutcome`、`RunRequest` 等）
- [x] 1.2 `src/app/orchestrator.ts`：`previewBatch(inputs, ports)`（抽取→映射→分组→校验）与 `submitBatch(approved, credentials, driver, onProgress)`（逐组 `createDraft`、互不阻断），全程经端口
- [x] 1.3 `src/app/environment.ts`：`checkEnvironment()` 汇总阻断项（Chrome/LLM/映射）
- [x] 1.4 测试：伪造 `Extractor`/`BrowserDriver`/映射——预览不提交、只提交已批准组、逐组报告（部分失败）、凭据脱敏

## 2. 后端服务（Fastify）

- [x] 2.1 添加 `fastify` 依赖；`src/app/server/server.ts`：组装 Fastify、注册路由、生产期托管前端静态资源
- [x] 2.2 路由：`POST /api/preview`（上传 PDF + 映射 → `PreviewResult`）、`POST /api/run`（已批准组 + 凭据 → 驱动）、`GET /api/run/stream`（SSE 进度）、`GET /api/environment`
- [x] 2.3 凭据处理：仅请求内存、错误脱敏、绝不写盘/日志
- [x] 2.4 测试：`fastify.inject` 测路由（preview、environment；run 用伪造 driver）

## 3. 前端（React + Vite）

- [ ] 3.1 添加 `react`/`react-dom`/`vite`/`@vitejs/plugin-react`/`@types/react`/`@types/react-dom`；`web/` 脚手架（`index.html`、`main.tsx`、`vite.config.ts`、dev 代理 `/api`）
- [ ] 3.2 界面：配置页（LLM 可选/映射 CSV/上传 PDF）、干跑预览页（每组将填什么 + 校验）、凭据输入 + 运行 + SSE 进度、报告页
- [ ] 3.3 `tsconfig` 纳入 `web/`（`jsx: react-jsx`）；ESLint 加 `eslint-plugin-react-hooks`；Vitest 前端用 jsdom（按文件标注）
- [ ] 3.4 测试：关键组件渲染（预览/校验展示、未确认禁用运行）

## 4. 启动器与构建

- [ ] 4.1 npm scripts：`dev`（vite + fastify 并行）、`build`（vite build + 后端打包）、`start`（起服务并打开浏览器）
- [ ] 4.2 `run.bat`：一键起服务 + 开浏览器
- [ ] 4.3 README 增补"运行/交付（本地 Web 应用）"一节

## 5. 收尾

- [ ] 5.1 `npm run verify` 全绿（前后端 typecheck/lint/test）
- [ ] 5.2 在 README/ARCHITECTURE 记一笔：旧 Python 树退役/清理另排一个变更
