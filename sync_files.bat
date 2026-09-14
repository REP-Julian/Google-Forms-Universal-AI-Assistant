@echo off
title Google Form AI - Sync Knowledge Files
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync_files.ps1"
echo.
echo Press any key to exit...
pause >nul
