@echo off
title Parakh Platform Runner
echo ========================================================
echo   Starting Parakh (The Memory of Every Brand Decision)
echo ========================================================
echo.
echo [1/2] Starting Backend API Server (Port 4000)...
start "Parakh Backend API" cmd /k "cd /d %~dp0server && npm run dev"

echo [2/2] Starting Frontend Web Interface (Port 5173)...
start "Parakh Frontend UI" cmd /k "cd /d %~dp0web && npm run dev"

echo.
echo Waiting 4 seconds for services to initialize...
timeout /t 4 /nobreak >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo.
echo Parakh is now running! Keep the terminal windows open.
pause
