param(
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    throw "未找到 .venv Python：$venvPython"
}

if ($Clean) {
    Write-Host "[clean] removing build/dist/output"
    Remove-Item -LiteralPath (Join-Path $projectRoot "build") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $projectRoot "dist") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $projectRoot "packaging\output") -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "[deps] install runtime deps"
& $venvPython -m pip install -r (Join-Path $projectRoot "requirements.txt")

Write-Host "[deps] install packaging deps"
& $venvPython -m pip install -r (Join-Path $projectRoot "packaging\requirements-packaging.txt")

Write-Host "[playwright] install chromium"
& $venvPython -m playwright install chromium

Write-Host "[build] run pyinstaller"
& $venvPython -m PyInstaller (Join-Path $projectRoot "packaging\pyinstaller.spec") --noconfirm

$distAppDir = Join-Path $projectRoot "dist\UTradeHubDesktop"
if (-not (Test-Path $distAppDir)) {
    throw "PyInstaller 输出不存在：$distAppDir"
}

$outputRoot = Join-Path $projectRoot "packaging\output"
$outputAppDir = Join-Path $outputRoot "UTradeHubDesktop"

Remove-Item -LiteralPath $outputAppDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $outputAppDir | Out-Null
Copy-Item -Path (Join-Path $distAppDir "*") -Destination $outputAppDir -Recurse -Force

Copy-Item -Path (Join-Path $projectRoot "README_USER.md") -Destination (Join-Path $outputAppDir "README_USER.md") -Force
Copy-Item -Path (Join-Path $projectRoot "config.user.example.json") -Destination (Join-Path $outputAppDir "config.user.json") -Force
Copy-Item -Path (Join-Path $projectRoot "resources\duck.ico") -Destination (Join-Path $outputAppDir "duck.ico") -Force
$mappingTargetDir = Join-Path $outputAppDir "data\local"
New-Item -ItemType Directory -Force -Path $mappingTargetDir | Out-Null
Copy-Item -Path (Join-Path $projectRoot "data\local\vendor_mapping.example.csv") -Destination (Join-Path $mappingTargetDir "vendor_mapping.example.csv") -Force

Write-Host "[done] build completed"
Write-Host "App folder: $outputAppDir"
Write-Host "Installer script: $projectRoot\packaging\installer.iss"
Write-Host "Use Inno Setup to compile installer."




