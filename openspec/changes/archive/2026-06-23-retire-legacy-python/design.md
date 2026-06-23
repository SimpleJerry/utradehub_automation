## Context

变更①–④用 TypeScript 重建了整个工具并已归档为 9 个主 spec。旧的 Python 实现仍躺在仓库里:`app/`(领域逻辑)、`desktop/`(Tkinter GUI + service runner)、根级 `main.py`/`launcher_gui.py`、`packaging/`(PyInstaller + Inno Setup)、`requirements.txt`、`resources/duck.ico`、`config.user.example.json`,以及新旧混杂的 `README*`。磁盘上还有 `.venv/`、`build/`、`dist/`、`packaging/output/`、`playwright-browsers/`、`__pycache__/` 等未跟踪产物。

已核查:新 TS 应用(`src/`、`web/`、`package.json`、`run.bat`)**不引用任何被删资产**;唯一对旧代码的提及是 `src/adapters/site-contract.ts` 顶部一句"值移植自 legacy app/site_bot.py"的来源注释。`npm run verify` 不依赖任何被删文件。

约束:操作员决定(本会话确认)——重写 `README.*` 为仅 TS;删除 `README_USER.*`;磁盘遗留产物一并删除;删 `data/` 旧布局但把 `vendor_mapping.example.csv` 作为模板保留。

## Goals / Non-Goals

**Goals:**
- 让仓库只剩一套真相:新的 TS 本地 Web 应用。
- 删干净旧 Python 代码、打包、依赖、资源与磁盘产物。
- `README.*` 仅描述新栈;移除已不适用的旧 GUI 用户手册。
- 保留供应商映射示例(迁到 `examples/`)。
- 把"单一实现来源"固化为 `engineering-harness` 的一条可测工程要求。
- 删除后 `npm run verify` 仍全绿、`git status` 干净。

**Non-Goals:**
- 不改动新 TS 应用的任何行为或既有需求(除给 `engineering-harness` 增补一条)。
- 不重写一份新的操作员使用手册(README_USER 直接删除,不补写);如需,另排变更。
- 不动 `.claude/`、`openspec/`、CI 配置等与遗留 Python 无关的部分。

## Decisions

- **整树删除而非渐进弃用**:旧实现无测试、无规格、且已被新栈完全取代,保留只会制造混淆;git 历史足以回溯,故一次性删除。备选(保留为 `legacy/` 只读目录)被否决——仍是"两套真相",违背本变更初衷。
- **README 改写 vs 删除**:`README.*` 含有效的新栈段落(npm/verify/run.bat),故**改写**而非删除,移除旧 Python 目录树、`pip install`、PyInstaller 段;`README_USER.*` 整套针对旧安装包 GUI,无可复用内容,故**删除**。
- **示例 CSV 迁到 `examples/`**:`data/local/vendor_mapping.example.csv` 是有用的映射模板,但 `data/` 旧布局(`input_pdfs/`、`extracted/`)属旧 CLI 工作流。把示例迁到新建的 `examples/`,删掉 `data/`。
- **`.gitignore` 精简**:移除只服务旧栈/旧布局的项(`.venv/`、`__pycache__/`、`*.py[cod]`、`config.user.json`、`data/**` 相关),保留 Node/TS 与通用项(`.env`、`node_modules/`、`coverage/`、`dist/`、`build/`、`web/dist/` 等)。注:`dist/`、`build/` 忽略项保留(通用构建产物名,无害)。
- **site-contract.ts 注释**:删除旧文件后,把"值移植自 legacy app/site_bot.py"改为不指向已删文件的中性表述(如"值来自对 uTradeHub 表单的人工勘察"),避免悬挂引用。
- **把规则写进 engineering-harness**:以 ADDED requirement 表达"仓库单一实现来源",让未来的 review/agent 有据可依;这正是本变更"Why"的规格化。

## Risks / Trade-offs

- [误删新栈仍需的文件] → 已逐项核查新代码引用;删除后立即跑 `npm run verify` 与构建验证,任何缺失会立刻暴露。
- [README 改写后链接/导航断裂] → 改写后检查三语互链与锚点;`README_USER` 链接随文件一并移除。
- [磁盘删除不可逆] → 被删的都是可重建产物(`.venv` 可重装、`playwright-browsers` 新栈不需要、`build/dist` 可重新构建);源码经 git 历史可回溯。
- [遗漏 `data/` 私有映射忽略后误提交私有数据] → 新应用经 Web 上传映射、不再读 `data/`;示例文件无敏感数据;同时在 `.gitignore` 保留对 `examples/` 下非 `.example.csv` 的保护(如有需要)。

## Migration Plan

1. 删除 git 跟踪的旧 Python 文件与资源(`git rm`)。
2. 迁移示例 CSV 到 `examples/`,删除 `data/`。
3. 改写 `README.*`、删除 `README_USER.*`、精简 `.gitignore`、修正 site-contract.ts 注释。
4. 向 `engineering-harness` 写 delta(ADDED requirement)。
5. 删除磁盘上未跟踪的遗留产物。
6. 跑 `npm run verify` + `npm run build` 确认全绿;`git status` 复核无误删。
7. 回滚策略:本变更未合并前 `git checkout -- .` 即可恢复;已提交则 `git revert`。
