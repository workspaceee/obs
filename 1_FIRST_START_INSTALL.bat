@echo off
chcp 65001 >nul
title IMBA Widgets - first start (install)
cd /d "%~dp0"
echo.
echo  ===============================================
echo    IMBA WIDGETS  -  first start / full install
echo  ===============================================
echo.
if not exist "%~dp0windows\scripts\install.ps1" goto missing
if not exist "%~dp0windows\scripts\messages.ru.json" goto missing
if not exist "%~dp0windows\web\index.html" goto missing
if not exist "%~dp0backend\server.py" goto missing
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\scripts\install.ps1"
if errorlevel 1 goto failed
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\scripts\start.ps1"
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

:missing
echo  [X] Project files not found next to this .bat file.
echo.
echo      This file must stay in the MAIN project folder, together with:
echo        backend\server.py
echo        windows\scripts\install.ps1
echo        windows\web\index.html
echo.
echo      Unpack the whole archive (Extract All) and run the .bat from the
echo      top folder. Do not move the .bat files to other folders.
echo.
pause
exit /b 1
