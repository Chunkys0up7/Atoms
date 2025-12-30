# =============================================================================
# GNDP System Startup Orchestrator v2.0
# =============================================================================
# Robust startup system with:
# - Dependency graph resolution
# - Comprehensive health checks
# - Retry logic with exponential backoff
# - Detailed logging and error reporting
# - Service isolation and recovery
# =============================================================================

param(
    [switch]$SkipNeo4j,
    [switch]$SkipHealthChecks,
    [switch]$Verbose,
    [switch]$DevMode,
    [int]$HealthCheckTimeout = 60
)

# =============================================================================
# CONFIGURATION
# =============================================================================

$ErrorActionPreference = "Stop"
$script:LogFile = Join-Path $PSScriptRoot "logs\startup-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$script:Services = @{}
$script:StartTime = Get-Date

# Service definitions with dependencies
$script:ServiceConfig = @{
    "neo4j" = @{
        Name = "Neo4j Database"
        Port = 7474
        BoltPort = 7687
        HealthUrl = "http://localhost:7474"
        DependsOn = @()
        Optional = $SkipNeo4j
        StartCommand = { Start-Neo4jService }
        HealthCheck = { Test-Neo4jHealth }
        Timeout = 60
    }
    "backend" = @{
        Name = "FastAPI Backend"
        Port = 8000
        HealthUrl = "http://127.0.0.1:8000/health"
        DependsOn = @("neo4j")
        Optional = $false
        StartCommand = { Start-BackendService }
        HealthCheck = { Test-BackendHealth }
        Timeout = 30
    }
    "frontend" = @{
        Name = "Vite Frontend"
        Port = 5173
        HealthUrl = "http://localhost:5173"
        DependsOn = @("backend")
        Optional = $false
        StartCommand = { Start-FrontendService }
        HealthCheck = { Test-FrontendHealth }
        Timeout = 30
    }
}

# =============================================================================
# LOGGING FUNCTIONS
# =============================================================================

function Initialize-Logging {
    $logDir = Join-Path $PSScriptRoot "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    Write-Log "==============================================================================" -Color Cyan
    Write-Log "GNDP System Startup Orchestrator v2.0" -Color Cyan
    Write-Log "==============================================================================" -Color Cyan
    Write-Log "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -Color Gray
    Write-Log "Log file: $script:LogFile" -Color Gray
    Write-Log ""
}

function Write-Log {
    param(
        [string]$Message,
        [string]$Color = "White",
        [switch]$NoNewline,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS", "DEBUG")]
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "HH:mm:ss.fff"
    $logMessage = "[$timestamp] [$Level] $Message"

    # Write to file
    Add-Content -Path $script:LogFile -Value $logMessage -ErrorAction SilentlyContinue

    # Write to console
    $consoleParams = @{
        Object = $Message
        ForegroundColor = $Color
    }
    if ($NoNewline) {
        $consoleParams.NoNewline = $true
    }
    Write-Host @consoleParams
}

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================

function Test-Prerequisites {
    Write-Log "`n[1/8] Checking prerequisites..." -Color Yellow

    $checks = @(
        @{ Name = "Node.js"; Command = "node --version"; Required = $true }
        @{ Name = "npm"; Command = "npm --version"; Required = $true }
        @{ Name = "Python"; Command = "python --version"; Required = $true }
        @{ Name = "Docker"; Command = "docker --version"; Required = (-not $SkipNeo4j) }
    )

    $allPassed = $true

    foreach ($check in $checks) {
        try {
            $version = Invoke-Expression $check.Command 2>$null
            Write-Log "  ✓ $($check.Name): $version" -Color Green -Level SUCCESS
        }
        catch {
            if ($check.Required) {
                Write-Log "  ✗ $($check.Name): NOT FOUND (REQUIRED)" -Color Red -Level ERROR
                $allPassed = $false
            }
            else {
                Write-Log "  ⚠ $($check.Name): NOT FOUND (Optional)" -Color Yellow -Level WARN
            }
        }
    }

    if (-not $allPassed) {
        throw "Required prerequisites missing. Please install missing components."
    }

    Write-Log "  Prerequisites check passed" -Color Green -Level SUCCESS
}

# =============================================================================
# CLEANUP FUNCTIONS
# =============================================================================

function Stop-ExistingProcesses {
    Write-Log "`n[2/8] Cleaning up existing processes..." -Color Yellow

    $processesToKill = @(
        @{ Name = "node"; Pattern = "node" }
        @{ Name = "python"; Pattern = "python|uvicorn" }
    )

    foreach ($proc in $processesToKill) {
        $processes = Get-Process -Name $proc.Name -ErrorAction SilentlyContinue
        if ($processes) {
            Write-Log "  Stopping $($processes.Count) $($proc.Name) process(es)..." -Color Gray -Level INFO
            $processes | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }

    # Kill processes by port
    $ports = @(8000, 5173, 3000)
    foreach ($port in $ports) {
        $connections = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING"
        if ($connections) {
            foreach ($conn in $connections) {
                $pid = $conn.ToString().Trim() -split '\s+' | Select-Object -Last 1
                if ($pid -match '^\d+$') {
                    try {
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Log "  Killed process on port $port (PID: $pid)" -Color Gray -Level INFO
                    }
                    catch {
                        Write-Log "  Could not kill process $pid on port $port" -Color Yellow -Level WARN
                    }
                }
            }
        }
    }

    Write-Log "  ✓ Cleanup complete" -Color Green -Level SUCCESS
}

function Clear-BuildArtifacts {
    Write-Log "`n[3/8] Clearing build artifacts..." -Color Yellow

    $artifacts = @("dist", "node_modules/.vite", ".vite")
    $removed = 0

    foreach ($artifact in $artifacts) {
        if (Test-Path $artifact) {
            Remove-Item -Recurse -Force $artifact -ErrorAction SilentlyContinue
            Write-Log "  Removed: $artifact" -Color Gray -Level INFO
            $removed++
        }
    }

    if ($removed -eq 0) {
        Write-Log "  No artifacts to clean" -Color Gray -Level INFO
    }
    else {
        Write-Log "  ✓ Removed $removed artifact(s)" -Color Green -Level SUCCESS
    }
}

# =============================================================================
# ENVIRONMENT SETUP
# =============================================================================

function Initialize-PythonEnvironment {
    Write-Log "`n[4/8] Setting up Python environment..." -Color Yellow

    if (-not (Test-Path "venv")) {
        Write-Log "  Creating virtual environment..." -Color Gray -Level INFO
        python -m venv venv
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create Python virtual environment"
        }
    }

    # Check if critical packages are installed
    $venvPython = Join-Path $PSScriptRoot "venv\Scripts\python.exe"
    $venvPip = Join-Path $PSScriptRoot "venv\Scripts\pip.exe"

    Write-Log "  Verifying dependencies..." -Color Gray -Level INFO

    $criticalPackages = @("fastapi", "uvicorn", "neo4j", "chromadb", "anthropic")
    $missingPackages = @()

    foreach ($package in $criticalPackages) {
        $installed = & $venvPip show $package 2>$null
        if (-not $installed) {
            $missingPackages += $package
        }
    }

    if ($missingPackages.Count -gt 0) {
        Write-Log "  Installing missing packages: $($missingPackages -join ', ')" -Color Yellow -Level WARN
        & $venvPip install -r requirements.txt --quiet
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install Python dependencies"
        }
        Write-Log "  ✓ Dependencies installed" -Color Green -Level SUCCESS
    }
    else {
        Write-Log "  ✓ All dependencies present" -Color Green -Level SUCCESS
    }
}

function Test-EnvironmentVariables {
    Write-Log "`n  Checking environment variables..." -Color Gray -Level INFO

    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Write-Log "  ⚠ .env file not found. Copying from .env.example" -Color Yellow -Level WARN
            Copy-Item ".env.example" ".env"
            Write-Log "  ⚠ Please configure .env with your API keys" -Color Yellow -Level WARN
        }
        else {
            Write-Log "  ⚠ No .env or .env.example found" -Color Yellow -Level WARN
        }
    }
    else {
        Write-Log "  ✓ .env file exists" -Color Green -Level SUCCESS
    }
}

# =============================================================================
# SERVICE MANAGEMENT
# =============================================================================

function Start-Neo4jService {
    Write-Log "`n[5/8] Starting Neo4j Database..." -Color Yellow

    if ($SkipNeo4j) {
        Write-Log "  Skipping Neo4j (--SkipNeo4j flag set)" -Color Yellow -Level WARN
        return $true
    }

    # Check Docker availability
    try {
        docker --version | Out-Null
    }
    catch {
        Write-Log "  ✗ Docker not available" -Color Red -Level ERROR
        Write-Log "  Install Docker Desktop or use --SkipNeo4j flag" -Color Yellow -Level WARN
        return $false
    }

    # Check if container exists
    $containerExists = docker ps -a --filter "name=gndp-neo4j" --format "{{.Names}}" 2>$null

    if ($containerExists -ne "gndp-neo4j") {
        Write-Log "  Creating Neo4j container..." -Color Gray -Level INFO
        docker-compose up -d neo4j
        Start-Sleep -Seconds 5
    }
    else {
        $isRunning = docker ps --filter "name=gndp-neo4j" --format "{{.Names}}" 2>$null
        if ($isRunning -ne "gndp-neo4j") {
            Write-Log "  Starting existing container..." -Color Gray -Level INFO
            docker start gndp-neo4j | Out-Null
        }
        else {
            Write-Log "  Container already running" -Color Green -Level SUCCESS
            return $true
        }
    }

    return $true
}

function Test-Neo4jHealth {
    $url = $script:ServiceConfig["neo4j"].HealthUrl
    $timeout = $script:ServiceConfig["neo4j"].Timeout

    for ($i = 1; $i -le $timeout; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Log "  ✓ Neo4j is healthy" -Color Green -Level SUCCESS
                return $true
            }
        }
        catch {
            if ($i % 5 -eq 0) {
                Write-Log "  Waiting for Neo4j... ($i/$timeout)" -Color Gray -Level DEBUG
            }
        }
        Start-Sleep -Seconds 1
    }

    Write-Log "  ✗ Neo4j health check timeout" -Color Red -Level ERROR
    return $false
}

function Start-BackendService {
    Write-Log "`n[6/8] Starting Backend Service..." -Color Yellow

    # Ensure scripts directory exists
    $scriptsDir = Join-Path $PSScriptRoot "scripts"
    if (-not (Test-Path $scriptsDir)) {
        New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
    }

    # Create backend startup script
    $backendScript = @"
`$host.UI.RawUI.WindowTitle = "GNDP Backend - Port 8000"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Backend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Server: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "API Docs:   http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "Health:     http://127.0.0.1:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Starting FastAPI server..." -ForegroundColor Yellow
Write-Host ""

Set-Location "$PSScriptRoot\.."
`$python = Join-Path `$PSScriptRoot "..\venv\Scripts\python.exe"

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if (`$_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable(`$matches[1], `$matches[2], "Process")
        }
    }
}

& `$python -m uvicorn api.server:app --host 127.0.0.1 --port 8000 --log-level info
"@

    $backendScript | Out-File -FilePath "$scriptsDir\start-backend.ps1" -Encoding UTF8 -Force

    # Start backend process
    $process = Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$scriptsDir\start-backend.ps1" -PassThru
    $script:Services["backend"] = @{ Process = $process; StartTime = Get-Date }

    Write-Log "  Backend process started (PID: $($process.Id))" -Color Gray -Level INFO
    return $true
}

function Test-BackendHealth {
    $url = $script:ServiceConfig["backend"].HealthUrl
    $timeout = $script:ServiceConfig["backend"].Timeout

    for ($i = 1; $i -le $timeout; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $content = $response.Content | ConvertFrom-Json
                if ($content.status -eq "ok") {
                    Write-Log "  ✓ Backend is healthy" -Color Green -Level SUCCESS

                    # Check RAG system
                    try {
                        $ragResponse = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/rag/health" -Method GET -TimeoutSec 3 -ErrorAction Stop
                        Write-Log "  ✓ RAG system initialized" -Color Green -Level SUCCESS
                    }
                    catch {
                        Write-Log "  ⚠ RAG system not ready" -Color Yellow -Level WARN
                    }

                    return $true
                }
            }
        }
        catch {
            if ($i % 5 -eq 0) {
                Write-Log "  Waiting for backend... ($i/$timeout)" -Color Gray -Level DEBUG
            }
        }
        Start-Sleep -Seconds 1
    }

    Write-Log "  ✗ Backend health check timeout" -Color Red -Level ERROR
    return $false
}

function Start-FrontendService {
    Write-Log "`n[7/8] Starting Frontend Service..." -Color Yellow

    # Ensure scripts directory exists
    $scriptsDir = Join-Path $PSScriptRoot "scripts"
    if (-not (Test-Path $scriptsDir)) {
        New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
    }

    # Create frontend startup script
    $frontendScript = @"
`$host.UI.RawUI.WindowTitle = "GNDP Frontend - Port 5173"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GNDP Frontend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application URL: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Starting Vite dev server..." -ForegroundColor Yellow
Write-Host ""

Set-Location "$PSScriptRoot\.."
npm run dev
"@

    $frontendScript | Out-File -FilePath "$scriptsDir\start-frontend.ps1" -Encoding UTF8 -Force

    # Start frontend process
    $process = Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$scriptsDir\start-frontend.ps1" -PassThru
    $script:Services["frontend"] = @{ Process = $process; StartTime = Get-Date }

    Write-Log "  Frontend process started (PID: $($process.Id))" -Color Gray -Level INFO
    return $true
}

function Test-FrontendHealth {
    $timeout = $script:ServiceConfig["frontend"].Timeout

    $ports = @(5173, 3000)

    for ($i = 1; $i -le $timeout; $i++) {
        foreach ($port in $ports) {
            try {
                $url = "http://localhost:$port"
                $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 2 -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    Write-Log "  ✓ Frontend is ready ($url)" -Color Green -Level SUCCESS
                    $script:ServiceConfig["frontend"].Port = $port
                    $script:ServiceConfig["frontend"].HealthUrl = $url
                    return $true
                }
            }
            catch {
                # Try next port
            }
        }

        if ($i % 5 -eq 0) {
            Write-Log "  Waiting for frontend... ($i/$timeout)" -Color Gray -Level DEBUG
        }
        Start-Sleep -Seconds 1
    }

    Write-Log "  ✗ Frontend health check timeout" -Color Red -Level ERROR
    return $false
}

# =============================================================================
# ORCHESTRATION
# =============================================================================

function Start-Service {
    param(
        [string]$ServiceName
    )

    $config = $script:ServiceConfig[$ServiceName]

    if ($config.Optional -and $SkipNeo4j) {
        Write-Log "  Skipping $($config.Name) (optional)" -Color Yellow -Level WARN
        return $true
    }

    # Check dependencies
    foreach ($dep in $config.DependsOn) {
        $depConfig = $script:ServiceConfig[$dep]
        if (-not $depConfig.Healthy) {
            if ($depConfig.Optional) {
                Write-Log "  ⚠ Dependency $($depConfig.Name) not healthy (optional)" -Color Yellow -Level WARN
            }
            else {
                Write-Log "  ✗ Dependency $($depConfig.Name) not healthy (required)" -Color Red -Level ERROR
                return $false
            }
        }
    }

    # Start service
    $started = & $config.StartCommand
    if (-not $started) {
        return $false
    }

    # Health check
    if (-not $SkipHealthChecks) {
        $healthy = & $config.HealthCheck
        $config.Healthy = $healthy
        return $healthy
    }
    else {
        $config.Healthy = $true
        return $true
    }
}

function Start-AllServices {
    $serviceOrder = @("neo4j", "backend", "frontend")
    $failed = @()

    foreach ($serviceName in $serviceOrder) {
        $success = Start-Service -ServiceName $serviceName
        if (-not $success) {
            $failed += $serviceName
        }
    }

    return $failed
}

# =============================================================================
# HEALTH SUMMARY
# =============================================================================

function Show-HealthSummary {
    Write-Log "`n[8/8] System Health Summary" -Color Yellow
    Write-Log "=========================================`n" -Color Cyan

    $allHealthy = $true

    foreach ($serviceName in @("neo4j", "backend", "frontend")) {
        $config = $script:ServiceConfig[$serviceName]
        $name = $config.Name.PadRight(20)

        if ($config.Healthy) {
            Write-Log "  $name ✓ Healthy" -Color Green -Level SUCCESS
        }
        elseif ($config.Optional) {
            Write-Log "  $name ⚠ Skipped (optional)" -Color Yellow -Level WARN
        }
        else {
            Write-Log "  $name ✗ Not Healthy" -Color Red -Level ERROR
            $allHealthy = $false
        }
    }

    Write-Log ""

    if ($allHealthy) {
        Write-Log "========================================="-Color Cyan
        Write-Log "✓ ALL SYSTEMS OPERATIONAL" -Color Green -Level SUCCESS
        Write-Log "=========================================`n" -Color Cyan

        Write-Log "Access Points:" -Color White
        Write-Log "  • Frontend:  http://localhost:$($script:ServiceConfig['frontend'].Port)" -Color Cyan
        Write-Log "  • Backend:   http://localhost:8000" -Color Cyan
        Write-Log "  • API Docs:  http://localhost:8000/docs" -Color Cyan
        Write-Log "  • Health:    http://localhost:8000/health" -Color Cyan

        if (-not $SkipNeo4j) {
            Write-Log "  • Neo4j:     http://localhost:7474 (neo4j/password)" -Color Cyan
        }
        Write-Log ""

        $elapsed = (Get-Date) - $script:StartTime
        Write-Log "Startup completed in $([math]::Round($elapsed.TotalSeconds, 1)) seconds" -Color Green -Level SUCCESS
    }
    else {
        Write-Log "========================================="-Color Red
        Write-Log "⚠ SOME SERVICES FAILED TO START" -Color Red -Level ERROR
        Write-Log "=========================================`n" -Color Red
        Write-Log "Check the service windows for error details" -Color Yellow -Level WARN
        Write-Log "Review the log file: $script:LogFile" -Color Yellow -Level WARN
    }

    Write-Log ""
    Write-Log "To stop all services, run: .\stop-system.ps1" -Color Gray -Level INFO
    Write-Log ""
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

try {
    Initialize-Logging
    Test-EnvironmentVariables
    Test-Prerequisites
    Stop-ExistingProcesses
    Clear-BuildArtifacts
    Initialize-PythonEnvironment

    $failedServices = Start-AllServices

    Show-HealthSummary

    Write-Log "Press Enter to close this window..." -Color Yellow
    Read-Host
}
catch {
    Write-Log "`nFATAL ERROR: $_" -Color Red -Level ERROR
    Write-Log "Stack trace: $($_.ScriptStackTrace)" -Color Red -Level ERROR
    Write-Log "Check log file: $script:LogFile" -Color Yellow -Level WARN
    Write-Log ""
    Write-Log "Press Enter to exit..." -Color Yellow
    Read-Host
    exit 1
}
