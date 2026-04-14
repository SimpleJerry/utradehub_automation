# UTradeHub Automation（脚手架版）

一个用于“批量读取 PDF -> 提取字段 -> 映射清洗 -> 自动填报网站表单”的自动化项目。

当前仓库处于**可运行脚手架阶段**：
- 目录结构、模块边界、主流程编排已就位。
- `pdf_reader`、`field_mapper`、`site_bot` 目前是占位实现（`TODO`），便于按真实样本逐步落地。

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
│  ├─ config.py         # 配置加载、目录初始化、日志初始化
│  ├─ models.py         # 数据模型定义
│  ├─ pdf_reader.py     # PDF提取层（占位）
│  ├─ field_mapper.py   # 字段映射层（占位）
│  ├─ site_bot.py       # 网页自动化层（占位）
│  ├─ workflow.py       # 主流程编排（已可跑批）
│  └─ __init__.py
├─ data/
│  ├─ input_pdfs/       # 测试/生产PDF输入目录
│  ├─ extracted/        # 中间结果与汇总结果输出
│  ├─ screenshots/      # 网页自动化截图输出（后续）
│  └─ traces/           # Playwright trace输出（后续）
├─ logs/                # 运行日志
├─ tests/               # 测试代码（当前为占位）
├─ main.py              # 程序入口
├─ requirements.txt     # 依赖清单
├─ .env.example         # 环境变量模板
├─ .env                 # 本地环境配置（不提交）
└─ .gitignore
```

## 3. 分层说明

1. 资料提取层：`app/pdf_reader.py`
- 负责读取 PDF 并返回原始抽取结果。
- 后续会接入 `pypdf` / `pdfplumber`，OCR 仅作为扫描件兜底。

2. 字段映射层：`app/field_mapper.py`
- 负责把原始 PDF 数据映射成标准 `FormRecord`。
- 字段清洗、格式统一、校验规则集中在本层。

3. 网页填报层：`app/site_bot.py`
- 负责 Playwright 网页动作（登录、打开表单、填写、临时保存）。
- 不承载 PDF 解析规则。

4. 流程编排层：`app/workflow.py`
- 串联“提取 -> 映射 -> 校验 -> 临时保存”。
- 批量处理、失败记录、不中断下一份。

5. 模型与配置层：`app/models.py` / `app/config.py`
- 统一数据结构。
- 统一配置来源（`.env`）和日志行为。

## 4. 数据流

```text
PDF -> pdf_reader -> RawPdfData
RawPdfData -> field_mapper -> FormRecord
FormRecord -> validate_record -> valid/invalid
valid -> site_bot -> SaveResult
SaveResult -> workflow -> CSV/JSONL + 日志
```

## 5. 快速开始

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

然后按实际情况填写 `.env` 中的网站地址、账号等信息。

3. 运行脚手架

```powershell
.\.venv\Scripts\python.exe main.py
```

## 6. 测试步骤（当前脚手架）

1. 空目录冒烟测试
- 不放 PDF，直接运行 `main.py`。
- 预期：提示“未发现PDF”，流程正常结束。

2. 放入测试 PDF
- 将样例文件放到：`data/input_pdfs/`
- 例如：`data/input_pdfs/sample_001.pdf`

3. 再次运行
- 程序会遍历该目录并输出中间结果。
- 因核心业务规则仍是占位实现，当前结果以流程验证为主。

4. 检查输出
- 中间文件：`data/extracted/*.raw.json`、`*.record.json`
- 汇总结果：`data/extracted/batch_results.csv`、`batch_results.jsonl`
- 运行日志：`logs/run.log`

## 7. 后续开发建议（按阶段推进）

1. 阶段1：先做网页流程（无PDF）
- 用假数据跑通登录、进表单、填写、临时保存。

2. 阶段2：只做 PDF 提取
- 选 3-5 份代表样本，确定字段来源位置。

3. 阶段3：接通端到端
- `PDF -> 映射记录 -> 网页临时保存`。

4. 阶段4：强化容错与观测
- 失败截图、trace、错误归档、结果报表。

## 8. 注意事项

1. 不要把 PDF 解析规则写进 `site_bot.py`。
2. 不要一开始就对所有 PDF 使用 OCR。
3. 优先使用 Playwright 自动等待，不依赖大量 `sleep()`。
4. 每份 PDF 都应保留可追溯中间结果。

