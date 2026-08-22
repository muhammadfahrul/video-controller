# Short-term / single-PC workaround.
#
# Berdiri sendiri - TIDAK bagian dari agent/video-controller, tidak lewat
# build atau CI/CD apa pun. Cukup copy file ini ke PC yang mau dites, lalu
# jalankan. Aman dicabut kapan saja (tinggal tutup jendela PowerShell-nya /
# hapus shortcut Startup-nya kalau dipasang permanen).
#
# Tiap $IntervalSeconds, tanpa mouse/keyboard sama sekali, watcher ini
# CUMA aktif kalau Chrome kiosk kita sendiri kedeteksi lagi kebuka (lihat
# $OurChromeProfileMarker) - itu tandanya billing kita lagi ON. Kalau
# belum kebuka (billing OFF, user lagi mau pakai app lama), watcher diem
# total, gak nyentuh app lama sama sekali - supaya app lama tetap bisa
# dipakai normal tanpa "ketarik turun" berkali-kali.
#
# Begitu Chrome kiosk kita kedeteksi ada, baru dia:
#   1. Minimize window app karaoke lama ($ProcessName.exe) - proses TETAP
#      HIDUP (bukan taskkill), cuma window-nya diturunkan ke taskbar.
#   2. Hide (bukan cuma minimize) window console cmd yang njalanin agent
#      kita sendiri (dikenali dari CommandLine yang mengandung
#      $OurProjectMarker), biar console node itu gak ikut berebut layar.
#   3. Paksa window Chrome kiosk kita ke foreground pakai trik
#      AttachThreadInput+SetForegroundWindow (cara resmi buat nembus
#      proteksi foreground-lock Windows) - jadi bukan cuma "kebetulan
#      kebagian fokus" karena app lama di-minimize, tapi benar-benar
#      dipaksa ke depan tiap tick.
#
# Berjalan terus (loop) sampai di-Ctrl+C / jendelanya ditutup - sengaja
# TERUS-MENERUS, bukan one-shot di awal, jadi otomatis netral terhadap
# kapan pun user pencet "play" di app kita: menutupi race boot-order,
# app lama yang muncul lagi sendiri (mis. screensaver-nya), maupun kondisi
# sebelum/pas/sesudah video diputar - tanpa perlu tahu persis event mana
# yang lagi terjadi.
#
# Cara pakai cepat (jalan sekarang, tidak persist setelah PC dimatikan):
#   powershell.exe -ExecutionPolicy Bypass -File .\legacy-app-minimize-watcher.ps1
#
# Cara pakai persist per-login (opsional, taruh shortcut di Startup folder
# - shell:startup - yang targetnya):
#   powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\path\to\legacy-app-minimize-watcher.ps1"

param(
    [string]$ProcessName = "karaoke",
    [int]$IntervalSeconds = 2,
    # Substring unik di command line proses cmd.exe yang njalanin agent kita
    # (mis. "npm run start:agent" dijalanin dari folder ...\v2\video-controller).
    # "video-controller" udah cukup unik dan aman - gak akan kesenggol nama
    # folder lain kayak "v2" doang yang terlalu generik.
    [string]$OurProjectMarker = "video-controller",
    # Substring unik di command line Chrome kiosk kita - path profile
    # Playwright-nya. Lihat agent/src/browser/BrowserProfile.ts:
    # profile disimpan di "<project>/agent/data/browser-profile", jadi
    # "browser-profile" ini cukup unik buat bedain dari Chrome biasa.
    [string]$OurChromeProfileMarker = "browser-profile"
)

# Anti dobel-instance: cek pakai $PID (otomatis merujuk ke proses PowerShell
# yang lagi ngejalanin blok ini SENDIRI, jadi gak akan salah mendeteksi
# dirinya sendiri sebagai "instance lain" - beda dari cek command-line lewat
# wmic/batch yang gampang salah karena teks pencariannya sendiri ikut
# mengandung nama file ini).
$existing = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
        $_.CommandLine -and
        $_.CommandLine -like "*legacy-app-minimize-watcher.ps1*" -and
        $_.ProcessId -ne $PID
    }

if ($existing) {
    Write-Host "[watcher] Instance lain sudah jalan (PID: $(($existing.ProcessId) -join ', ')), keluar."
    exit 0
}

Add-Type -Namespace Native -Name Win32 -MemberDefinition '
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();
'

$SW_HIDE = 0
$SW_MINIMIZE = 6
$SW_RESTORE = 9

function Get-MainWindowHandle {
    param([int]$ProcessId)
    try {
        $proc = Get-Process -Id $ProcessId -ErrorAction Stop
        if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
            return $proc.MainWindowHandle
        }
    } catch {}
    return [IntPtr]::Zero
}

# AttachThreadInput trick: Windows blocks a background process from calling
# SetForegroundWindow on its own (the "foreground lock" restriction), unless
# its thread is attached to the thread that currently owns focus. Attaching
# first makes SetForegroundWindow reliable instead of silently no-op'ing.
function Set-ForceForegroundWindow {
    param([IntPtr]$TargetHandle)

    $fgWindow = [Native.Win32]::GetForegroundWindow()
    $fgThreadId = [Native.Win32]::GetWindowThreadProcessId($fgWindow, [ref]0)
    $curThreadId = [Native.Win32]::GetCurrentThreadId()

    [Native.Win32]::AttachThreadInput($curThreadId, $fgThreadId, $true) | Out-Null
    [Native.Win32]::ShowWindowAsync($TargetHandle, $SW_RESTORE) | Out-Null
    [Native.Win32]::BringWindowToTop($TargetHandle) | Out-Null
    [Native.Win32]::SetForegroundWindow($TargetHandle) | Out-Null
    [Native.Win32]::AttachThreadInput($curThreadId, $fgThreadId, $false) | Out-Null
}

Write-Host "[watcher] Memantau proses '$ProcessName' setiap ${IntervalSeconds}s. Ctrl+C untuk berhenti."

while ($true) {

    # Gate semuanya di belakang keberadaan Chrome kiosk kita sendiri.
    # agent/src/core/Agent.ts cuma manggil browser.start() SETELAH billing
    # activation selesai (lihat waitForActivation() di start()) - jadi
    # selama Chrome kiosk kita belum ada, itu tandanya billing kita lagi
    # OFF/belum diaktifin, dan user memang mau pakai app lama dulu. Watcher
    # harus diem total di kondisi itu - jangan ganggu app lama sama sekali,
    # supaya gak "rebutan" bikin app lama keminimize berkali-kali tiap kali
    # dia coba naik ke depan.
    #
    # "--type=" dikecualikan karena itu ciri proses anak Chrome
    # (renderer/GPU/dst), bukan window utama.
    $ourChrome = Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -and
            $_.CommandLine -like "*$OurChromeProfileMarker*" -and
            $_.CommandLine -notlike "*--type=*"
        } |
        Select-Object -First 1

    if (-not $ourChrome) {

        # Chrome kiosk kita belum kebuka -> billing kita lagi off, biarin
        # app lama dipakai bebas tanpa gangguan sama sekali.
        Start-Sleep -Seconds $IntervalSeconds
        continue

    }

    # Dari sini, Chrome kiosk kita udah kebuka -> billing kita aktif ->
    # kita yang harus ambil alih layar.

    # 1. Minimize window app karaoke lama.
    $legacyProcs = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue

    foreach ($p in $legacyProcs) {

        if ($p.MainWindowHandle -ne [IntPtr]::Zero) {

            [Native.Win32]::ShowWindowAsync($p.MainWindowHandle, $SW_MINIMIZE) | Out-Null

            Write-Host "[watcher] $(Get-Date -Format 'HH:mm:ss') - minimized legacy PID $($p.Id)"

        }

    }

    # 2. Hide console cmd yang njalanin agent kita sendiri.
    $ourConsoles = Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*$OurProjectMarker*" }

    foreach ($c in $ourConsoles) {

        $handle = Get-MainWindowHandle -ProcessId $c.ProcessId

        if ($handle -ne [IntPtr]::Zero) {

            [Native.Win32]::ShowWindowAsync($handle, $SW_HIDE) | Out-Null

        }

    }

    # 3. Paksa window Chrome kiosk kita ke depan (bukan cuma ngandelin efek
    #    samping dari minimize-nya app lama).
    $handle = Get-MainWindowHandle -ProcessId $ourChrome.ProcessId

    if ($handle -ne [IntPtr]::Zero) {

        Set-ForceForegroundWindow -TargetHandle $handle

    }

    Start-Sleep -Seconds $IntervalSeconds

}
