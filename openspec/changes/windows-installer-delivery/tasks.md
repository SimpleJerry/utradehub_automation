## 1. 后端打包(esbuild)

- [ ] 1.1 加开发依赖 `esbuild`
- [ ] 1.2 写打包入口配置:用 esbuild 把 `src/app/server/index.ts` 打成单个 JS;`playwright-core` 及任何动态/原生依赖(按需 `unpdf` 等)用 `--external` 保留为真实 `node_modules`
- [ ] 1.3 处理 `web/dist` 定位:确保打包后入口能正确找到前端静态目录(相对入口的稳定路径或 `APP_BASE_DIR`/`process.execPath` 推定);若输出 CJS,注入 `import.meta.url` 垫片

## 2. 应用包组装与启动器

- [ ] 2.1 `packaging/package.mjs`:`npm run build`(前端)→ esbuild 后端 → 下载/缓存便携 `node.exe`(win-x64, Node 24)→ 组装应用包(node.exe + 外部 node_modules + 后端 JS + web/dist + 启动器)
- [ ] 2.2 启动器(`.cmd` 或极小 exe):工作目录设为安装目录,执行 `node.exe <入口.js>`;服务自带开浏览器,不重复打开
- [ ] 2.3 `package.json` 增 `package` 脚本(调用 `packaging/package.mjs` 再触发 Inno Setup)

## 3. Inno Setup 安装脚本

- [ ] 3.1 `packaging/installer.iss`:把应用包目录打成 `Setup.exe`,安装目录、开始菜单 + 桌面快捷方式指向启动器、卸载清理
- [ ] 3.2 本地 `npm run package` 跑通,产出 `Setup.exe`

## 4. 验收(干净环境)

- [ ] 4.1 在尽量干净的环境双击安装并经快捷方式运行:**验证起本地服务 + 浏览器打开应用页 + 能驱动系统 Chrome**(可借集成测试覆盖驱动路径)
- [ ] 4.2 缺模块/路径问题则补外部化清单或调整 `web/dist` 定位,直至装好即用

## 5. CI 自动出包

- [ ] 5.1 `.github/workflows/release.yml`:触发 `push tags: v*`;Windows runner:`npm ci` → 安装 Inno Setup → `npm run package` → 上传 `Setup.exe` 为 release 资产
- [ ] 5.2 打一个测试 tag 验证 CI 产出 `Setup.exe`

## 6. 退役与文档

- [ ] 6.1 `git rm run.bat`
- [ ] 6.2 更新 `README.md`/`.en`/`.ko` 运行/交付一节:改为“安装 `Setup.exe` → 桌面图标运行”,移除 `run.bat`/`npm run build` 的终端用户指引(开发者指引保留)

## 7. 收尾

- [ ] 7.1 `npm run verify` 全绿(应用代码未变,确认打包改动未破坏既有构建/测试)
