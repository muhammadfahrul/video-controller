# Video Controller - Build Release (Windows golden build)
# Port dari build-release.sh - jalan SEKALI di build machine, hasilnya zip yang didistribusikan
# ke tiap PC room (lihat install.ps1 buat instalasi per-PC dari source, atau ekstrak zip ini
# manual kalo mau golden-build flow yang sama kayak Linux).
#
# Usage:
#   .\build-release.ps1                    # full build
#   .\build-release.ps1 -SkipBuild         # skip 'npm run build', cuma npm ci + repackage
#   .\build-release.ps1 -SkipPlaywright    # jangan bundle cache Playwright

param(
    [switch]$SkipBuild,
    [switch]$SkipPlaywright
)

$ErrorActionPreference = "Stop"

function Log($msg)  { Write-Host "[BUILD] $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function WarnMsg($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function ErrMsg($msg)  { Write-Host "[ERROR] $msg" -ForegroundColor Red }

function Invoke-Checked {
    param([string]$Command, [string[]]$CommandArgs, [string]$Context)
    & $Command @CommandArgs
    if ($LASTEXITCODE -ne 0) {
        throw "$Context gagal (exit code $LASTEXITCODE)"
    }
}

$ROOT = $PSScriptRoot
$STAGING = Join-Path $ROOT "release-package\staging"

# ============================================
# Version string - short git hash + timestamp, fallback ke 'manual'
# ============================================
$gitHash = "manual"
try {
    $gitHash = (& git -C $ROOT rev-parse --short HEAD 2>$null)
    if (-not $gitHash) { $gitHash = "manual" }
} catch {
    $gitHash = "manual"
}
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$VERSION = "$gitHash-$timestamp"
Log "Version: $VERSION"

# ============================================
# Fresh staging dir
# ============================================
if (Test-Path $STAGING) {
    Remove-Item -Path $STAGING -Recurse -Force
}
New-Item -ItemType Directory -Path $STAGING -Force | Out-Null

$SERVICES = @("agent", "server", "web", "cashier")

# ============================================
# npm ci + npm run build per service
# ============================================
foreach ($svc in $SERVICES) {
    $svcPath = Join-Path $ROOT $svc
    if (-not (Test-Path $svcPath)) {
        WarnMsg "$svc gak ada, skip"
        continue
    }

    Log "[$svc] npm ci..."
    Push-Location $svcPath
    try {
        Invoke-Checked -Command "npm" -CommandArgs @("ci") -Context "[$svc] npm ci"

        if (-not $SkipBuild) {
            Log "[$svc] npm run build..."
            Invoke-Checked -Command "npm" -CommandArgs @("run", "build") -Context "[$svc] npm run build"
        }
    } finally {
        Pop-Location
    }
    Ok "[$svc] beres"
}

# ============================================
# Prune agent & server ke production-only (jalan via `node dist/index.js`)
# web & cashier tetep full node_modules - butuh `vite` buat `npm run preview:host`
# ============================================
foreach ($svc in @("agent", "server")) {
    $svcPath = Join-Path $ROOT $svc
    if (-not (Test-Path $svcPath)) { continue }

    Log "[$svc] prune ke production-only..."
    Push-Location $svcPath
    try {
        Invoke-Checked -Command "npm" -CommandArgs @("ci", "--omit=dev") -Context "[$svc] npm ci --omit=dev"
    } finally {
        Pop-Location
    }
}

# ============================================
# Bundle Playwright chromium cache kalo ada, biar PC target gak perlu download lagi
# ============================================
if (-not $SkipPlaywright) {
    $pwCache = Join-Path $env:LOCALAPPDATA "ms-playwright"
    if (Test-Path $pwCache) {
        $vendorDir = Join-Path $STAGING "vendor"
        New-Item -ItemType Directory -Path $vendorDir -Force | Out-Null
        Copy-Item -Path $pwCache -Destination (Join-Path $vendorDir "ms-playwright") -Recurse -Force
        Ok "Playwright cache bundled"
    } else {
        WarnMsg "Playwright cache gak ada di $pwCache - jalanin: cd agent; npx playwright install chromium, lalu build ulang"
    }
}

# ============================================
# Copy dist/node_modules/package(-lock).json + .env.example ke staging
# ============================================
foreach ($svc in $SERVICES) {
    $svcPath = Join-Path $ROOT $svc
    if (-not (Test-Path $svcPath)) { continue }

    $dest = Join-Path $STAGING $svc
    New-Item -ItemType Directory -Path $dest -Force | Out-Null

    foreach ($item in @("dist", "node_modules", "package.json", "package-lock.json")) {
        $src = Join-Path $svcPath $item
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination $dest -Recurse -Force
        }
    }

    # .env.example doang, JANGAN .env asli - jangan sampe secret/config per-room ke-bundle
    $envExample = Join-Path $svcPath ".env.example"
    if (Test-Path $envExample) {
        Copy-Item -Path $envExample -Destination $dest -Force
    } else {
        WarnMsg "[$svc] .env.example gak ada"
    }
}

Set-Content -Path (Join-Path $STAGING "RELEASE_VERSION.txt") -Value $VERSION -NoNewline

# ============================================
# Generate 1 shared secret buat socket auth (VC-5) - dipake bareng semua service &
# semua room dari release build ini, jadi gak perlu manual sync token per PC.
# Format sama kayak build-release.sh (openssl rand -hex 32): 64 karakter hex lowercase.
# ============================================
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$secretBytes = New-Object byte[] 32
$rng.GetBytes($secretBytes)
$SHARED_SECRET = ($secretBytes | ForEach-Object { $_.ToString("x2") }) -join ""
$rng.Dispose()

Set-Content -Path (Join-Path $STAGING "RELEASE_SECRET.txt") -Value $SHARED_SECRET -NoNewline

foreach ($svc in $SERVICES) {
    $envFile = Join-Path $STAGING "$svc\.env.example"
    if (-not (Test-Path $envFile)) { continue }

    (Get-Content $envFile) |
        ForEach-Object {
            $_ -replace '^VC_SHARED_SECRET=.*', "VC_SHARED_SECRET=$SHARED_SECRET" `
               -replace '^VITE_SHARED_SECRET=.*', "VITE_SHARED_SECRET=$SHARED_SECRET"
        } |
        Set-Content $envFile
}
Ok "Shared secret digenerate & di-inject ke .env.example semua service (juga tersimpan di RELEASE_SECRET.txt)"

# ============================================
# Zip
# ============================================
$releaseDir = Join-Path $ROOT "release-package"
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
$zipPath = Join-Path $releaseDir "video-controller-release-$VERSION.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Log "Zipping..."
Compress-Archive -Path (Join-Path $STAGING "*") -DestinationPath $zipPath -CompressionLevel Optimal

Ok "Release siap: $zipPath"
Write-Host ""
Write-Host "Isi zip: agent/server/web/cashier (dist + node_modules + .env.example dengan VC_SHARED_SECRET/VITE_SHARED_SECRET" -ForegroundColor White
Write-Host "udah keisi otomatis) + RELEASE_VERSION.txt + RELEASE_SECRET.txt." -ForegroundColor White
Write-Host "Next: extract zip ini ke tiap PC room, copy .env.example jadi .env di tiap service folder" -ForegroundColor White
Write-Host "(atau pake install.ps1 kalo udah disesuaikan buat mode extract-zip)." -ForegroundColor White
