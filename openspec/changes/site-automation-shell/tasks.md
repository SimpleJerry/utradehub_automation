## 1. 站点契约

- [x] 1.1 `src/adapters/site-contract.ts`：按步骤集中 uTradeHub 的选择器/角色/label 与基础默认值（`receiver`/`materialType`/`currency`），从旧 `app/site_bot.py` 移植真实值
- [x] 1.2 测试：契约关键键齐全、各选择器为非空字符串

## 2. 提交计划（纯）

- [x] 2.1 `src/core/submission-plan.ts`：定义 `SubmissionPlan` 类型 + `buildSubmissionPlan(record, defaults)` 纯函数（basic-info 值、供应商关键字、逐行项目值、품명拼接规则）
- [x] 2.2 测试：逐行项目值覆盖、품명拼接（有/无 docNumber）、基础值与供应商关键字

## 3. 漂移检测

- [x] 3.1 `src/adapters/site-drift.ts`：`DriftError{ step, anchor, message }` + 基于"锚点存在性"的检测函数
- [x] 3.2 测试：用伪造的存在性映射，缺失锚点 → 正确 `DriftError`；齐全 → 通过

## 4. BrowserDriver 端口 + Playwright 执行器

- [x] 4.1 `src/ports/browser-driver.ts`：`BrowserDriver` 接口（`createDraft(record) => Promise<Result<SaveResult>>`）+ `SaveResult` 类型
- [x] 4.2 添加 `playwright` 依赖；记录"用系统 Chrome（`channel:"chrome"`）、不捆 Chromium"的运行前提
- [x] 4.3 `src/adapters/playwright-driver.ts`：实现 `createDraft`——按计划+契约执行 `login → open_form → fill_basic_info → select_supplier → fill_line_items → 임시저장`，捕获保存对话框 → `SaveResult`，失败返回带步骤的 `Result`，**严格止于草稿**
- [x] 4.4 执行器内部小工具：mainFrame 解析、`expect_popup` 封装、优先自动等待（少用硬 sleep）

## 5. 配置与凭据

- [x] 5.1 `.env.example` 补 `SITE_BASE_URL`/`SITE_USERNAME`/`SITE_PASSWORD`（**仅供 gated 集成测试**的开发机占位；真实值永不入库）
- [x] 5.2 凭据以**参数**传入 driver（内存态、不持久化、不记忆 id/pw）；env 读取仅用于 gated 集成测试，缺项给清晰错误

## 6. 集成测试（gated）与收尾

- [x] 6.1 env-gated（`SITE_E2E=1`）集成测试骨架：连真站点跑一次到草稿；默认 `verify` 跳过
- [x] 6.2 `npm run verify` 全绿（默认零浏览器/零网络）
