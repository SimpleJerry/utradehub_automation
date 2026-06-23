## Why

本地 Web 应用面向**非技术操作员**,其机器上大概率没有 Node,也不应要求他们跑 `npm install/build` 或装 Docker。需要一种“双击安装→桌面图标→双击运行”的 Windows 交付:**自带运行时**、操作员零依赖。已用 spike 验证单文件 .exe(pkg/SEA)因 `playwright-core` 运行时动态 `require` 崩溃而不可行;结论是**用安装包,保留 node_modules 原样**。同时打包必须**可一条命令 + CI 自动化**,避免手工繁琐。背景与决策见 `docs/superpowers/specs/2026-06-24-operator-config-and-packaging-design.md`(Change B)。

## What Changes

- **生产打包脚本**:`npm run package` 一条命令——构建前端(`web/dist`)→ 用 esbuild 把后端打成单个 JS(`playwright-core` 等需动态加载/原生的依赖保留为真实 `node_modules` 外部件)→ 组装“应用包”(便携 `node.exe` + 外部 `node_modules` + 后端 JS + `web/dist` + 启动器)→ 调用 Inno Setup `iscc` 产出 `Setup.exe`。
- **Inno Setup 安装脚本**(`packaging/installer.iss`):把应用包打成 `Setup.exe`,安装到本地并创建**开始菜单/桌面快捷方式**;快捷方式启动本地服务(服务自带打开浏览器)。
- **启动器**:快捷方式经一个轻量启动器运行 `node.exe <后端入口>`;服务现有逻辑已自动开浏览器,无需额外打开逻辑。
- **打包自动化(CI)**:`.github/workflows/release.yml`——打 tag 时在 Windows runner 上 `npm ci` → `npm run package`(含安装 Inno Setup)→ 把 `Setup.exe` 作为 release 资产上传。发版不手工打包。
- **`run.bat` 退役**:由安装后的快捷方式取代。
- **README 更新**:运行/交付一节改为“安装 Setup.exe → 桌面图标运行”,移除 `run.bat`/`npm run build` 的终端用户指引(开发者指引保留)。

## Capabilities

### New Capabilities
- `windows-installer-delivery`: 以自带 Node 运行时的 Windows 安装包(`Setup.exe`)交付应用,使非技术操作员无需安装 Node/Docker 即可运行;且打包过程可一条命令并由 CI 在 release tag 上自动产出。

### Modified Capabilities
- `operator-web-app`: 修改“一键启动”需求——启动方式由 `run.bat` 改为**安装后的快捷方式**(启动本地服务并打开浏览器);`.bat` 退役。

## Impact

- **新增**:`packaging/installer.iss`、打包脚本(如 `packaging/package.mjs`)、`.github/workflows/release.yml`;`package.json` 增 `package` 脚本与 esbuild 开发依赖。
- **退役**:`run.bat`。
- **更新**:`README*` 的运行/交付一节。
- **打包布局注意**:服务入口经相对路径定位 `web/dist`(`src/app/server/index.ts` 用 `import.meta.url` → `../../../web/dist`);安装包布局必须保持该相对关系,或改为按 `process.execPath`/基准目录定位(实现时确定,并以“装好后能起服务+开页面”验证)。
- **不变**:应用功能、人工闸、站点驱动、配置/密钥模型(Change A);仅交付/打包层。
- **非目标**:不做自动更新;不做代码签名证书(缺签名会有 Windows SmartScreen 提示,后续另排);不支持非 Windows。
