## Why

本地 Web 应用面向非技术操作员日常使用,但当前配置/密钥模型有两处摩擦与风险:① 供应商映射要把 CSV 内容**手动粘贴**进 textarea(总得开文件拷内容);② **LLM_API_KEY 只能从 `.env` 读**,意味着密钥以明文落在磁盘文件里,有泄露面,且非技术用户难配置。本变更把可由用户录入的配置搬进界面、把密钥收敛为**仅内存**,并为非敏感项设默认值,既降低泄露风险又简化操作。背景与决策见 `docs/superpowers/specs/2026-06-24-operator-config-and-packaging-design.md`(Change A)。

## What Changes

- **供应商映射改文件上传**:界面用 `<input type="file" accept=".csv">` 上传 CSV,前端读取文本后照旧发 `/api/preview`,取代粘贴 textarea。
- **LLM_API_KEY 进界面、仅内存**:配置页新增 API Key 输入框,值随本次 app 运行保留于内存(关闭/刷新即清),**绝不落盘/记日志**,与登录密码同一安全原则。`/api/preview` 请求携带 LLM 配置;服务端按请求构建 LLM 抽取器。
- **LLM 非敏感项设默认 + 可选覆盖**:`LLM_MODEL` 默认 `deepseek-v4-flash`、`LLM_BASE_URL` 设默认值(硬编码),配置页提供“高级”可选覆盖字段;provider 仍 OpenAI 兼容,不锁单一供应商。
- **uTradeHub 网址只读展示**:界面只显示固定值 `https://www.utradehub.or.kr/`,移除任何编辑入口。
- **app 不再从环境读 LLM 配置**:`deps.ts` 停止从 `process.env` 取 `LLM_*`;改由请求传入 / 代码默认。**BREAKING**(对开发者运行方式):`start` 脚本移除 `--env-file`(终端用户不再需要 `.env`)。`.env` 仅保留为开发者 gated 集成测试(`SITE_*`)的本地 fixture。
- **运行前检查随之调整**:环境阻断检查聚焦系统 Chrome;LLM API Key 与供应商映射作为操作员录入项,界面在预览前要求齐备。

## Capabilities

### New Capabilities
<!-- 无新增 capability:本变更修改既有 web 应用能力的配置/密钥行为。 -->
（无)

### Modified Capabilities
- `operator-web-app`: 新增“供应商映射经文件上传”“LLM 配置经界面录入且 API Key 仅内存”“uTradeHub 网址只读展示”三条需求;修改“运行前环境检查”以反映 LLM Key/映射改为操作员录入项。

## Impact

- **改动代码**:`web/src/App.tsx`(上传按钮、LLM Key/高级字段、只读网址)、`web/src/api.ts` 与 `src/app/dto.ts`(preview 请求携带 LLM 配置)、`src/app/server/server.ts`/`deps.ts`(按请求构建抽取器、停读 env、调整环境检查)、`package.json`(`start` 去 `--env-file`)。
- **退役**:`.env` 在终端用户路径中的角色(仅留作开发测试 fixture)。
- **不变**:`batch-orchestration`(`previewBatch` 仍经端口,LLM 抽取器在上游按请求构建);人工闸、站点驱动逻辑、凭据仅内存原则均不变(并延伸到 LLM Key)。
- **安全**:密钥不再落盘,泄露面收敛到运行时内存。
- **测试**:服务端路由测试更新为“preview 携带 LLM 配置”;前端组件测试覆盖上传与 LLM Key 字段。零真实网络/浏览器不变。
