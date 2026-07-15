# Video Controller - Deploy Script for Windows
# Auto-installs EVERYTHING - just run .\deploy.ps1

param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Video Controller (Production)..." -ForegroundColor Cyan

$PROJECT_ROOT = $PSScriptRoot

# ============================================
# Auto-install Git if needed
# ============================================
function Install-Git {
    Write-Host "🔧 Installing Git..." -ForegroundColor Yellow
    
    # Download Git for Windows
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.46.0.windows.1/Git-2.46.0-64-bit.exe"
    $gitInstaller = "$env:TEMP\git-installer.exe"
    
    Write-Host "⬇️ Downloading Git..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $gitUrl -OutFile $gitInstaller -UseBasicParsing
    
    Write-Host "📥 Installing Git (this may take a moment)..." -ForegroundColor Yellow
    Start-Process -FilePath $gitInstaller -ArgumentList "/S" -Wait
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "✅ Git installed" -ForegroundColor Green
}

# Check for Git
$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath) {
    Write-Host "❌ Git is not installed!" -ForegroundColor Red
    Install-Git
}

Write-Host "✅ Git $(git --version) detected" -ForegroundColor Green

# ============================================
# Auto-install Node.js if needed
# ============================================
function Install-NodeJS {
    Write-Host "🔧 Installing Node.js..." -ForegroundColor Yellow
    
    $nodeUrl = "https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi"
    $nodeInstaller = "$env:TEMP\node-installer.msi"
    
    Write-Host "⬇️ Downloading Node.js..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
    
    Write-Host "📥 Installing Node.js..." -ForegroundColor Yellow
    Start-Process -FilePath msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "✅ Node.js installed" -ForegroundColor Green
}

# Check Node.js version
$nodeVersion = & node --version 2>$null
$nodeMajorVersion = if ($nodeVersion -match 'v(\d+)') { [int]$matches[1] } else { 0 }

if (-not $nodeVersion -or $nodeMajorVersion -lt 16) {
    Write-Host "❌ Node.js $nodeVersion is too old or not installed!" -ForegroundColor Red
    Install-NodeJS
}

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "✅ Node.js $(node --version) and npm $(npm --version) detected" -ForegroundColor Green

# ============================================
# Check project files
# ============================================
if (-not (Test-Path "$PROJECT_ROOT\package.json")) {
    Write-Host "📥 Project files not found. Downloading..." -ForegroundColor Yellow
    
    $zipUrl = "https://github.com/muhammadfahrul/video-controller/archive/refs/heads/main.zip"
    $zipFile = "$env:TEMP\video-controller.zip"
    $extractPath = "$env:TEMP\video-controller-main"
    
    Write-Host "⬇️ Downloading project..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing
    
    Write-Host "📦 Extracting..." -ForegroundColor Yellow
    Expand-Archive -Path $zipFile -DestinationPath $env:TEMP -Force
    
    # Move to project root
    $targetPath = Split-Path $PROJECT_ROOT -Parent
    $repoName = Split-Path $PROJECT_ROOT -Leaf
    
    if (Test-Path "$targetPath\$repoName") {
        Remove-Item "$targetPath\$repoName" -Recurse -Force
    }
    
    Move-Item -Path $extractPath -Destination "$targetPath\$repoName"
    $PROJECT_ROOT = "$targetPath\$repoName"
    
    Remove-Item $zipFile -Force
    
    Write-Host "✅ Project extracted to $PROJECT_ROOT" -ForegroundColor Green
}

# ============================================
# Clean node_modules if needed
# ============================================
Write-Host "🧹 Checking dependencies..." -ForegroundColor Yellow

if (Test-Path "$PROJECT_ROOT\web\node_modules") {
    Write-Host "🧹 Cleaning web node_modules..." -ForegroundColor Yellow
    Remove-Item -Path "$PROJECT_ROOT\web\node_modules" -Recurse -Force
    Remove-Item -Path "$PROJECT_ROOT\web\package-lock.json" -Force -ErrorAction SilentlyContinue
}

# ============================================
# Install dependencies
# ============================================
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

function Install-Deps {
    param([string]$Path, [string]$Name)
    
    if (-not (Test-Path "$Path\node_modules")) {
        Write-Host "📦 Installing $Name dependencies..." -ForegroundColor Yellow
        Push-Location $Path
        npm install
        Pop-Location
    }
}

Install-Deps -Path $PROJECT_ROOT -Name "root"
Install-Deps -Path "$PROJECT_ROOT\agent" -Name "agent"
Install-Deps -Path "$PROJECT_ROOT\server" -Name "server"
Install-Deps -Path "$PROJECT_ROOT\web" -Name "web"

# ============================================
# Build all services
# ============================================
Write-Host "🔨 Building all services..." -ForegroundColor Yellow

Push-Location $PROJECT_ROOT
npm run build
Pop-Location

# ============================================
# Start all services
# ============================================
Write-Host "▶️ Starting all services..." -ForegroundColor Yellow

# Start server
Start-Process -FilePath "npm" -ArgumentList "run","start" -WorkingDirectory "$PROJECT_ROOT\server" -NoNewWindow
$serverPid = $LASTEXITCODE

# Start agent
Start-Process -FilePath "npm" -ArgumentList "run","start" -WorkingDirectory "$PROJECT_ROOT\agent" -NoNewWindow
$agentPid = $LASTEXITCODE

# Start web (preview)
Start-Process -FilePath "npm" -ArgumentList "run","preview:host" -WorkingDirectory "$PROJECT_ROOT\web" -NoNewWindow
$webPid = $LASTEXITCODE

Write-Host ""
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host "   - Server: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   - Agent: http://localhost:3001" -ForegroundColor Cyan
Write-Host "   - Web: http://localhost:4173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

# Wait for interrupt
try {
    while ($true) { Start-Sleep -Seconds 1 }
}
finally {
    Write-Host ""
    Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow
    
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "✅ All services stopped" -ForegroundColor Green
}
