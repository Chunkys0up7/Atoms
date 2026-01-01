@echo off
REM GNDP System Shutdown Script (Batch version)
REM Simple wrapper to run PowerShell script

powershell.exe -ExecutionPolicy Bypass -File "%~dp0stop-system.ps1"
pause
