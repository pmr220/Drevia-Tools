@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
 echo Install Python 3.10 or newer and enable Add Python to PATH. Then run this again.
 pause
 exit /b 1
)
python -m venv .venv
if errorlevel 1 goto failed
.venv\Scripts\python.exe -m pip install -r requirements-advanced.txt
if errorlevel 1 goto failed
echo Advanced engines installed. Now run START-WINDOWS.cmd.
pause
exit /b 0
:failed
echo Setup failed. Read the error above; the advanced tools are not ready yet.
pause
exit /b 1
