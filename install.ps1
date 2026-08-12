# Video Controller - Deploy Script for Windows
# Auto-installs dependencies and starts the selected services

param(
    [switch]$SkipInstall,
    [string]$Mode
)

# Bypass execution policy untuk menjalankan script ini
$currentPolicy = Get-ExecutionPolicy -Scope CurrentUser
if ($currentPolicy -eq "Restricted" -or $currentPolicy -eq "AllSigned") {
    Write-Host "[INFO] Mengaktifkan execution policy..." -ForegroundColor Yellow
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force -ErrorAction SilentlyContinue
}

$ErrorActionPreference = "Stop"

function Show-Menu {
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "   Video Controller - Deploy Script" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pilih aplikasi yang ingin diinstall:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [1] Room App       - Agent + Server + Web (1 PC = 1 Ruangan)" -ForegroundColor White
    Write-Host "  [2] Kasir          - Aplikasi Kasir (PC Kasir, konek ke N server ruangan)" -ForegroundColor White
    Write-Host "  [3] Semua          - Room App + Kasir (untuk PC yg handle keduanya)" -ForegroundColor White
    Write-Host ""
    Write-Host "  [A] Auto-start Room App" -ForegroundColor Green
    Write-Host "  [B] Auto-start Kasir" -ForegroundColor Green
    Write-Host "  [C] Auto-start Semua" -ForegroundColor Green
    Write-Host ""
    Write-Host "  [D] Remove Auto-start Room App" -ForegroundColor Red
    Write-Host "  [E] Remove Auto-start Kasir" -ForegroundColor Red
    Write-Host "  [F] Remove Auto-start Semua" -ForegroundColor Red
    Write-Host ""
    Write-Host "  [0] Keluar" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "Masukkan pilihan [0-F]"
    return $choice
}

function Get-InstallMode {
    param([string]$RequestedMode)

    if ($RequestedMode) {
        $mode = $RequestedMode.ToLower()
        switch ($mode) {
            '1' { return 'room' }
            'room' { return 'room' }
            '2' { return 'kasir' }
            'kasir' { return 'kasir' }
            '3' { return 'all' }
            'all' { return 'all' }
            'a' { return 'autostart-room' }
            'autostart-room' { return 'autostart-room' }
            'b' { return 'autostart-kasir' }
            'autostart-kasir' { return 'autostart-kasir' }
            'c' { return 'autostart-all' }
            'autostart-all' { return 'autostart-all' }
            'd' { return 'remove-autostart-room' }
            'remove-autostart-room' { return 'remove-autostart-room' }
            'remove-room' { return 'remove-autostart-room' }
            'e' { return 'remove-autostart-kasir' }
            'remove-autostart-kasir' { return 'remove-autostart-kasir' }
            'remove-kasir' { return 'remove-autostart-kasir' }
            'f' { return 'remove-autostart-all' }
            'remove-autostart-all' { return 'remove-autostart-all' }
            'remove-all' { return 'remove-autostart-all' }
            'remove-autostart' { return 'remove-autostart-all' }
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
        'a' { return 'autostart-room' }
        'A' { return 'autostart-room' }
        'b' { return 'autostart-kasir' }
        'B' { return 'autostart-kasir' }
        'c' { return 'autostart-all' }
        'C' { return 'autostart-all' }
        'd' { return 'remove-autostart-room' }
        'D' { return 'remove-autostart-room' }
        'e' { return 'remove-autostart-kasir' }
        'E' { return 'remove-autostart-kasir' }
        'f' { return 'remove-autostart-all' }
        'F' { return 'remove-autostart-all' }
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

# ============================================
# Configure .env files
# ============================================
function Set-EnvConfig {
    param(
        [string]$ProjectRoot,
        [string]$ServerIP,
        [string]$RoomID,
        [string]$RoomName,
        [string]$Rooms,
        [string]$BillingEnabled,
        [string]$PricePerHour
    )

    # Skip if all values are empty
    if (-not $ServerIP -and -not $RoomID -and -not $RoomName -and -not $Rooms -and -not $BillingEnabled -and -not $PricePerHour) {
        Write-Host "[INFO] Tidak ada konfigurasi yang diubah" -ForegroundColor Cyan
        return
    }

    Write-Host ""
    Write-Host "Mengupdate file .env..." -ForegroundColor Yellow

    # Agent .env - ROOM_ID, ROOM_NAME, SERVER_IP
    if ($RoomID -or $RoomName -or $ServerIP) {
        $agentEnvPath = Join-Path $ProjectRoot "agent\.env"
        if (Test-Path $agentEnvPath) {
            $envContent = Get-Content $agentEnvPath -Raw
            
            if ($ServerIP) {
                $envContent = $envContent -replace 'SERVER_IP=.*', "SERVER_IP=$ServerIP"
            }
            if ($RoomID) {
                $envContent = $envContent -replace 'ROOM_ID=.*', "ROOM_ID=$RoomID"
            }
            if ($RoomName) {
                $envContent = $envContent -replace 'ROOM_NAME=.*', "ROOM_NAME=$RoomName"
            }
            
            Set-Content -Path $agentEnvPath -Value $envContent -NoNewline
            Write-Host "[OK] Updated agent/.env" -ForegroundColor Green
        } else {
            Write-Host "[WARN] File agent/.env tidak ditemukan" -ForegroundColor Yellow
        }
    }

    # Server .env - SERVER_IP
    if ($ServerIP) {
        $serverEnvPath = Join-Path $ProjectRoot "server\.env"
        if (Test-Path $serverEnvPath) {
            $envContent = Get-Content $serverEnvPath -Raw
            $envContent = $envContent -replace 'SERVER_IP=.*', "SERVER_IP=$ServerIP"
            Set-Content -Path $serverEnvPath -Value $envContent -NoNewline
            Write-Host "[OK] Updated server/.env" -ForegroundColor Green
        } else {
            Write-Host "[WARN] File server/.env tidak ditemukan" -ForegroundColor Yellow
        }
    }

    # Web .env - SERVER_IP
    if ($ServerIP) {
        $webEnvPath = Join-Path $ProjectRoot "web\.env"
        if (Test-Path $webEnvPath) {
            $envContent = Get-Content $webEnvPath -Raw
            $envContent = $envContent -replace 'VITE_SERVER_IP=.*', "VITE_SERVER_IP=$ServerIP"
            Set-Content -Path $webEnvPath -Value $envContent -NoNewline
            Write-Host "[OK] Updated web/.env" -ForegroundColor Green
        } else {
            Write-Host "[WARN] File web/.env tidak ditemukan" -ForegroundColor Yellow
        }
    }

    # Cashier .env - VITE_ROOMS
    if ($Rooms -or $BillingEnabled) {
        $cashierEnvPath = Join-Path $ProjectRoot "cashier\.env"
        if (Test-Path $cashierEnvPath) {
            $envContent = Get-Content $cashierEnvPath -Raw
            
            # Use rooms JSON directly if provided (user already included IPs)
            if ($Rooms -and $Rooms -ne "default") {
                $envContent = $envContent -replace 'VITE_ROOMS=.*', "VITE_ROOMS=$Rooms"
            }
            
            if ($BillingEnabled) {
                $envContent = $envContent -replace 'VITE_BILLING_ENABLED=.*', "VITE_BILLING_ENABLED=$BillingEnabled"
            }
            
            Set-Content -Path $cashierEnvPath -Value $envContent -NoNewline
            Write-Host "[OK] Updated cashier/.env" -ForegroundColor Green
        } else {
            Write-Host "[WARN] File cashier/.env tidak ditemukan" -ForegroundColor Yellow
        }
    }
    
    # Server .env - BILLING_ENABLED, PRICE_PER_HOUR
    if ($BillingEnabled -or $PricePerHour) {
        $serverEnvPath = Join-Path $ProjectRoot "server\.env"
        if (Test-Path $serverEnvPath) {
            $envContent = Get-Content $serverEnvPath -Raw
            if ($BillingEnabled) {
                $envContent = $envContent -replace 'BILLING_ENABLED=.*', "BILLING_ENABLED=$BillingEnabled"
            }
            if ($PricePerHour) {
                $envContent = $envContent -replace 'PRICE_PER_HOUR=.*', "PRICE_PER_HOUR=$PricePerHour"
            }
            Set-Content -Path $serverEnvPath -Value $envContent -NoNewline
            Write-Host "[OK] Updated server/.env" -ForegroundColor Green
        }
    }
    
    # Agent .env - BILLING_ENABLED
    if ($BillingEnabled) {
        $agentEnvPath = Join-Path $ProjectRoot "agent\.env"
        if (Test-Path $agentEnvPath) {
            $envContent = Get-Content $agentEnvPath -Raw
            $envContent = $envContent -replace 'BILLING_ENABLED=.*', "BILLING_ENABLED=$BillingEnabled"
            Set-Content -Path $agentEnvPath -Value $envContent -NoNewline
            Write-Host "[OK] Updated agent/.env" -ForegroundColor Green
        }
    }
    
    # Web .env - VITE_BILLING_ENABLED
    if ($BillingEnabled) {
        $webEnvPath = Join-Path $ProjectRoot "web\.env"
        if (Test-Path $webEnvPath) {
            $envContent = Get-Content $webEnvPath -Raw
            $envContent = $envContent -replace 'VITE_BILLING_ENABLED=.*', "VITE_BILLING_ENABLED=$BillingEnabled"
            Set-Content -Path $webEnvPath -Value $envContent -NoNewline
            Write-Host "[OK] Updated web/.env" -ForegroundColor Green
        }
    }
}

function Install-NodeJS {
    Write-Host "[INFO] Installing Node.js v22 (ZIP format)..." -ForegroundColor Yellow

    # Use Node.js v22 - required by Vite 8.x and ESLint 10.x
    $nodeVersion = "22.13.1"
    $nodeUrl = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip"
    $nodeZip = "$env:TEMP\node-v$nodeVersion-win-x64.zip"
    $nodeExtractDir = "C:\nodejs"

    Write-Host "[INFO] Downloading Node.js v$nodeVersion..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing

    Write-Host "[INFO] Extracting Node.js to $nodeExtractDir..." -ForegroundColor Yellow
    
    # Remove old installation if exists
    if (Test-Path $nodeExtractDir) {
        Remove-Item -Path $nodeExtractDir -Recurse -Force
    }
    
    # Create directory
    New-Item -ItemType Directory -Path $nodeExtractDir -Force | Out-Null

    # Extract using Expand-Archive (PowerShell 5.1+)
    Expand-Archive -Path $nodeZip -DestinationPath $nodeExtractDir -Force

    Write-Host "[OK] Node.js v$nodeVersion installed to $nodeExtractDir" -ForegroundColor Green
}

function Install-Dependencies {
    param(
        [string]$Path,
        [string]$Name,
        [switch]$ForceReinstall
    )

    # Skip if path doesn't exist
    if (-not (Test-Path $Path)) {
        Write-Host "[INFO] Skipping $Name - folder not found" -ForegroundColor Yellow
        return
    }

    # Remove node_modules if ForceReinstall or doesn't exist properly
    if ($ForceReinstall -or -not (Test-Path (Join-Path $Path 'node_modules'))) {
        if (Test-Path (Join-Path $Path 'node_modules')) {
            Write-Host "[INFO] Removing $Name node_modules (fresh install)..." -ForegroundColor Yellow
            Remove-NodeModules -Path (Join-Path $Path 'node_modules')
        }
        
        $lockFile = Join-Path $Path 'package-lock.json'
        if (Test-Path $lockFile) {
            Write-Host "[INFO] Removing $Name package-lock.json..." -ForegroundColor Yellow
            Remove-FileIfExists -Path $lockFile
        }
        
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

# ============================================
# Create a minimized-window shortcut for a .bat script
# ============================================
function New-MinimizedShortcut {
    param(
        [string]$ShortcutPath,
        [string]$TargetPath
    )

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = $TargetPath
    $shortcut.WorkingDirectory = Split-Path $TargetPath -Parent
    $shortcut.WindowStyle = 7  # 7 = Minimized
    $shortcut.Save()
}

# ============================================
# Auto-start setup (Windows Task Scheduler)
# ============================================
function Setup-Autostart {
    param([string]$mode)

    Write-Host "[INFO] Setting up auto-start for mode: $mode" -ForegroundColor Yellow

    # Use Startup folder approach (simpler and more reliable)
    $startupFolder = [Environment]::GetFolderPath('Startup')

    # Actual .bat scripts live here; Startup folder only gets minimized shortcuts pointing to them
    $scriptsFolder = Join-Path $PROJECT_ROOT ".autostart-scripts"
    if (-not (Test-Path $scriptsFolder)) {
        New-Item -ItemType Directory -Path $scriptsFolder -Force | Out-Null
    }

    # Find Node.js and npm location (used for all autostart scripts)
    $npmPath = $null
    try {
        $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
        if ($npmCmd) {
            $npmPath = $npmCmd.Source
        }
    } catch {}
    
    if ($mode -eq "room" -or $mode -eq "all") {
        $logFile = Join-Path $PROJECT_ROOT "room_startup.log"
        
        if ($npmPath) {
            $npmDir = Split-Path $npmPath -Parent

            # Server startup script
            $serverStartupScript = Join-Path $scriptsFolder "VideoController_Server.bat"
            @"
@echo off
echo Starting Server at %date% %time% > "$logFile"
set PATH=$npmDir;%PATH%
cmd /k "cd /d "$PROJECT_ROOT\server" && npm run start"
"@ | Out-File -FilePath $serverStartupScript -Encoding ASCII
            New-MinimizedShortcut -ShortcutPath (Join-Path $startupFolder "VideoController_Server.lnk") -TargetPath $serverStartupScript
            Write-Host "[OK] Server auto-start configured: $serverStartupScript" -ForegroundColor Green

            # Agent startup script
            $agentStartupScript = Join-Path $scriptsFolder "VideoController_Agent.bat"
            @"
@echo off
echo Starting Agent at %date% %time% >> "$logFile"
set PATH=$npmDir;%PATH%
set BROWSER_HEADLESS=false
cmd /k "cd /d "$PROJECT_ROOT\agent" && npm run start"
"@ | Out-File -FilePath $agentStartupScript -Encoding ASCII
            New-MinimizedShortcut -ShortcutPath (Join-Path $startupFolder "VideoController_Agent.lnk") -TargetPath $agentStartupScript
            Write-Host "[OK] Agent auto-start configured: $agentStartupScript" -ForegroundColor Green

            # Web startup script
            $webStartupScript = Join-Path $scriptsFolder "VideoController_Web.bat"
            @"
@echo off
echo Starting Web at %date% %time% >> "$logFile"
set PATH=$npmDir;%PATH%
cmd /k "cd /d "$PROJECT_ROOT\web" && npm run preview:host"
"@ | Out-File -FilePath $webStartupScript -Encoding ASCII
            New-MinimizedShortcut -ShortcutPath (Join-Path $startupFolder "VideoController_Web.lnk") -TargetPath $webStartupScript
            Write-Host "[OK] Web auto-start configured: $webStartupScript" -ForegroundColor Green
        } else {
            # Fallback if npm not found
            $serverStartupScript = Join-Path $scriptsFolder "VideoController_Server.bat"
            @"
@echo off
echo WARNING: npm not found in PATH >> "$logFile"
cmd /k "cd /d "$PROJECT_ROOT\server" && npm run start"
"@ | Out-File -FilePath $serverStartupScript -Encoding ASCII
            New-MinimizedShortcut -ShortcutPath (Join-Path $startupFolder "VideoController_Server.lnk") -TargetPath $serverStartupScript
            Write-Host "[OK] Server auto-start configured: $serverStartupScript" -ForegroundColor Green

            $agentStartupScript = Join-Path $scriptsFolder "VideoController_Agent.bat"
            @"
@echo off
set BROWSER_HEADLESS=false
cmd /k "cd /d "$PROJECT_ROOT\agent" && npm run start"
"@ | Out-File -FilePath $agentStartupScript -Encoding ASCII
            New-MinimizedShortcut -ShortcutPath (Join-Path $startupFolder "VideoController_Agent.lnk") -TargetPath $agentStartupScript
            Write-Host "[OK] Agent auto-start configured: $agentStartupScript" -ForegroundColor Green

            $webStartupScript = Join-Path $scriptsFolder "VideoController_Web.bat"
            @"
@echo off
cmd /k "cd /d "$PROJECT_ROOT\web" && npm run preview:host"
"@ | Out-File -FilePath $webStartupScript -Encoding ASCII
            New-MinimizedShortcut -ShortcutPath (Join-Path $startupFolder "VideoController_Web.lnk") -TargetPath $webStartupScript
            Write-Host "[OK] Web auto-start configured: $webStartupScript" -ForegroundColor Green
        }
    }

    if ($mode -eq "kasir" -or $mode -eq "all") {
        # Cashier startup script
        $cashierBatScript = Join-Path $scriptsFolder "VideoController_Cashier.bat"
        $cashierLogFile = Join-Path $PROJECT_ROOT "cashier_startup.log"

        if ($npmPath) {
            # Use full path to npm
            $npmDir = Split-Path $npmPath -Parent
            @"
@echo off
echo Starting Cashier at %date% %time% > "$cashierLogFile"
echo Using npm: $npmPath >> "$cashierLogFile"
set PATH=$npmDir;%PATH%
cmd /k "cd /d "$PROJECT_ROOT\cashier" && npm run preview:host"
"@ | Out-File -FilePath $cashierBatScript -Encoding ASCII
        } else {
            # Fallback to regular npm command
            @"
@echo off
echo Starting Cashier at %date% %time% > "$cashierLogFile"
echo WARNING: npm not found in PATH >> "$cashierLogFile"
cmd /k "cd /d "$PROJECT_ROOT\cashier" && npm run preview:host"
"@ | Out-File -FilePath $cashierBatScript -Encoding ASCII
        }

        New-MinimizedShortcut -ShortcutPath (Join-Path $startupFolder "VideoController_Cashier.lnk") -TargetPath $cashierBatScript
        Write-Host "[OK] Cashier auto-start configured: $cashierBatScript" -ForegroundColor Green
        if ($npmPath) {
            Write-Host "[OK] Using npm: $npmPath" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] npm not found in PATH, using default" -ForegroundColor Yellow
        }
        Write-Host "[OK] Log file: $cashierLogFile" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "[INFO] Auto-start menggunakan Windows Startup folder (shortcut minimized)" -ForegroundColor Yellow
    Write-Host "[INFO] Shortcut (.lnk) terletak di: $startupFolder" -ForegroundColor Yellow
    Write-Host "[INFO] Script asli (.bat) terletak di: $scriptsFolder" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[INFO] Untuk testing manual:" -ForegroundColor Yellow
    Write-Host "  1. Buka folder: $startupFolder" -ForegroundColor Yellow
    if ($mode -eq "room") {
        Write-Host "  2. Klik dua kali shortcut VideoController_Server / Agent / Web (window akan minimize otomatis)" -ForegroundColor Yellow
        Write-Host "  3. Jika cmd langsung close, cek log: $PROJECT_ROOT\room_startup.log" -ForegroundColor Yellow
    } elseif ($mode -eq "kasir") {
        Write-Host "  2. Klik dua kali shortcut VideoController_Cashier (window akan minimize otomatis)" -ForegroundColor Yellow
        Write-Host "  3. Jika cmd langsung close, cek log: $PROJECT_ROOT\cashier_startup.log" -ForegroundColor Yellow
    } else {
        Write-Host "  2. Klik dua kali shortcut VideoController_* (window akan minimize otomatis)" -ForegroundColor Yellow
        Write-Host "  3. Jika cmd langsung close, cek log di $PROJECT_ROOT" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "[OK] Auto-start ($mode) configured successfully!" -ForegroundColor Green
}

# ============================================
# Remove auto-start
# ============================================
function Remove-Autostart {
    param([string]$mode)

    Write-Host "[INFO] Removing auto-start for mode: $mode" -ForegroundColor Yellow

    # Use Startup folder approach
    $startupFolder = [Environment]::GetFolderPath('Startup')

    # Actual .bat scripts live here (see Setup-Autostart); Startup folder only has minimized shortcuts
    $scriptsFolder = Join-Path $PROJECT_ROOT ".autostart-scripts"

    if ($mode -eq "room" -or $mode -eq "all") {
        # Remove Room App shortcuts (.lnk in Startup) + scripts (.bat in scripts folder)
        # Also cleans up legacy .bat files from older installs that wrote directly into Startup
        $baseNames = @("VideoController_Server", "VideoController_Agent", "VideoController_Web")
        foreach ($baseName in $baseNames) {
            $pathsToRemove = @(
                (Join-Path $startupFolder "$baseName.lnk"),
                (Join-Path $startupFolder "$baseName.bat"),
                (Join-Path $scriptsFolder "$baseName.bat")
            )
            foreach ($path in $pathsToRemove) {
                if (Test-Path $path) {
                    Remove-Item -Path $path -Force
                    Write-Host "[OK] Removed $path" -ForegroundColor Green
                }
            }
        }
    }

    if ($mode -eq "kasir" -or $mode -eq "all") {
        # Remove Cashier shortcut (.lnk in Startup) + script (.bat in scripts folder)
        # Also cleans up legacy files from older installs
        $pathsToRemove = @(
            (Join-Path $startupFolder "VideoController_Cashier.lnk"),
            (Join-Path $startupFolder "VideoController_Cashier.bat"),
            (Join-Path $startupFolder "VideoController_Cashier.ps1"),
            (Join-Path $scriptsFolder "VideoController_Cashier.bat")
        )
        foreach ($path in $pathsToRemove) {
            if (Test-Path $path) {
                Remove-Item -Path $path -Force
                Write-Host "[OK] Removed $path" -ForegroundColor Green
            }
        }
        # Also remove log file if exists
        $logFile = Join-Path $PROJECT_ROOT "cashier_startup.log"
        if (Test-Path $logFile) {
            Remove-Item -Path $logFile -Force
            Write-Host "[OK] Removed cashier_startup.log" -ForegroundColor Green
        }
    }

    Write-Host "[OK] Auto-start ($mode) removed successfully!" -ForegroundColor Green
}

# ============================================
# Find Node.js installation
# ============================================
function Find-NodeJS {
    # Try to find node.exe in common installation directories
    # Priority: C:\nodejs (ZIP) > Program Files (MSI)
    $nodePaths = @(
        # ZIP installations (newer)
        "C:\nodejs\node-v22.13.1-win-x64\node.exe",
        "C:\nodejs\node-v20.18.1-win-x64\node.exe",
        # MSI installations
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe",
        "$env:APPDATA\nodejs\node.exe",
        "$env:LOCALAPPDATA\nodejs\node.exe"
    )
    
    $foundNode = $null
    $foundVersion = $null
    
    foreach ($path in $nodePaths) {
        if (Test-Path $path) {
            # Get version to compare
            try {
                $version = & $path --version 2>$null
                if ($version -match 'v(\d+)\.(\d+)') {
                    $major = [int]$matches[1]
                    $minor = [int]$matches[2]
                    
                    # Always prefer v22 if found
                    if ($major -ge 22 -and $foundVersion -notmatch 'v2[2-9]') {
                        $foundNode = $path
                        $foundVersion = $version
                    }
                    # Store first found (v20) if no v22 found yet
                    elseif (-not $foundNode) {
                        $foundNode = $path
                        $foundVersion = $version
                    }
                }
            } catch {
                # If version check fails, still return the path
                if (-not $foundNode) {
                    $foundNode = $path
                }
            }
        }
    }
    return $foundNode
}

Write-Host "[INFO] Starting Video Controller..." -ForegroundColor Cyan

# Find project root - look in script directory, parent directories, AND sibling directories
$PROJECT_ROOT = $PSScriptRoot
$found = $false

# 0. Check current working directory (where user runs the script)
if (Test-Path (Join-Path $PWD 'package.json')) {
    $PROJECT_ROOT = $PWD
    $found = $true
}

# 1. Check script directory (where script file is located)
if (-not $found -and (Test-Path (Join-Path $PSScriptRoot 'package.json'))) {
    $PROJECT_ROOT = $PSScriptRoot
    $found = $true
}

# 2. If not found, walk up parent directories
if (-not $found) {
    $checkPath = $PSScriptRoot
    $maxLevels = 5
    for ($i = 0; $i -lt $maxLevels; $i++) {
        if (Test-Path (Join-Path $checkPath 'package.json')) {
            $PROJECT_ROOT = $checkPath
            $found = $true
            break
        }
        $parent = Split-Path $checkPath -Parent
        if (-not $parent) { break }
        $checkPath = $parent
    }
}

# 3. Check for "video-controller" folder in script directory
if (-not $found) {
    $siblingPath = Join-Path $PSScriptRoot 'video-controller'
    if (Test-Path $siblingPath) {
        if (Test-Path (Join-Path $siblingPath 'package.json')) {
            $PROJECT_ROOT = $siblingPath
            $found = $true
        }
    }
}

# 4. Check for video-controller in parent directory (common case for Downloads)
if (-not $found) {
    $parentDir = Split-Path $PSScriptRoot -Parent
    if ($parentDir) {
        $siblingPath = Join-Path $parentDir 'video-controller'
        if (Test-Path $siblingPath) {
            if (Test-Path (Join-Path $siblingPath 'package.json')) {
                $PROJECT_ROOT = $siblingPath
                $found = $true
            }
        }
    }
}

# Show where we found the project
if ($found) {
    Write-Host "[INFO] Project root: $PROJECT_ROOT" -ForegroundColor Cyan
} else {
    Write-Host "[WARNING] Cannot find project root (package.json)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[INFO] Searched locations:" -ForegroundColor Yellow
    Write-Host "  - $PWD (current directory)"
    Write-Host "  - $PSScriptRoot (script location)"
    
    $checkPath = $PSScriptRoot
    for ($i = 0; $i -lt 3; $i++) {
        $parent = Split-Path $checkPath -Parent
        if (-not $parent) { break }
        Write-Host "  - $parent (parent $i)"
        $checkPath = $parent
    }
    
    Write-Host "  - $PSScriptRoot\video-controller (sibling)"
    $parentDir = Split-Path $PSScriptRoot -Parent
    if ($parentDir) {
        Write-Host "  - $parentDir\video-controller (sibling in parent)"
    }
    
    Write-Host ""
    Write-Host "[Q] Download dari GitHub? [y/N]: " -ForegroundColor Cyan -NoNewline
    $download = Read-Host
    if ($download -eq 'y' -or $download -eq 'Y') {
        Write-Host "[INFO] Downloading video-controller from GitHub..." -ForegroundColor Yellow
        
        $zipUrl = "https://github.com/muhammadfahrul/video-controller/archive/refs/heads/main.zip"
        $zipFile = "$env:TEMP\video-controller.zip"
        $extractDir = Split-Path $PSScriptRoot -Parent
        if (-not $extractDir) { $extractDir = $PSScriptRoot }
        
        Write-Host "[INFO] Downloading from $zipUrl..." -ForegroundColor Yellow
        try {
            Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing
            Write-Host "[INFO] Extracting..." -ForegroundColor Yellow
            
            # Use current working directory where user runs the script
            $extractDir = $PWD
            
            Expand-Archive -Path $zipFile -DestinationPath $extractDir -Force
            
            # Move contents from video-controller-main to video-controller
            $extractedPath = Join-Path $extractDir "video-controller-main"
            $targetPath = Join-Path $extractDir "video-controller"
            
            # Only create/move if target doesn't have package.json
            if (-not (Test-Path (Join-Path $targetPath 'package.json'))) {
                if (Test-Path $targetPath) {
                    Remove-Item -Path $targetPath -Recurse -Force
                }
                Move-Item -Path $extractedPath -Destination $targetPath
            }
            
            $PROJECT_ROOT = $targetPath
            $found = $true
            Write-Host "[OK] Using project at: $PROJECT_ROOT" -ForegroundColor Green
            
            # Clean up zip
            Remove-Item -Path $zipFile -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "[ERROR] Failed to download: $_" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host ""
        Write-Host "[INFO] Solusi: Pindahkan install.ps1 ke dalam folder video-controller" -ForegroundColor Yellow
        exit 1
    }
}

$INSTALL_MODE = Get-InstallMode -RequestedMode $Mode

# ============================================
# Prompt for .env configuration
# ============================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Konfigurasi .env (optional)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Tekan Enter untuk skip/tidak ubah field"
Write-Host ""

# Initialize variables
$ServerIP = ""
$RoomID = ""
$RoomName = ""
$Rooms = ""
$BillingEnabled = ""
$PricePerHour = ""

# Room App mode - needs Server IP, Room ID, Room Name
if ($INSTALL_MODE -eq "room" -or $INSTALL_MODE -eq "all") {
    Write-Host "Topologi: 1 Ruangan = 1 PC. Server & agent jalan di PC yg sama." -ForegroundColor Cyan
    Write-Host "SERVER_IP boleh dikosongkan (auto-detect IP lokal PC)." -ForegroundColor Cyan
    $input = Read-Host "Server IP (contoh: 192.168.1.100, kosongkan untuk skip/auto)"
    if ($input -ne "") { $ServerIP = $input }

    $input = Read-Host "Room ID (contoh: room-001, kosongkan untuk skip)"
    if ($input -ne "") { $RoomID = $input }

    $input = Read-Host "Room Name (contoh: Room 1, kosongkan untuk skip)"
    if ($input -ne "") { $RoomName = $input }

    $input = Read-Host "Billing Enabled (contoh: true/false, kosongkan untuk skip)"
    if ($input -ne "") { $BillingEnabled = $input }

    $input = Read-Host "Price Per Hour / tarif ruangan ini (contoh: 50000, kosongkan untuk skip)"
    if ($input -ne "") { $PricePerHour = $input }
}

# Kasir mode - only needs Rooms JSON
if ($INSTALL_MODE -eq "kasir") {
    Write-Host "Topologi: PC Kasir konek ke N server ruangan yg terpisah." -ForegroundColor Cyan
    Write-Host "Setiap 'ip' di rooms = IP PC Ruangan (bukan IP server pusat)." -ForegroundColor Cyan
    Write-Host "Tarif per jam (pricePerHour) TIDAK diisi di sini - dikonfigurasi lewat" -ForegroundColor Cyan
    Write-Host "PRICE_PER_HOUR di server/.env tiap PC ruangan, lalu dikirim ke kasir otomatis." -ForegroundColor Cyan
    Write-Host "Rooms JSON contoh: [{`"roomId`":`"room-001`",`"name`":`"Room 1`",`"ip`":`"192.168.1.101`",`"port`":53331}]" -ForegroundColor Cyan
    $input = Read-Host "Rooms JSON (kosongkan untuk skip)"
    if ($input -ne "") { $Rooms = $input }

    $input = Read-Host "Billing Enabled (contoh: true/false, kosongkan untuk skip)"
    if ($input -ne "") { $BillingEnabled = $input }
}

# All mode - also needs Rooms JSON
if ($INSTALL_MODE -eq "all") {
    Write-Host "Untuk mode all, jika PC ini handle KASIR sekaligus:" -ForegroundColor Cyan
    Write-Host "Tarif per jam (pricePerHour) TIDAK diisi di rooms JSON - dikonfigurasi lewat" -ForegroundColor Cyan
    Write-Host "Price Per Hour di atas (server/.env PC ruangan tsb), lalu dikirim ke kasir otomatis." -ForegroundColor Cyan
    Write-Host "Rooms JSON contoh: [{`"roomId`":`"room-001`",`"name`":`"Room 1`",`"ip`":`"192.168.1.101`",`"port`":53331}]" -ForegroundColor Cyan
    $input = Read-Host "Rooms JSON (kosongkan untuk skip)"
    if ($input -ne "") { $Rooms = $input }

    $input = Read-Host "Billing Enabled (contoh: true/false, kosongkan untuk skip)"
    if ($input -ne "") { $BillingEnabled = $input }
}

# Show selected mode
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
    'autostart-room' {
        Write-Host "[INFO] Mode: Auto-start Room App" -ForegroundColor Green
    }
    'autostart-kasir' {
        Write-Host "[INFO] Mode: Auto-start Kasir" -ForegroundColor Green
    }
    'autostart-all' {
        Write-Host "[INFO] Mode: Auto-start Semua" -ForegroundColor Green
    }
    'remove-autostart-room' {
        Write-Host "[INFO] Mode: Remove Auto-start Room App" -ForegroundColor Red
    }
    'remove-autostart-kasir' {
        Write-Host "[INFO] Mode: Remove Auto-start Kasir" -ForegroundColor Red
    }
    'remove-autostart-all' {
        Write-Host "[INFO] Mode: Remove Auto-start Semua" -ForegroundColor Red
    }
}

Write-Host ""

# Handle auto-start modes - skip service start
if ($INSTALL_MODE -match "autostart-" -or $INSTALL_MODE -match "remove-autostart-") {
    Write-Host "[INFO] Auto-start mode detected, checking Node.js..." -ForegroundColor Yellow

    # Check Node.js
    $nodeExePath = Find-NodeJS
    if (-not $nodeExePath) {
        Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
        exit 1
    }

    $nodeVersion = & $nodeExePath --version 2>$null
    $nodeMajorVersion = if ($nodeVersion -match 'v(\d+)') { [int]$matches[1] } else { 0 }

    if (-not $nodeVersion -or $nodeMajorVersion -lt 22) {
        Write-Host "[ERROR] Node.js $nodeVersion requires v22+ for this project (Vite 8.x)!" -ForegroundColor Red
        exit 1
    }

    $nodeDir = Split-Path $nodeExePath -Parent
    $env:Path = $nodeDir + ";" + $env:Path

    $npmVersion = & npm --version 2>$null
    Write-Host "[OK] Node.js $nodeVersion and npm $npmVersion detected" -ForegroundColor Green

    # Check if project files exist
    if (-not (Test-Path (Join-Path $PROJECT_ROOT 'package.json'))) {
        Write-Host "[ERROR] Project files not found in $PROJECT_ROOT" -ForegroundColor Red
        exit 1
    }

    # Install dependencies if needed
    Write-Host "[INFO] Checking dependencies..." -ForegroundColor Yellow

    if ($INSTALL_MODE -eq "autostart-room" -or $INSTALL_MODE -eq "autostart-all") {
        Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'agent') -Name 'agent'
        Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'server') -Name 'server'
        Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'web') -Name 'web' -ForceReinstall
        Ensure-PlaywrightBrowsers
    }

    if ($INSTALL_MODE -eq "autostart-kasir" -or $INSTALL_MODE -eq "autostart-all") {
        Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'cashier') -Name 'cashier'
    }

    # Build if needed
    if ($INSTALL_MODE -eq "autostart-room" -or $INSTALL_MODE -eq "autostart-all") {
        Write-Host "[INFO] Building Room App..." -ForegroundColor Yellow
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

    if ($INSTALL_MODE -eq "autostart-kasir" -or $INSTALL_MODE -eq "autostart-all") {
        Write-Host "[INFO] Building Kasir..." -ForegroundColor Yellow
        Push-Location (Join-Path $PROJECT_ROOT 'cashier')
        & npm run build
        Pop-Location
    }

    # Setup or remove auto-start
    if ($INSTALL_MODE -eq "autostart-room") {
        Setup-Autostart "room"
        exit 0
    }

    if ($INSTALL_MODE -eq "autostart-kasir") {
        Setup-Autostart "kasir"
        exit 0
    }

    if ($INSTALL_MODE -eq "autostart-all") {
        Setup-Autostart "all"
        exit 0
    }

    if ($INSTALL_MODE -eq "remove-autostart-room") {
        Remove-Autostart "room"
        exit 0
    }

    if ($INSTALL_MODE -eq "remove-autostart-kasir") {
        Remove-Autostart "kasir"
        exit 0
    }

    if ($INSTALL_MODE -eq "remove-autostart-all") {
        Remove-Autostart "all"
        exit 0
    }
}

# Normal mode - continue with service start

# Apply .env configuration for existing project
Set-EnvConfig -ProjectRoot $PROJECT_ROOT -ServerIP $ServerIP -RoomID $RoomID -RoomName $RoomName -Rooms $Rooms -BillingEnabled $BillingEnabled -PricePerHour $PricePerHour

$nodeExePath = Find-NodeJS

if (-not $nodeExePath) {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Install-NodeJS
    $nodeExePath = Find-NodeJS
}

if (-not $nodeExePath) {
    Write-Host "[ERROR] Node.js is still not available after installation." -ForegroundColor Red
    Write-Host "[INFO] Silakan tutup PowerShell ini dan buka PowerShell baru, lalu jalankan ulang script." -ForegroundColor Yellow
    exit 1
}

# Get Node.js version using the found path
$nodeVersion = & $nodeExePath --version 2>$null
$nodeMajorVersion = if ($nodeVersion -match 'v(\d+)') { [int]$matches[1] } else { 0 }

# Check if Node.js is too old or below v22 (required by Vite 8.x)
if (-not $nodeVersion -or $nodeMajorVersion -lt 22) {
    Write-Host "[ERROR] Node.js $nodeVersion requires v22+ for this project (Vite 8.x)" -ForegroundColor Red
    Write-Host "[INFO] Installing Node.js v22..." -ForegroundColor Yellow
    Install-NodeJS
    $nodeExePath = Find-NodeJS
    
    if (-not $nodeExePath) {
        Write-Host "[ERROR] Node.js is still not available after installation." -ForegroundColor Red
        Write-Host "[INFO] Silakan tutup PowerShell ini dan buka PowerShell baru, lalu jalankan ulang script." -ForegroundColor Yellow
        exit 1
    }
    $nodeVersion = & $nodeExePath --version 2>$null
    $nodeMajorVersion = if ($nodeVersion -match 'v(\d+)') { [int]$matches[1] } else { 0 }
}

# Add node directory to PATH for this session
$nodeDir = Split-Path $nodeExePath -Parent
$env:Path = $nodeDir + ";" + $env:Path

# Find npm
$npmExePath = $null
$npmPaths = @(
    (Join-Path $nodeDir "npm.cmd"),
    (Join-Path $nodeDir "npm"),
    "C:\nodejs\node-v22.13.1-win-x64\npm.cmd",
    "C:\nodejs\node-v20.18.1-win-x64\npm.cmd",
    "C:\Program Files\nodejs\npm.cmd",
    "C:\Program Files (x86)\nodejs\npm.cmd"
)
foreach ($path in $npmPaths) {
    if (Test-Path $path) {
        $npmExePath = $path
        break
    }
}

if (-not $npmExePath) {
    Write-Host "[ERROR] npm is not available." -ForegroundColor Red
    exit 1
}
if (-not $npmExePath) {
    Write-Host "[ERROR] npm is not available." -ForegroundColor Red
    exit 1
}

$npmVersion = & $npmExePath --version 2>$null
Write-Host "[OK] Node.js $nodeVersion and npm $npmVersion detected" -ForegroundColor Green

if (-not (Test-Path (Join-Path $PROJECT_ROOT 'package.json'))) {
    Write-Host "[INFO] Project files not found. Downloading ZIP archive..." -ForegroundColor Yellow

    # Create video-controller subfolder in current directory
    $destDir = Join-Path $PROJECT_ROOT 'video-controller'
    $archiveUrl = 'https://github.com/muhammadfahrul/video-controller/archive/refs/heads/main.zip'
    $archivePath = Join-Path $env:TEMP 'video-controller-main.zip'
    $extractDir = Join-Path $destDir 'video-controller-main'

    if (-not (Get-Command Expand-Archive -ErrorAction SilentlyContinue)) {
        Write-Host "[ERROR] PowerShell archive support is unavailable." -ForegroundColor Red
        Install-7Zip
    }

    # Only download if destination folder doesn't exist
    if (-not (Test-Path (Join-Path $destDir 'package.json'))) {
        # Remove existing destination folder if exists (but no package.json)
        if (Test-Path $destDir) {
            Remove-Item -Path $destDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null

        Write-Host "[INFO] Downloading repository archive..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $archiveUrl -OutFile $archivePath -UseBasicParsing

        Write-Host "[INFO] Extracting archive..." -ForegroundColor Yellow
        Expand-Archive -Path $archivePath -DestinationPath $destDir -Force

        # Move contents from video-controller-main to destDir
        if (Test-Path $extractDir) {
            $items = Get-ChildItem -Path $extractDir
            foreach ($item in $items) {
                $itemDestPath = Join-Path $destDir $item.Name
                if (Test-Path $itemDestPath) {
                    if ($item.PSIsContainer) {
                        Remove-Item -Path $itemDestPath -Recurse -Force
                    } else {
                        Remove-Item -Path $itemDestPath -Force
                    }
                }
                Move-Item -Path $item.FullName -Destination $itemDestPath -Force
            }
            Remove-Item -Path $extractDir -Recurse -Force
        }

        Remove-Item -Path $archivePath -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "[OK] Using existing project at $destDir" -ForegroundColor Green
    }

    $PROJECT_ROOT = $destDir

    # Apply .env configuration AFTER PROJECT_ROOT is set correctly
    Set-EnvConfig -ProjectRoot $PROJECT_ROOT -ServerIP $ServerIP -RoomID $RoomID -RoomName $RoomName -Rooms $Rooms -BillingEnabled $BillingEnabled -PricePerHour $PricePerHour
}

Write-Host "[INFO] Checking dependencies..." -ForegroundColor Yellow

# Only remove node_modules if folders exist
if (Test-Path (Join-Path $PROJECT_ROOT 'web')) {
    Remove-NodeModules -Path (Join-Path $PROJECT_ROOT 'web/node_modules')
    Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'web/package-lock.json')
}
if (Test-Path (Join-Path $PROJECT_ROOT 'cashier')) {
    Remove-NodeModules -Path (Join-Path $PROJECT_ROOT 'cashier/node_modules')
    Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'cashier/package-lock.json')
}

if (-not (Test-Path (Join-Path $PROJECT_ROOT 'node_modules'))) {
    Write-Host "[INFO] Removing old workspace node_modules..." -ForegroundColor Yellow
    if (Test-Path (Join-Path $PROJECT_ROOT 'node_modules')) { Remove-NodeModules -Path (Join-Path $PROJECT_ROOT 'node_modules') }
    if (Test-Path (Join-Path $PROJECT_ROOT 'agent')) { Remove-NodeModules -Path (Join-Path $PROJECT_ROOT 'agent/node_modules') }
    if (Test-Path (Join-Path $PROJECT_ROOT 'server')) { Remove-NodeModules -Path (Join-Path $PROJECT_ROOT 'server/node_modules') }
    if (Test-Path (Join-Path $PROJECT_ROOT 'package-lock.json')) { Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'package-lock.json') }
    if (Test-Path (Join-Path $PROJECT_ROOT 'agent')) { Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'agent/package-lock.json') }
    if (Test-Path (Join-Path $PROJECT_ROOT 'server')) { Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'server/package-lock.json') }
    if (Test-Path (Join-Path $PROJECT_ROOT 'web')) { Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'web/package-lock.json') }
    if (Test-Path (Join-Path $PROJECT_ROOT 'cashier')) { Remove-FileIfExists -Path (Join-Path $PROJECT_ROOT 'cashier/package-lock.json') }
}

Write-Host "[INFO] Checking dependencies..." -ForegroundColor Yellow
Install-Dependencies -Path $PROJECT_ROOT -Name 'root'

if ($INSTALL_MODE -eq 'all' -or $INSTALL_MODE -eq 'room') {
    Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'agent') -Name 'agent'
    Ensure-PlaywrightBrowsers
    Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'server') -Name 'server'
    Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'web') -Name 'web' -ForceReinstall
}

if ($INSTALL_MODE -eq 'all' -or $INSTALL_MODE -eq 'kasir') {
    Install-Dependencies -Path (Join-Path $PROJECT_ROOT 'cashier') -Name 'cashier' -ForceReinstall
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

# Function to wait for server to be ready
function Wait-ForServer {
    param(
        [string]$ServerIP = "127.0.0.1",
        [int]$Port = 53331,
        [int]$MaxWaitSeconds = 30
    )
    
    Write-Host "   Waiting for server to be ready..." -ForegroundColor Yellow
    $startTime = Get-Date
    $serverUrl = "http://${ServerIP}:${Port}"
    
    while (((Get-Date) - $startTime).TotalSeconds -lt $MaxWaitSeconds) {
        try {
            $response = Invoke-WebRequest -Uri "$serverUrl/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "   [OK] Server is ready!" -ForegroundColor Green
                return $true
            }
        } catch {
            # Server not ready yet
        }
        Start-Sleep -Seconds 1
    }
    
    Write-Host "   [WARNING] Server may not be ready, but continuing..." -ForegroundColor Yellow
    return $false
}

if ($INSTALL_MODE -eq 'all' -or $INSTALL_MODE -eq 'room') {
    Write-Host "[INFO] Starting Room App services..." -ForegroundColor Yellow

    # Start Server first
    $serverProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm run start') -WorkingDirectory (Join-Path $PROJECT_ROOT 'server') -WindowStyle Minimized -PassThru
    $processes += $serverProcess
    Write-Host "   - Server: PID $($serverProcess.Id)" -ForegroundColor Cyan
    
    # Wait for server to be ready before starting agent
    Wait-ForServer -ServerIP $ServerIP -Port 53331 -MaxWaitSeconds 30
    
    # Check if server is still running after wait
    if ($serverProcess.HasExited) {
        Write-Host "   [ERROR] Server exited with code: $($serverProcess.ExitCode)" -ForegroundColor Red
    } else {
        Write-Host "   [OK] Server is running" -ForegroundColor Green
    }

    # Start Agent (only if server is still running)
    if (-not $serverProcess.HasExited) {
        $agentProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'set BROWSER_HEADLESS=false&& npm run start') -WorkingDirectory (Join-Path $PROJECT_ROOT 'agent') -WindowStyle Minimized -PassThru
        $processes += $agentProcess
        Write-Host "   - Agent: PID $($agentProcess.Id)" -ForegroundColor Cyan
        Start-Sleep -Seconds 2
        
        # Check if agent is still running
        if ($agentProcess.HasExited) {
            Write-Host "   [ERROR] Agent exited with code: $($agentProcess.ExitCode)" -ForegroundColor Red
        } else {
            Write-Host "   [OK] Agent is running" -ForegroundColor Green
        }
    }

    # Start Web
    $webProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm run preview:host') -WorkingDirectory (Join-Path $PROJECT_ROOT 'web') -WindowStyle Minimized -PassThru
    $processes += $webProcess
    Write-Host "   - Web: PID $($webProcess.Id)" -ForegroundColor Cyan
}

if ($INSTALL_MODE -eq 'all' -or $INSTALL_MODE -eq 'kasir') {
    Write-Host "[INFO] Starting Kasir service..." -ForegroundColor Yellow

    $cashierProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm run preview:host') -WorkingDirectory (Join-Path $PROJECT_ROOT 'cashier') -WindowStyle Minimized -PassThru
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
