@echo off
REM ============================================================
REM  Daftarin run-legacy-app-minimize-watcher.bat ke Windows
REM  Startup folder, jadi otomatis jalan tiap kali PC ini
REM  nyala/login - gak perlu double-click manual lagi.
REM
REM  Jalanin file ini SEKALI aja (one-time setup). Setelah itu,
REM  restart PC buat mulai ngetes autostart-nya.
REM ============================================================

setlocal

set "SCRIPT_DIR=%~dp0"
set "TARGET=%SCRIPT_DIR%run-legacy-app-minimize-watcher.bat"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_DIR%\LegacyKaraokeFocusWatcher.lnk"

if not exist "%TARGET%" (
    echo File run-legacy-app-minimize-watcher.bat tidak ditemukan di folder ini.
    echo Pastikan install-autostart.bat ada di folder yang sama.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$s = New-Object -ComObject WScript.Shell;" ^
    "$sc = $s.CreateShortcut('%SHORTCUT%');" ^
    "$sc.TargetPath = '%TARGET%';" ^
    "$sc.WorkingDirectory = '%SCRIPT_DIR%';" ^
    "$sc.WindowStyle = 7;" ^
    "$sc.Description = 'Legacy karaoke app focus watcher - short-term workaround';" ^
    "$sc.Save()"

if exist "%SHORTCUT%" (
    echo [OK] Shortcut dibuat: %SHORTCUT%
    echo Watcher akan otomatis jalan tiap kali PC ini nyala/login.
    echo Restart PC sekarang buat mulai ngetes.
) else (
    echo [GAGAL] Shortcut tidak berhasil dibuat, coba jalanin lagi atau bikin manual
    echo lewat shell:startup.
)

pause
endlocal
