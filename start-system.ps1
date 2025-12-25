# GNDP System Startup Script with Health Checks
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP System Startup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill existing processes
Write-Host "[1/7] Cleaning up existing processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  Stopping existing Node.js processes..." -ForegroundColor Gray
    $nodeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

$pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    Write-Host "  Stopping existing Python processes..." -ForegroundColor Gray
    $pythonProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}
Write-Host "  ✓ Cleanup complete" -ForegroundColor Green
Write-Host ""

# Step 2: Clean build artifacts
Write-Host "[2/7] Cleaning build artifacts..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "  Removed dist/" -ForegroundColor Gray
}
if (Test-Path "node_modules/.vite") {
    Remove-Item -Recurse -Force "node_modules/.vite"
    Write-Host "  Removed Vite cache" -ForegroundColor Gray
}
Write-Host "  ✓ Build artifacts cleaned" -ForegroundColor Green
Write-Host ""

# Step 3: Verify environment
Write-Host "[3/7] Verifying environment..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "  ✗ ERROR: Node.js not found" -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green

$pythonVersion = python --version 2>$null
if (-not $pythonVersion) {
    Write-Host "  ✗ ERROR: Python not found" -ForegroundColor Red
    Write-Host "  Please install Python 3.12 or later" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ Python: $pythonVersion" -ForegroundColor Green
Write-Host ""

# Step 4: Check dependencies
Write-Host "[4/7] Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing Node.js dependencies..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ ERROR: npm install failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Node.js dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✓ Node.js dependencies OK" -ForegroundColor Green
}

if (-not (Test-Path "venv")) {
    Write-Host "  Creating Python virtual environment..." -ForegroundColor Gray
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ ERROR: Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Installing Python dependencies..." -ForegroundColor Gray
    .\venv\Scripts\pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ ERROR: pip install failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Python environment created" -ForegroundColor Green
} else {
    Write-Host "  ✓ Python venv OK" -ForegroundColor Green
}
Write-Host ""

# Step 5: Ensure scripts directory exists
if (-not (Test-Path ".\scripts")) {
    New-Item -ItemType Directory -Path ".\scripts" -Force | Out-Null
}

# Step 6: Start Backend
Write-Host "[5/7] Starting backend service..." -ForegroundColor Yellow

# Create backend startup script
@'
$host.UI.RawUI.WindowTitle = "GNDP Backend"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Backend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Server: http://localhost:8000" -ForegroundColor Green
Write-Host "API Docs:   http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Health:     http://localhost:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Starting FastAPI server..." -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot\..
.\venv\Scripts\activate
Set-Location api
uvicorn server:app --reload --host 0.0.0.0 --port 8000
'@ | Out-File -FilePath ".\scripts\start-backend.ps1" -Encoding UTF8

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", ".\scripts\start-backend.ps1"
Write-Host "  Backend process started" -ForegroundColor Gray
Write-Host "  Waiting for backend to initialize..." -ForegroundColor Gray

# Wait for backend health check
$backendReady = $false
$maxAttempts = 30
$attempt = 0

while (-not $backendReady -and $attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            Write-Host "  ✓ Backend is healthy (http://localhost:8000)" -ForegroundColor Green
        }
    } catch {
        # Still waiting
        if ($attempt % 5 -eq 0) {
            Write-Host "    Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
        }
    }
}

if (-not $backendReady) {
    Write-Host "  ✗ WARNING: Backend health check timed out" -ForegroundColor Yellow
    Write-Host "  Backend may still be starting. Check the backend window." -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Start Frontend
Write-Host "[6/7] Starting frontend service..." -ForegroundColor Yellow

# Create frontend startup script
@'
$host.UI.RawUI.WindowTitle = "GNDP Frontend"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Frontend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application URL: http://localhost:5173" -ForegroundColor Green
Write-Host "                 (or check output below)" -ForegroundColor Gray
Write-Host ""
Write-Host "Starting Vite dev server..." -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot\..
npm run dev
'@ | Out-File -FilePath ".\scripts\start-frontend.ps1" -Encoding UTF8

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", ".\scripts\start-frontend.ps1"
Write-Host "  Frontend process started" -ForegroundColor Gray
Write-Host "  Waiting for frontend to initialize..." -ForegroundColor Gray

# Wait for frontend to be ready (Vite typically uses port 5173)
$frontendReady = $false
$maxAttempts = 30
$attempt = 0

while (-not $frontendReady -and $attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    $attempt++
    try {
        # Try both common Vite ports
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $frontendReady = $true
            $frontendUrl = "http://localhost:5173"
            Write-Host "  ✓ Frontend is ready ($frontendUrl)" -ForegroundColor Green
        }
    } catch {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $frontendReady = $true
                $frontendUrl = "http://localhost:3000"
                Write-Host "  ✓ Frontend is ready ($frontendUrl)" -ForegroundColor Green
            }
        } catch {
            # Still waiting
            if ($attempt % 5 -eq 0) {
                Write-Host "    Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
            }
        }
    }
}

if (-not $frontendReady) {
    Write-Host "  ✗ WARNING: Frontend health check timed out" -ForegroundColor Yellow
    Write-Host "  Frontend may still be starting. Check the frontend window." -ForegroundColor Yellow
    $frontendUrl = "http://localhost:5173"
}
Write-Host ""

# Step 8: System Health Summary
Write-Host "[7/7] System Health Summary" -ForegroundColor Yellow
Write-Host ""

# Backend health check
try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 3
    if ($backendHealth.status -eq "ok") {
        Write-Host "  Backend:  ✓ Healthy" -ForegroundColor Green
    } else {
        Write-Host "  Backend:  ? Unknown status" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Backend:  ✗ Not responding" -ForegroundColor Red
}

# RAG system health check
try {
    $ragHealth = Invoke-RestMethod -Uri "http://localhost:8000/api/rag/health" -Method GET -TimeoutSec 3
    Write-Host "  RAG:      ✓ Healthy" -ForegroundColor Green
} catch {
    Write-Host "  RAG:      ⚠ Check backend window for details" -ForegroundColor Yellow
}

# Frontend health check
try {
    $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "  Frontend: ✓ Healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "  Frontend: ✗ Not responding" -ForegroundColor Red
}

Write-Host ""

# Final summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP System Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access Points:" -ForegroundColor White
Write-Host "  • Frontend:  $frontendUrl" -ForegroundColor Cyan
Write-Host "  • Backend:   http://localhost:8000" -ForegroundColor Cyan
Write-Host "  • API Docs:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  • Health:    http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services are running in separate windows." -ForegroundColor Gray
Write-Host "To stop all services, run: .\stop-system.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Enter to close this window..." -ForegroundColor Yellow
Read-Host
