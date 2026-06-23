## ADDED Requirements

### Requirement: 自带运行时的 Windows 安装包

项目 SHALL 能产出一个 Windows 安装包(`Setup.exe`),其中**自带 Node 运行时**与应用(含 `node_modules`、构建后的前端);使**非技术操作员无需另行安装 Node 或 Docker** 即可安装并运行本应用。

#### Scenario: 无 Node 的机器上安装运行

- **WHEN** 操作员在一台未安装 Node 的 Windows 机器上运行 `Setup.exe` 并完成安装
- **THEN** 应用被安装并可经快捷方式运行(本地服务启动、浏览器打开到应用页)
- **AND** 无需操作员单独安装 Node 或 Docker

### Requirement: 打包一条命令且 CI 自动产出

产出安装包 SHALL 可由**单条命令**完成(如 `npm run package`);持续集成 SHALL 在 release tag 上自动构建并将 `Setup.exe` 作为 release 资产发布,使发版无需手工打包。

#### Scenario: 本地一条命令出包

- **WHEN** 开发者运行 `npm run package`
- **THEN** 产出一个可安装的 `Setup.exe`

#### Scenario: CI 在 release tag 自动出包

- **WHEN** 推送一个 release tag
- **THEN** CI 自动构建安装包并将 `Setup.exe` 作为该 release 的资产上传
