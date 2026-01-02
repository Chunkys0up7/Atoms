$host.UI.RawUI.WindowTitle = "GNDP Backend"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Backend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Server: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "API Docs:   http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "Health:     http://127.0.0.1:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Starting FastAPI server..." -ForegroundColor Yellow
Write-Host ""

Set-Location "F:\Projects\FullSytem"
$python = "F:\Projects\FullSytem\venv\Scripts\python.exe"
& $python -m uvicorn api.server:app --host 127.0.0.1 --port 8000 --log-level info
