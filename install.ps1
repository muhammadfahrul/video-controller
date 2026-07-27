# Video Controller - Deploy Script for Windows
# Auto-installs dependencies and starts the selected services

param(
    [switch]$SkipInstall,
    [string]$Mode
)

$ErrorActionPreference = "Stop"

function Show-Menu {
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "   Video Controller - Deploy Script" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pilih aplikasi yang ingin diinstall:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [1] Room App       - Agent, Server, Web PWA" -ForegroundColor White
    Write-Host "  [2] Kasir          - Aplikasi Kasir (Cashier)" -ForegroundColor White
    Write-Host "  [3] Semua          - Room App + Kasir" -ForegroundColor White
    Write-Host ""
    Write-Host "  [0] Keluar" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "Masukkan pilihan [1-3]"
    return $choice
}

function Get-InstallMode {
    param([string]$RequestedMode)

    if ($RequestedMode) {
        switch ($RequestedMode.ToLower()) {
            '1' { return 'room' }
            'room' { return 'room' }
            '2' { return 'kasir' }
            'kasir' { return 'kasir' }
            '3' { return 'all' }
            'all' { return 'all' }
            '0' { exit 0 }
            default {
                Write-Host "Pilihan tidak valid: $RequestedMode" -ForegroundColor Red
                exit 1
            }
        }
    }

    $choice = Show-Menu

    switch ($choice) {
        '1' { return 'room' }
        '2' { return 'kasir' }
        '3' { return 'all' }
        '0' { exit 0 }
        default {
            Write-Host "Pilihan tidak valid!" -ForegroundColor Red
            exit 1
        }
    }
}

function Install-7Zip {
    Write-Host "[INFO] Installing 7-Zip..." -ForegroundColor Yellow

    $sevenZipUrl = 'https://www.7-zip.org/a/7z2408-x64.exe'
    $sevenZipInstaller = "$env:TEMP\7z-installer.exe"

    Write-Host "[INFO] Downloading 7-Zip..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $sevenZipUrl -OutFile $sevenZipInstaller -UseBasicParsing

    Write-Host "[INFO] Installing 7-Zip (this may take a moment)..." -ForegroundColor Yellow
    Start-Process -FilePath $sevenZipInstaller -ArgumentList '/S' -Wait

    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')

    Write-Host "[OK] 7-Zip installed" -ForegroundColor Green
}

function Install-NodeJS {
    Write-Host "[INFO] Installing Node.js..." -ForegroundColor Yellow

    $nodeUrl = 'https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi'
    $nodeInstaller = "$env:TEMP\node-installer.msi"

    Write-Host "[INFO] Downloading Node.js..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing

    Write-Host "[INFO] Installing Node.js..." -ForegroundColor Yellow
    Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', "`"$nodeInstaller`"", '/quiet', '/norestart') -Wait

    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')

    Write-Host "[OK] Node.js installed" -ForegroundColor Green
}

function Install-Dependencies {
    param(
        [string]$Path,
        [string]$Name
    )

    if (-not (Test-Path (Join-Path $Path 'node_modules'))) {
        Write-Host "[INFO] Installing $Name dependencies..." -ForegroundColor Yellow
        Push-Location $Path
        & npm install
        Pop-Location
    }
}

function Remove-NodeModules {
    param([string]$Path)

    if (Test-Path $Path) {
        Remove-Item -Path $Path -Recurse -Force
    }
}

function Remove-FileIfExists {
    param([string]$Path)

    if (Test-Path $Path) {
        Remove-Item -Path $Path -Force
    }
}

function Ensure-PlaywrightBrowsers {
    $agentPath = Join-Path $PROJECT_ROOT 'agent'
    if (Test-Path $agentPath) {
        Write-Host "[INFO] Installing Playwright browsers..." -ForegroundColor Yellow
        Push-Location $agentPath
        & npx playwright install chromium
        Pop-Location
    }
}

Write-Host "[INFO] Starting Video Controller..." -ForegroundColor Cyan

$PROJECT_ROOT = $PSScriptRoot
$INSTALL_MODE = Get-InstallMode -RequestedMode $Mode

switch ($INSTALL_MODE) {
    'all' {
        Write-Host "[INFO] Mode: Semua layanan (Room App + Kasir)" -ForegroundColor Yellow
    }
    'room' {
        Write-Host "[INFO] Mode: Room App saja (agent, server, web)" -ForegroundColor Yellow
    }
    'kasir' {
        Write-Host "[INFO] Mode: Kasir saja (cashier)" -ForegroundColor Yellow
    }
}

Write-Host ""

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Install-NodeJS
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
}

if (-not $nodeCommand) {
    Write-Host "[ERROR] Node.js is still not available after installation." -ForegroundColor Red
    exit 1
}

$nodeVersion = & $nodeCommand.Source --version 2>$null
$nodeMajorVersion = if ($nodeVersion -match 'v(\d+)') { [int]$matches[1] } else { 0 }

if (-not $nodeVersion -or $nodeMajorVersion -lt 16) {
    Write-Host "[ERROR] Node.js $nodeVersion is too old or not installed!" -ForegroundColor Red
    Install-NodeJS
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        Write-Host "[ERROR] Node.js is still not available after installation." -ForegroundColor Red
        exit 1
    }
    $nodeVersion = & $nodeCommand.Source --version 2>$null
    $nodeMajorVersion = if ($nodeVersion -match 'v(\d+)') { [int]$matches[1] } else { 0 }
}

$npmCommand = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    Write-Host "[ERROR] npm is not available." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Node.js $(node --version) and npm $(npm --version) detected" -ForegroundColor Green

if (-not (Test-Path (Join-Path $PROJECT_ROOT 'package.json'))) {
    Write-Host "[INFO] Project files not found. Downloading ZIP archive..." -ForegroundColor Yellow

    $parentDir = Split-Path $PROJECT_ROOT -Parent
    $archiveUrl = 'https://github.com/muhammadfahrul/video-controller/archive/refs/heads/main.zip'
    $archivePath = Join-Path $env:TEMP 'video-controller-main.zip'
    $extractDir = Join-Path $parentDir 'video-controller-main'
    $destDir = Join-Path $parentDir 'video-controller'

    if (-not (Get-Command Expand-Archive -ErrorAction SilentlyContinue)) {
        Write-Host "[ERROR] PowerShell archive support is unavailable." -ForegroundColor Red
        Install-7Zip
    }

    if (Test-Path $destDir) {
        Remove-Item -Path $destDir -Recurse -Force
    }

    if (Test-Path $extractDir) {
        Remove-Item -Path $extractDir -Recurse -Force
    }

    Write-Host "[INFO] Downloading repository archive..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $archiveUrl -OutFile $archivePath -UseBasicParsing

    Write-Host "[INFO] Extracting archive..." -ForegroundColor Yellow
    Expand-Archive -Path $archivePath -DestinationPath $parentDir -Force

    if (Test-Path $extractDir) {
        Rename-Item -Path $extractDir -NewName 'video-controller'
    }

    $PROJECT_ROOT = $destDir
    Write-Host "[OK] Project ready at $PROJECT_ROOT" -ForegroundColor Green
}

Write-Host "[INFO] Checking dependencies..." -ForegroundColor Yellow

Remove-NodeModules -Path (Join-Path $PROJECT_ROOT 'web/node_modules')
Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'web/package-lock.json')
Remove-NodeModules -Path (Join-Path $PROJECT_ROOT 'cashier/node_modules')
Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'cashier/package-lock.json')

if (-not (Test-Path (Join-Path $PROJECT_ROOT 'node_modules'))) {
    Write-Host "[INFO] Removing old workspace node_modules..." -ForegroundColor Yellow
    Remove-NodeModules -Path (Join-Path $PROJECT_ROOT 'node_modules')
    Remove-NodeModules -Path (Join-Path $PROJECT_ROOT 'agent/node_modules')
    Remove-NodeModules -Path (Join-Path $PROJECT_ROOT 'server/node_modules')
    Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'package-lock.json')
    Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'agent/package-lock.json')
    Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'server/package-lock.json')
    Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'web/package-lock.json')
    Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'cashier/package-lock.json')
}

Write-Host "[INFO] Checking dependencies..." -ForegroundColor Yellow
Install-Dependencies -Path $PROJECT_ROOT -Name 'root'

if ($INSTALL_MODE -eq 'all' -or $INSTALL_MODE -eq 'room') {
    Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'agent') -Name 'agent'
    Ensure-PlaywrightBrowsers
    Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'server') -Name 'server'
    Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'web') -Name 'web'
}

if ($INSTALL_MODE -eq 'all' -or $INSTALL_MODE -eq 'kasir') {
    Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'cashier') -Name 'cashier'
}

Write-Host "[INFO] Building services..." -ForegroundColor Yellow

if ($INSTALL_MODE -eq 'all' -or $INSTALL_MODE -eq 'room') {
    Write-Host "[INFO] Building Room App (agent, server, web)..." -ForegroundColor Yellow
    Push-Location (Join-Path $PROJECT_ROOT 'server')
    & npm run build
    Pop-Location

    Push-Location (Join-Path $PROJECT_ROOT 'agent')
    & npm run build
    Pop-Location

    Push-Location (Join-Path $PROJECT_ROOT 'web')
    & npm run build
    Pop-Location
}

if ($INSTALL_MODE -eq 'all' -or $INSTALL_MODE -eq 'kasir') {
    Write-Host "[INFO] Building Kasir (cashier)..." -ForegroundColor Yellow
    Push-Location (Join-Path $PROJECT_ROOT 'cashier')
    & npm run build
    Pop-Location
}

Write-Host "[INFO] Starting services..." -ForegroundColor Yellow

$processes = @()

if ($INSTALL_MODE -eq 'all' -or $INSTALL_MODE -eq 'room') {
    Write-Host "[INFO] Starting Room App services..." -ForegroundColor Yellow

    $serverProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm run start') -WorkingDirectory (Join-Path $PROJECT_ROOT 'server') -PassThru
    $processes += $serverProcess
    Write-Host "   - Server: PID $($serverProcess.Id)" -ForegroundColor Cyan

    $agentProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm run start') -WorkingDirectory (Join-Path $PROJECT_ROOT 'agent') -PassThru
    $processes += $agentProcess
    Write-Host "   - Agent: PID $($agentProcess.Id)" -ForegroundColor Cyan

    $webProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm run preview:host') -WorkingDirectory (Join-Path $PROJECT_ROOT 'web') -PassThru
    $processes += $webProcess
    Write-Host "   - Web: PID $($webProcess.Id)" -ForegroundColor Cyan
}

if ($INSTALL_MODE -eq 'all' -or $INSTALL_MODE -eq 'kasir') {
    Write-Host "[INFO] Starting Kasir service..." -ForegroundColor Yellow

    $cashierProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm run preview:host') -WorkingDirectory (Join-Path $PROJECT_ROOT 'cashier') -PassThru
    $processes += $cashierProcess
    Write-Host "   - Cashier: PID $($cashierProcess.Id)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "[OK] All selected services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

try {
    while ($true) { Start-Sleep -Seconds 1 }
}
finally {
    Write-Host ""
    Write-Host "[INFO] Stopping all services..." -ForegroundColor Yellow

    foreach ($process in $processes) {
        if ($null -ne $process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Host "[OK] All services stopped" -ForegroundColor Green
}
