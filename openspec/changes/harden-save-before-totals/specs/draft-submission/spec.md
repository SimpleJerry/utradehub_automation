## ADDED Requirements

### Requirement: 保存前总计必须落地

`BrowserDriver` SHALL NOT click `임시저장` for a `SubmissionRecord` that has line items until the uTradeHub parent form's total quantity and total amount fields are both present and non-zero.

#### Scenario: 总计未回填时停止保存

- **WHEN** line items have been entered
- **AND** the parent form totals remain blank or zero after the bounded wait and refresh retry
- **THEN** the driver returns a failed `Result`
- **AND** the failure includes step context before save
- **AND** `임시저장` is not clicked

#### Scenario: 总计已回填时允许保存

- **WHEN** line items have been entered
- **AND** the parent form total quantity and total amount are both populated and non-zero
- **THEN** the driver may proceed to the `임시저장` save flow
