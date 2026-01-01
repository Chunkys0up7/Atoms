@echo off
REM GNDP System Startup Script (Batch version)
REM Simple wrapper to run PowerShell script

powershell.exe -ExecutionPolicy Bypass -File "%~dp0start-system.ps1"
pause
