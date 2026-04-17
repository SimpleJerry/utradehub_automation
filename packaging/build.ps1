param(
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"
$playwrightBrowsersDir = Join-Path $projectRoot "playwright-browsers"

if (-not (Test-Path $venvPython)) {
    throw "Missing .venv Python: $venvPython"
}

if ($Clean) {
    Write-Host "[clean] removing build/dist/output and bundled browsers"
    Remove-Item -LiteralPath (Join-Path $projectRoot "build") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $projectRoot "dist") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $projectRoot "packaging\output") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $playwrightBrowsersDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "[deps] install runtime deps"
& $venvPython -m pip install -r (Join-Path $projectRoot "requirements.txt")

Write-Host "[deps] install packaging deps"
& $venvPython -m pip install -r (Join-Path $projectRoot "packaging\requirements-packaging.txt")

New-Item -ItemType Directory -Force -Path $playwrightBrowsersDir | Out-Null
$env:PLAYWRIGHT_BROWSERS_PATH = $playwrightBrowsersDir
Write-Host "[playwright] install chromium to $playwrightBrowsersDir"
& $venvPython -m playwright install chromium

$chromiumDirs = Get-ChildItem -Path $playwrightBrowsersDir -Directory -Filter "chromium-*" -ErrorAction SilentlyContinue
if (-not $chromiumDirs) {
    throw "Chromium browser not found under: $playwrightBrowsersDir"
}

Write-Host "[build] run pyinstaller"
& $venvPython -m PyInstaller (Join-Path $projectRoot "packaging\pyinstaller.spec") --noconfirm

$distAppDir = Join-Path $projectRoot "dist\UTradeHubDesktop"
if (-not (Test-Path $distAppDir)) {
    throw "PyInstaller output not found: $distAppDir"
}

# Bundle browsers into dist folder for direct smoke test.
$distBrowserDir = Join-Path $distAppDir "playwright-browsers"
Remove-Item -LiteralPath $distBrowserDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $distBrowserDir | Out-Null
Copy-Item -Path (Join-Path $playwrightBrowsersDir "*") -Destination $distBrowserDir -Recurse -Force

$outputRoot = Join-Path $projectRoot "packaging\output"
$outputAppDir = Join-Path $outputRoot "UTradeHubDesktop"

Remove-Item -LiteralPath $outputAppDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $outputAppDir | Out-Null
Copy-Item -Path (Join-Path $distAppDir "*") -Destination $outputAppDir -Recurse -Force

Copy-Item -Path (Join-Path $projectRoot "README_USER.md") -Destination (Join-Path $outputAppDir "README_USER.md") -Force
Copy-Item -Path (Join-Path $projectRoot "config.user.example.json") -Destination (Join-Path $outputAppDir "config.user.json.example") -Force
Copy-Item -Path (Join-Path $projectRoot "resources\duck.ico") -Destination (Join-Path $outputAppDir "duck.ico") -Force
$mappingTargetDir = Join-Path $outputAppDir "data\local"
New-Item -ItemType Directory -Force -Path $mappingTargetDir | Out-Null
Copy-Item -Path (Join-Path $projectRoot "data\local\vendor_mapping.example.csv") -Destination (Join-Path $mappingTargetDir "vendor_mapping.example.csv") -Force

# Ensure browsers also exist in final output folder used by Inno Setup.
$outputBrowserDir = Join-Path $outputAppDir "playwright-browsers"
Remove-Item -LiteralPath $outputBrowserDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $outputBrowserDir | Out-Null
Copy-Item -Path (Join-Path $playwrightBrowsersDir "*") -Destination $outputBrowserDir -Recurse -Force

Write-Host "[done] build completed"
Write-Host "App folder: $outputAppDir"
Write-Host "Bundled browsers: $outputBrowserDir"
Write-Host "Installer script: $projectRoot\packaging\installer.iss"
Write-Host "Use Inno Setup to compile installer."
