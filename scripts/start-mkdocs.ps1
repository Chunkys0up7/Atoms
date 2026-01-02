$host.UI.RawUI.WindowTitle = "GNDP Docs"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Documentation Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Docs URL: http://127.0.0.1:8001" -ForegroundColor Green
Write-Host ""
Write-Host "Starting mkdocs serve..." -ForegroundColor Yellow
Write-Host ""

Set-Location "F:\Projects\FullSytem"
$python = "F:\Projects\FullSytem\venv\Scripts\python.exe"
& $python -m mkdocs serve --dev-addr 127.0.0.1:8001
