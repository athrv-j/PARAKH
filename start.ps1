# Parakh PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Parakh (The Memory of Every Brand Decision)  " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

Write-Host "`n[1/2] Launching Backend Server on port 4000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root/server'; npm run dev"

Write-Host "[2/2] Launching Frontend Web App on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root/web'; npm run dev"

Write-Host "`nWaiting 3 seconds for servers to start..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host "Opening Parakh Web UI in your default browser..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host "`n✓ Running! Check the two opened terminal windows for logs." -ForegroundColor Green
