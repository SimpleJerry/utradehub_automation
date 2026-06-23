## 1. DTO 与 LLM 默认值

- [ ] 1.1 `src/app/dto.ts`:`PreviewRequest`(或 preview body 类型)增 `llm: { apiKey: string; model?: string; baseUrl?: string }`
- [ ] 1.2 定义并导出 `LLM_DEFAULTS = { model: "deepseek-v4-flash", baseUrl: <默认> }`(放 `deps.ts` 或合适的常量位)

## 2. 服务端:按请求构建抽取器、停读 env

- [ ] 2.1 `src/app/server/deps.ts`:移除 `loadLlmConfig()`/`process.env.LLM_*` 读取;改为提供 `makeExtractor(llm)` 工厂(用请求 `llm` 合并 `LLM_DEFAULTS` 构建 `AiSdkLlmProvider`→`LlmExtractor`);`driver`/`parseMapping` 不变
- [ ] 2.2 `src/app/server/server.ts`:`POST /api/preview` 用请求体的 `llm` 构建抽取器并执行 `previewBatch`;API Key 仅用于本次请求,错误信息脱敏,绝不写盘/日志
- [ ] 2.3 `checkEnvironment` 与 `GET /api/environment`:移除对 `process.env.LLM_API_KEY` 的依赖,环境检查聚焦系统 Chrome

## 3. 前端配置页

- [ ] 3.1 `web/src/App.tsx`:供应商映射改 `<input type="file" accept=".csv">`,`onChange` 读 `file.text()` 存入 `mappingCsv` state(移除粘贴 textarea)
- [ ] 3.2 新增 LLM API Key 输入(`type="password"`,React state,仅内存);可折叠“高级”里放 model/baseUrl 可选覆盖(占位显示默认 `deepseek-v4-flash`)
- [ ] 3.3 uTradeHub 网址:只读展示固定值,移除编辑入口
- [ ] 3.4 预览按钮禁用条件:缺 API Key / 缺映射 / 无 PDF 时禁用并提示
- [ ] 3.5 `web/src/api.ts`:`preview()` 增 `llm` 参数并随请求体发送

## 4. 启动脚本

- [ ] 4.1 `package.json`:`start` 移除 `--env-file`(终端用户不再需要 `.env`);确认 gated 测试命令仍显式 `--env-file=.env`,不受影响

## 5. 测试

- [ ] 5.1 服务端路由测试:`/api/preview` 携带 `llm` 配置(伪造 Extractor/工厂);`/api/environment` 不再依赖 LLM env
- [ ] 5.2 前端组件测试:映射上传、API Key 字段、缺 Key 时预览禁用

## 6. 收尾

- [ ] 6.1 `npm run verify` 全绿(typecheck + lint + format:check + test)
- [ ] 6.2 自检:`npm run dev` 起 app,过一遍“上传映射 + 录入 Key + 选 PDF → 预览”路径(真实抽取需真 Key,可选)
