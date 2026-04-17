# UTradeHub Automation User Guide

## Language / 语言 / 언어
- 中文（Main）：[README_USER.md](./README_USER.md)
- English (current): [README_USER.en.md](./README_USER.en.md)
- 한국어: [README_USER.ko.md](./README_USER.ko.md)

## 0. Quick Flow (1~6)
1. Install `UTradeHubAutomationSetup.exe`.
2. Open the desktop app and fill in runtime settings.
3. Click “Save Settings”.
4. Put PDFs to process into the input folder.
5. Click “Start Processing”.
6. Check results in output and log folders.

## 1. Installation
1. Double-click `UTradeHubAutomationSetup.exe`.
2. After installation, a `UTradeHub Automation` desktop icon should appear.

## 2. First-Time Setup
1. Open the desktop app.
2. Fill these fields in “Runtime Settings”:
- Site base URL
- Login username / password
- Vendor mapping CSV path
- PDF input directory
- Output directory
3. Click “Save Settings”.

User settings are saved to:
`%LOCALAPPDATA%\UTradeHubAutomation\config.user.json`

Notes:
- The install directory includes `config.user.json.example` as a template only.
- For vendor mapping CSV, start from `vendor_mapping.example.csv` and save your own file.

## 3. Run
1. Click “Start Processing”.
2. Progress is shown in the log panel.
3. When done, a summary popup appears (total/success/failed).

## 4. Output
By default, all runtime files are under:
`%LOCALAPPDATA%\UTradeHubAutomation`

- Input: `data/input_pdfs`
- Output: `data/extracted`
- Log: `logs/run.log`

## 5. FAQ
1. “Please complete settings first” on startup
- This is normal for first run. Fill required fields and save.

2. “Vendor mapping file not found”
- Check whether your CSV path is correct.

3. “No PDF files in input directory”
- Confirm the folder contains `.pdf` files.

4. Web flow failed
- Check username/password, network, and site accessibility.
- Click “Open Log Folder” and share `logs/run.log` with maintenance.

5. Error: `BrowserType.launch: Executable doesn't exist`
- This means packaged Playwright browser files are missing.
- Re-run `packaging/build.ps1 -Clean`, then rebuild installer in Inno Setup.
- After reinstall, verify `<install_dir>/playwright-browsers/chromium-*` exists.
- If still failing, uninstall old version and reinstall latest package.

## 6. Permissions
- Installing/upgrading under `Program Files` may require admin permission.
- Daily run and saving settings should not require admin permission.
- Runtime config/logs/input/output are all under `%LOCALAPPDATA%\UTradeHubAutomation`.