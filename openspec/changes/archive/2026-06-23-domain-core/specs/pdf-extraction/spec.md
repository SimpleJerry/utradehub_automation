## ADDED Requirements

### Requirement: 从 PDF 抽取强类型采购订单
`Extractor` SHALL 接受一份采购订单 PDF 输入，产出经 zod schema 校验的 `PurchaseOrder`，至少包含 Blanket Purchase Order 号、文档日期、英文供应商名（Pay-to Vendor）与行项目（描述/数量/单价）。

#### Scenario: 成功抽取一份有效订单
- **WHEN** 给定一份可抽取文本的有效采购订单 PDF
- **THEN** 返回成功的 `Result`，其 `PurchaseOrder` 含 BPO 号、文档日期、英文供应商名与至少一条行项目
- **AND** 该对象完整通过 zod schema 校验

### Requirement: 抽取失败返回带原因的结果而非抛异常
抽取 SHALL 以 `Result`（成功 | 失败+原因）表达结果；任何失败（文本为空、LLM 输出不符 schema 等）SHALL NOT 以抛异常表达，也 SHALL NOT 产出半成品记录。

#### Scenario: PDF 无可抽取文本
- **WHEN** 输入 PDF 不含可抽取文本（如扫描件）
- **THEN** 返回失败 `Result` 并附明确原因
- **AND** 不抛异常

#### Scenario: LLM 输出不满足 schema
- **WHEN** LLM 返回的结构不满足 `PurchaseOrder` schema
- **THEN** 返回失败 `Result`（schema 校验失败原因）
- **AND** 不产出部分填充的记录

### Requirement: 厂商无关的 LLM 访问
抽取 SHALL 经由 `LlmProvider` 端口访问大模型，具体 provider 由配置（base_url / model / key）决定，SHALL NOT 在代码中硬编码某一厂商。

#### Scenario: 切换 provider 仅改配置
- **WHEN** 把 LLM 配置指向另一个 OpenAI 兼容 provider
- **THEN** 抽取逻辑无需改动代码即可工作（以伪造 `LlmProvider` 注入验证此接缝）

### Requirement: 保留来源与原始文本以便追溯
`PurchaseOrder` SHALL 记录来源文件名与原始抽取文本，供排障与人工复核。

#### Scenario: 追溯字段存在
- **WHEN** 抽取成功
- **THEN** 结果记录包含来源文件名与原始抽取文本字段
