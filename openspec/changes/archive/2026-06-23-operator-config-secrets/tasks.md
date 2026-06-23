## 1. DTO 与 LLM 默认值

- [x] 1.1 `src/app/dto.ts`:增 `LlmRequestConfig { apiKey: string; model?: string; baseUrl?: string }`(preview body 引用)
- [x] 1.2 定义并导出 `LLM_DEFAULTS = { model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com" }`(在 `deps.ts`)

## 2. 服务端:按请求构建抽取器、停读 env

- [x] 2.1 `src/app/server/deps.ts`:移除 env LLM 读取;改为 `makeExtractor(llm)` 工厂(请求 `llm` 合并 `LLM_DEFAULTS` 构建 `AiSdkLlmProvider`→`LlmExtractor`);`driver`/`parseMapping` 不变
- [x] 2.2 `src/app/server/server.ts`:`POST /api/preview` 用请求体 `llm` 经 `deps.makeExtractor` 构建抽取器并执行 `previewBatch`(Key 仅本次请求,不写盘/日志)
- [x] 2.3 `checkEnvironment` 与 `GET /api/environment`:移除对 `process.env.LLM_API_KEY` 的依赖,环境检查聚焦系统 Chrome

## 3. 前端配置页

- [x] 3.1 `web/src/App.tsx`:供应商映射改 `<input type="file" accept=".csv">`,读 `file.text()` 存入 `mappingCsv`(移除粘贴 textarea),并显示已加载文件名
- [x] 3.2 新增 LLM API Key 输入(`type="password"`,React state,仅内存);可折叠“高级”放 model/baseUrl 可选覆盖(占位显示默认)
- [x] 3.3 uTradeHub 网址:只读展示固定值,移除编辑入口
- [x] 3.4 预览按钮禁用条件:缺 API Key / 缺映射 / 无 PDF 时禁用
- [x] 3.5 `web/src/api.ts`:`preview()` 增 `llm` 参数并随请求体发送

## 4. 启动脚本

- [x] 4.1 `package.json`:`start` 移除 `--env-file`(回到 `tsx src/app/server/index.ts`);gated 测试命令仍显式 `--env-file=.env`,不受影响

## 5. 测试

- [x] 5.1 服务端路由测试:`/api/preview` 携带 `llm` 配置(伪造 `makeExtractor`);`environment.test.ts` 不再依赖 LLM env
- [x] 5.2 前端组件测试:映射上传 + API Key 字段渲染、缺 Key 时预览禁用(加 `afterEach(cleanup)`)

## 6. 收尾

- [x] 6.1 `npm run verify` 全绿(typecheck + lint + format:check + test;40 passed / 1 skipped)
- [x] 6.2 自检:`npm run build` 成功;`start`(无 `--env-file`)起服务,`GET /api/environment` 返回 `{"issues":[]}`(去 LLM env 后仅 Chrome 检查)
