## 1. 后端打包(esbuild)

- [x] 1.1 加开发依赖 `esbuild`
- [x] 1.2 esbuild 把 `src/app/server/index.ts` 打成单个 ESM(`--packages=external`,**所有** node_modules 保留为真实依赖;`playwright-core` 等动态/原生依赖零特殊处理)
- [x] 1.3 `web/dist` 定位:`index.ts` 支持 `WEB_DIST_DIR` 环境变量覆盖,打包后由启动器设置(ESM 输出,`import.meta.url` 仍可用)

## 2. 应用包组装与启动器

- [x] 2.1 `packaging/package.mjs`:前端构建 → esbuild 后端 → `npm ci --omit=dev` 暂存生产 node_modules → 拷 web/dist → 复制本机 `node.exe`(版本一致)→ 组装应用包
- [x] 2.2 启动器 `UTradeHubAutomation.cmd`:设 `WEB_DIST_DIR` 后运行 `node.exe app\index.mjs`;服务自带开浏览器
- [x] 2.3 `package.json` 增 `package` 脚本(`node packaging/package.mjs`,含 Inno Setup)

## 3. Inno Setup 安装脚本

- [x] 3.1 `packaging/installer.iss`:per-user 安装到 `{localappdata}\Programs`、开始菜单 + 桌面快捷方式、卸载清理
- [x] 3.2 本地 `npm run package` 跑通,产出 `packaging/dist/UTradeHubAutomationSetup.exe`(29MB)

## 4. 验收(干净环境)

- [x] 4.1 静默安装并运行:已安装的 `node.exe app\index.mjs` 起服务 `/api/environment` `{"issues":[]}` + 前端首页正常;bundle 的 playwright-core 驱动系统 Chrome 成功(`BUNDLE_PW_OK`);静默卸载后安装目录与桌面快捷方式清除干净
- [x] 4.2 路径/模块均无问题(node_modules 原样、`WEB_DIST_DIR` 定位 web/dist 均验证通过)

## 5. CI 自动出包

- [x] 5.1 `.github/workflows/release.yml`:`push tags: v*`;Windows runner:`npm ci` → `choco install innosetup` → `npm run verify` → `npm run package` → `softprops/action-gh-release` 上传 `Setup.exe`
- [ ] 5.2 推送一个 `v*` 测试 tag 验证 CI 产出 `Setup.exe`(**对外操作:发布 release,留给用户在确认后推送**)
- [x] 5.3 发布前人工 checklist 已补充:版本号/tag、installer 冒烟、Chrome 环境、`임시저장` 边界、不得 `발급`/`제출`、产物 hash/记录

## 6. 退役与文档

- [x] 6.1 `git rm run.bat`
- [x] 6.2 更新 `README.md`/`.en`/`.ko` 运行/交付一节:改为“安装 `Setup.exe` → 桌面图标运行”,LLM Key 改界面录入,新增开发者 `npm run package` 说明;移除 `run.bat`/`npm run build` 终端用户指引

## 7. 收尾

- [x] 7.1 `npm run verify` 全绿(40 passed / 1 skipped),确认打包改动未破坏既有构建/测试
