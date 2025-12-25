# GNDP System Startup Guide

Complete guide for starting and managing the GNDP (Graph-Native Documentation Platform) system.

## Quick Start

### Automated Startup (Recommended)

```powershell
# Start entire system with health checks
.\start-system.ps1

# Stop all services
.\stop-system.ps1
```

The startup script will:
- Clean up existing processes
- Verify environment (Node.js, Python)
- Install dependencies if needed
- Start backend with health check polling
- Start frontend with port auto-detection
- Display system health summary

### Manual Startup

**Backend:**
```powershell
.\scripts\start-backend.ps1
```

**Frontend:**
```powershell
.\scripts\start-frontend.ps1
```

## System Requirements

### Required Software

| Component | Version | Download |
|-----------|---------|----------|
| Node.js | v18+ | https://nodejs.org |
| Python | 3.12+ | https://python.org |
| Git | Latest | https://git-scm.com |

### Optional Dependencies

| Component | Purpose | Required For |
|-----------|---------|--------------|
| Neo4j | Graph database | Graph operations, lineage tracking |
| ChromaDB | Vector database | RAG search, semantic indexing |

## Startup Process

### Step-by-Step Breakdown

#### 1. Process Cleanup (5 seconds)
```
[1/7] Cleaning up existing processes...
  Stopping existing Node.js processes...
  Stopping existing Python processes...
  ✓ Cleanup complete
```

Forcefully stops any running `node.exe` or `python.exe` processes to avoid port conflicts.

#### 2. Build Artifacts Cleanup (2 seconds)
```
[2/7] Cleaning build artifacts...
  Removed dist/
  Removed Vite cache
  ✓ Build artifacts cleaned
```

Removes:
- `dist/` - Previous Vite builds
- `node_modules/.vite` - Vite cache directory

#### 3. Environment Verification (1 second)
```
[3/7] Verifying environment...
  ✓ Node.js: v20.11.0
  ✓ Python: Python 3.12.1
```

Validates that required runtime environments are installed. **Exits with error code 1 if missing.**

#### 4. Dependency Check (5-60 seconds)
```
[4/7] Checking dependencies...
  ✓ Node.js dependencies OK
  ✓ Python venv OK
```

Auto-installs dependencies if missing:
- `npm install` - If `node_modules/` doesn't exist
- `python -m venv venv` - If `venv/` doesn't exist
- `pip install -r requirements.txt` - After creating venv

#### 5. Backend Startup (30 seconds)
```
[5/7] Starting backend service...
  Backend process started
  Waiting for backend to initialize...
    Attempt 5/30...
    Attempt 10/30...
  ✓ Backend is healthy (http://localhost:8000)
```

**Health Check Logic:**
- Polls `http://localhost:8000/health` every 1 second
- Max 30 attempts (30 seconds total)
- Expects `{"status": "ok"}` response
- Opens backend in separate PowerShell window

**Backend Window Shows:**
```
========================================
GNDP Backend Service
========================================

API Server: http://localhost:8000
API Docs:   http://localhost:8000/docs
Health:     http://localhost:8000/health

Starting FastAPI server...
```

#### 6. Frontend Startup (30 seconds)
```
[6/7] Starting frontend service...
  Frontend process started
  Waiting for frontend to initialize...
    Attempt 5/30...
  ✓ Frontend is ready (http://localhost:5173)
```

**Health Check Logic:**
- Tries `http://localhost:5173` (default Vite port)
- Falls back to `http://localhost:3000` (alternative port)
- Max 30 attempts (30 seconds total)
- Opens frontend in separate PowerShell window

**Frontend Window Shows:**
```
========================================
GNDP Frontend Service
========================================

Application URL: http://localhost:5173
                 (or check output below)

Starting Vite dev server...
```

#### 7. System Health Summary (5 seconds)
```
[7/7] System Health Summary

  Backend:  ✓ Healthy
  RAG:      ✓ Healthy
  Frontend: ✓ Healthy
```

**Checks Performed:**
1. `GET http://localhost:8000/health` → Backend status
2. `GET http://localhost:8000/api/rag/health` → RAG system (vector/graph DB)
3. `GET http://localhost:5173` → Frontend availability

## Access Points

After successful startup, you can access:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:5173 | Main application UI |
| **Backend API** | http://localhost:8000 | REST API endpoints |
| **API Docs** | http://localhost:8000/docs | Interactive Swagger UI |
| **Health Check** | http://localhost:8000/health | System health status |
| **RAG Health** | http://localhost:8000/api/rag/health | RAG subsystem status |

## Health Check Endpoints

### Backend Health (`/health`)

**Request:**
```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "ok"
}
```

**Status Codes:**
- `200` - Backend is healthy
- `503` - Backend not ready (still starting)

### RAG System Health (`/api/rag/health`)

**Request:**
```bash
curl http://localhost:8000/api/rag/health
```

**Response:**
```json
{
  "status": "healthy",
  "neo4j_connected": true,
  "chroma_connected": true,
  "llm_available": true,
  "graph_stats": {
    "atoms": 150,
    "relationships": 320
  }
}
```

**Checks:**
- Neo4j connection and graph stats
- ChromaDB connection and collections
- Gemini LLM availability

## Troubleshooting

### Backend Health Check Fails

**Symptoms:**
```
✗ WARNING: Backend health check timed out
Backend may still be starting. Check the backend window.
```

**Common Causes:**
1. **Python dependencies missing** - Check backend window for import errors
2. **Port 8000 in use** - Another process is using the port
3. **Environment variables missing** - Check `.env` file

**Solutions:**
```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process using port 8000 (replace PID)
taskkill /PID <PID> /F

# Reinstall Python dependencies
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Health Check Fails

**Symptoms:**
```
✗ WARNING: Frontend health check timed out
Frontend may still be starting. Check the frontend window.
```

**Common Causes:**
1. **npm dependencies missing** - Node modules not installed
2. **Port conflict** - Ports 5173 and 3000 both in use
3. **Build errors** - TypeScript or build errors in frontend window

**Solutions:**
```powershell
# Reinstall frontend dependencies
npm install

# Clear npm cache
npm cache clean --force
npm install

# Check for TypeScript errors
npm run build
```

### Environment Verification Fails

**Symptoms:**
```
✗ ERROR: Node.js not found
Please install Node.js from https://nodejs.org
```

**Solutions:**
1. Install missing runtime (Node.js or Python)
2. Verify installation: `node --version` and `python --version`
3. Add to PATH environment variable if installed but not detected

### Dependency Installation Fails

**Symptoms:**
```
✗ ERROR: npm install failed
```

**Common Causes:**
- Network issues downloading packages
- Insufficient disk space
- Permission errors

**Solutions:**
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install

# For Python issues
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

## Advanced Usage

### Custom Ports

To use custom ports, modify the startup scripts:

**Backend (port 9000):**
```powershell
# Edit scripts\start-backend.ps1
uvicorn server:app --reload --host 0.0.0.0 --port 9000
```

**Frontend (port 4000):**
```powershell
# Edit package.json
"scripts": {
  "dev": "vite --port 4000"
}
```

### Environment Variables

Create a `.env` file in the project root:

```env
# API Configuration
API_ADMIN_TOKEN=your-secret-token
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Database Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# AI Configuration
GEMINI_API_KEY=your-gemini-api-key
```

### Running in Production

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Docker containerization
- SSL/TLS configuration
- Database setup (Neo4j, ChromaDB)
- Environment hardening
- Performance optimization

## Service Management

### Stop All Services

```powershell
.\stop-system.ps1
```

Output:
```
========================================
GNDP System Shutdown
========================================

Stopping all GNDP services...

  - Stopping frontend (Node.js/Vite)...
    ✓ Frontend stopped
  - Stopping backend (Python/FastAPI)...
    ✓ Backend stopped

========================================
All services stopped
========================================
```

### Individual Service Control

**Stop backend only:**
```powershell
Get-Process -Name "python" | Stop-Process -Force
```

**Stop frontend only:**
```powershell
Get-Process -Name "node" | Stop-Process -Force
```

**Restart backend:**
```powershell
# Stop
Get-Process -Name "python" | Stop-Process -Force

# Start
.\scripts\start-backend.ps1
```

## Startup Script Customization

### Disable Health Checks

To skip health checks (faster startup, no validation):

```powershell
# Edit start-system.ps1 - Comment out health check sections

# Step 5: Start Backend (without health check)
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", ".\scripts\start-backend.ps1"
# Skip health check polling

# Step 6: Start Frontend (without health check)
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", ".\scripts\start-frontend.ps1"
# Skip health check polling
```

### Adjust Timeouts

Change `$maxAttempts` in [start-system.ps1](../start-system.ps1):

```powershell
# Default: 30 attempts = 30 seconds
$maxAttempts = 30

# Increase for slower machines
$maxAttempts = 60  # 60 seconds

# Decrease for faster startup
$maxAttempts = 15  # 15 seconds
```

## Logs and Debugging

### Backend Logs

Backend logs are displayed in the separate PowerShell window.

**To save logs to file:**
```powershell
# Edit scripts\start-backend.ps1
uvicorn server:app --reload --host 0.0.0.0 --port 8000 --log-level debug | Tee-Object -FilePath logs/backend.log
```

### Frontend Logs

Frontend logs (Vite output) are displayed in the separate PowerShell window.

**To save logs to file:**
```powershell
# Edit scripts\start-frontend.ps1
npm run dev | Tee-Object -FilePath logs/frontend.log
```

### Health Check Debugging

To see detailed health check responses:

```powershell
# Backend health
curl -v http://localhost:8000/health

# RAG health (detailed)
curl -v http://localhost:8000/api/rag/health

# Frontend (check HTML response)
curl -v http://localhost:5173
```

## Performance Optimization

### Faster Startup

1. **Keep dependencies cached** - Don't delete `node_modules/` or `venv/`
2. **Disable build cleanup** - Comment out Step 2 in startup script
3. **Skip health checks** - Remove polling loops (not recommended for production)

### Resource Usage

| Service | CPU (Idle) | Memory | Disk I/O |
|---------|------------|--------|----------|
| Backend | 1-2% | 200-400 MB | Low |
| Frontend | 0-1% | 100-200 MB | Low |
| Neo4j | 2-5% | 500 MB-2 GB | Medium |
| ChromaDB | 1-2% | 100-300 MB | Low |

## Next Steps

After successful startup:

1. **Verify Installation** - Run tests: `pytest tests/unit/ --cov=api`
2. **Explore API** - Visit http://localhost:8000/docs
3. **Load Sample Data** - Use ingestion engine to import atoms
4. **Configure RAG** - Index documents for semantic search
5. **Review Documentation** - See [README.md](../README.md) for features

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [OPERATIONS.md](OPERATIONS.md) - Day-to-day operations
- [TESTING.md](TESTING.md) - Testing strategy and examples
- [README.md](../README.md) - Project overview and features
