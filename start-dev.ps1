# Jalankan Web Pinjaman dari terminal PowerShell
$NodeDir = "C:\Program Files\nodejs"
$env:Path = "$NodeDir;$env:Path"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "[INFO] Menjalankan Web Pinjaman..."
Write-Host "Buka browser di http://localhost:3000"
Write-Host "Tekan Ctrl+C untuk menghentikan server."
Write-Host ""

& "$NodeDir\npm.cmd" run dev
