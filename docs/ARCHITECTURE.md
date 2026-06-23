# 架构约定（TypeScript 重写）

本文件记录所有后续变更（②③④）都必须遵守的结构约定。它是 `engineering-harness` 能力的落地说明。

## Functional core / imperative shell

- **core（纯核心）**：`src/core/` 只放纯逻辑——PDF 文本 → 强类型订单、供应商映射、按供应商分组、校验/preflight。无 I/O、无网络、无浏览器、无时钟读取。可被单元测试完全覆盖。
- **shell（命令式外壳）**：产生副作用的代码（浏览器自动化、文件读写、HTTP/LLM 调用、读取配置）放在 `src/adapters/` 与 `src/app/`。

> 经验法则：如果一段逻辑需要"真实世界"才能跑，它就不属于 core。

## Ports and adapters（接缝）

所有外部依赖都只能经由 **port（接口）** 访问，core 永远依赖接口而非实现：

| Port（接口，后续变更定义） | 用途                       | Adapter 示例              |
| -------------------------- | -------------------------- | ------------------------- |
| `LlmProvider`              | 厂商无关的结构化抽取       | OpenAI 兼容 / DeepSeek V4 |
| `BrowserDriver`            | 驱动 uTradeHub 到 임시저장 | Playwright（系统 Chrome） |
| `FileStore`                | 读 PDF / 写产物            | Node `fs`                 |
| `Clock`                    | 取当前时间                 | `Date`                    |

测试时用内存/伪造 adapter 注入，使 core 与编排逻辑无需真实外部依赖即可验证（见 `engineering-harness` 规格的"核心在无外部依赖下被测试"场景）。

> 注意：本变更①**不**定义具体 port——它们随各自的消费者在变更②③④落地（YAGNI）。

## 质量闸门

- 唯一健康判据是 `npm run verify`（= `typecheck` + `lint` + `format:check` + `test`），人与 CI 用同一个。
- 密钥不入库：真实 `.env` 被 git 忽略，仅提交 `.env.example`。

## CI 与分支保护

- `.github/workflows/ci.yml` 在每次 push 与 PR 上运行 `npm ci && npm run verify`。
- **要让"失败即拦截合并"真正生效**，需在 GitHub 仓库手动开启分支保护：
  Settings → Branches → Branch protection rules → 对 `main` 勾选
  _Require status checks to pass before merging_，并选中 CI 的 `verify` 检查。
  （CI 工作流本身只能报告成败；拦截合并由这条仓库设置强制。）

## 过渡期

遗留 Python 工程（`app/`、`desktop/`、`main.py` 等）在被变更②③④取代前原样保留，不被本 harness 的 lint/format 触及（见 `.prettierignore` 与 ESLint 默认只处理 JS/TS）。其移除另排一个变更。
