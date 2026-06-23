## 1. 领域模型（zod 单一来源）

- [x] 1.1 在 `src/core/model.ts` 用 zod 定义 `LineItem`、`PurchaseOrder`（含 `sourceFile`、`rawText`、`bpoNo`、`documentDate`、`payToVendorNameEn`、`lineItems`、可选 `supplierNameKo`/`hsCode`）、`SupplierGroup`、`SubmissionRecord`、`ValidationResult`；用 `z.infer` 导出 TS 类型
- [x] 1.2 加 `Result<T>`（成功 | 失败+原因）类型于 `src/core/result.ts`
- [x] 1.3 模型单元测试：合法对象 `parse` 通过、非法对象被拒

## 2. 端口（ports）

- [x] 2.1 `src/ports/llm.ts` 定义 `LlmProvider` 接口（给 zod schema + prompt，返回校验后的对象）
- [x] 2.2 `src/ports/extractor.ts` 定义 `Extractor` 接口（`extract(pdf) => Promise<Result<PurchaseOrder>>`）
- [x] 2.3 `src/ports/pdf-text.ts` 定义"PDF 字节 → 文本"接口

## 3. PDF 取文本 adapter

- [x] 3.1 添加依赖 `unpdf`；`src/adapters/pdf-text.ts` 实现"PDF 字节 → 文本"（确定性）
- [x] 3.2 测试：对一份**脱敏/合成**的夹具 PDF 抽文本（golden）

## 4. LLM 抽取 adapter

- [x] 4.1 添加依赖 `zod`、`ai`、`@ai-sdk/openai`；`src/adapters/llm-provider.ts` 用 `generateObject` 实现 `LlmProvider`（OpenAI 兼容，配置 `LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY`，低温度）
- [x] 4.2 `src/adapters/llm-extractor.ts` 实现 `Extractor`：取文本 → LLM 结构化抽取 → zod 校验 → `Result`
- [x] 4.3 测试：用**伪造 `LlmProvider`** 覆盖 成功 / schema 失败 / 空文本失败 三条路径（零网络）

## 5. 供应商映射

- [x] 5.1 `src/adapters/vendor-mapping-loader.ts`：读固定列 CSV（`vendor_name_en,supplier_name_ko,hs_code`）→ 映射表；缺列/缺文件给明确错误
- [x] 5.2 `src/core/vendor-mapping.ts`：`applyVendorMapping(order, table)` 纯函数（归一化键、命中补字段、未命中标记）
- [x] 5.3 测试：加载（含缺列）、命中/未命中（golden 夹具 CSV）

## 6. 分组

- [x] 6.1 `src/core/grouping.ts`：`groupBySupplier(orders)` 纯函数（归一化键、合并行项目并保留来源、缺键归入 UNKNOWN 组）
- [x] 6.2 测试：`m→n` 组、合并保留来源、未知供应商（golden 夹具）

## 7. 校验闸

- [x] 7.1 `src/core/validation.ts`：`validateForSubmission(record)` 纯函数 → `ValidationResult`
- [x] 7.2 测试：通过 / 缺字段 / 非法输入

## 8. 回归夹具与纯链组合测试

- [x] 8.1 加入一份**脱敏/合成**的回归夹具（依"手改后曾搞崩旧解析"的结构）；断言抽取/校验在该样本上稳定
- [x] 8.2 纯链组合测试：一组 `PurchaseOrder` → 映射 → 分组 → 校验 的端到端（无 I/O）断言

## 9. 收尾

- [x] 9.1 删除变更① 的临时样本 `src/core/text.ts` 及其测试 `test/normalize.test.ts`（被真实核心取代）
- [x] 9.2 `npm run verify` 全绿
