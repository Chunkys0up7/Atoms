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
    # Verify critical dependencies are installed
    Write-Host "  Checking Python dependencies..." -ForegroundColor Gray
    $missingDeps = @()

    $criticalPackages = @("fastapi", "uvicorn", "neo4j", "chromadb", "anthropic")
    foreach ($package in $criticalPackages) {
        $installed = .\venv\Scripts\pip show $package 2>$null
        if (-not $installed) {
            $missingDeps += $package
        }
    }

    if ($missingDeps.Count -gt 0) {
        Write-Host "  ⚠ Missing dependencies detected: $($missingDeps -join ', ')" -ForegroundColor Yellow
        Write-Host "  Installing missing packages..." -ForegroundColor Gray
        .\venv\Scripts\pip install -r requirements.txt -q
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ✗ ERROR: Failed to install dependencies" -ForegroundColor Red
            Write-Host "  Run manually: .\venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Python dependencies OK" -ForegroundColor Green
    }
}
Write-Host ""

# Step 4: Check and start Neo4j Docker container
Write-Host "[4/7] Checking Neo4j database..." -ForegroundColor Yellow

# Check if Docker is available
$dockerAvailable = $false
try {
    docker --version | Out-Null
    $dockerAvailable = $true
} catch {
    Write-Host "  ✗ WARNING: Docker not found or not running" -ForegroundColor Yellow
    Write-Host "  Please start Docker Desktop to enable Graph Analytics features" -ForegroundColor Yellow
}

if ($dockerAvailable) {
    # Check if gndp-neo4j container exists and start it
    $neo4jContainer = docker ps -a --filter "name=gndp-neo4j" --format "{{.Names}}" 2>$null

    if ($neo4jContainer -eq "gndp-neo4j") {
        $neo4jStatus = docker ps --filter "name=gndp-neo4j" --format "{{.Status}}" 2>$null

        if ($neo4jStatus) {
            Write-Host "  ✓ Neo4j container already running" -ForegroundColor Green
        } else {
            Write-Host "  Starting Neo4j container..." -ForegroundColor Gray
            docker start gndp-neo4j | Out-Null
            Write-Host "  Waiting for Neo4j to initialize..." -ForegroundColor Gray

            # Wait for Neo4j health check
            $neo4jReady = $false
            $maxAttempts = 30
            $attempt = 0

            while (-not $neo4jReady -and $attempt -lt $maxAttempts) {
                Start-Sleep -Seconds 2
                $attempt++
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:7474" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
                    if ($response.StatusCode -eq 200) {
                        $neo4jReady = $true
                        Write-Host "  ✓ Neo4j is healthy (http://localhost:7474)" -ForegroundColor Green
                    }
                } catch {
                    if ($attempt % 5 -eq 0) {
                        Write-Host "    Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
                    }
                }
            }

            if (-not $neo4jReady) {
                Write-Host "  ⚠ WARNING: Neo4j health check timed out" -ForegroundColor Yellow
                Write-Host "  Graph Analytics may not work. Check Docker Desktop." -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  ⚠ WARNING: gndp-neo4j container not found" -ForegroundColor Yellow
        Write-Host "  Run 'docker-compose up neo4j -d' to create it" -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 5: Ensure scripts directory exists
if (-not (Test-Path ".\scripts")) {
    New-Item -ItemType Directory -Path ".\scripts" -Force | Out-Null
}

# Step 5: Start Backend
Write-Host "[5/8] Starting backend service..." -ForegroundColor Yellow

# Create backend startup script
@'
$host.UI.RawUI.WindowTitle = "GNDP Backend"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Backend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Server: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "API Docs:   http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "Health:     http://127.0.0.1:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Starting FastAPI server using venv Python..." -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot\..
$python = Join-Path $PSScriptRoot "..\venv\Scripts\python.exe"
& $python -m uvicorn api.server:app --host 127.0.0.1 --port 8000 --log-level info
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
        # Try loopback IPv4 first (avoids IPv6 resolution issues)
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response -and $response.StatusCode -eq 200) {
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

# Step 6: Start Frontend
Write-Host "[6/8] Starting frontend service..." -ForegroundColor Yellow

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

# Step 7: Neo4j Health Check
Write-Host "[7/8] Neo4j Health Check" -ForegroundColor Yellow
try {
    $neo4jResponse = Invoke-WebRequest -Uri "http://localhost:7474" -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($neo4jResponse.StatusCode -eq 200) {
        Write-Host "  Neo4j:    ✓ Healthy (http://localhost:7474)" -ForegroundColor Green
    }
} catch {
    Write-Host "  Neo4j:    ✗ Not responding (Graph Analytics will not work)" -ForegroundColor Red
}
Write-Host ""

# Step 8: System Health Summary
Write-Host "[8/8] System Health Summary" -ForegroundColor Yellow
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
Write-Host "  • Neo4j:     http://localhost:7474 (user: neo4j, pass: password)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services are running in separate windows." -ForegroundColor Gray
Write-Host "To stop all services, run: .\stop-system.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Enter to close this window..." -ForegroundColor Yellow
Read-Host
