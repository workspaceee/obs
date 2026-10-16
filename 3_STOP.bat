@echo off
chcp 65001 >nul
title IMBA Widgets - stop
cd /d "%~dp0"
if not exist "%~dp0windows\scripts\stop.ps1" goto missing
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\scripts\stop.ps1"
echo.
pause
exit /b 0

:missing
echo  [X] Project files not found next to this .bat file.
echo      Keep this file in the MAIN project folder (with backend\ and windows\).
echo.
pause
exit /b 1
