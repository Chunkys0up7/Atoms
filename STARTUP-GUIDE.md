# GNDP System Startup Guide

## Quick Start

### Option 1: Using the V2 Orchestrator (Recommended)
```powershell
.\start-system-v2.ps1
```

### Option 2: Using Original Script
```powershell
.\start-system.ps1
```

### Option 3: Using Batch File
```cmd
start-system.bat
```

## System Architecture

### Service Dependency Graph
```
Neo4j Database (Port 7474/7687)
    ↓
FastAPI Backend (Port 8000)
    ↓
Vite Frontend (Port 5173)
```

### Service Details

| Service | Technology | Port | Health Check | Required |
|---------|-----------|------|--------------|----------|
| Neo4j | Docker Container | 7474, 7687 | http://localhost:7474 | Optional |
| Backend | Python/FastAPI | 8000 | http://127.0.0.1:8000/health | Yes |
| Frontend | Node.js/Vite | 5173 | http://localhost:5173 | Yes |

## Prerequisites

### Required Software
1. **Node.js** (v18+)
   - Download: https://nodejs.org
   - Verify: `node --version`

2. **Python** (v3.11+)
   - Download: https://python.org
   - Verify: `python --version`

3. **npm** (comes with Node.js)
   - Verify: `npm --version`

### Optional Software
4. **Docker Desktop** (for Neo4j)
   - Download: https://docker.com/products/docker-desktop
   - Verify: `docker --version`
   - Required for Graph Analytics features
   - Can skip with `--SkipNeo4j` flag

### Required Files
- `.env` (copy from `.env.example` and configure)
- `requirements.txt` (Python dependencies)
- `package.json` (Node dependencies)

## Environment Setup

### First Time Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd FullSystem
   ```

2. **Configure Environment Variables**
   ```powershell
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Install Dependencies**
   ```powershell
   # Python dependencies (auto-installed by startup script)
   python -m venv venv
   .\venv\Scripts\pip install -r requirements.txt

   # Node dependencies
   npm install
   ```

4. **Start Neo4j (Optional)**
   ```powershell
   docker-compose up -d neo4j
   ```

## Advanced Startup Options

### V2 Orchestrator Flags

```powershell
# Skip Neo4j if Docker not available
.\start-system-v2.ps1 -SkipNeo4j

# Skip health checks (faster startup, less safe)
.\start-system-v2.ps1 -SkipHealthChecks

# Verbose logging
.\start-system-v2.ps1 -Verbose

# Custom health check timeout (default: 60 seconds)
.\start-system-v2.ps1 -HealthCheckTimeout 90

# Development mode with all flags
.\start-system-v2.ps1 -DevMode -Verbose
```

## Troubleshooting

### Common Issues

#### 1. "Port already in use"

**Symptoms:**
- Services fail to start
- Error messages about ports 8000, 5173, or 7474

**Solutions:**
```powershell
# Stop all services
.\stop-system-v2.ps1

# Or manually kill processes by port
# For Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Then restart
.\start-system-v2.ps1
```

#### 2. "Python virtual environment missing dependencies"

**Symptoms:**
- Backend fails to start
- Import errors in backend window

**Solutions:**
```powershell
# Reinstall dependencies
.\venv\Scripts\pip install -r requirements.txt

# Or delete and recreate venv
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
```

#### 3. "Docker not available / Neo4j won't start"

**Symptoms:**
- Warning about Docker not found
- Graph Analytics features not working

**Solutions:**
```powershell
# Option 1: Install Docker Desktop
# Download from https://docker.com/products/docker-desktop

# Option 2: Skip Neo4j
.\start-system-v2.ps1 -SkipNeo4j

# Option 3: Start Neo4j manually
docker-compose up -d neo4j
# Then run startup script
.\start-system-v2.ps1
```

#### 4. "Frontend health check timeout"

**Symptoms:**
- Frontend service window opens but health check fails
- Vite takes longer than 30 seconds to start

**Solutions:**
```powershell
# Increase timeout
.\start-system-v2.ps1 -HealthCheckTimeout 90

# Clear Vite cache
Remove-Item -Recurse -Force node_modules/.vite
Remove-Item -Recurse -Force .vite

# Check for npm errors in frontend window
# May need to reinstall dependencies
Remove-Item -Recurse -Force node_modules
npm install
```

#### 5. "Backend health check timeout but server is running"

**Symptoms:**
- Backend window shows server running
- Health check still fails

**Solutions:**
```powershell
# Check health manually
curl http://127.0.0.1:8000/health

# Check if .env is configured
# Ensure ANTHROPIC_API_KEY is set

# Check backend logs in the backend window
# Look for errors during initialization
```

#### 6. "RAG system not initialized"

**Symptoms:**
- Backend starts but RAG health check fails
- Search features don't work

**Solutions:**
- Check that `rag-index` directory exists
- Verify OpenAI API key in `.env`
- May need to rebuild RAG index (first startup is slow)
- Check backend window for ChromaDB errors

### Service-Specific Debugging

#### Backend (FastAPI)
```powershell
# Manual start for debugging
.\venv\Scripts\python -m uvicorn api.server:app --host 127.0.0.1 --port 8000 --reload --log-level debug

# Check health
curl http://127.0.0.1:8000/health

# View API docs
# Open http://localhost:8000/docs in browser
```

#### Frontend (Vite)
```powershell
# Manual start for debugging
npm run dev

# With verbose output
npm run dev -- --debug

# Clear cache
npm run dev -- --force
```

#### Neo4j
```powershell
# Check container status
docker ps -a | findstr gndp-neo4j

# View logs
docker logs gndp-neo4j

# Restart container
docker restart gndp-neo4j

# Access Neo4j Browser
# Open http://localhost:7474 in browser
# Username: neo4j
# Password: password
```

## Log Files

### Startup Log
- Location: `logs/startup-YYYYMMDD-HHmmss.log`
- Contains detailed startup sequence and timestamps
- Useful for debugging timing issues

### Service Logs
- Backend: Check the "GNDP Backend" window
- Frontend: Check the "GNDP Frontend" window
- Neo4j: `docker logs gndp-neo4j`

## Performance Tuning

### Faster Startups

1. **Use Skip Health Checks** (risky)
   ```powershell
   .\start-system-v2.ps1 -SkipHealthChecks
   ```

2. **Keep Services Running**
   - Don't stop services between development sessions
   - Only restart when needed

3. **Pre-warm Python Environment**
   - Virtual environment creation is one-time
   - Dependencies are cached after first install

### Resource Optimization

1. **Neo4j Memory** (edit `docker-compose.yml`)
   ```yaml
   environment:
     - NEO4J_dbms_memory_heap_max__size=1G  # Default: 2G
     - NEO4J_dbms_memory_pagecache_size=512M  # Default: 1G
   ```

2. **Vite Build Cache**
   - `.vite` directory caches build artifacts
   - Automatically managed by startup script

## Shutdown

### Graceful Shutdown
```powershell
.\stop-system-v2.ps1
```

### What It Does
1. Stops all Node.js processes (Frontend)
2. Stops all Python processes (Backend)
3. Stops Neo4j Docker container
4. Cleans up temporary script files
5. Verifies all services stopped

### Force Shutdown
If graceful shutdown fails:
```powershell
# Kill all node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Kill all python processes
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force

# Stop Neo4j
docker stop gndp-neo4j
```

## Development Workflow

### Recommended Workflow

1. **Morning: Full Start**
   ```powershell
   .\start-system-v2.ps1
   ```

2. **During Development: Keep Running**
   - Services auto-reload on file changes
   - Backend: Uvicorn watches Python files
   - Frontend: Vite watches React files

3. **Backend Changes Only**
   - No need to restart frontend
   - Backend auto-reloads via Uvicorn

4. **Frontend Changes Only**
   - No need to restart backend
   - Vite HMR handles updates

5. **End of Day: Shutdown**
   ```powershell
   .\stop-system-v2.ps1
   ```

### Testing Changes

```powershell
# Run backend tests
.\venv\Scripts\pytest

# Run frontend tests
npm test

# Run linting
npm run lint

# Validate YAML atoms
npm run validate:atoms
```

## Health Check Endpoints

### Backend Health
```bash
GET http://127.0.0.1:8000/health
# Response: {"status": "ok"}
```

### RAG System Health
```bash
GET http://127.0.0.1:8000/api/rag/health
# Response: {"status": "initialized", "index_size": 123}
```

### Neo4j Health
```bash
GET http://localhost:7474
# Response: HTML page (200 OK)
```

### Frontend Health
```bash
GET http://localhost:5173
# Response: HTML page (200 OK)
```

## API Documentation

Once the system is running, access interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Support

### Getting Help

1. **Check Logs**
   - Startup log: `logs/startup-*.log`
   - Backend window output
   - Frontend window output

2. **Common Issues** (see Troubleshooting section above)

3. **GitHub Issues**
   - Report bugs with log files attached
   - Include system information (Windows version, Node version, Python version)

### System Information

To gather system info for bug reports:
```powershell
# Create system-info.txt
@"
Node: $(node --version)
npm: $(npm --version)
Python: $(python --version)
Docker: $(docker --version)
OS: $([System.Environment]::OSVersion)
"@ | Out-File system-info.txt
```

## Best Practices

1. **Always use the orchestrator scripts**
   - Don't start services manually in production
   - Scripts handle dependencies correctly

2. **Check health after startup**
   - Visit http://localhost:8000/health
   - Visit http://localhost:5173

3. **Monitor the service windows**
   - Keep them visible during development
   - Watch for errors or warnings

4. **Use proper shutdown**
   - Don't close windows directly
   - Use `stop-system-v2.ps1`

5. **Keep dependencies updated**
   - `npm update` for Node packages
   - `pip install --upgrade -r requirements.txt` for Python packages

## Differences Between V1 and V2 Scripts

| Feature | V1 (start-system.ps1) | V2 (start-system-v2.ps1) |
|---------|----------------------|--------------------------|
| Logging | Console only | File + Console |
| Health Checks | Basic | Comprehensive |
| Retries | Fixed attempts | Configurable |
| Dependencies | Sequential | Dependency-aware |
| Error Handling | Basic | Detailed with stack traces |
| Cleanup | Manual | Automatic |
| Flags | None | Multiple options |
| Service Isolation | No | Yes (separate processes) |

## Migration from V1 to V2

No migration needed! Both scripts work independently:

```powershell
# Try V2
.\start-system-v2.ps1

# If issues, fallback to V1
.\start-system.ps1
```

V2 is backwards compatible and uses the same:
- Environment variables (`.env`)
- Dependencies (`requirements.txt`, `package.json`)
- Service configurations

## FAQ

**Q: Which script should I use?**
A: Use V2 (`start-system-v2.ps1`) for better logging and error handling. Use V1 if you encounter issues.

**Q: Do I need Docker?**
A: Only for Graph Analytics (Neo4j). Skip with `-SkipNeo4j` flag.

**Q: How long should startup take?**
A: 30-60 seconds typically. First run may take 2-3 minutes (dependency installation).

**Q: Can I run multiple instances?**
A: No, ports are fixed. Stop existing instance first.

**Q: Where are logs stored?**
A: V2 logs in `logs/` directory. Service logs in their respective windows.

**Q: How do I update dependencies?**
A: `npm install` for Node, `pip install -r requirements.txt` for Python. Scripts auto-detect missing packages.

**Q: What if health checks fail?**
A: Check service windows for errors, verify `.env` configuration, ensure ports are free.
