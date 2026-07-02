---
name: golden-fixture
description: 【非用户入口·内部步骤手册】仅由 extraction-eval 专才在改写 src/adapters/llm-extractor.ts 与 src/adapters/pdf-text.ts 的回归资产（test/fixtures/pdf-extract/ 下的脱敏样例与逐字段比对脚本）过程中，用 Skill 工具按名调用；不响应任何用户请求（用户请求一律由 utradehub-orchestrator 路由）。内容为该专才在 test/fixtures 下建立样例与比对脚本时遵循的实现步骤。
---

# Golden Fixture — 抽取 golden fixture 与准确率评测流程

抽取层"键名保真全靠 prompt"，模型/提示一漂移就静默退化。本流程用真实样例 + 数字把退化挡在门外。

## 为什么需要

- DeepSeek `json_object` 模式下 Zod schema 仅"建议性"，键名靠 prompt 维持——无回归测试就无从知晓退化。
- 现状 `test/pdf-text.test.ts`/`llm-extractor.test.ts` 全用合成 PDF/mock，**无真实韩文 PO**，无准确率度量。`test/fixtures/README.md` 已预告 `pdf-extract/` 但未建。

## 建 fixture 流程

1. 取一份真实韩文 PO PDF，**先脱敏**（去除敏感商号/数字中可识别隐私）后放 `test/fixtures/pdf-extract/{vendor}-{case}.pdf`。
2. 人工标注期望抽取结果为 golden JSON（`bpoNo/documentDate/payToVendorNameEn/lineItems[description,quantity,unitPrice]`），存同名 `.expected.json`。
3. 覆盖多样性：多页 PO、不同供应商版式、含 > 35byte 품명、含千分位数字各至少一例。

## 准确率度量

- 跑抽取，逐字段与 golden 比对，输出命中率：供应商名、行项目**数量**（条数对不对）、各行 quantity/unitPrice、documentDate 格式。
- 行项目用集合比对（顺序无关），缺行/多行/错值都要计入。
- 给**改动前 vs 改动后**对比数字；准确率下降即判退化，阻止合入。

## 原则

- 任何 prompt/解析/schema 改动必须带 fixture 与数字，不靠主观判断。遵 superpowers `test-driven-development`。
- documentDate 等格式字段补 schema 级 ISO 校验，别让坏格式静默通过。
- fixture 是回归资产：新发现的 bug 先加一条复现 fixture 再修。
