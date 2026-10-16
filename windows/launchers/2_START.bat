@echo off
chcp 65001 >nul
title IMBA Widgets - server
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\scripts\start.ps1"
echo.
pause
