# order-grouping Specification

## Purpose
TBD - created by archiving change domain-core. Update Purpose after archive.
## Requirements
### Requirement: 按供应商分组为申报单元
`groupBySupplier` SHALL 是纯函数，把已校验订单按归一化后的 Pay-to 供应商分组，每组产出一个申报单元；组数等于不同供应商的数量（`m 份 PDF → n 组`，通常 `m >= n`）。

#### Scenario: 多份订单归并为按供应商的组
- **WHEN** 给定分属若干供应商的多份订单
- **THEN** 同一供应商的订单归并到同一组
- **AND** 组数等于不同供应商的数量

### Requirement: 合并组内行项目并保留来源
分组 SHALL 把同组各订单的行项目合并进该申报单元，并逐条行项目保留其文档号、文档日期与来源文件名。

#### Scenario: 合并后仍可追溯来源
- **WHEN** 某供应商组由多份 PDF 组成
- **THEN** 合并后的每条行项目仍带有它各自的文档号、文档日期与来源文件名

### Requirement: 缺供应商键的订单不被静默丢弃
没有可用供应商键的订单 SHALL 归入一个明确的"未知供应商"组，SHALL NOT 被静默丢弃。

#### Scenario: 未知供应商
- **WHEN** 某订单缺少可用的供应商键
- **THEN** 它被归入明确的"未知供应商"组，以便后续校验将其拦下

