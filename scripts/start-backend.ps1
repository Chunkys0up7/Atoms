$host.UI.RawUI.WindowTitle = "GNDP Backend"
Write-Host "GNDP Backend Service - http://localhost:8000"
Write-Host ""
Set-Location $PSScriptRoot\..

# Ensure core dependencies are installed
Write-Host "Checking backend dependencies..."
.\venv\Scripts\pip.exe install -q uvicorn fastapi python-dotenv 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Dependencies OK"
} else {
    Write-Host "Warning: Some dependencies may be missing"
}
Write-Host ""

.\venv\Scripts\activate
Set-Location api
Write-Host "Starting FastAPI server..."
Write-Host ""
uvicorn server:app --reload --host 0.0.0.0 --port 8000
