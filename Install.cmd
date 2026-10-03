@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install.ps1" %*
if errorlevel 1 (
  echo.
  echo Installation failed. See the message above and run Install.cmd again to retry.
  pause
  exit /b 1
)
