# engineering-harness Specification

## Purpose
TBD - created by archiving change bootstrap-engineering-harness. Update Purpose after archive.
## Requirements
### Requirement: 严格静态类型
本工程 SHALL 使用严格模式的 TypeScript，类型检查步骤遇到任何类型错误时 SHALL 使构建失败。

#### Scenario: 类型错误导致 typecheck 失败
- **WHEN** 开发者引入一个违反已声明类型的表达式
- **THEN** `npm run typecheck` 以非零退出并报告出错的文件与行

### Requirement: 统一的验证命令
本工程 SHALL 提供单一的 `verify` 命令，依次运行 typecheck、lint、format-check 与测试；其中任一步失败时 SHALL 以非零退出。

#### Scenario: verify 聚合所有闸门
- **WHEN** 开发者或 CI 运行 `npm run verify`
- **THEN** typecheck、lint、format-check 与测试全部执行
- **AND** 仅当每一步都通过时命令才以零退出

### Requirement: 自动化单元测试
本工程 SHALL 使用测试运行器（Vitest），能以单次 CI 友好的方式运行单元测试，并可报告覆盖率。

#### Scenario: 测试以 CI 模式运行
- **WHEN** 在 CI 中运行 `npm test`
- **THEN** 所有单元测试执行一次，且只要有任一测试失败进程即以非零退出

### Requirement: lint 与格式化闸门
本工程 SHALL 强制执行 lint（ESLint）与一致的格式（Prettier）；`verify` 在出现 lint 错误或格式漂移时 SHALL 失败。

#### Scenario: 格式漂移阻断 verify
- **WHEN** 检查到某个文件不符合 Prettier 格式
- **THEN** `npm run verify` 在 format-check 这一步失败

### Requirement: 持续集成强制
持续集成 SHALL 在每次 push 与 pull request 上运行 `verify`，并在其失败时 SHALL 拦截合并。

#### Scenario: 失败的检查拦截合并
- **WHEN** 打开一个 `verify` 失败的 pull request
- **THEN** CI 检查报告失败，且在修复前该分支不可合并

### Requirement: functional-core / imperative-shell 分层
代码库 SHALL 将纯函数核心与产生副作用的代码分离，所有外部依赖（LLM provider、浏览器驱动、文件系统、网络、时钟）SHALL 仅通过 ports（接口）访问，使核心可在不依赖它们的情况下被测试。

#### Scenario: 核心在无外部依赖下被测试
- **WHEN** 核心的单元测试运行
- **THEN** 它们在没有网络访问、真实浏览器或真实 LLM provider 的情况下执行，使用内存或伪造的 adapter

### Requirement: 密钥不入版本库
凭据与密钥 SHALL NOT 被提交；仓库 SHALL 提供一个已提交的 `.env.example` 模板，而真实的 `.env` 被 git 忽略。

#### Scenario: 真实 env 被忽略
- **WHEN** 开发者创建一个含真实凭据的本地 `.env`
- **THEN** git 不追踪它，且只有不含密钥的 `.env.example` 被提交

### Requirement: 确定性 golden-file 夹具
本工程 SHALL 支持 golden-file 夹具，存放于专用的夹具目录，用于对解析与转换逻辑做确定性测试。

#### Scenario: golden 夹具驱动一个测试
- **WHEN** 针对一份已存储的输入夹具运行某个转换
- **THEN** 其输出与已存储的期望输出比对，任何差异都使测试失败

### Requirement: 单一实现来源

代码库 SHALL 只保留单一的 TypeScript 实现作为该工具的唯一真相来源;SHALL NOT 在仓库中保留与之并行的遗留运行时(例如旧的 Python CLI 或 GUI 桌面程序)及其专属的打包、依赖与资源文件。被取代的实现 SHALL 通过删除退役,其历史依赖 git 版本历史回溯,而非以并存目录形式保留。

#### Scenario: 仓库不含并行遗留运行时

- **WHEN** 检视版本库追踪的文件
- **THEN** 不存在旧 Python 应用代码(如 `app/`、`desktop/`、根级 `main.py`/`launcher_gui.py`)
- **AND** 不存在仅服务旧实现的打包与依赖文件(如 `requirements.txt`、PyInstaller/Inno Setup 打包配置)

#### Scenario: 新栈不依赖被退役的实现

- **WHEN** 在仅含 TypeScript 实现的仓库上运行 `npm run verify` 与 `npm run build`
- **THEN** 两者均成功,且不引用任何已删除的遗留文件

