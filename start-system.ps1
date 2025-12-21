# GNDP System Startup Script
Write-Host "========================================"
Write-Host "GNDP System Startup Script"
Write-Host "========================================"
Write-Host ""

# Step 1: Kill existing processes
Write-Host "[1/6] Cleaning up existing processes..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "  Done"
Write-Host ""

# Step 2: Clean build artifacts
Write-Host "[2/6] Cleaning build artifacts..."
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "node_modules/.vite") { Remove-Item -Recurse -Force "node_modules/.vite" }
Write-Host "  Done"
Write-Host ""

# Step 3: Verify environment
Write-Host "[3/6] Verifying environment..."
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "  ERROR: Node.js not found"
    exit 1
}
Write-Host "  Node.js: $nodeVersion"

$pythonVersion = python --version 2>$null
if (-not $pythonVersion) {
    Write-Host "  ERROR: Python not found"
    exit 1
}
Write-Host "  Python: $pythonVersion"
Write-Host ""

# Step 4: Check dependencies
Write-Host "[4/6] Checking dependencies..."
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing Node.js dependencies..."
    npm install
} else {
    Write-Host "  Node.js dependencies OK"
}

if (-not (Test-Path "venv")) {
    Write-Host "  Creating Python virtual environment..."
    python -m venv venv
    .\venv\Scripts\pip install -r requirements.txt
} else {
    Write-Host "  Python venv OK"
}
Write-Host ""

# Step 5: Start Backend
Write-Host "[5/6] Starting backend service..."
if (-not (Test-Path ".\scripts")) {
    New-Item -ItemType Directory -Path ".\scripts" -Force | Out-Null
}

@'
$host.UI.RawUI.WindowTitle = "GNDP Backend"
Write-Host "GNDP Backend Service - http://localhost:8000"
Set-Location $PSScriptRoot\..
.\venv\Scripts\activate
Set-Location api
uvicorn server:app --reload --host 0.0.0.0 --port 8000
'@ | Out-File -FilePath ".\scripts\start-backend.ps1" -Encoding ASCII

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", ".\scripts\start-backend.ps1"
Write-Host "  Backend starting on http://localhost:8000"
Start-Sleep -Seconds 4
Write-Host ""

# Step 6: Start Frontend
Write-Host "[6/6] Starting frontend service..."

@'
$host.UI.RawUI.WindowTitle = "GNDP Frontend"
Write-Host "GNDP Frontend Service - http://localhost:3000"
Set-Location $PSScriptRoot\..
npm run dev
'@ | Out-File -FilePath ".\scripts\start-frontend.ps1" -Encoding ASCII

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", ".\scripts\start-frontend.ps1"
Write-Host "  Frontend starting on http://localhost:3000"
Start-Sleep -Seconds 3
Write-Host ""

Write-Host "========================================"
Write-Host "GNDP System Ready!"
Write-Host "========================================"
Write-Host ""
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:8000"
Write-Host "API Docs: http://localhost:8000/docs"
Write-Host ""
Write-Host "Services running in separate windows."
Write-Host "Press Enter to close this window..."
Read-Host
