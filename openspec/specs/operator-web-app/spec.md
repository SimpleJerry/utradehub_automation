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
运行前 SHALL 检查阻断项（系统 Chrome 是否就绪、LLM 配置、映射文件等）并在界面给出清晰提示。

#### Scenario: 缺少系统 Chrome
- **WHEN** 运行环境缺少系统 Chrome
- **THEN** 界面给出清晰的阻断提示，且不开始运行

### Requirement: 一键启动
SHALL 提供一键启动器（`.bat`/快捷方式）启动本地服务并打开浏览器到应用页。

#### Scenario: 一键启动
- **WHEN** 操作员运行启动器
- **THEN** 本地服务启动且浏览器打开到本应用页面

