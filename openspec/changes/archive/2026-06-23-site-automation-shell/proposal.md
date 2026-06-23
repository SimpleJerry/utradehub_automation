## Why

变更②产出了"经校验、已按供应商分组的 `SubmissionRecord`"。本变更是命令式外壳：把一条 `SubmissionRecord` 在 uTradeHub 上**驱动成一份 임시저장 草稿**，到此为止交给人复核并正式 발급。这正是旧项目"年久失修"的震中——脆弱选择器、硬编码韩文 label 与魔法默认值散落在流程里，网站一变就崩。本变更的目标不是"再写一遍点击脚本"，而是把脆弱面**关进一个声明式站点契约**，并把"可测的纯计划"与"不可测的浏览器执行"分开，使外壳尽可能薄、可观测、可在网站漂移时给出清晰报错。

## What Changes

- 新增**站点契约层**：把 uTradeHub 的全部选择器、角色名、韩文 label 与基础默认值（收货方/物料类型/币种）集中到**单一声明式模块**；流程代码不再内联任何选择器。
- 新增**纯提交计划**：`SubmissionRecord` → `SubmissionPlan`（结构化的、按步骤的填表指令与逐行项目值），纯函数、可完全单测。
- 新增 `BrowserDriver` 端口与 **Playwright 执行器**（驱动**系统 Chrome**，`channel:"chrome"`，不捆 Chromium），按计划+契约执行 `login → open_form → fill_basic_info → select_supplier → fill_line_items → 임시저장`，返回强类型 `SaveResult`。
- 新增**漂移检测**：在关键步骤前断言契约锚点存在；某锚点缺失时抛出指明"哪个选择器/哪一步漂移了"的清晰错误，取代含糊的 Playwright 超时。
- **人工闸硬约束**：流程**只到 임시저장**，绝不点正式 발급/제출。
- 从旧 `app/site_bot.py` **移植真实选择器与流程知识**进站点契约（不照搬其结构）。

测试：站点契约（形状/快照）、提交计划（纯函数）、漂移错误（用伪造的"元素存在性检查器"）均进默认 `verify`；**真·端到端**需连真站点，作为 env-gated 集成测试，不进默认单测。

## Capabilities

### New Capabilities
- `site-contract`：uTradeHub 的 DOM 契约（选择器/角色/label/默认值）集中于单一声明式模块；并提供漂移检测，在契约锚点缺失时给出指向具体步骤的清晰错误。
- `draft-submission`：把一条 `SubmissionRecord` 经编排流程驱动为一份 임시저장 草稿，严格止于草稿（人工闸），返回强类型 `SaveResult`；编排可对伪造页面测试。

### Modified Capabilities
<!-- 无。 -->

## Impact

- **新增代码**：`src/core/submission-plan.ts`（纯计划）、`src/ports/browser-driver.ts`（端口 + `SaveResult`）、`src/adapters/site-contract.ts`（选择器/默认值）、`src/adapters/site-drift.ts`（漂移检测）、`src/adapters/playwright-driver.ts`（执行器）、相应 `test/`。
- **新增依赖**：`playwright`（运行时驱动）。需 `npx playwright install chrome` 或复用系统 Chrome（`channel:"chrome"`，不下载 Chromium）。
- **配置**：uTradeHub 登录 `SITE_BASE_URL`/`SITE_USERNAME`/`SITE_PASSWORD`（写入 `.env.example`，真实值永不入库）；基础默认值（收货方/物料/币种）进契约或配置。
- **测试**：默认 `verify` 零网络/零浏览器；真站点流程为 env-gated 集成测试。
- **风险**：网站结构变化是固有风险 → 用集中契约 + 漂移检测把"改一处即可修复"和"清晰定位"做实；非确定性等待用 Playwright 自动等待，少用硬 sleep。
