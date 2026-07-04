# UTradeHub Automation

本仓库是本地运行的 `구매확인서` 草稿生成工具：

`采购订单 PDF -> 结构化抽取 -> 英文供应商名/HS 映射 -> 按供应商分组 -> 操作员预览确认 -> uTradeHub 임시저장 草稿`

**硬边界：人工闸。** 工具只允许创建 `임시저장` 草稿，绝不自动点击正式 `발급`、`제출` 或任何等价签发/提交动作。最终复核和签发必须由操作员在 uTradeHub 页面内手动完成。

## 文档语言

- 中文：本文件
- English: [README.en.md](./README.en.md)
- 한국어: [README.ko.md](./README.ko.md)

三语 README 应保持同一事实口径。更新任一功能、脚本、边界或运行方式时，同步更新三份 README。

## 当前形态

- 版本：`package.json` 中的 `2.x` TypeScript 重写线。
- 后端：Fastify 本地 HTTP API。
- 前端：React 19 + Vite 操作员界面。
- 浏览器自动化：`playwright-core` 驱动操作员系统已安装的 Google Chrome，使用 `channel: "chrome"`，不捆绑 Chromium。
- PDF 文本：`unpdf`。
- LLM 抽取：Vercel AI SDK + OpenAI-compatible provider，Zod schema 校验。
- 质量闸：`npm run verify`，即 `typecheck + lint + format:check + test`。
- 打包：`packaging/package.mjs` 构建前端和后端包，复制当前 Node 运行时与生产依赖，再用 Inno Setup 生成 Windows per-user 安装包。

更多架构背景见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) 与 [openspec/](./openspec/)。

## 功能边界

工具支持的工作流：

1. 操作员在本地界面选择供应商映射 CSV、输入本次 LLM API Key、选择一个或多个采购订单 PDF。
2. `/api/preview` 执行干跑：PDF 取文本、LLM 结构化抽取、供应商映射、按供应商分组、提交前校验。
3. LLM 抽取的供应商字段是 `payToVendorNameEn`（英文 Pay-to Vendor 名称），CSV 用该英文名映射韩文供应商名 `supplierNameKo` 与 `hsCode`。
4. 前端展示每个供应商组将提交的字段、行项目、缺失字段、会被提交计划丢弃的行项目，以及 PDF/LLM 抽取失败。
5. 操作员只批准要处理的供应商组，并选择登录方式。
6. `/api/run` 只对已批准组调用浏览器驱动，逐组创建 `임시저장` 草稿并返回结果报告。

工具明确不做的事：

- 不保存 LLM API Key、uTradeHub 账号密码或会话凭据。
- 不提交私有供应商映射。
- 不在默认验证中访问网络或启动真实浏览器。
- 不替代人工判断 HS code、门户字段语义、真实签发或发布放行。

## 目录结构

```text
utradehub_automation/
├─ src/
│  ├─ core/        # 纯领域逻辑：模型、行项目归一、CSV、映射、分组、校验、提交计划
│  ├─ ports/       # 外部依赖接口：PDF text、LLM、Extractor、BrowserDriver
│  ├─ adapters/    # unpdf、OpenAI-compatible LLM、Playwright、站点契约/漂移、CSV loader
│  └─ app/         # DTO、编排、诊断、环境检查、Fastify server
├─ web/            # React/Vite 操作员界面：配置、预览、人工确认、运行、报告
├─ test/           # Vitest 后端/核心测试与 fixtures
├─ web/src/        # 前端组件与 *.test.tsx
├─ examples/       # 可提交模板，例如 vendor_mapping.example.csv
├─ docs/           # 架构说明与设计记录
├─ openspec/       # 规格、变更提案和归档历史
├─ packaging/      # Windows 打包脚本与 Inno Setup 配置
├─ scripts/        # Ruler agent 资产同步等维护脚本
└─ .ruler/         # AGENTS.md、skills、subagents 的单一源头
```

`.ruler/AGENTS.md` 是 agent 启动说明的单一真相源。根目录 `AGENTS.md` 不再跟踪；不要手写或提交它。运行 `npm run agents:sync` 会从 `.ruler/AGENTS.md` 重新生成根 `AGENTS.md`，并刷新本地平台输出（如 `CLAUDE.md`、`.claude/`、`.codex/`、`.agents/skills/`）。根 `AGENTS.md` 已被 `.gitignore` 忽略，不再作为真相源提交。

## 供应商映射 CSV

界面要求上传一份 CSV。当前固定列为：

```csv
vendor_name_en,supplier_name_ko,hs_code
Skin Medience,스킨메디언스,3916909000
```

`vendor_name_en` 对应 LLM 抽取出的 `payToVendorNameEn`。模板见 [examples/vendor_mapping.example.csv](./examples/vendor_mapping.example.csv)。把模板复制为自己的本地映射文件使用，不要提交私有供应商、HS code 或客户数据。

## 操作员运行

面向非技术操作员的目标路径是 Windows 安装包：

1. 安装 `UTradeHubAutomationSetup.exe`，per-user 安装，无需管理员权限。
2. 双击桌面或开始菜单的 **UTradeHub Automation**。
3. 本地服务监听 `127.0.0.1:3000`，启动后自动打开浏览器。
4. 在界面完成：映射 CSV、LLM API Key、PDF 选择、干跑预览、人工核对、确认运行、查看报告。
5. 登录默认走“在 Chrome 中手动登录”：工具打开 Chrome 后等待操作员完成 uTradeHub 登录。也可取消手动登录，改用本次会话内的账号/密码自动登录；账号密码不保存。
6. 到 uTradeHub 页面人工复核 `임시저장` 草稿，再决定是否正式 `발급`。

运行前提：

- 操作员电脑已安装 Google Chrome。
- LLM API Key、uTradeHub 凭据只在当次运行输入。
- 供应商映射 CSV 已准备好。
- 界面提供“检查运行环境”按钮，用于检查 Chrome 等阻断项。

## 开发

要求 Node.js >= 24 和 npm。

```powershell
npm install
npm run dev
npm run verify
```

常用命令：

```powershell
npm run typecheck      # TypeScript strict check
npm run lint           # ESLint
npm run format:check   # Prettier check
npm run test           # Vitest
npm run coverage       # Vitest coverage
npm run fix            # eslint --fix + prettier write
npm run build          # Vite frontend build
npm run start          # Fastify server against built web/dist
```

`npm run verify` 是唯一健康判据，也是 CI 应使用的本地等价命令。默认验证必须保持零网络、零真实浏览器。

## 打包

```powershell
npm run package
```

打包流程：

1. `npm run build` 生成 `web/dist`。
2. esbuild 将 `src/app/server/index.ts` 打包为 Node ESM 后端入口。
3. 在临时 stage 中执行 `npm ci --omit=dev --ignore-scripts`，复制生产 `node_modules`。
4. 复制当前机器的 `node.exe` 到 `packaging/build/`。
5. 生成 `UTradeHubAutomation.cmd` launcher。
6. 若存在 Inno Setup，输出安装包到 `packaging/dist/`。

没有安装 Inno Setup 时，可先运行：

```powershell
node packaging/package.mjs --no-installer
```

CI release 工作流从版本 tag 构建安装包；真实发布、tag 和外部放行仍属于人工门。

## 真实站点测试

真实 uTradeHub 集成测试默认跳过。只有显式开启并提供开发者本地环境变量时才运行；测试代码直接读取当前进程 `process.env`，不会自动加载 `.env`：

```powershell
$env:SITE_E2E = "1"
$env:SITE_BASE_URL = "https://..."
$env:SITE_MANUAL_LOGIN = "1"  # 手动登录模式；否则还需 SITE_USERNAME / SITE_PASSWORD
npm test
```

如不用手动登录模式：

```powershell
$env:SITE_E2E = "1"
$env:SITE_BASE_URL = "https://..."
$env:SITE_USERNAME = "..."
$env:SITE_PASSWORD = "..."
npm test
```

`.env` 仅用于开发者自行管理 gated 测试变量，保持 ignored。真实站点验证只能跑到 `임시저장`，不得自动正式签发或提交。

## 诊断与敏感数据

设置 `UTH_DIAG=1` 时，应用会把预览/运行摘要写到 `.diagnostics/`，也可用 `UTH_DIAG_DIR` 指向其他本地目录。Playwright 失败诊断也可能写入截图或 HTML 捕获。诊断产物可能包含账号、供应商或订单上下文，必须保持 ignored，不得提交。

同样不得提交：

- `.env`
- 私有供应商映射
- 截图、HTML capture、trace、HAR 等门户诊断
- 打包产物 `packaging/build/`、`packaging/dist/`
- 本地 agent 平台生成目录和根 `AGENTS.md`

## Agent/Ruler 维护

Ruler 是共享 agent 资产的单一源头：

- 改启动说明：编辑 `.ruler/AGENTS.md`。
- 改项目 skills：编辑 `.ruler/skills/`。
- 改 subagents：编辑 `.ruler/agents/`。
- 预览生成差异：`npm run agents:dry-run`。
- 正式刷新本地平台输出：`npm run agents:sync`。

保留 `.ruler/` 作为唯一真相源；根目录 `AGENTS.md` 可由 Ruler 本地生成，但不再跟踪。