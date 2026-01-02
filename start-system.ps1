# GNDP System Startup Script - Consolidated Edition
# Orchestrates the complete GNDP system startup with health checks and validation

param(
    [switch]$SkipNeo4j,      # Skip Neo4j startup (for development without graph features)
    [switch]$Quick,          # Skip optional health checks for faster startup
    [switch]$Verbose,        # Enable detailed logging
    [int]$Timeout = 120      # Health check timeout in seconds (default 2 minutes)
)

# Configure logging
$LogDir = ".\logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$LogFile = Join-Path $LogDir "startup-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logEntry
    if ($Verbose) {
        Write-Host $logEntry -ForegroundColor Gray
    }
}

function Write-Step {
    param([string]$Message, [string]$Color = "Yellow")
    Write-Host $Message -ForegroundColor $Color
    Write-Log $Message "STEP"
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✓ $Message" -ForegroundColor Green
    Write-Log $Message "SUCCESS"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠ $Message" -ForegroundColor Yellow
    Write-Log $Message "WARNING"
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "  ✗ ERROR: $Message" -ForegroundColor Red
    Write-Log $Message "ERROR"
}

# Header
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP System Startup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Log "Starting GNDP system startup sequence"

# ============================================================
# STEP 1: PREREQUISITES CHECK
# ============================================================
Write-Step "[1/6] Checking prerequisites..."

# Check Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Error-Custom "Node.js not found. Please install from https://nodejs.org"
    exit 1
}
else {
    Write-Success "Node.js $nodeVersion"
}

# Check Python
$pythonVersion = python --version 2>$null
if (-not $pythonVersion) {
    Write-Error-Custom "Python not found. Please install Python 3.11+"
    exit 1
}
else {
    Write-Success "Python $pythonVersion"
}

# Check Docker (optional for Neo4j)
if (-not $SkipNeo4j) {
    try {
        docker --version | Out-Null
        Write-Success "Docker is available"
    }
    catch {
        Write-Warning "Docker not found. Use -SkipNeo4j to start without graph features"
    }
}

Write-Host ""

# ============================================================
# STEP 2: CLEANUP EXISTING PROCESSES
# ============================================================
Write-Step "[2/6] Cleaning up existing processes..."

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  Stopping existing Node.js processes..." -ForegroundColor Gray
    $nodeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Success "Node.js processes stopped"
}

$pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    Write-Host "  Stopping existing Python processes..." -ForegroundColor Gray
    $pythonProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Success "Python processes stopped"
}

# Clean build artifacts
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
    Write-Success "Removed dist/"
}
if (Test-Path "node_modules/.vite") {
    Remove-Item -Recurse -Force "node_modules/.vite" -ErrorAction SilentlyContinue
    Write-Success "Removed Vite cache"
}

Write-Host ""

# ============================================================
# STEP 3: ENVIRONMENT SETUP
# ============================================================
Write-Step "[3/6] Setting up environment..."

# Python virtual environment
if (-not (Test-Path "venv")) {
    Write-Host "  Creating Python virtual environment..." -ForegroundColor Gray
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Failed to create virtual environment"
        exit 1
    }
    Write-Host "  Installing Python dependencies..." -ForegroundColor Gray
    .\venv\Scripts\pip install -r requirements.txt -q
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Failed to install Python dependencies"
        exit 1
    }
    Write-Success "Python environment created"
}
else {
    # Verify critical dependencies
    Write-Host "  Checking Python dependencies..." -ForegroundColor Gray
    $missingDeps = @()
    $criticalPackages = @("fastapi", "uvicorn", "neo4j", "chromadb", "anthropic", "mkdocs", "mkdocs-material", "mkdocs-awesome-pages-plugin", "mkdocs-minify-plugin")

    foreach ($package in $criticalPackages) {
        $installed = .\venv\Scripts\pip show $package 2>$null
        if (-not $installed) {
            $missingDeps += $package
        }
    }

    if ($missingDeps.Count -gt 0) {
        Write-Warning "Missing dependencies: $($missingDeps -join ', ')"
        Write-Host "  Installing missing packages..." -ForegroundColor Gray
        .\venv\Scripts\pip install -r requirements.txt -q
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "Failed to install dependencies"
            exit 1
        }
        Write-Success "Dependencies installed"
    }
    else {
        Write-Success "Python dependencies OK"
    }
}

# Ensure scripts directory exists
if (-not (Test-Path ".\scripts")) {
    New-Item -ItemType Directory -Path ".\scripts" -Force | Out-Null
}

Write-Host ""

# ============================================================
# STEP 4: NEO4J DATABASE
# ============================================================
if (-not $SkipNeo4j) {
    Write-Step "[4/6] Starting Neo4j database..."

    $neo4jContainer = docker ps -a --filter "name=gndp-neo4j" --format "{{.Names}}" 2>$null

    if ($neo4jContainer -eq "gndp-neo4j") {
        $neo4jStatus = docker ps --filter "name=gndp-neo4j" --format "{{.Status}}" 2>$null

        if ($neo4jStatus) {
            Write-Success "Neo4j container already running"
        }
        else {
            Write-Host "  Starting Neo4j container..." -ForegroundColor Gray
            docker start gndp-neo4j | Out-Null
            Write-Host "  Waiting for Neo4j to initialize..." -ForegroundColor Gray

            # Health check with configurable timeout
            $neo4jReady = $false
            $maxAttempts = [math]::Ceiling($Timeout / 2)
            $attempt = 0

            while (-not $neo4jReady -and $attempt -lt $maxAttempts) {
                Start-Sleep -Seconds 2
                $attempt++
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:7474" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
                    if ($response.StatusCode -eq 200) {
                        $neo4jReady = $true
                        Write-Success "Neo4j is healthy (http://localhost:7474)"
                    }
                }
                catch {
                    if ($Verbose -and $attempt % 5 -eq 0) {
                        Write-Host "    Health check attempt $attempt/$maxAttempts..." -ForegroundColor Gray
                    }
                }
            }

            if (-not $neo4jReady) {
                Write-Warning "Neo4j health check timed out after $Timeout seconds"
                Write-Warning "Graph Analytics may not work. Check Docker Desktop."
            }
        }
    }
    else {
        Write-Warning "gndp-neo4j container not found"
        Write-Host "  Run 'docker-compose up neo4j -d' to create it" -ForegroundColor Yellow
    }
}
else {
    Write-Step "[4/6] Skipping Neo4j database (--SkipNeo4j flag)"
}

Write-Host ""

# ============================================================
# STEP 4.5: POSTGRESQL DATABASE
# ============================================================
Write-Step "[4.5/6] Starting PostgreSQL database..."

$postgresContainer = docker ps -a --filter "name=gndp-postgres" --format "{{.Names}}" 2>$null

if ($postgresContainer -eq "gndp-postgres") {
    $postgresStatus = docker ps --filter "name=gndp-postgres" --format "{{.Status}}" 2>$null

    if ($postgresStatus) {
        Write-Success "PostgreSQL container already running"
    }
    else {
        Write-Host "  Starting PostgreSQL container..." -ForegroundColor Gray
        docker start gndp-postgres | Out-Null
        Write-Host "  Waiting for PostgreSQL to initialize..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
    
    # Simple port check
    try {
        if (Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet) {
            Write-Success "PostgreSQL is listening on port 5432"
        }
        else {
            Write-Warning "PostgreSQL is running but port 5432 is not responding yet"
        }
    }
    catch {
        Write-Warning "Could not verify PostgreSQL port 5432"
    }

}
else {
    Write-Warning "gndp-postgres container not found"
    Write-Host "  Run 'docker-compose up postgres -d' to create it" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================
# STEP 5: BACKEND SERVICE
# ============================================================
Write-Step "[5/6] Starting backend service..."

# Get absolute path to project root
$ProjectRoot = (Get-Location).Path

# Create backend startup script
@"
`$host.UI.RawUI.WindowTitle = "GNDP Backend"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Backend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Server: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "API Docs:   http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "Health:     http://127.0.0.1:8000/health" -ForegroundColor Green
Write-Host ""
    # Set ALLOWED_ORIGINS explicitly to ensure CORS works regardless of .env file
    `$env:ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:8000"

    Write-Host "  Starting API server on 0.0.0.0:8000..." -ForegroundColor Gray
    Write-Host ""

Set-Location "$ProjectRoot"
& "$ProjectRoot\venv\Scripts\python.exe" -m uvicorn api.server:app --host 0.0.0.0 --port 8000 --log-level info
"@ | Out-File -FilePath ".\scripts\start-backend.ps1" -Encoding UTF8

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", ".\scripts\start-backend.ps1"
Write-Host "  Backend process started" -ForegroundColor Gray

if (-not $Quick) {
    Write-Host "  Waiting for backend to initialize..." -ForegroundColor Gray

    $backendReady = $false
    $maxAttempts = [math]::Ceiling($Timeout / 1)
    $attempt = 0

    while (-not $backendReady -and $attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 1
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response -and $response.StatusCode -eq 200) {
                $backendReady = $true
                Write-Success "Backend is healthy (http://localhost:8000)"
            }
        }
        catch {
            if ($Verbose -and $attempt % 5 -eq 0) {
                Write-Host "    Health check attempt $attempt/$maxAttempts..." -ForegroundColor Gray
            }
        }
    }

    if (-not $backendReady) {
        Write-Warning "Backend health check timed out after $Timeout seconds"
        Write-Warning "Backend may still be starting. Check the backend window."
    }
}
else {
    Write-Success "Backend started (quick mode - no health check)"
}

Write-Host ""

# ============================================================
# STEP 6: FRONTEND SERVICE
# ============================================================
Write-Step "[6/6] Starting frontend service..."

# Create frontend startup script
@"
`$host.UI.RawUI.WindowTitle = "GNDP Frontend"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Frontend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application URL: http://localhost:5174" -ForegroundColor Green
Write-Host "                 (or check output below)" -ForegroundColor Gray
Write-Host ""
Write-Host "Starting Vite dev server..." -ForegroundColor Yellow
Write-Host ""

Set-Location "$ProjectRoot"
npm run dev
"@ | Out-File -FilePath ".\scripts\start-frontend.ps1" -Encoding UTF8

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", ".\scripts\start-frontend.ps1"
Write-Host "  Frontend process started" -ForegroundColor Gray

if (-not $Quick) {
    Write-Host "  Waiting for frontend to initialize..." -ForegroundColor Gray

    $frontendReady = $false
    $frontendUrl = "http://localhost:5174"
    $maxAttempts = [math]::Ceiling($Timeout / 1)
    $attempt = 0

    while (-not $frontendReady -and $attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 1
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5174" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $frontendReady = $true
                $frontendUrl = "http://localhost:5174"
                Write-Success "Frontend is ready ($frontendUrl)"
            }
        }
        catch {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $frontendReady = $true
                    $frontendUrl = "http://localhost:3000"
                    Write-Success "Frontend is ready ($frontendUrl)"
                }
            }
            catch {
                if ($Verbose -and $attempt % 5 -eq 0) {
                    Write-Host "    Health check attempt $attempt/$maxAttempts..." -ForegroundColor Gray
                }
            }
        }
    }

    if (-not $frontendReady) {
        Write-Warning "Frontend health check timed out after $Timeout seconds"
        Write-Warning "Frontend may still be starting. Check the frontend window."
    }
}
else {
    $frontendUrl = "http://localhost:5174"
}
else {
    $frontendUrl = "http://localhost:5174"
    Write-Success "Frontend started (quick mode - no health check)"
}

Write-Host ""

# ============================================================
# STEP 7: MKDOCS SERVICE
# ============================================================
Write-Step "[7/7] Starting MkDocs service..."

if (Test-Path "mkdocs.yml") {
    # Check if port 8001 is already in use
    $mkdocsPortOpen = $false
    try {
        if (Test-NetConnection -ComputerName localhost -Port 8001 -InformationLevel Quiet) {
            $mkdocsPortOpen = $true
            Write-Success "MkDocs is already running on port 8001"
        }
    }
    catch {}

    if (-not $mkdocsPortOpen) {
        Write-Host "  Starting MkDocs server..." -ForegroundColor Gray
        
        # Create MkDocs startup script
        @"
`$host.UI.RawUI.WindowTitle = "GNDP Docs"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Documentation Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Docs URL: http://127.0.0.1:8001" -ForegroundColor Green
Write-Host ""
Write-Host "Starting mkdocs serve..." -ForegroundColor Yellow
Write-Host ""

Set-Location "$ProjectRoot"
`$python = "$ProjectRoot\venv\Scripts\python.exe"
& `$python -m mkdocs serve --dev-addr 127.0.0.1:8001
"@ | Out-File -FilePath ".\scripts\start-mkdocs.ps1" -Encoding UTF8

        # Start MkDocs in new window
        Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", ".\scripts\start-mkdocs.ps1"
        Write-Host "  MkDocs process started" -ForegroundColor Gray

        if (-not $Quick) {
            Write-Host "  Waiting for MkDocs to initialize..." -ForegroundColor Gray
            Start-Sleep -Seconds 5
        }
    }
}
else {
    Write-Warning "mkdocs.yml not found. Skipping MkDocs startup."
}

Write-Host ""

# ============================================================
# SYSTEM HEALTH SUMMARY
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "System Health Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Neo4j check
if (-not $SkipNeo4j) {
    try {
        $neo4jResponse = Invoke-WebRequest -Uri "http://localhost:7474" -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($neo4jResponse.StatusCode -eq 200) {
            Write-Host "  Neo4j:    ✓ Healthy (http://localhost:7474)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  Neo4j:    ✗ Not responding" -ForegroundColor Red
    }
}

# Backend check
try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 3
    if ($backendHealth.status -eq "ok") {
        Write-Host "  Backend:  ✓ Healthy (http://localhost:8000)" -ForegroundColor Green
    }
    else {
        Write-Host "  Backend:  ? Unknown status" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  Backend:  ✗ Not responding" -ForegroundColor Red
}

# RAG system check
try {
    $ragHealth = Invoke-RestMethod -Uri "http://localhost:8000/api/rag/health" -Method GET -TimeoutSec 3
    Write-Host "  RAG:      ✓ Healthy" -ForegroundColor Green
}
catch {
    Write-Host "  RAG:      ⚠ Check backend window for details" -ForegroundColor Yellow
}

# Frontend check
try {
    $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "  Frontend: ✓ Healthy ($frontendUrl)" -ForegroundColor Green
    }
}
catch {
    Write-Host "  Frontend: ✗ Not responding" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# FINAL SUMMARY
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP System Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access Points:" -ForegroundColor White
Write-Host "  • Frontend:  $frontendUrl" -ForegroundColor Cyan
Write-Host "  • Backend:   http://localhost:8000" -ForegroundColor Cyan
Write-Host "  • API Docs:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  • Health:    http://localhost:8000/health" -ForegroundColor Cyan
if (-not $SkipNeo4j) {
    Write-Host "  • Neo4j:     http://localhost:7474 (user: neo4j, pass: password)" -ForegroundColor Cyan
}
Write-Host "  • Postgres:  localhost:5432 (user: postgres, pass: postgres)" -ForegroundColor Cyan
if (Test-Path "mkdocs.yml") {
    Write-Host "  • MkDocs:    http://127.0.0.1:8001" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Services are running in separate windows." -ForegroundColor Gray
Write-Host "To stop all services, run: .\stop-system.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Log file: $LogFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Enter to close this window..." -ForegroundColor Yellow
Read-Host
