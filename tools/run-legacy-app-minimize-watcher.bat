@echo off
REM ============================================================
REM  Bulletproof launcher untuk legacy-app-minimize-watcher.ps1
REM  Short-term / single-PC workaround - TIDAK bagian dari agent,
REM  tidak lewat build/CI-CD apa pun. Tinggal double-click.
REM
REM  Yang dijamin di sini:
REM   1. Selalu jalan relatif ke lokasi file .bat ini sendiri
REM      (aman walau di-double-click dari Explorer atau dipanggil
REM      dari shortcut Startup folder dengan working dir beda).
REM   2. Anti dobel-instance (dicek di dalam .ps1-nya sendiri lewat
REM      $PID - supaya gak numpuk banyak proses PowerShell).
REM   3. Auto-restart kalau script PowerShell-nya crash/keluar
REM      sendiri - loop-nya di-relaunch terus, jadi "nempel"
REM      selama PC nyala, gak perlu ada yang mantengin manual.
REM   4. Semua output dicatat ke log file (soalnya kalau dipasang
REM      hidden di Startup, gak ada jendela buat dibaca langsung).
REM ============================================================

setlocal EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
set "PS1_PATH=%SCRIPT_DIR%legacy-app-minimize-watcher.ps1"
set "LOG_FILE=%SCRIPT_DIR%watcher.log"

cd /d "%SCRIPT_DIR%"

if not exist "%PS1_PATH%" (
    echo [%date% %time%] ERROR: tidak ketemu "%PS1_PATH%" >> "%LOG_FILE%"
    echo File legacy-app-minimize-watcher.ps1 tidak ditemukan di folder ini.
    echo Pastikan .bat dan .ps1 ada di folder yang sama.
    pause
    exit /b 1
)

echo [%date% %time%] Watcher dimulai. >> "%LOG_FILE%"

:loop

    powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%PS1_PATH%" >> "%LOG_FILE%" 2>&1

    REM Kalau baris di atas selesai (ps1-nya keluar/crash entah kenapa),
    REM catat, tunggu sebentar, lalu coba lagi - jangan pernah nyerah.
    echo [%date% %time%] Watcher process keluar ^(exit code %errorlevel%^), restart dalam 5 detik... >> "%LOG_FILE%"

    timeout /t 5 /nobreak >nul

    goto :loop

endlocal
