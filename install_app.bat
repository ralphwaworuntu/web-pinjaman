@echo off
set "NODE_DIR=C:\Program Files\nodejs"
set "PATH=%NODE_DIR%;%PATH%"

echo Memeriksa instalasi Node.js...
if not exist "%NODE_DIR%\npm.cmd" (
    echo [ERROR] Node.js belum terinstall!
    echo Silakan install dulu dari https://nodejs.org/
    echo Setelah install, restart komputer atau Cursor.
    pause
    exit /b
)

echo.
echo [INFO] Menginstall dependencies (node_modules)...
call "%NODE_DIR%\npm.cmd" install

if %errorlevel% neq 0 (
    echo [ERROR] Gagal menginstall dependencies. Cek koneksi internet.
    pause
    exit /b
)

echo.
echo [SUCCESS] Instalasi selesai! Menjalankan aplikasi...
echo Buka browser di http://localhost:3000
call "%NODE_DIR%\npm.cmd" run dev
pause
