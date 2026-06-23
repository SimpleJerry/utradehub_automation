# 设计:操作员配置/密钥模型 + Windows 安装包交付

日期:2026-06-24
状态:已认可(Junfan），待拆为 OpenSpec change A、B 实现

## 背景与目标

TS 重写已端到端打通(集成测试在真站点跑到 임시저장)。下一步是让**非技术操作员**能在自己的机器上日常使用,并收敛私密信息的泄露面。本设计回应四个诉求:免 `npm run build` / 免装 Node 的交付、退役 `run.bat`、供应商映射改上传按钮、退役 `.env`(密钥改界面录入)。

## 关键技术结论(已用 spike 验证,避免重复论证)

- **Docker 容器方案否决**:核心架构是 Playwright 驱动操作员**系统 Chrome、有头(可见窗口)**,以支撑“人看着自动化 + 事后人工 발급”的人工闸。容器隔离,无法驱动宿主 Chrome、无法显示可见窗口;改为容器内无头 Chromium 会推翻“用系统 Chrome、不捆 Chromium”的锁定决策,且让操作员装 Docker Desktop 比一键 exe 更重。
- **单文件 .exe(pkg/SEA)否决**:2026-06-24 做了 spike——`@yao-pkg/pkg` 能打出 71MB 单文件 exe,但**运行时在 `playwright-core` 的浏览器 registry 因动态 `require` 直接 `MODULE_NOT_FOUND` 崩溃**。要救需把 playwright-core 当外部资源解包放 exe 旁,即不再是单文件。故单文件对本项目不通。
- **采用:安装包(node_modules 原样保留)**。playwright-core 作为真实模块零特殊处理,最稳;对操作员仍是“双击安装→桌面图标→双击运行”的一键体验。

## 分解为两个 OpenSpec change

可独立实现/交付。实现顺序 A → B(先定最终 UX/配置,B 再打包最终形态)。

### Change A —「操作员配置与密钥模型」(web + server)

1. **供应商映射改上传按钮**:`App.tsx` 的粘贴 textarea → `<input type="file" accept=".csv">`;前端读文件文本后照旧发 `/api/preview`。
2. **LLM_API_KEY 进界面**:配置页新增 API Key 输入框,**仅内存**(随本次 app 运行保留,关闭/刷新即清,绝不落盘),与登录密码同一原则。`/api/preview` 请求携带它;服务端按请求构建 LLM 抽取器,**不再从 `process.env` 读密钥**。
3. **非敏感项默认值 + 可选覆盖**:`LLM_MODEL` 默认 `deepseek-v4-flash`、`LLM_BASE_URL` 设默认值,硬编码于代码;配置页提供“高级”可选覆盖字段。
4. **SITE_BASE_URL 只读展示**:界面只显示固定值 `https://www.utradehub.or.kr/`,无编辑入口。
5. **app 不再读 `.env`**:`deps.ts` 停止从 env 取 LLM 配置;LLM 配置改由请求传入 / 代码默认。`.env` 仅保留为**开发者 gated 集成测试**(`SITE_*`)的本地 fixture(不分发、仍 gitignore)。`start` 脚本的 `--env-file` 对终端用户变为多余,予以移除。

非目标(Change A):不引入任何密钥落盘/OS keychain(刻意,符合“宁可安全”取向);不改人工闸、不改站点驱动逻辑。

### Change B —「Windows 安装包交付」(打包 / CI)

6. **Setup.exe 安装包(Inno Setup)**:内置便携 `node.exe` + 生产 `node_modules`(playwright-core 原样)+ 构建好的前端;安装后桌面/开始菜单快捷方式,双击→起本地服务→自动开浏览器。操作员无需 Node/Docker。
7. **`run.bat` 退役**:由快捷方式取代。
8. **打包自动化**:`npm run package` 一条命令 + GitHub Actions release workflow(打 tag → CI 跑 `iscc` 产出 `Setup.exe` 作为 release 资产),发版不手工打包。

非目标(Change B):不做自动更新;不做代码签名证书(可后续另排,缺签名会有 SmartScreen 提示,届时再议);不支持非 Windows。

## 已定决策

- 安装包工具:**Inno Setup**(旧项目用过、稳、产出单 Setup.exe、CI 可跑 `iscc`)。
- LLM Key 录入:**每次开 app 填一次、仅内存**(非每次预览;非落盘)。
- 默认 `LLM_MODEL=deepseek-v4-flash`,provider 仍 OpenAI 兼容、可覆盖(不锁单一供应商)。

## 影响

- 改动:`web/src/App.tsx`、`web/src/api.ts`、`src/app/dto.ts`、`src/app/server/*`(preview 接受 LLM 配置)、`src/app/server/deps.ts`(停读 env)、`package.json`(`start` 去 `--env-file`)。
- 新增:打包脚本、Inno Setup 脚本、`.github/workflows` release。
- 退役:`run.bat`;`.env` 退至开发测试 fixture 角色。
- 架构记忆需更新:LLM key 由 env 迁至界面(仍不持久化),强化“凭据仅内存”。
