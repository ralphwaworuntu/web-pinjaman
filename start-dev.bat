@echo off
set "NODE_DIR=C:\Program Files\nodejs"
set "PATH=%NODE_DIR%;%PATH%"

cd /d "%~dp0"

echo.
echo [INFO] Menjalankan Web Pinjaman...
echo Buka browser di http://localhost:3000
echo Tekan Ctrl+C untuk menghentikan server.
echo.

call "%NODE_DIR%\npm.cmd" run dev
pause
