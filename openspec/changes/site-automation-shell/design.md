## Context

变更①（harness）与②（纯核心，产出 `SubmissionRecord`）已落地。本变更把一条 `SubmissionRecord` 驱动成 uTradeHub 的 임시저장 草稿。旧 `app/site_bot.py` 提供了真实的选择器与流程（`iframe[name^="mainFrame"]`、`#splybutton`、`#searchOptionText1`、`구매물품 목록 등록/수정`、`input[name="hsCd"]`、`품명/단가/수량 입력`、`#btn_add_save2`、`임시저장` 等），以及收货方/물료/币种等基础默认值——这些是金矿，但当时内联在流程里、无测试、网站一变即崩。决策依据见项目 memory 的 [[utradehub-rewrite-architecture]]。

## Goals / Non-Goals

**Goals:**
- 把全部 DOM 知识集中到**单一站点契约**，流程零内联选择器。
- 把 `SubmissionRecord → 填表指令` 做成**纯函数计划**，可完全单测。
- Playwright 执行器**薄**：只按计划+契约操作，驱动系统 Chrome。
- **漂移检测**：锚点缺失即给出"哪一步/哪个选择器"的清晰错误。
- 严格**止于 임시저장**（人工闸）。
- 默认 `verify` 零浏览器；真站点为 env-gated 集成测试。

**Non-Goals:**
- 正式 발급/제출（永远是人的活）。
- Web UI / 编排入口（变更④）。
- 凭据存储/输入 UX（变更④）。**为安全：不持久化 id/pw**——登录凭据作为参数传入、仅内存态、每次全新登录；`.env` 的 `SITE_*` 仅供 gated 集成测试（开发机本地、git 忽略）。
- 视觉识别/自愈选择器等高级韧性（YAGNI）。

## Decisions

**站点契约：单一声明式模块 `src/adapters/site-contract.ts`。**
按步骤分组导出选择器/角色名/label 与基础默认值（`receiver=EKTNET@`/`materialType=2AJ`/`currency=KRW`，**作为契约常量**）。流程代码只引用契约键，不写裸选择器。网站改版 → 只改这一个文件。

**纯提交计划：`src/core/submission-plan.ts`。**
`buildSubmissionPlan(record, defaults) => SubmissionPlan`：产出结构化的 basic-info 值、供应商查询关键字、逐行项目值（hsCode/品명/단가/수량/구매일자，含旧逻辑里 `품명 = 描述 + 换行 + doc号` 这类规则）。纯函数，是本变更**测试密度最高**的地方。执行器只消费计划，不含业务判断。

**`BrowserDriver` 端口 + Playwright 执行器。**
`src/ports/browser-driver.ts`：`createDraft(record, credentials) => Promise<Result<SaveResult>>`。`src/adapters/playwright-driver.ts` 实现之：用 `chromium.launch({ channel: "chrome", headless: false })`（操作员可见、复用系统 Chrome、不捆 Chromium），按契约执行 `login → open_form → fill_basic_info → select_supplier → fill_line_items → 임시저장`，捕获保存对话框 → `SaveResult`。失败返回带步骤的 `Result`，不抛裸异常。**凭据作为参数传入、仅内存态、driver 不读盘不持久化、每次全新登录、不记忆 id/pw。**

**漂移检测：`src/adapters/site-drift.ts`。**
在关键转场前断言一组关键锚点（mainFrame、작성、#splybutton、임시저장 等）存在；缺失即抛 `DriftError{ step, anchor, message }`，让上层把"页面结构变了，请更新契约的 X"直接报给操作员（对应旧 `to_user_message` 的意图，但精确指向契约）。

**可测性：纯计划 + 伪造存在性检查。**
默认 `verify` 测：① 提交计划（纯，含逐行项目与品명拼接规则）；② 站点契约形状（关键键存在、无空选择器）；③ 漂移错误（给一个伪造的"锚点存在性"映射，断言缺失锚点 → 正确的 `DriftError`）。Playwright 真实流程**不进默认单测**——它需要真站点，作为 `SITE_E2E=1` 才跑的 gated 集成测试。备选：录制 DOM 快照做离线回放——成本高，推迟。

**等待策略：优先 Playwright 自动等待，少用硬 sleep**（修正旧代码的 `wait_for_timeout(3000)`）。

## Risks / Trade-offs

- **网站结构变化（固有）** → 集中契约（改一处）+ 漂移检测（清晰定位）把维护成本压到最低；无法消除，只能可控。
- **多弹窗/iframe 编排复杂** → 沿用旧代码验证过的 `expect_popup`/mainFrame 模式，封装进执行器的小工具函数。
- **默认测试无法覆盖真实浏览器** → 把业务判断尽量挪进纯计划（高覆盖），执行器保持薄；真站点用 gated 集成测试 + 人工闸兜底。
- **`channel:"chrome"` 依赖操作员装了 Chrome** → 变更④的环境检查里校验；缺失给清晰提示。

## Migration Plan

纯增量。新代码落在 `src/core`、`src/ports`、`src/adapters`。旧 `app/site_bot.py` 仅作选择器参考，不改动、不依赖。回滚 = 删除新增文件。

## 已敲定（原 Open Questions）

- 登录：**每次全新 id/pw 登录**；**为安全不记忆/不持久化 id/pw**（凭据仅内存态、作为参数传入 driver）。
- 基础默认值（`EKTNET@`/`2AJ`/`KRW`）：放**契约常量**。
- 真站点集成测试：`SITE_E2E=1` 环境变量门控。
