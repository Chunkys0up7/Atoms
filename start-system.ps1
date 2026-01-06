# GNDP Startup Script (Consolidated & Fixed)
param(
    [switch]$Quick, 
    [switch]$SkipNeo4j,
    [switch]$Verbose
)

Write-Host "Stage 0: Environmental Cleanup" -ForegroundColor Yellow
# Stop existing named windows
Get-Process | Where-Object { $_.MainWindowTitle -in "GNDP Backend", "GNDP Frontend", "GNDP Docs" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Stop processes on ports (8000, 8001, 5174)
$Ports = @(8000, 8001, 5174)
foreach ($Port in $Ports) {
    if (Get-Command "netstat" -ErrorAction SilentlyContinue) {
        $ProcId = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        if ($ProcId) {
            Stop-Process -Id $ProcId -Force -ErrorAction SilentlyContinue
            Write-Host "  Freed port $Port" -ForegroundColor Gray
        }
    }
}
Start-Sleep -Seconds 1

Write-Host "Stage 1: System Checks & Databases"

# Prerequisites Checks
node --version
python --version

if (-not $SkipNeo4j) {
    Write-Host "Starting Neo4j..."
    try { docker start gndp-neo4j } catch {}
    
    # Wait for Neo4j to be ready
    Write-Host "  Waiting for Neo4j (port 7687)..." -ForegroundColor Gray
    $neo4jReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            if (Test-NetConnection -ComputerName localhost -Port 7687 -InformationLevel Quiet) {
                $neo4jReady = $true
                break
            }
        }
        catch {}
        Start-Sleep -Seconds 2
    }
    
    if ($neo4jReady) {
        Write-Host "  Syncing Graph Data..." -ForegroundColor Cyan
        & python scripts/sync_neo4j.py --graph test_data/graph.json
    }
    else {
        Write-Warning "Neo4j did not start in time. Graph sync skipped."
    }
}

Write-Host "Starting Postgres..."
try { docker start gndp-postgres } catch {}

$ProjectRoot = (Get-Location).Path
Write-Host "Project Root: $ProjectRoot"

# ============================================================
# Backend Service
# ============================================================
Write-Host "Stage 2: Starting Backend Service..."
$backendLines = @(
    '$host.UI.RawUI.WindowTitle = "GNDP Backend"',
    'Write-Host "Starting API Proxy..."',
    '$env:ALLOWED_ORIGINS = "*"',
    "Set-Location `"$ProjectRoot`"",
    "& `"$ProjectRoot\venv\Scripts\python.exe`" -m uvicorn api.server:app --host 0.0.0.0 --port 8000 --log-level info"
)
$backendPath = ".\scripts\start-backend.ps1"
$backendLines | Out-File -FilePath $backendPath -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $backendPath

# ============================================================
# Frontend Service
# ============================================================
Write-Host "Stage 3: Starting Frontend Service..."
$frontendLines = @(
    '$host.UI.RawUI.WindowTitle = "GNDP Frontend"',
    'Write-Host "Starting Vite..."',
    "Set-Location `"$ProjectRoot`"",
    'npm run dev'
)
$frontendPath = ".\scripts\start-frontend.ps1"
$frontendLines | Out-File -FilePath $frontendPath -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $frontendPath

# ============================================================
# Documentation Service
# ============================================================
Write-Host "Stage 4: Starting MkDocs Service..."
if (Test-Path "mkdocs.yml") {
    $mkdocsLines = @(
        '$host.UI.RawUI.WindowTitle = "GNDP Docs"',
        'Write-Host "Starting MkDocs..."',
        "Set-Location `"$ProjectRoot`"",
        "& `"$ProjectRoot\venv\Scripts\python.exe`" -m mkdocs serve --dev-addr 127.0.0.1:8001"
    )
    $mkdocsPath = ".\scripts\start-mkdocs.ps1"
    $mkdocsLines | Out-File -FilePath $mkdocsPath -Encoding UTF8
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $mkdocsPath
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP System Started Successfully" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:8000"
Write-Host "Frontend: http://localhost:5174"
Write-Host "Docs:     http://127.0.0.1:8001"
Write-Host ""
