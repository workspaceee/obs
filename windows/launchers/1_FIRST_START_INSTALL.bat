@echo off
chcp 65001 >nul
title IMBA Widgets - first start (install)
cd /d "%~dp0"
echo.
echo  ===============================================
echo    IMBA WIDGETS  -  first start / full install
echo  ===============================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\scripts\install.ps1"
if errorlevel 1 goto failed
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\scripts\start.ps1"
echo.
pause
exit /b 0
:failed
echo.
echo  [X] Install failed - read the message above.
echo      Check the internet connection and run this file again.
echo.
pause
exit /b 1
