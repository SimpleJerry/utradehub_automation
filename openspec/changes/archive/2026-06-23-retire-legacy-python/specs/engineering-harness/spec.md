## ADDED Requirements

### Requirement: 单一实现来源

代码库 SHALL 只保留单一的 TypeScript 实现作为该工具的唯一真相来源;SHALL NOT 在仓库中保留与之并行的遗留运行时(例如旧的 Python CLI 或 GUI 桌面程序)及其专属的打包、依赖与资源文件。被取代的实现 SHALL 通过删除退役,其历史依赖 git 版本历史回溯,而非以并存目录形式保留。

#### Scenario: 仓库不含并行遗留运行时

- **WHEN** 检视版本库追踪的文件
- **THEN** 不存在旧 Python 应用代码(如 `app/`、`desktop/`、根级 `main.py`/`launcher_gui.py`)
- **AND** 不存在仅服务旧实现的打包与依赖文件(如 `requirements.txt`、PyInstaller/Inno Setup 打包配置)

#### Scenario: 新栈不依赖被退役的实现

- **WHEN** 在仅含 TypeScript 实现的仓库上运行 `npm run verify` 与 `npm run build`
- **THEN** 两者均成功,且不引用任何已删除的遗留文件
