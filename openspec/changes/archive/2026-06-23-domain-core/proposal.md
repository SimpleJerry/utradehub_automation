## Why

harness（变更①）就位后，下一步是建**纯领域核心**：把采购订单 PDF 变成"经校验、已按供应商分组的申报记录"。这一段没有浏览器、没有 UI、没有对 uTradeHub 的写入，因此可被 golden-file 完全覆盖测试。旧项目两个最严重的病——脆弱的正则抽取（被 PDF 编辑器手改一下就崩）与 `extra: dict[str, Any]` 字符串袋数据——都活在这一层。现在把它做在有类型、有测试的接口之后，一次性根治两者；同时它是变更③（站点外壳）与④（Web 应用）的输入。

## What Changes

- 定义强类型领域模型（`PurchaseOrder`、`LineItem`、`SupplierGroup`、`SubmissionRecord`），用 zod schema 描述并在边界校验——取代旧的无类型 dict。
- 引入 `Extractor` 端口（PDF → `PurchaseOrder`）与**厂商无关的 LLM adapter**（OpenAI 兼容，DeepSeek V4 默认），其输出经 zod schema 校验为结构化数据。
- 供应商映射：从外部 CSV 加载（英文供应商名 → 韩文供应商名 + HS Code）并应用到订单。
- 分组：按 `Pay-to Vendor` 把已校验订单归并为每供应商一个申报单元（m 份 PDF → n 个组）。
- 校验闸：确定性 preflight，产出强类型校验结果（必填齐、数字可解析、行项目有效等），决定一条记录是否可提交。
- 为每个纯转换写 golden-file 测试，**把曾经把旧解析器搞崩的那份手改 PDF 固化为回归夹具**。

本变更**不**包含浏览器自动化、Web UI 或对 uTradeHub 的任何写入（那是变更③④）。LLM adapter 的真实网络调用在单元测试中用伪造 provider 替身，核心逻辑不依赖网络。

## Capabilities

### New Capabilities
- `pdf-extraction`：经 `Extractor` 端口 + LLM adapter 把 PDF 抽成强类型 `PurchaseOrder`，并对输出做 schema 校验。
- `vendor-mapping`：从外部 CSV 把英文供应商名映射为韩文供应商名 + HS Code。
- `order-grouping`：把已校验订单按供应商归并为申报单元。
- `submission-validation`：确定性 preflight，判定一条记录是否就绪可提交。

### Modified Capabilities
<!-- 无。openspec/specs/ 仍为空（变更①的 engineering-harness 规格尚未归档）。 -->

## Impact

- **新增代码**：`src/core/`（领域模型、映射、分组、校验）、`src/ports/`（`Extractor`、`LlmProvider` 接口）、`src/adapters/`（LLM adapter、CSV 加载器、PDF 取文本、`fs`）、以及 `test/fixtures/` 下的 golden 夹具。
- **新增依赖**：`zod`（schema 与校验）、一个 LLM 客户端（Vercel AI SDK 或 OpenAI 兼容 SDK）、一个 PDF 取文本库（如 `unpdf`/`pdfjs-dist`）。
- **配置**：复用 `.env.example` 的 `LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY`。
- **测试**：单元测试零网络、零浏览器；LLM adapter 用伪造 provider 验证"schema 校验 + 错误处理"路径。
- **风险**：LLM 输出的非确定性 → 用低温度 + 结构化输出 + 确定性校验闸 + （后续）人工闸多重兜底；真实 provider 的契约由少量记录样本或集成测试覆盖，不进默认单元测试。
