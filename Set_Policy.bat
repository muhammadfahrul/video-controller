@echo off
echo Mengatur Execution Policy PowerShell menjadi RemoteSigned...

powershell -Command "Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"

echo.
echo Pengaturan berhasil diterapkan!
pause