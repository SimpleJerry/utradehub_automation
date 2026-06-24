; Inno Setup script for UTradeHub Automation.
; Packages packaging/build/ (node.exe + launcher + app bundle) into a per-user Setup.exe.
; Build with: ISCC.exe packaging\installer.iss  (driven by `npm run package`).

#define AppName "UTradeHub Automation"
#define AppVersion "0.0.0"

[Setup]
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=UTradeHub Automation
DefaultDirName={localappdata}\Programs\UTradeHubAutomation
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputDir=dist
OutputBaseFilename=UTradeHubAutomationSetup
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Per-user install: no admin / UAC prompt for a non-technical operator.
PrivilegesRequired=lowest
WizardStyle=modern

[Files]
Source: "build\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\UTradeHubAutomation.cmd"; WorkingDir: "{app}"
Name: "{userdesktop}\{#AppName}"; Filename: "{app}\UTradeHubAutomation.cmd"; WorkingDir: "{app}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加任务:"

[Run]
Filename: "{app}\UTradeHubAutomation.cmd"; Description: "立即启动 {#AppName}"; Flags: nowait postinstall skipifsilent
