# GNDP System Management Scripts

This document describes the automated system management scripts for starting and stopping the GNDP platform.

## Available Scripts

### `start-system.ps1` / `start-system.bat`

**Purpose**: Complete system startup with automated cleanup and service orchestration.

**What it does**:
1. **Process Cleanup** - Kills any existing Node.js and Python processes
2. **Build Artifact Cleanup** - Removes dist/, Vite cache, Python cache
3. **Environment Verification** - Checks Node.js, Python, and .env configuration
4. **Dependency Management** - Ensures node_modules and Python venv are ready
5. **Backend Startup** - Launches FastAPI server on port 8000 (separate window)
6. **Frontend Startup** - Launches Vite dev server on port 3000 (separate window)
7. **Health Checks** - Waits for both services to be ready

**Usage**:
```powershell
# PowerShell
.\start-system.ps1

# Command Prompt
start-system.bat

# Double-click in Windows Explorer
start-system.bat
```

**Requirements**:
- Node.js (tested with v18+)
- Python 3.11+
- `.env` file (will create template if missing)

### `stop-system.ps1` / `stop-system.bat`

**Purpose**: Gracefully shutdown all GNDP services.

**What it does**:
1. Stops all Node.js processes (frontend)
2. Stops all Python processes (backend)
3. Confirms shutdown

**Usage**:
```powershell
# PowerShell
.\stop-system.ps1

# Command Prompt
stop-system.bat

# Double-click in Windows Explorer
stop-system.bat
```

## Service URLs

After successful startup:
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **API Health**: http://localhost:8000/health

## First-Time Setup

1. **Configure .env file**:
   ```bash
   # Neo4j Configuration
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_password_here

   # Claude API
   ANTHROPIC_API_KEY=your_api_key_here

   # API Configuration
   API_ADMIN_TOKEN=your_admin_token_here
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
   ```

2. **Install dependencies** (handled automatically by start script):
   - Frontend: `npm install`
   - Backend: `python -m venv venv && venv\Scripts\pip install -r requirements.txt`

3. **Start Neo4j** (if using graph features):
   ```bash
   # Ensure Neo4j is running on bolt://localhost:7687
   ```

## Workflow

### Daily Development Workflow

```powershell
# Start your day
.\start-system.bat

# Work on frontend/backend
# Both services auto-reload on file changes

# End your day
.\stop-system.bat
```

### Troubleshooting

**Problem**: Services won't start
**Solution**: Run `stop-system.bat` first to cleanup, then `start-system.bat`

**Problem**: Port already in use
**Solution**: Check for processes on ports 3000 and 8000:
```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :8000
# Kill process by PID: taskkill /F /PID <pid>
```

**Problem**: Backend fails to start
**Solution**: Check .env configuration and ensure Python venv is activated:
```powershell
.\venv\Scripts\activate
cd api
uvicorn server:app --reload
```

**Problem**: Frontend fails to start
**Solution**: Clear Vite cache and node_modules:
```powershell
Remove-Item -Recurse -Force node_modules\.vite
npm install
npm run dev
```

## Manual Service Control

### Start Backend Only
```powershell
.\venv\Scripts\activate
cd api
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Start Frontend Only
```powershell
npm run dev
```

## Script Internals

### Startup Sequence

1. **Cleanup Phase** (1-2 seconds)
   - Kill existing processes
   - Remove build artifacts

2. **Verification Phase** (1-2 seconds)
   - Check Node.js and Python installations
   - Verify/create .env file
   - Check dependencies

3. **Backend Launch** (3-5 seconds)
   - Activate Python venv
   - Load environment variables
   - Start FastAPI with uvicorn
   - Wait for /health endpoint

4. **Frontend Launch** (5-10 seconds)
   - Start Vite dev server
   - Wait for HTTP 200 on localhost:3000

**Total startup time**: ~10-15 seconds

### Process Management

Both services run in **separate PowerShell windows**:
- **Advantage**: Independent logging, easy to monitor
- **Control**: Close window or Ctrl+C to stop individual service
- **Persistence**: Services continue running after startup script exits

## Environment Variables

The startup script automatically loads variables from `.env`:

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEO4J_URI` | Neo4j connection string | `bolt://localhost:7687` |
| `NEO4J_USER` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | *(required)* |
| `ANTHROPIC_API_KEY` | Claude API key | *(required for AI features)* |
| `API_ADMIN_TOKEN` | Admin API authentication | *(required)* |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000,...` |
| `PYTHONPATH` | Python module search path | `.` |

## Logs and Debugging

### Frontend Logs
- **Location**: Visible in frontend PowerShell window
- **Vite output**: Shows HMR updates, errors, build info

### Backend Logs
- **Location**: Visible in backend PowerShell window
- **FastAPI output**: Shows request logs, errors, startup info

### System Logs
- **Startup script output**: Main PowerShell window during startup

## Architecture

```
start-system.ps1
├── Cleanup
│   ├── Kill Node processes
│   └── Kill Python processes
├── Verify Environment
│   ├── Check Node.js
│   ├── Check Python
│   └── Check .env
├── Dependencies
│   ├── npm install (if needed)
│   └── pip install (if needed)
├── Launch Backend
│   ├── New PowerShell window
│   ├── Activate venv
│   ├── Start uvicorn
│   └── Health check loop
└── Launch Frontend
    ├── New PowerShell window
    ├── Start Vite
    └── Readiness check loop
```

## Security Notes

- `.env` file contains sensitive credentials - **never commit to git**
- API admin token should be a strong random string
- In production, use proper secret management (Azure Key Vault, AWS Secrets Manager, etc.)
- CORS origins should be restricted to known domains in production

## Platform Notes

These scripts are designed for **Windows** environments:
- PowerShell 5.1+ required
- For Linux/Mac, equivalent bash scripts would be needed
- Consider using Docker Compose for cross-platform deployment

## Future Enhancements

Potential improvements:
- [ ] Docker Compose integration
- [ ] Automatic Neo4j startup/shutdown
- [ ] Log file persistence
- [ ] Service health monitoring dashboard
- [ ] Automatic dependency updates check
- [ ] Database migration runner
- [ ] Test suite runner before startup

---

**Last Updated**: 2025-12-21
**Version**: 1.0.0
**Compatibility**: Windows 10/11, PowerShell 5.1+
