$host.UI.RawUI.WindowTitle = "GNDP Frontend"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Frontend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application URL: http://localhost:5174" -ForegroundColor Green
Write-Host "                 (or check output below)" -ForegroundColor Gray
Write-Host ""
Write-Host "Starting Vite dev server..." -ForegroundColor Yellow
Write-Host ""

Set-Location "F:\Projects\FullSytem"
npm run dev
