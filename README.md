# UTradeHub Automation

## Language / 语言 / 언어
- 中文（主文档）：[README.md](./README.md)
- English: [README.en.md](./README.en.md)
- 한국어: [README.ko.md](./README.ko.md)

一个把 **采购订单 PDF → 提取字段 → 映射清洗 → 按供应商分组 → 在 uTradeHub 网站驱动出 구매확인서 임시저장（临时保存）草稿** 的本地工具。

**人工闸（硬约束）**：本工具只创建 **임시저장 草稿**，绝不点正式 발급/제출；最终签发由人在 uTradeHub 上复核后手动完成。它是“草稿生成器”，不是“自动申报器”。

技术形态：**TypeScript 全栈本地 Web 应用**（Fastify 后端 + React/Vite 界面），用 **Playwright 驱动操作员系统里的 Chrome**（`channel:"chrome"`，不捆 Chromium）。架构背景见 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) 与 `openspec/`（规格与变更历史）。

## 1. 功能边界

1. 批量摄入多个采购订单 PDF。
2. 经 LLM（厂商无关，OpenAI 兼容）结构化抽取核心字段：`Blanket Purchase Order No.`、`Document Date`、`Pay-to Vendor No.`、行项目，并以 zod schema 校验。
3. 供应商映射与 HS Code 映射（外置 CSV）。
4. 按 `Pay-to Vendor No.` 分组：`m 个 PDF → n 个供应商组`（通常 `m ≥ n`）。
5. preflight 校验后给出**干跑预览**（每组将填什么 + 校验结果）。
6. 人工确认后，逐组在网站执行 `login → open_form → fill_basic_info → select_supplier → fill_line_items → 임시저장`，输出结果报告。
7. 凭据**仅内存态**：每会话在界面输入，后端只在本次运行内存中持有，绝不写盘、不记日志。

## 2. 目录结构

```text
utradehub_automation/
├─ src/
│  ├─ core/        # 纯领域逻辑（模型/映射/分组/校验/提交计划），无 I/O，全单元测试
│  ├─ ports/       # 外部依赖接口（LLM provider、浏览器驱动、PDF 取文本、Extractor）
│  ├─ adapters/    # ports 的实现（LLM 抽取、unpdf、Playwright 驱动、站点契约、漂移检测）
│  └─ app/         # 组装根：DTO、编排、环境检查、Fastify server
├─ web/            # React + Vite 前端（配置 / 干跑预览 / 凭据 + 运行 / 报告）
├─ test/           # 单元测试与 test/fixtures/ golden-file 夹具
├─ examples/       # vendor_mapping.example.csv 等模板
├─ docs/           # ARCHITECTURE.md
├─ openspec/       # 规格（specs/）与变更历史（changes/archive/）
├─ .env.example
└─ run.bat         # 一键启动（= npm run start）
```

## 3. 供应商映射 CSV（固定列）

界面里选择一份 CSV 作为供应商映射。列名必须固定为：

```csv
vendor_name_en,supplier_name_ko,hs_code
Skin Medience,스킨메디언스,3916909000
```

模板见 [`examples/vendor_mapping.example.csv`](./examples/vendor_mapping.example.csv)；把它复制成你自己的映射文件，**不要把私有映射数据提交到仓库**。

## 4. 运行 / 交付（面向非技术操作员）

1. 一次性准备：`npm install && npm run build`。
2. 双击 `run.bat`（等价于 `npm run start`）——启动本地服务并自动打开浏览器。
3. 在界面里：填 LLM 配置（可选）与供应商映射 CSV、选 PDF →「干跑预览」→ 核对每组 → 输入本次登录账号密码（**仅内存、不保存**）→ 勾选确认 →「确认并运行」→ 看结果报告。
4. 程序只建到 임시저장 草稿；请到 uTradeHub 复核后再由人正式 발급。

**运行前提**：操作员系统已装 Chrome；已配置 LLM（`.env`：`LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY`）；映射 CSV 就绪。界面/`checkEnvironment()` 会在运行前汇总阻断项。

## 5. 开发

环境：Node ≥ 24、npm（开发机未装 pnpm）。

```powershell
npm install          # 安装依赖
npm run dev          # 开发模式：Vite 前端 + Fastify 后端并行
npm run verify       # typecheck + lint + format:check + test（唯一健康判据）
npm test             # 仅跑测试
npm run format       # 用 Prettier 自动格式化
```

工程约定（详见 `docs/ARCHITECTURE.md`）：
- functional-core / imperative-shell 分层；所有外部依赖（LLM、浏览器、文件系统、时钟）仅经 ports 访问，使核心可零 I/O 单测。
- 凭据/密钥不入库；只提交不含密钥的 `.env.example`。
- golden-file 夹具驱动确定性测试。

CI（`.github/workflows/ci.yml`）在每次 push/PR 跑 `npm run verify`。“失败即拦截合并”需在 GitHub 仓库手动开启分支保护。

## 6. 站点集成测试（gated）

连真实 uTradeHub 跑一次到草稿的集成测试默认跳过，仅在显式开启时运行：

```powershell
$env:SITE_E2E = "1"   # 并配置 .env 的 SITE_BASE_URL / SITE_USERNAME / SITE_PASSWORD（仅开发机，永不入库）
npm test
```

默认 `npm run verify` 为零浏览器、零网络。
