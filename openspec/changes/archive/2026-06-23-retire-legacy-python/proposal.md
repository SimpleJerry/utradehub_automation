## Why

变更①②③④已经用 TypeScript 把整个工具重建完毕(纯核心 + 站点外壳 + 本地 Web 应用),并已归档为主 specs 基线。旧的 Python/Playwright 实现(CLI + PyInstaller 打包的 GUI 桌面程序)从此再无来源地位——它没有自动化测试、没有规格,只会在仓库里制造"两套真相",误导 agent 与读者、并让 README 新旧混杂。变更④的 task 5.2 已明确把"旧 Python 树退役"留作本变更。现在新栈已自洽且 `verify` 全绿,可以安全地把遗留树整体清掉。

## What Changes

- **删除旧 Python 应用代码**:`app/`(config/models/pdf_reader/vendor_mapping_loader/field_mapper/site_bot/workflow)、`desktop/`(GUI 入口、playwright runtime、service runner、settings)、根级 `main.py` 与 `launcher_gui.py`。
- **删除旧 Python 打包与依赖**:`packaging/`(build.ps1、installer.iss、pyinstaller.spec、requirements-packaging.txt)、根级 `requirements.txt`、旧配置示例 `config.user.example.json`。
- **删除旧 GUI 资源**:`resources/duck.ico`。
- **删除磁盘上未跟踪的遗留产物**:`.venv/`、`__pycache__/`、`build/`、`dist/`、`packaging/output/`、`playwright-browsers/`(新应用用系统 Chrome,不捆 Chromium)。
- **重写多语 README**:`README.md`/`README.en.md`/`README.ko.md` 精简为仅描述新的 TS 本地 Web 应用(运行/开发/交付),移除旧 Python 目录结构、`pip install`、PyInstaller 等段落。
- **删除旧用户手册**:`README_USER.md`/`README_USER.en.md`/`README_USER.ko.md`(整套是旧 GUI 安装包的操作手册,已不适用)。
- **保留并迁移供应商映射示例**:把 `data/local/vendor_mapping.example.csv` 迁到 `examples/vendor_mapping.example.csv` 作为映射模板;删除其余 `data/` 旧布局目录(`input_pdfs/`、`extracted/`、`local/`)。
- **清理 `.gitignore`**:移除仅服务于旧 Python 栈与旧 `data/` 布局的忽略项(`.venv/`、`__pycache__/`、`*.py[cod]`、`config.user.json`、`data/**`),保留新栈相关项。
- **把"单一实现来源"固化为工程要求**:向 `engineering-harness` 增补一条需求——仓库 SHALL 只保留一套 TypeScript 实现,不得存在与之并行的遗留运行时(旧 Python CLI/GUI),以根除"两套真相"。
- 除上述 `engineering-harness` 外,本变更**不改动其余 capability 规格**——旧 Python 树从未被规格覆盖,其余 8 个主 spec 描述的都是新 TS 应用,其需求不变。

## Capabilities

### New Capabilities
<!-- 无新增 capability:本变更属遗留代码退役,不引入新行为能力。 -->
（无)

### Modified Capabilities
- `engineering-harness`: 增补一条需求,要求仓库只保留单一 TS 实现、不含并行的遗留 Python 运行时(ADDED requirement,不改动既有需求)。

## Impact

- **删除的代码/文件**:`app/`、`desktop/`、`main.py`、`launcher_gui.py`、`packaging/`、`requirements.txt`、`config.user.example.json`、`resources/duck.ico`、`README_USER.*`、`data/` 旧布局。
- **磁盘清理**:`.venv/`、`build/`、`dist/`、`packaging/output/`、`playwright-browsers/`、`__pycache__/`(均已被 .gitignore,不在版本库内)。
- **改写的文件**:`README.md`/`.en`/`.ko`、`.gitignore`。
- **新增文件**:`examples/vendor_mapping.example.csv`(由 `data/local/` 迁入)。
- **代码依赖**:无 —— 新 TS 应用不引用任何被删资产(已核查:仅 `src/adapters/site-contract.ts` 有一句"值移植自 legacy app/site_bot.py"的来源注释,随删除一并改为不指向具体旧文件)。
- **构建/CI**:无影响,`npm run verify` 不依赖任何被删文件。
- **风险**:低且可逆(git 历史保留旧实现);唯一需确认的是 README 改写后链接与导航仍自洽。
