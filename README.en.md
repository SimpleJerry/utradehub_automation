# UTradeHub Automation

## Language / 语言 / 언어
- 中文（Main）：[README.md](./README.md)
- English (current): [README.en.md](./README.en.md)
- 한국어: [README.ko.md](./README.ko.md)

An automation project for “batch PDF ingestion -> field extraction -> mapping/normalization -> automatic web form filling”.

Current repository status (runnable):
- PDF parsing and key field extraction are implemented.
- Vendor and HS Code mapping are externalized in CSV.
- Records are grouped by `Pay-to Vendor No.` and saved through one web flow per group.
- GUI desktop entry, logs, and batch result outputs are connected.

## 1. Scope (Current Version)

1. Iterates multiple PDFs from the `input_pdfs` directory.
2. Extracts key fields: `Blanket Purchase Order No.`, `Document Date`, `Pay-to Vendor No.`, and line items.
3. Runs preflight validation, then groups by vendor: `m PDFs -> n vendor groups -> n web saves` (typically `m >= n`).
4. Main web action chain: `login -> open_form -> fill_basic_info -> select_supplier -> fill_order_from_pdf -> save`.
5. Outputs intermediate files, summary CSV/JSONL, and runtime logs.

## 2. Directory Structure

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
├─ desktop/                  # GUI-related modules
├─ data/
│  ├─ input_pdfs/            # PDF input directory
│  ├─ extracted/             # intermediate & summary outputs
│  └─ local/                 # local mapping files
├─ packaging/                # packaging scripts and installer script
├─ resources/                # icons and resources
├─ launcher_gui.py           # GUI entry (dev environment)
├─ main.py                   # CLI entry (dev/debug)
├─ README_USER.md            # end-user guide
├─ .env.example
└─ config.user.example.json
```

## 3. Module Responsibilities

1. `app/pdf_reader.py`
- Parses PDF text and extracts metadata + line items.

2. `app/field_mapper.py`
- Maps `RawPdfData` to `FormRecord`.
- Resolves Korean supplier name and HS Code from external CSV.
- Executes unified preflight validation (`source_file/supplier_name/hs_code/line_items`).

3. `app/workflow.py`
- Batch-processes PDFs.
- Groups by vendor and builds group records.
- Executes one web save per group and records results.

4. `app/site_bot.py`
- Encapsulates web actions, including supplier selection and item-row filling.

5. `desktop/*`
- GUI settings load/save, run validation, log streaming, and batch trigger.

## 4. Data Flow

```text
PDF -> pdf_reader -> RawPdfData
RawPdfData -> field_mapper(+vendor mapping CSV) -> FormRecord
FormRecord -> validate_record(preflight) -> valid/invalid
valid records -> group by Pay-to Vendor No.
grouped records -> site_bot.save_record -> SaveResult
SaveResult -> workflow -> batch_results.csv/jsonl + logs
```

## 5. Vendor Mapping CSV (Fixed Columns)

- Use `VENDOR_MAPPING_PATH` to point to your CSV file.
- If unset, default path is `data/local/vendor_mapping.csv`.
- Template: `data/local/vendor_mapping.example.csv`

Required CSV columns:

```csv
vendor_name_en,supplier_name_ko,hs_code
Skin Medience,스킨메디언스,3916909000
```

## 6. Run in Development (CLI / GUI)

1. Install dependencies

```powershell
cd F:\utradehub_automation
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m playwright install chromium
```

2. Configure `.env` (for CLI debugging)

```powershell
copy .env.example .env
```

3. Start GUI (recommended)

```powershell
.\.venv\Scripts\python.exe launcher_gui.py
```

4. Start CLI (dev/debug)

```powershell
.\.venv\Scripts\python.exe main.py
```

## 7. Desktop Packaging and Delivery

1. Build desktop artifacts

```powershell
cd F:\utradehub_automation
.\packaging\build.ps1 -Clean
```

2. Verify `packaging/output/UTradeHubDesktop` contains at least:
- `UTradeHubDesktop.exe`
- `README_USER.md`
- `config.user.json.example`
- `data/local/vendor_mapping.example.csv`
- `playwright-browsers/chromium-*`

3. Open `packaging/installer.iss` in Inno Setup and compile.
4. Deliver `UTradeHubAutomationSetup.exe` with `README_USER.md`.

## 8. GUI Runtime Paths (Important)

- Runtime config: `%LOCALAPPDATA%\UTradeHubAutomation\config.user.json`
- Default input dir: `%LOCALAPPDATA%\UTradeHubAutomation\data\input_pdfs`
- Default output dir: `%LOCALAPPDATA%\UTradeHubAutomation\data\extracted`
- Runtime logs: `%LOCALAPPDATA%\UTradeHubAutomation\logs`

Notes:
- Installer ships template `config.user.json.example` only.
- On first GUI start, runtime config is auto-created.
- If legacy `<install_dir>/config.user.json` is found, one-time migration is applied.

## 9. Packaging Check (Playwright Browser)

1. Run `packaging/build.ps1 -Clean` before compiling installer.
2. Ensure `playwright-browsers/chromium-*` exists in output.
3. If you see `BrowserType.launch: Executable doesn't exist` after install, browser files were not packaged/copied correctly.
4. Fix path: rebuild (`build.ps1 -Clean`) -> recompile installer -> uninstall old version -> reinstall.

## 10. Maintenance Notes

1. Do not hardcode supplier/HS mapping in `site_bot.py`.
2. Keep real mapping data in local CSV, not in repository.
3. Prefer Playwright auto-wait over hardcoded sleeps.
4. Keep `*.raw.json` and `*.record.json` for traceable troubleshooting.
