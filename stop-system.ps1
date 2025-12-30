# GNDP System Shutdown Script - Consolidated Edition
# Gracefully stops all backend and frontend services

param(
    [switch]$Force,          # Force kill processes without graceful shutdown
    [switch]$StopNeo4j,      # Also stop Neo4j Docker container
    [switch]$Verbose         # Show detailed output
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP System Shutdown" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$stoppedServices = 0

# ============================================================
# STOP FRONTEND (Node.js/Vite)
# ============================================================
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  - Stopping frontend (Node.js/Vite)..." -ForegroundColor Gray
    if ($Force) {
        $nodeProcesses | Stop-Process -Force
    } else {
        $nodeProcesses | ForEach-Object {
            $_.CloseMainWindow() | Out-Null
            Start-Sleep -Milliseconds 500
            if (-not $_.HasExited) {
                $_ | Stop-Process -Force
            }
        }
    }
    Write-Host "    ✓ Frontend stopped" -ForegroundColor Green
    $stoppedServices++
    if ($Verbose) {
        Write-Host "      Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ℹ No frontend processes running" -ForegroundColor Gray
}

# ============================================================
# STOP BACKEND (Python/FastAPI)
# ============================================================
$pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    Write-Host "  - Stopping backend (Python/FastAPI)..." -ForegroundColor Gray
    if ($Force) {
        $pythonProcesses | Stop-Process -Force
    } else {
        $pythonProcesses | ForEach-Object {
            $_.CloseMainWindow() | Out-Null
            Start-Sleep -Milliseconds 500
            if (-not $_.HasExited) {
                $_ | Stop-Process -Force
            }
        }
    }
    Write-Host "    ✓ Backend stopped" -ForegroundColor Green
    $stoppedServices++
    if ($Verbose) {
        Write-Host "      Stopped $($pythonProcesses.Count) Python process(es)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ℹ No backend processes running" -ForegroundColor Gray
}

# ============================================================
# STOP NEO4J (OPTIONAL)
# ============================================================
if ($StopNeo4j) {
    Write-Host "  - Checking Neo4j container..." -ForegroundColor Gray
    try {
        $neo4jRunning = docker ps --filter "name=gndp-neo4j" --format "{{.Names}}" 2>$null
        if ($neo4jRunning -eq "gndp-neo4j") {
            Write-Host "    Stopping Neo4j container..." -ForegroundColor Gray
            docker stop gndp-neo4j | Out-Null
            Write-Host "    ✓ Neo4j stopped" -ForegroundColor Green
            $stoppedServices++
        } else {
            Write-Host "    ℹ Neo4j container not running" -ForegroundColor Gray
        }
    } catch {
        Write-Host "    ⚠ Could not check Neo4j status (Docker may not be available)" -ForegroundColor Yellow
    }
}

# ============================================================
# CLEANUP TEMPORARY FILES (OPTIONAL)
# ============================================================
if ($Force) {
    Write-Host "  - Cleaning temporary files..." -ForegroundColor Gray

    # Remove log locks
    $logLocks = Get-ChildItem -Path ".\logs" -Filter "*.lock" -ErrorAction SilentlyContinue
    if ($logLocks) {
        $logLocks | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Host "    Removed log locks" -ForegroundColor Gray
    }

    # Remove PID files if they exist
    $pidFiles = Get-ChildItem -Path "." -Filter "*.pid" -ErrorAction SilentlyContinue
    if ($pidFiles) {
        $pidFiles | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Host "    Removed PID files" -ForegroundColor Gray
    }
}

Write-Host ""

# ============================================================
# SUMMARY
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
if ($stoppedServices -gt 0) {
    Write-Host "Stopped $stoppedServices service(s)" -ForegroundColor Green
} else {
    Write-Host "No services were running" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($Verbose) {
    Write-Host "Options used:" -ForegroundColor Gray
    Write-Host "  Force:      $Force" -ForegroundColor Gray
    Write-Host "  StopNeo4j:  $StopNeo4j" -ForegroundColor Gray
    Write-Host ""
}

# Usage hints
if (-not $StopNeo4j -and $stoppedServices -gt 0) {
    Write-Host "💡 Tip: Use -StopNeo4j to also stop the Neo4j Docker container" -ForegroundColor Cyan
    Write-Host ""
}
