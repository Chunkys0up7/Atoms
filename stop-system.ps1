# GNDP System Shutdown Script
# Gracefully stops all backend and frontend services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP System Shutdown" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Stopping all GNDP services..." -ForegroundColor Yellow
Write-Host ""

# Stop Node/Vite processes (frontend)
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  - Stopping frontend (Node.js/Vite)..." -ForegroundColor Gray
    $nodeProcesses | Stop-Process -Force
    Write-Host "    ✓ Frontend stopped" -ForegroundColor Green
} else {
    Write-Host "  ℹ No frontend processes running" -ForegroundColor Gray
}

# Stop Python/Uvicorn processes (backend)
$pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    Write-Host "  - Stopping backend (Python/FastAPI)..." -ForegroundColor Gray
    $pythonProcesses | Stop-Process -Force
    Write-Host "    ✓ Backend stopped" -ForegroundColor Green
} else {
    Write-Host "  ℹ No backend processes running" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All services stopped" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
