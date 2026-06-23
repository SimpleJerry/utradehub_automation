## 1. 删除旧 Python 应用代码

- [x] 1.1 `git rm -r app/`(config/models/pdf_reader/vendor_mapping_loader/field_mapper/site_bot/workflow/__init__)
- [x] 1.2 `git rm -r desktop/`(gui_main/playwright_runtime/run_service/settings/__init__)
- [x] 1.3 `git rm main.py launcher_gui.py`

## 2. 删除旧打包、依赖与资源

- [x] 2.1 `git rm -r packaging/`(build.ps1、installer.iss、pyinstaller.spec、requirements-packaging.txt)
- [x] 2.2 `git rm requirements.txt config.user.example.json`
- [x] 2.3 `git rm resources/duck.ico`(`resources/` 因此变空,已一并移除)

## 3. 迁移示例、删除 data/ 旧布局

- [x] 3.1 新建 `examples/`,把 `data/local/vendor_mapping.example.csv` 迁入为 `examples/vendor_mapping.example.csv`
- [x] 3.2 `git rm -r data/`(input_pdfs/、extracted/、local/ 及其 .gitkeep)
- [x] 3.3 （额外发现·已确认）`data/` 内含真实业务数据(真实 PO PDF、跑批输出、私有 `vendor_mapping.csv`)且 `config.user.json` 含明文账号/密码——均为 git 未跟踪的私有数据。经确认**移出仓库到 `F:\utradehub_legacy_data\`** 妥善保留,而非删除

## 4. 改写文档

- [x] 4.1 重写 `README.md`:移除旧 Python 目录结构、`pip install`/`.venv`、PyInstaller/`UTradeHubDesktop` 等段落;仅保留并整理新 TS 本地 Web 应用的"功能/运行/开发/交付"内容;修正示例路径为 `examples/vendor_mapping.example.csv`
- [x] 4.2 同步重写 `README.en.md`、`README.ko.md`(与中文版结构一致)
- [x] 4.3 `git rm README_USER.md README_USER.en.md README_USER.ko.md`;三语 README 顶部导航无指向 README_USER.* 的链接(原本就没有)

## 5. 精简配置与悬挂引用

- [x] 5.1 `.gitignore`:移除仅服务旧栈/旧布局的项(`.venv/`、`__pycache__/`、`*.py[cod]`、`config.user.json`、`data/**`、`logs/*` 相关),保留 Node/TS 与通用项;映射保护改为 `examples/vendor_mapping.*`
- [x] 5.2 `src/adapters/site-contract.ts`:把"值移植自 legacy app/site_bot.py"注释改为中性表述("Values come from manual inspection of the uTradeHub web form.")
- [x] 5.3 （额外发现）`git rm logs/.gitkeep`:`logs/` 是旧 CLI/GUI 运行时输出目录,新栈不引用,一并退役

## 6. 删除磁盘上未跟踪的遗留产物

- [x] 6.1 从磁盘删除 `.venv/`、`__pycache__/`、`build/`、`dist/`、`packaging/`、`playwright-browsers/`、`logs/`(均已被忽略、不在版本库内;回收约 2.7 GB)

## 7. 验证与收尾

- [x] 7.1 `npm run verify` 全绿(typecheck + lint + format:check + test;16 passed / 1 skipped)
- [x] 7.2 `npm run build` 成功(vite 构建输出 web/dist/,不依赖任何被删文件)
- [x] 7.3 `git status` 复核:仅预期的删除/改写/新增(28 删 + 5 改 + 重命名示例 CSV + 新 change 目录),无误删新栈文件;工作区无残留 untracked 遗留物
- [x] 7.4 三语 README 互链自洽、无 README_USER/Python 悬挂引用,示例路径指向 `examples/vendor_mapping.example.csv`
