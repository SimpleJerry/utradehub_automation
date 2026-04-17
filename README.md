# UTradeHub Automation

一个用于“批量读取 PDF -> 提取字段 -> 映射清洗 -> 自动填报网站表单”的自动化项目。

当前仓库处于**可运行版本**：
- 核心流程（PDF 提取、字段映射、按 Vendor 分组、网页临时保存）已打通。
- 当前重点是稳定性和维护性优化。

## 1. 项目目标

1. 批量读取多个 PDF。
2. 提取目标字段并做清洗映射。
3. 使用 Playwright 自动登录并填写网页表单。
4. 支持批处理、失败跳过、日志留痕、结果汇总。
5. 保持模块化，方便后续维护与扩展。

## 2. 目录结构

```text
utradehub_automation/
├─ app/
│  ├─ config.py               # 配置加载、目录初始化、日志初始化
│  ├─ models.py               # 数据模型定义
│  ├─ pdf_reader.py           # PDF提取层
│  ├─ vendor_mapping_loader.py# 外部供应商映射文件加载
│  ├─ field_mapper.py         # 字段映射层
│  ├─ site_bot.py             # 网页自动化层
│  ├─ workflow.py             # 主流程编排（按Vendor分组跑批）
│  └─ __init__.py
├─ data/
│  ├─ input_pdfs/             # 测试/生产PDF输入目录
│  ├─ extracted/              # 中间结果与汇总结果输出
│  └─ local/                  # 本地映射文件目录（默认不提交真实数据）
├─ logs/                      # 运行日志
├─ main.py                    # 程序入口
├─ requirements.txt           # 依赖清单
├─ .env.example               # 环境变量模板
├─ .env                       # 本地环境配置（不提交）
└─ .gitignore
```

## 3. 分层说明

1. 资料提取层：`app/pdf_reader.py`
- 负责读取 PDF 并返回原始抽取结果。
- 当前已提取：`Blanket Purchase Order No.`、`Document Date`、`Pay-to Vendor No.`、行项目表格。

2. 字段映射层：`app/field_mapper.py`
- 负责把原始 PDF 数据映射成标准 `FormRecord`。
- 通过外部映射文件把英文供应商名转换为韩文供应商名与 HS Code。

3. 网页填报层：`app/site_bot.py`
- 负责 Playwright 网页动作：`login -> open_form -> fill_basic_info -> select_supplier -> fill_order_from_pdf -> save`。
- `fill_order_from_pdf` 按行项目循环填报弹窗字段（支持 item 级 doc/date）。

4. 流程编排层：`app/workflow.py`
- 串联“提取 -> 映射 -> 统一 preflight 校验 -> 按Vendor分组 -> 每组一次临时保存”。
- 批量处理、失败记录、不中断下一份。

5. 模型与配置层：`app/models.py` / `app/config.py`
- 统一数据结构。
- 统一配置来源（`.env`）和日志行为。

## 4. 数据流

```text
PDF -> pdf_reader -> RawPdfData
RawPdfData -> field_mapper(+vendor mapping file) -> FormRecord
FormRecord -> validate_record (preflight) -> valid/invalid
valid records -> group by Pay-to Vendor No.
grouped FormRecord -> site_bot -> SaveResult
SaveResult -> workflow -> CSV/JSONL + 日志
```

## 5. 外部映射文件（重要）

- 供应商映射不硬编码在 Python 中，而是从外部 `CSV` 文件读取（固定列名）。
- 环境变量：`VENDOR_MAPPING_PATH`
- 默认路径（未配置时）：`data/local/vendor_mapping.csv`
- 示例模板：`data/local/vendor_mapping.example.csv`

CSV 固定列：

```csv
vendor_name_en,supplier_name_ko,hs_code
Skin Medience,스킨메디언스,3916909000
```

## 6. 快速开始

1. 安装依赖

```powershell
cd F:\utradehub_automation
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\playwright.exe install chromium
```

2. 配置环境变量

```powershell
copy .env.example .env
```

然后按实际情况填写 `.env` 中的网站地址、账号、映射文件路径等信息。

3. 准备映射文件

- 复制 `data/local/vendor_mapping.example.csv` 为你自己的映射文件。
- 推荐放在 `data/local/vendor_mapping.csv` 或 `.env` 指向任意本地路径。

4. 运行程序

```powershell
.\.venv\Scripts\python.exe main.py
```

## 7. 测试步骤

1. 空目录冒烟测试
- 不放 PDF，直接运行 `main.py`。
- 预期：提示“未发现PDF”，流程正常结束。

2. 放入测试 PDF
- 将样例文件放到：`data/input_pdfs/`
- 例如：`data/input_pdfs/sample_001.pdf`

3. 再次运行
- 程序会遍历该目录并输出中间结果。
- 当前流程为按 `Pay-to Vendor No.` 分组后提交，每个供应商组只提交一次表单。

4. 检查输出
- 中间文件：`data/extracted/*.raw.json`、`*.record.json`
- 汇总结果：`data/extracted/batch_results.csv`、`batch_results.jsonl`
- 运行日志：`logs/run.log`

## 8. 桌面版打包与交付（1~6）

1. 构建桌面程序

```powershell
cd F:\utradehub_automation
.\packaging\build.ps1 -Clean
```

2. 检查构建产物目录 `packaging/output/UTradeHubDesktop`，至少包含：
- `UTradeHubDesktop.exe`
- `config.user.json`
- `README_USER.md`
- `data/local/vendor_mapping.example.csv`

3. 生成安装包（Inno Setup）
- 图标统一使用 `resources/duck.ico`（程序 EXE + 安装包图标）
- 使用 Inno Setup 打开 `packaging/installer.iss`
- 点击 Compile
- 安装包输出到 `packaging/output/`

4. 本机安装并做一次冒烟验证
- 启动桌面程序
- 填写并保存配置
- 准备至少 1 个 PDF，点击“开始处理”
- 确认日志有运行结果

5. 交付文件给非开发用户
- `UTradeHubAutomationSetup.exe`
- `README_USER.md`
- （可选）供应商映射模板 `vendor_mapping.example.csv`

6. 运行时数据位置（重要）
- 配置文件：安装目录根目录 `config.user.json`
- 日志/输入输出目录默认在：`%LOCALAPPDATA%\UTradeHubAutomation`



## 9. 注意事项

1. 不要把供应商映射和 HS Code 硬编码在 `site_bot.py`。
2. 供应商映射真实数据应放在本地映射文件，并通过 `.gitignore` 避免入库。
3. 不要一开始就对所有 PDF 使用 OCR。
4. 优先使用 Playwright 自动等待，不依赖大量 `sleep()`。
5. 每份 PDF 都应保留可追溯中间结果。

## 11. Packaging Checklist (Playwright Browser)

1. Run `packaging/build.ps1 -Clean` before compiling installer.
2. Confirm `packaging/output/UTradeHubDesktop/playwright-browsers/chromium-*` exists.
3. Compile installer with `packaging/installer.iss`.
4. After install, confirm `<install_dir>/playwright-browsers/chromium-*` exists.
5. If logs show `BrowserType.launch: Executable doesn't exist`, installer artifact is incomplete; rebuild from step 1.

