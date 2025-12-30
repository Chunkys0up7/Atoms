# =============================================================================
# GNDP System Shutdown Script v2.0
# =============================================================================
# Graceful shutdown with proper cleanup and verification
# =============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP System Shutdown" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# CONFIGURATION
# =============================================================================

$services = @(
    @{ Name = "Frontend (Vite)"; ProcessName = "node"; Port = @(5173, 3000) }
    @{ Name = "Backend (FastAPI)"; ProcessName = "python"; Port = @(8000) }
    @{ Name = "Neo4j (Docker)"; Container = "gndp-neo4j" }
)

# =============================================================================
# SHUTDOWN FUNCTIONS
# =============================================================================

function Stop-ServicesByPort {
    param([int[]]$Ports)

    foreach ($port in $Ports) {
        $connections = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING"
        if ($connections) {
            foreach ($conn in $connections) {
                $pid = $conn.ToString().Trim() -split '\s+' | Select-Object -Last 1
                if ($pid -match '^\d+$') {
                    try {
                        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                        if ($process) {
                            Write-Host "  Stopping process on port $port (PID: $pid, Name: $($process.Name))..." -ForegroundColor Gray
                            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                            Start-Sleep -Milliseconds 500
                            Write-Host "  ✓ Stopped" -ForegroundColor Green
                            return $true
                        }
                    }
                    catch {
                        Write-Host "  ⚠ Could not stop process $pid on port $port" -ForegroundColor Yellow
                    }
                }
            }
        }
    }
    return $false
}

function Stop-ServicesByName {
    param([string]$ProcessName)

    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host "  Found $($processes.Count) $ProcessName process(es)" -ForegroundColor Gray
        foreach ($proc in $processes) {
            try {
                Write-Host "  Stopping $ProcessName (PID: $($proc.Id))..." -ForegroundColor Gray
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Write-Host "  ✓ Stopped" -ForegroundColor Green
            }
            catch {
                Write-Host "  ⚠ Could not stop process $($proc.Id)" -ForegroundColor Yellow
            }
        }
        return $true
    }
    return $false
}

function Stop-DockerContainer {
    param([string]$ContainerName)

    try {
        $running = docker ps --filter "name=$ContainerName" --format "{{.Names}}" 2>$null
        if ($running -eq $ContainerName) {
            Write-Host "  Stopping Docker container: $ContainerName..." -ForegroundColor Gray
            docker stop $ContainerName 2>$null | Out-Null
            Write-Host "  ✓ Stopped" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "  Container $ContainerName not running" -ForegroundColor Gray
            return $false
        }
    }
    catch {
        Write-Host "  ⚠ Error stopping container: $_" -ForegroundColor Yellow
        return $false
    }
}

# =============================================================================
# MAIN SHUTDOWN SEQUENCE
# =============================================================================

Write-Host "[1/4] Stopping services by port..." -ForegroundColor Yellow
Write-Host ""

$stoppedAny = $false

foreach ($service in $services) {
    Write-Host "Stopping $($service.Name)..." -ForegroundColor White

    if ($service.Port) {
        $stopped = Stop-ServicesByPort -Ports $service.Port
        $stoppedAny = $stoppedAny -or $stopped
    }

    if ($service.ProcessName) {
        $stopped = Stop-ServicesByName -ProcessName $service.ProcessName
        $stoppedAny = $stoppedAny -or $stopped
    }

    if ($service.Container) {
        $stopped = Stop-DockerContainer -ContainerName $service.Container
        $stoppedAny = $stoppedAny -or $stopped
    }

    Write-Host ""
}

# =============================================================================
# VERIFICATION
# =============================================================================

Write-Host "[2/4] Verifying shutdown..." -ForegroundColor Yellow
Write-Host ""

$stillRunning = @()

# Check ports
foreach ($service in $services) {
    if ($service.Port) {
        foreach ($port in $service.Port) {
            $connections = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING"
            if ($connections) {
                $stillRunning += "$($service.Name) on port $port"
            }
        }
    }
}

# Check Docker
try {
    $running = docker ps --filter "name=gndp-neo4j" --format "{{.Names}}" 2>$null
    if ($running -eq "gndp-neo4j") {
        $stillRunning += "Neo4j container"
    }
}
catch {
    # Docker might not be running, that's okay
}

if ($stillRunning.Count -gt 0) {
    Write-Host "  ⚠ Still running:" -ForegroundColor Yellow
    foreach ($item in $stillRunning) {
        Write-Host "    - $item" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "  You may need to manually stop these services" -ForegroundColor Yellow
}
else {
    Write-Host "  ✓ All services stopped successfully" -ForegroundColor Green
}

Write-Host ""

# =============================================================================
# CLEANUP
# =============================================================================

Write-Host "[3/4] Cleaning up temporary files..." -ForegroundColor Yellow
Write-Host ""

$tempFiles = @(
    ".\scripts\start-backend.ps1",
    ".\scripts\start-frontend.ps1"
)

$cleaned = 0
foreach ($file in $tempFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed: $file" -ForegroundColor Gray
        $cleaned++
    }
}

if ($cleaned -eq 0) {
    Write-Host "  No temporary files to clean" -ForegroundColor Gray
}
else {
    Write-Host "  ✓ Cleaned $cleaned file(s)" -ForegroundColor Green
}

Write-Host ""

# =============================================================================
# SUMMARY
# =============================================================================

Write-Host "[4/4] Shutdown Summary" -ForegroundColor Yellow
Write-Host ""

if ($stillRunning.Count -eq 0 -and $stoppedAny) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✓ SHUTDOWN COMPLETE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
}
elseif ($stillRunning.Count -gt 0) {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "⚠ SHUTDOWN INCOMPLETE" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Some services are still running. Check manually:" -ForegroundColor Yellow
    foreach ($item in $stillRunning) {
        Write-Host "  - $item" -ForegroundColor Yellow
    }
}
else {
    Write-Host "========================================" -ForegroundColor Gray
    Write-Host "ℹ No services were running" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press Enter to close this window..." -ForegroundColor Yellow
Read-Host
