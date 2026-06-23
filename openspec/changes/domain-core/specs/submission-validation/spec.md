## ADDED Requirements

### Requirement: 确定性提交前校验（preflight）
`validateForSubmission` SHALL 是纯、确定性的函数，判定一条申报记录是否就绪：必须具备 `supplier_name_ko`、`hs_code`，以及至少一条有效行项目（描述、数量、单价齐全且数量与单价可解析为数字）。

#### Scenario: 记录就绪
- **WHEN** 记录满足全部必填条件
- **THEN** 返回 `isValid = true` 且 `missingFields` 为空

#### Scenario: 缺必填项
- **WHEN** 记录缺少 `hs_code` 或没有任何有效行项目
- **THEN** 返回 `isValid = false`
- **AND** 在 `missingFields` 中列出缺失项

### Requirement: 强类型结果，不以异常表达失败
校验 SHALL 返回强类型 `ValidationResult`；对空或不完整的输入 SHALL 返回结果对象，SHALL NOT 抛异常。

#### Scenario: 非法或不完整输入
- **WHEN** 传入空或不完整的记录
- **THEN** 返回 `isValid = false` 的 `ValidationResult`
- **AND** 不抛异常
