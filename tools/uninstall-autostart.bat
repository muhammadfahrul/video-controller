@echo off
REM Cabut LegacyKaraokeFocusWatcher dari Windows Startup folder.
REM Ini cuma hapus shortcut-nya (jadi gak auto-jalan lagi pas login
REM berikutnya) - kalau prosesnya lagi jalan SEKARANG, itu gak ikut
REM kematian, harus dimatiin manual lewat Task Manager (cari
REM powershell.exe) kalau memang mau distop juga.

setlocal

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_DIR%\LegacyKaraokeFocusWatcher.lnk"

if exist "%SHORTCUT%" (
    del "%SHORTCUT%"
    echo [OK] Shortcut dihapus: %SHORTCUT%
    echo Watcher tidak akan auto-jalan lagi mulai login berikutnya.
) else (
    echo Shortcut tidak ditemukan, mungkin memang belum pernah dipasang.
)

pause
endlocal
