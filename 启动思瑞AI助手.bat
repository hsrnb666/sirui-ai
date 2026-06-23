@echo off
chcp 65001 >nul 2>&1
title 思瑞AI助手
echo.
echo  正在启动思瑞AI助手...
echo.
cd /d "%~dp0"
node start.js
pause
