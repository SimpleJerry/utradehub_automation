## Context

应用是 Fastify 后端(`src/app/server/index.ts`,ESM,经 tsx 运行)+ React/Vite 前端(构建到 `web/dist`)。服务入口已自带:监听 `127.0.0.1:PORT`、托管 `web/dist` 静态资源、用 `cmd /c start` 打开浏览器。生产依赖含 `playwright-core`(spike 证实其浏览器 registry 用动态 `require`,无法被单文件打包器静态解析)、`fastify`、`@fastify/static`、`ai`/`@ai-sdk/openai-compatible`、`unpdf`、`zod`。开发机为 Windows,已装 Node 24、Chrome。

约束:操作员零依赖(无 Node/Docker);保留“系统 Chrome + 有头”架构;打包可一条命令 + CI 自动化。

## Goals / Non-Goals

**Goals:**
- 产出 `Setup.exe`:自带便携 `node.exe`,操作员双击安装→快捷方式运行→浏览器自动打开。
- `npm run package` 一条命令本地可出包;CI 在 release tag 上自动出包并上传。
- `playwright-core` 等保留为真实 `node_modules`(零特殊处理),规避 spike 暴露的动态 require 问题。

**Non-Goals:**
- 不做自动更新、代码签名、非 Windows 平台。
- 不改应用功能/人工闸/配置模型。

## Decisions

- **后端用 esbuild 打成单个 JS,但保留必须外部化的依赖**:用 esbuild 把 `src/app/server/index.ts` 及其纯 JS 依赖打成一个文件,降低文件数;`playwright-core`(动态 require)与任何带原生/wasm/动态加载的依赖(如 `unpdf` 视情况)用 `--external` 保留为真实 `node_modules`,随包一起发。备选(整个 `node_modules` 原样发、不 bundle)更省事但文件多、体积大;先尝试 esbuild + 外部化,以“装好后能起服务并驱动 Chrome”为验收。
  - `import.meta.url` 在 CJS 输出下不可用:若 esbuild 目标为 CJS,需用 banner 注入 `import.meta.url` 垫片或改用 ESM 输出;`web/dist` 定位改为相对**打包后入口**的稳定路径(或经 `APP_BASE_DIR`/`process.execPath` 推定),实现时确定。
- **便携 Node**:打包脚本下载/缓存对应版本的 `node.exe`(win-x64)纳入应用包。版本与开发一致(Node 24)。
- **启动器**:快捷方式指向一个轻量启动器(`.cmd` 或极小 exe),工作目录设为安装目录,执行 `node.exe <入口.js>`;服务自带开浏览器,启动器不重复开。
- **Inno Setup**:`packaging/installer.iss` 把应用包目录打成 `Setup.exe`,装到 `{autopf}\UTradeHubAutomation`(或 per-user),建开始菜单 + 桌面快捷方式指向启动器;卸载清理。
- **CI**:`release.yml` 触发于 `push tags: v*`;Windows runner:`npm ci` → 安装 Inno Setup(choco 或 action)→ `npm run package` → `softprops/action-gh-release` 上传 `Setup.exe`。
- **`run.bat` 退役**:删除;README 运行/交付指引改为安装包流程。

## Risks / Trade-offs

- [esbuild 外部化清单不全 → 装好后运行缺模块] → 以“组装后在干净环境跑起来并驱动 Chrome”为硬验收;缺啥补进外部化清单或随包带其 `node_modules`。
- [`web/dist` 相对路径在安装布局下失效] → 调整定位策略并在验收中确认页面能开。
- [缺代码签名 → SmartScreen 提示] → 已列非目标;在 README 说明“更多信息→仍要运行”,后续可加签名。
- [便携 node 版本与 playwright-core 兼容] → 固定到开发同款 Node 24;CI 与本地一致。
- [安装包体积偏大(含 node + node_modules)] → 可接受(对标旧 PyInstaller+Inno 产物);不追求单文件。

## Migration Plan

1. 加 esbuild 开发依赖;写 `packaging/package.mjs`:build 前端 → esbuild 后端(定外部化清单)→ 备便携 node → 组装应用包 → `iscc installer.iss`。
2. 写 `packaging/installer.iss` 与启动器脚本;处理 `web/dist` 定位与(如需)`import.meta.url` 垫片。
3. `package.json` 加 `package` 脚本。
4. 本地 `npm run package` 出包;**在尽量干净的环境双击安装并运行,验证起服务 + 开页面 + 能驱动系统 Chrome**(可借集成测试覆盖驱动)。
5. 写 `.github/workflows/release.yml`,打一个测试 tag 验证 CI 产出 `Setup.exe`。
6. `git rm run.bat`;更新 `README*` 运行/交付一节。
7. 回滚:打包/CI 为新增物,删除即可;`run.bat` 可经 git 历史恢复。
