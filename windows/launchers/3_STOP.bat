@echo off
chcp 65001 >nul
title IMBA Widgets - stop
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\scripts\stop.ps1"
echo.
pause
