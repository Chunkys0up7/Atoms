$host.UI.RawUI.WindowTitle = "GNDP Docs"
Write-Host "Starting MkDocs..."
Set-Location "C:\Users\camer\Projects\atoms\Atoms"
& "C:\Users\camer\Projects\atoms\Atoms\venv\Scripts\python.exe" -m mkdocs serve --dev-addr 127.0.0.1:8001
