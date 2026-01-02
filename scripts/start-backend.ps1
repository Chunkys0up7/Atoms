$host.UI.RawUI.WindowTitle = "GNDP Backend"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Backend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Server: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "API Docs:   http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "Health:     http://127.0.0.1:8000/health" -ForegroundColor Green
Write-Host ""
    # Set ALLOWED_ORIGINS explicitly to ensure CORS works regardless of .env file
    $env:ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:8000"

    Write-Host "  Starting API server on 0.0.0.0:8000..." -ForegroundColor Gray
    Write-Host ""

Set-Location "F:\Projects\FullSytem"
& "F:\Projects\FullSytem\venv\Scripts\python.exe" -m uvicorn api.server:app --host 0.0.0.0 --port 8000 --log-level info
