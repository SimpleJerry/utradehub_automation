# UTradeHub Automation 用户使用说明

## 0. 快速流程（1~6）
1. 安装 `UTradeHubAutomationSetup.exe`。
2. 打开桌面程序并填写运行设置。
3. 点击“保存设置”。
4. 把待处理 PDF 放到输入目录。
5. 点击“开始处理”。
6. 在输出目录和日志目录查看结果。

## 1. 安装
1. 双击安装包 `UTradeHubAutomationSetup.exe`。
2. 完成安装后，桌面会出现 `UTradeHub Automation` 图标。

## 2. 首次配置
1. 打开桌面程序。
2. 在“运行设置”里填写：
- 网站入口 URL
- 登录账号 / 登录密码
- 供应商映射 CSV 路径
- PDF 输入目录
- 结果输出目录
3. 点击“保存设置”。

程序会把用户配置保存到：
`<安装目录>\\config.user.json`（默认安装通常位于 `%ProgramFiles%\\UTradeHub Automation`）

## 3. 运行
1. 点击“开始处理”。
2. 程序会在下方日志窗口显示进度。
3. 运行完成后会弹出统计结果（总数/成功/失败）。

## 4. 输出结果
默认都在：`%LOCALAPPDATA%\UTradeHubAutomation` 目录下。

- 输入目录：`data/input_pdfs`
- 输出目录：`data/extracted`
- 日志：`logs/run.log`

## 5. 常见问题
1. 提示“供应商映射文件不存在”
- 检查 CSV 路径是否正确。

2. 提示“输入目录里没有 PDF 文件”
- 检查目录中是否有 `.pdf` 文件。

3. 网页流程失败
- 检查账号密码、网络、网站是否可访问。
- 点击“打开日志目录”，将 `logs/run.log` 提供给维护人员。

