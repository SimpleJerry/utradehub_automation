## 1. 工程骨架

- [x] 1.1 在仓库根创建 `package.json`（npm，`"type": "module"`，`engines.node` ">=24"）
- [x] 1.2 添加开发依赖：`typescript`、`tsx`、`@types/node`、`vitest`、`@vitest/coverage-v8`、`eslint`、`typescript-eslint`、`prettier`、`eslint-config-prettier`
- [x] 1.3 创建目录布局：`src/core/`、`src/ports/`、`src/adapters/`、`src/app/`、`test/fixtures/`（空目录放 `.gitkeep`）
- [x] 1.4 更新 `.gitignore` 增加 Node 相关：`node_modules/`、`coverage/`、`dist/`

## 2. TypeScript 配置

- [x] 2.1 添加严格 `tsconfig.json`（`strict: true`、`noUncheckedIndexedAccess`、`module`/`moduleResolution` NodeNext、现代 target、`noEmit`）
- [x] 2.2 添加 `typecheck` npm 脚本（`tsc --noEmit`）

## 3. lint 与格式化

- [x] 3.1 添加 ESLint flat config（`eslint.config.js`），采用 `typescript-eslint` 推荐规则 + `eslint-config-prettier`
- [x] 3.2 添加 Prettier 配置（`.prettierrc`）与 `.prettierignore`
- [x] 3.3 添加 `lint`（`eslint .`）、`format:check`（`prettier --check .`）、`format`（`prettier --write .`）脚本

## 4. 测试与 golden-file 夹具

- [x] 4.1 添加 `vitest.config.ts`（v8 覆盖率，include `src` 与 `test`）
- [x] 4.2 添加 `test`（`vitest run`）、`test:watch`（`vitest`）、`coverage` 脚本
- [x] 4.3 在 `src/core/` 放一个临时纯函数 + 一个通过的单元测试 + `test/fixtures/` 一份 golden 夹具，端到端验证 测试/覆盖率/golden 管线（变更② 用真实核心替换）
- [x] 4.4 添加 `test/fixtures/README.md` 说明 golden-file 约定

## 5. 约定文档

- [x] 5.1 写一份简短架构说明（如 `docs/ARCHITECTURE.md`），描述 functional-core / imperative-shell 与 ports-and-adapters 接缝（LLM provider、浏览器驱动、文件系统、时钟仅经 port 访问）；此处**不**定义具体产品 port

## 6. 统一 verify 闸门

- [x] 6.1 添加 `verify` 脚本，串联 `typecheck` + `lint` + `format:check` + `test`（任一步失败即止）
- [x] 6.2 本地运行 `npm run verify`，确认全绿通过

## 7. 持续集成

- [x] 7.1 添加 `.github/workflows/ci.yml`，在 push 与 pull_request 上：setup Node 24、`npm ci`、`npm run verify`
- [x] 7.2 在架构说明或 README 中记录"失败即拦截合并"所需的 branch-protection 设置（GitHub 仓库设置）

## 8. 密钥与 env

- [x] 8.1 添加新应用的 `.env.example`（`LLM_BASE_URL`、`LLM_MODEL`、`LLM_API_KEY` 占位；注明 uTradeHub 凭据在后续变更处理且永不入库）
- [x] 8.2 确认 `.env` 仍被 git 忽略；按需补充 Node 相关密钥忽略项

## 9. 开发者文档

- [x] 9.1 在 README 增加"开发（TypeScript 重写）"一节：安装、`npm run verify`、工程布局，以及过渡期遗留 Python 的位置
