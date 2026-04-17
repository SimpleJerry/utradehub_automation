# UTradeHub Automation

## Language / 语言 / 언어
- 中文（主文档）：[README.md](./README.md)
- English: [README.en.md](./README.en.md)
- 한국어: [README.ko.md](./README.ko.md)

一个用于“批量读取 PDF -> 提取字段 -> 映射清洗 -> 自动填报网站表单”的自动化项目。

当前仓库是可运行版本，已经打通：
- PDF 解析与字段抽取。
- 供应商映射与 HS Code 映射（CSV 外置）。
- 按 `Pay-to Vendor No.` 分组后，执行网页临时保存。
- GUI 桌面入口、日志输出、批处理结果汇总。

## 1. 功能边界（当前版本）

1. 支持遍历 `input_pdfs` 目录中的多个 PDF。
2. 抽取核心字段：`Blanket Purchase Order No.`、`Document Date`、`Pay-to Vendor No.`、行项目。
3. 经 preflight 校验后按供应商分组：`m 个 PDF -> n 个供应商组 -> n 次网页保存`（通常 `m >= n`）。
4. 网页动作主链路：`login -> open_form -> fill_basic_info -> select_supplier -> fill_order_from_pdf -> save`。
5. 输出中间文件、汇总 CSV/JSONL、运行日志。

## 2. 目录结构

```text
utradehub_automation/
├─ app/
│  ├─ config.py
│  ├─ models.py
│  ├─ pdf_reader.py
│  ├─ vendor_mapping_loader.py
│  ├─ field_mapper.py
│  ├─ site_bot.py
│  ├─ workflow.py
│  └─ __init__.py
├─ desktop/                  # GUI 入口相关模块
├─ data/
│  ├─ input_pdfs/            # PDF 输入目录
│  ├─ extracted/             # 中间结果与汇总结果
│  └─ local/                 # 本地映射文件目录
├─ packaging/                # 打包脚本与安装脚本
├─ resources/                # 图标等资源
├─ launcher_gui.py           # GUI 启动入口（开发环境）
├─ main.py                   # CLI 启动入口（开发调试）
├─ README_USER.md            # 最终用户说明
├─ .env.example
└─ config.user.example.json
```

## 3. 模块职责

1. `app/pdf_reader.py`
- 解析 PDF 文本并抽取元字段和行项目。

2. `app/field_mapper.py`
- 把 `RawPdfData` 映射成 `FormRecord`。
- 通过外部 CSV 映射供应商韩文名和 HS Code。
- 执行统一 preflight 校验（当前校验：`source_file/supplier_name/hs_code/line_items`）。

3. `app/workflow.py`
- 批量处理 PDF。
- 按供应商分组并构建 group record。
- 每个 group 执行一次网页保存并记录结果。

4. `app/site_bot.py`
- 封装网页动作，含供应商选择与逐行填报行项目。

5. `desktop/*`
- GUI 配置加载/保存、运行校验、日志回显、批处理触发。

## 4. 数据流

```text
PDF -> pdf_reader -> RawPdfData
RawPdfData -> field_mapper(+vendor mapping CSV) -> FormRecord
FormRecord -> validate_record(preflight) -> valid/invalid
valid records -> group by Pay-to Vendor No.
grouped records -> site_bot.save_record -> SaveResult
SaveResult -> workflow -> batch_results.csv/jsonl + logs
```

## 5. 供应商映射 CSV（固定列）

- 通过 `VENDOR_MAPPING_PATH` 指向 CSV 文件。
- 未配置时默认使用 `data/local/vendor_mapping.csv`。
- 模板：`data/local/vendor_mapping.example.csv`

CSV 列名必须固定为：

```csv
vendor_name_en,supplier_name_ko,hs_code
Skin Medience,스킨메디언스,3916909000
```

## 6. 开发环境运行（CLI / GUI）

1. 安装依赖

```powershell
cd F:\utradehub_automation
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m playwright install chromium
```

2. 配置 `.env`（CLI 调试使用）

```powershell
copy .env.example .env
```

3. 启动 GUI（推荐）

```powershell
.\.venv\Scripts\python.exe launcher_gui.py
```

4. 启动 CLI（开发调试）

```powershell
.\.venv\Scripts\python.exe main.py
```

## 7. 桌面版打包与交付

1. 构建桌面产物

```powershell
cd F:\utradehub_automation
.\packaging\build.ps1 -Clean
```

2. 检查 `packaging/output/UTradeHubDesktop` 至少包含：
- `UTradeHubDesktop.exe`
- `README_USER.md`
- `config.user.json.example`
- `data/local/vendor_mapping.example.csv`
- `playwright-browsers/chromium-*`

3. 用 Inno Setup 打开并编译 `packaging/installer.iss`。
4. 交付安装包 `UTradeHubAutomationSetup.exe` 和 `README_USER.md`。

## 8. GUI 运行时路径（重要）

- 实际运行配置：`%LOCALAPPDATA%\UTradeHubAutomation\config.user.json`
- 默认输入目录：`%LOCALAPPDATA%\UTradeHubAutomation\data\input_pdfs`
- 默认输出目录：`%LOCALAPPDATA%\UTradeHubAutomation\data\extracted`
- 运行日志目录：`%LOCALAPPDATA%\UTradeHubAutomation\logs`

补充说明：
- 安装包只携带模板 `config.user.json.example`。
- 首次 GUI 启动会自动创建运行配置文件。
- 若发现旧版 `<install_dir>/config.user.json`，会做一次迁移。

## 9. 打包检查（Playwright 浏览器）

1. 编译前先执行 `packaging/build.ps1 -Clean`。
2. 确认产物目录含 `playwright-browsers/chromium-*`。
3. 安装后若报 `BrowserType.launch: Executable doesn't exist`，说明浏览器文件未被正确打包或覆盖。
4. 处理方式：重新 `build.ps1 -Clean` -> 重新编译安装包 -> 卸载旧版后重装。

## 10. 维护注意事项

1. 不要在 `site_bot.py` 硬编码供应商与 HS Code。
2. 真实映射数据放在本地 CSV，不要提交到仓库。
3. 优先使用 Playwright 自动等待，减少硬编码 sleep。
4. 保留 `*.raw.json` 与 `*.record.json` 便于排障追溯。
