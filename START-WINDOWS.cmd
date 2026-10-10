@echo off
setlocal
cd /d "%~dp0"
if exist .venv\Scripts\python.exe set "PYTHON_BIN=%~dp0.venv\Scripts\python.exe"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
if not exist node_modules\express\package.json (
  echo Installing dependencies. Internet is required for this first setup.
  call npm ci
  if errorlevel 1 (
    echo Installation failed. Check the error above and your internet connection.
    pause
    exit /b 1
  )
)
echo Open http://localhost:3000 after the server reports that it is ready.
echo Keep this window open while using Drevia. Press Ctrl+C to stop.
call npm start
pause
