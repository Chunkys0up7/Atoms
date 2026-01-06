$host.UI.RawUI.WindowTitle = "GNDP Backend"
Write-Host "Starting API Proxy..."
$env:ALLOWED_ORIGINS = "*"
Set-Location "C:\Users\camer\Projects\atoms\Atoms"
& "C:\Users\camer\Projects\atoms\Atoms\venv\Scripts\python.exe" -m uvicorn api.server:app --host 0.0.0.0 --port 8000 --log-level info
