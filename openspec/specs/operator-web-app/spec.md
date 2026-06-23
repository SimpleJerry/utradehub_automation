# operator-web-app Specification

## Purpose
TBD - created by archiving change local-web-app. Update Purpose after archive.
## Requirements
### Requirement: 凭据仅内存态、绝不落盘
Web 应用 SHALL 每会话在界面接受 uTradeHub 凭据，仅在本次运行请求的内存中持有并传给驱动；SHALL NOT 将凭据写入任何文件、配置或日志（错误信息中亦须脱敏）。

#### Scenario: 凭据不被持久化
- **WHEN** 操作员输入凭据并发起运行
- **THEN** 凭据不被写入任何文件、配置或日志
- **AND** 运行结束后不留存于磁盘

### Requirement: 干跑预览作为人工闸
界面 SHALL 在驱动浏览器之前展示干跑预览，并要求操作员**显式确认**后才开始驱动。

#### Scenario: 未确认不驱动
- **WHEN** 操作员尚未确认干跑预览
- **THEN** 不发生任何浏览器驱动

### Requirement: 运行前环境检查

运行前 SHALL 检查**环境**阻断项(系统 Chrome 是否就绪)并在界面给出清晰提示。LLM API Key 与供应商映射作为**操作员录入项**,界面 SHALL 在预览前要求其齐备(缺失时禁用预览并提示),不计入环境检查。

#### Scenario: 缺少系统 Chrome

- **WHEN** 运行环境缺少系统 Chrome
- **THEN** 界面给出清晰的阻断提示,且不开始运行

#### Scenario: 缺操作员录入项

- **WHEN** 操作员尚未提供 LLM API Key 或供应商映射
- **THEN** 界面禁用预览并提示缺失项,不向服务端发起预览

### Requirement: 一键启动
SHALL 提供一键启动器（`.bat`/快捷方式）启动本地服务并打开浏览器到应用页。

#### Scenario: 一键启动
- **WHEN** 操作员运行启动器
- **THEN** 本地服务启动且浏览器打开到本应用页面

### Requirement: 供应商映射经文件上传录入

界面 SHALL 通过文件上传控件接受供应商映射 CSV 文件(列 `vendor_name_en,supplier_name_ko,hs_code`),前端读取其文本内容后用于预览;SHALL NOT 要求操作员手动粘贴 CSV 文本。

#### Scenario: 上传映射文件

- **WHEN** 操作员通过上传控件选择一个供应商映射 CSV 文件
- **THEN** 界面读取该文件文本并将其作为映射用于后续预览
- **AND** 操作员无需打开文件复制其内容到文本框

### Requirement: LLM 配置经界面录入且 API Key 仅内存

界面 SHALL 提供 LLM API Key 输入项,由操作员每次会话录入;该 Key SHALL 仅在内存中持有(刷新/关闭即清),并随预览请求传递给服务端按请求构建抽取器;SHALL NOT 将该 Key 写入任何文件、配置或日志(错误信息亦须脱敏)。非敏感项 `LLM_MODEL`(默认 `deepseek-v4-flash`)与 `LLM_BASE_URL` SHALL 有内置默认值并允许在界面可选覆盖;服务端 SHALL NOT 从环境变量读取 LLM API Key。

#### Scenario: API Key 仅内存、不落盘

- **WHEN** 操作员在界面录入 LLM API Key 并发起预览
- **THEN** 该 Key 仅用于本次请求构建抽取器,不被写入任何文件、配置或日志
- **AND** 刷新或关闭应用后该 Key 不留存

#### Scenario: 非敏感项用默认值

- **WHEN** 操作员未覆盖 model/baseUrl
- **THEN** 服务端使用内置默认(model 为 `deepseek-v4-flash`)进行抽取

#### Scenario: 缺 API Key 不发起预览

- **WHEN** 操作员未录入 LLM API Key
- **THEN** 界面禁用预览并给出清晰提示,不向服务端发起预览请求

### Requirement: uTradeHub 网址只读展示

界面 SHALL 以只读方式展示固定的 uTradeHub 网址(`https://www.utradehub.or.kr/`);SHALL NOT 提供修改该网址的入口。

#### Scenario: 网址不可编辑

- **WHEN** 操作员查看配置页
- **THEN** uTradeHub 网址以只读形式显示,无编辑控件

