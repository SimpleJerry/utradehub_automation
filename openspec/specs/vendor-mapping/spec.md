# vendor-mapping Specification

## Purpose
TBD - created by archiving change domain-core. Update Purpose after archive.
## Requirements
### Requirement: 从固定列 CSV 加载供应商映射
映射加载 SHALL 读取固定列 `vendor_name_en,supplier_name_ko,hs_code` 的 CSV；当文件不存在或缺必需列时 SHALL 给出明确错误，SHALL NOT 静默产出错误映射。

#### Scenario: 加载有效 CSV
- **WHEN** 给定列名正确且有数据行的 CSV
- **THEN** 得到以归一化英文供应商名为键、`{supplier_name_ko, hs_code}` 为值的映射表

#### Scenario: 缺必需列
- **WHEN** CSV 缺少某个必需列
- **THEN** 报告明确的列缺失错误
- **AND** 不返回一个静默错误的映射

### Requirement: 将映射应用到订单（纯函数）
`applyVendorMapping` SHALL 是纯函数，用归一化后的英文供应商名查表，为订单补充 `supplier_name_ko` 与 `hs_code`；查不到时 SHALL 标记为未映射且 SHALL NOT 抛异常。

#### Scenario: 命中映射
- **WHEN** 订单的英文供应商名（归一化后）存在于映射表
- **THEN** 订单被补上对应的 `supplier_name_ko` 与 `hs_code`

#### Scenario: 未命中映射
- **WHEN** 订单的英文供应商名不在映射表中
- **THEN** `supplier_name_ko` 与 `hs_code` 留空，并标记该订单为"未映射"
- **AND** 不抛异常

