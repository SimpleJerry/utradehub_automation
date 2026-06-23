# draft-submission Specification

## Purpose
TBD - created by archiving change site-automation-shell. Update Purpose after archive.
## Requirements
### Requirement: 纯提交计划
`buildSubmissionPlan` SHALL 是纯函数，从一条 `SubmissionRecord` 与基础默认值产出结构化填表计划，包含 basic-info 值、供应商查询关键字，以及每条行项目的填表值（HS Code、品명、단가、수량、구매일자）。

#### Scenario: 计划覆盖每条行项目
- **WHEN** 给定含 N 条行项目的 `SubmissionRecord`
- **THEN** 计划含 N 条行项目指令，每条都带 HS Code、品명、단가、수량

#### Scenario: 品명拼接规则
- **WHEN** 某行项目带有文档号（docNumber）
- **THEN** 该行的품명为「描述 + 换行 + 文档号」；无文档号时품명为「描述」

### Requirement: 把记录驱动为 임시저장 草稿
`BrowserDriver` SHALL 执行 `login → open_form → fill_basic_info → select_supplier → fill_line_items → 임시저장` 流程，把一条 `SubmissionRecord` 驱动为一份临时保存草稿，并返回强类型 `SaveResult`。

#### Scenario: 成功创建草稿
- **WHEN** 一条有效记录被驱动且各步骤成功
- **THEN** 在 uTradeHub 上创建出一份 임시저장 草稿
- **AND** 返回 `success = true` 的 `SaveResult`（含可解析到的参考号/消息）

### Requirement: 严格止于草稿（人工闸）
驱动流程 SHALL 只执行到 임시저장；SHALL NOT 触发正式 발급/제출或任何不可逆的最终提交。

#### Scenario: 不越过草稿
- **WHEN** 驱动流程完成
- **THEN** 仅执行到临时保存，未点击正式 발급/제출

### Requirement: 失败以带步骤的结果表达，不抛裸异常
驱动 SHALL 以 `Result` 表达失败并标明出错步骤；SHALL NOT 让裸异常逃逸到调用方。

#### Scenario: 某步骤失败
- **WHEN** 流程中某一步出错（如登录失败或锚点漂移）
- **THEN** 返回失败 `Result`，其消息标明出错的步骤
- **AND** 不抛出裸异常

