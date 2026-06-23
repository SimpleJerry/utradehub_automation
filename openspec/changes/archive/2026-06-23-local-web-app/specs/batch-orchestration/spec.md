## ADDED Requirements

### Requirement: 干跑预览不触碰浏览器
`previewBatch` SHALL 对输入执行 抽取 → 映射 → 分组 → 校验，产出每组的预览（含校验结果）；SHALL NOT 驱动浏览器或提交任何东西到 uTradeHub。

#### Scenario: 预览不发生提交
- **WHEN** 对一批输入运行预览
- **THEN** 产出按供应商分组的预览与每组校验结果
- **AND** 未发生任何浏览器驱动或网络提交

#### Scenario: 预览标出无效组
- **WHEN** 某分组未通过提交前校验
- **THEN** 预览中将其标记为 `isValid = false` 并列出缺失字段

### Requirement: 仅驱动人工确认过的组
`submitBatch` SHALL 只对**显式批准**的分组调用 `createDraft`；SHALL NOT 自动提交未经批准的分组。

#### Scenario: 只提交已批准子集
- **WHEN** 提供已批准分组的一个子集
- **THEN** 只对这些分组调用浏览器驱动，其余不被驱动

### Requirement: 逐组报告且互不阻断
`submitBatch` SHALL 为每个分组产出强类型结果（成功/失败 + 消息/参考号），汇总为 `BatchReport`；某组失败 SHALL NOT 阻断其余分组。

#### Scenario: 部分失败仍出完整报告
- **WHEN** 驱动多个分组且其中一个失败
- **THEN** 报告含每个分组各自的成功/失败与消息
- **AND** 失败的分组不影响其余分组被处理

### Requirement: 端口注入、可在无浏览器无网络下测试
编排 SHALL 通过端口（`Extractor`、`BrowserDriver`、映射加载）依赖外部能力，使其可用伪造件在无真实浏览器/网络下测试。

#### Scenario: 伪造件下端到端
- **WHEN** 以伪造 `Extractor` 与 `BrowserDriver` 运行预览与提交
- **THEN** 全过程不需要真实浏览器或网络
