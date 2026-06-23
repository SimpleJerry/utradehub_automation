## Context

变更①已搭好 harness（严格类型、Vitest、lint、CI、`verify` 闸、ports/adapters 约定）。本变更在其上建纯领域核心：`PDF → PurchaseOrder → 映射 → 分组 → 校验`。整条链没有浏览器/UI/对 uTradeHub 的写入，可被 golden-file 完全覆盖。决策依据见项目 memory 的 [[utradehub-rewrite-architecture]] 与本变更 `proposal.md`。

旧实现的字段（供对齐）：`Blanket Purchase Order No.`、`Document Date`、`Pay-to Vendor No.`（英文供应商名）、行项目 `{description, quantity, unit_price}`；映射后补 `supplier_name_ko`、`hs_code`。

## Goals / Non-Goals

**Goals:**
- 用 zod 定义强类型领域模型，TS 类型从 schema 推断（单一事实来源），彻底取代 `extra: dict`。
- `Extractor` 端口 + 厂商无关 LLM adapter，输出经 schema 校验。
- 确定性的映射、分组、校验（preflight），全部纯函数。
- 每个纯转换有 golden-file 测试；把手改 PDF 失效样本固化为回归夹具。
- 单元测试零网络、零浏览器。

**Non-Goals:**
- 浏览器自动化、Web UI、对 uTradeHub 的写入（变更③④）。
- 产物持久化/导出格式（CSV/JSONL 汇总等，留待编排层）。
- 第二个（规则/坐标）抽取器——YAGNI，只在 LLM 被证明不够用时再加（同一端口后面）。

## Decisions

**领域模型用 zod 为单一来源。**
`PurchaseOrder`、`LineItem`、`SupplierGroup`、`SubmissionRecord` 用 zod schema 定义，TS 类型 `z.infer`。所有进入核心的数据在边界 `parse`，非法即拒。理由：彻底消灭无类型 dict，让数据契约对人和 agent 都显式可查。

**`Extractor` 端口：`extract(pdf) => Promise<Result<PurchaseOrder>>`。**
管线：PDF 字节 → 取文本（确定性，PDF 库）→ LLM 结构化抽取（按 zod schema）→ `PurchaseOrder`。失败返回带原因的 `Result`（不抛异常），便于编排层逐文件记录成败（对应旧 `ProcessResult`）。
- 决策：喂**文本**给 LLM（这些是数字版可抽文本的 PDF，旧 pypdf 已证明）。备选：对页面图像走视觉模型（对怪版式更稳但更贵更慢）——推迟，留作同端口下的后续 adapter。

**LLM 访问：Vercel AI SDK `generateObject` + zod schema，OpenAI 兼容 provider。**
DeepSeek V4 经 `base_url + model + key`（config）接入，provider 仅是配置 → 不锁厂商。低温度。`LlmProvider` 以接口注入，单测用伪造 provider 覆盖"schema 校验 + 错误路径"。备选：裸 OpenAI SDK + JSON mode（代码更多）。

**供应商映射：CSV adapter 加载 → 纯函数应用。**
固定列 `vendor_name_en,supplier_name_ko,hs_code`（沿用旧约定）。`loadVendorMapping`（adapter，读文件）产出内存表；`applyVendorMapping(order, table)`（core，纯）补 `supplier_name_ko`/`hs_code`。

**分组：纯 `groupBySupplier(orders) => SupplierGroup[]`。**
键为归一化后的 pay-to 供应商；把同组多份 PDF 的行项目合并，并逐项标注 doc 号/日期/来源文件（对应旧 `_build_group_record`）。`m 份 PDF → n 个组`。

**校验闸：纯 `validateForSubmission(record) => ValidationResult`。**
必填：`supplier_name_ko`、`hs_code`、至少一条有效行项目（描述/数量/单价齐且数字可解析）。返回强类型结果（是否就绪 + 缺失字段），不抛异常。

**可追溯性。**
`PurchaseOrder` 保留来源文件名与原始抽取文本（对应旧 `*.raw.json`），便于排障与人工复核。

## Risks / Trade-offs

- **LLM 输出非确定性** → 低温度 + 结构化 schema + 确定性校验闸 + （变更④）人工闸多重兜底。
- **真实 provider 契约漂移** → adapter 保持极薄；用少量记录样本测试覆盖，network-gated，不进默认单测。
- **PDF 取文本质量** → 文本为空（扫描件）时抽取明确失败并上报；视觉兜底推迟。
- **范围膨胀** → 不建第二抽取器、不做持久化/导出；本变更只到"内存里的已校验、已分组记录"。

## Migration Plan

纯增量。不替换任何在跑的东西；旧 Python 原样保留。新代码落在 `src/core`、`src/ports`、`src/adapters`，测试在 `test/`。回滚 = 删除新增文件。

## Open Questions（待你拍）

- LLM 客户端库：**Vercel AI SDK**（默认）vs 裸 OpenAI 兼容 SDK。
- PDF 取文本库：**unpdf**（默认，pdf.js 封装）vs `pdfjs-dist`。
- 是否在模型里保留原始抽取文本做追溯：**保留**（默认）。
