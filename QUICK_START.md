# GNDP Quick Start Guide

## System Status ✓

Both backend and frontend services are **RUNNING** and operational.

### Access Points

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | http://localhost:3000 | ✓ Running |
| **Backend API** | http://localhost:8000 | ✓ Running |
| **API Docs** | http://localhost:8000/docs | ✓ Available |
| **Health Check** | http://localhost:8000/health | ✓ OK |

### Current Configuration

- **CORS Origins**: Ports 3000, 3001, 5173, 8000 allowed
- **Python venv**: Active with core dependencies installed
- **Node modules**: Installed and cached

## Starting the System

### Option 1: Automated Startup (Recommended)

Double-click or run:
```bash
.\start-system.bat
```

This will:
1. Kill any existing processes
2. Clean build artifacts
3. Verify Node.js and Python
4. Check/install dependencies
5. Start backend on port 8000
6. Start frontend on port 3000

### Option 2: Manual Startup

**Backend:**
```powershell
.\venv\Scripts\activate
cd api
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```powershell
npm run dev
```

## Stopping the System

### Option 1: Automated Shutdown
```bash
.\stop-system.bat
```

### Option 2: Manual Shutdown
Close the PowerShell windows or press Ctrl+C in each terminal.

## Troubleshooting

### Backend Won't Start

**Problem:** `No module named uvicorn`
**Solution:**
```powershell
.\venv\Scripts\pip install uvicorn fastapi python-dotenv
```

**Problem:** Port 8000 already in use
**Solution:**
```powershell
Get-Process -Name python | Stop-Process -Force
```

### Frontend Won't Start

**Problem:** Port 3000 already in use
**Solution:**
```powershell
Get-Process -Name node | Stop-Process -Force
```

Frontend will auto-increment to 3001 if 3000 is busy (CORS is configured for both).

### CORS Errors

If you see CORS errors in browser console, verify `.env` has:
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:8000
```

Then restart the backend.

## Verify System is Working

### Test Backend
```bash
curl http://localhost:8000/health
# Expected: {"status":"ok"}

curl http://localhost:8000/api/atoms?limit=1
# Expected: JSON with atom data
```

### Test Frontend
Open http://localhost:3000 in browser - you should see the GNDP interface with:
- Sidebar navigation
- Atom explorer
- Graph visualization

## Key Features Available

### Workflow Management (NEW!)
- Navigate to **Workflows** in sidebar
- Create end-to-end business journeys
- Build modules from atoms
- Manage phases and sequences

### Ontology Browser (NEW!)
- Navigate to **Ontology** in sidebar
- Browse domains, types, edges
- Edit schema definitions
- Manage constraints

### Atom Explorer
- View all documentation atoms
- Filter by type, category, criticality
- Search by name or content

### Graph Visualization
- See atom relationships
- Multiple layout modes
- Module grouping
- Edge type filtering

## Development Workflow

1. **Make Changes** - Edit files in your IDE
2. **Auto-Reload** - Both services watch for changes
   - Frontend: Vite HMR (instant)
   - Backend: Uvicorn --reload (2-3 seconds)
3. **Test** - Refresh browser to see changes

## Important Files

| File | Purpose |
|------|---------|
| `.env` | Configuration (DO NOT COMMIT) |
| `vite.config.ts` | Frontend build config |
| `api/server.py` | Backend entry point |
| `atoms/` | YAML data files |
| `components/` | React UI components |

## Next Steps

- Explore the [SYSTEM_SCRIPTS.md](SYSTEM_SCRIPTS.md) for detailed automation docs
- Review [BUILDER_COMPONENTS_GUIDE.md](docs/BUILDER_COMPONENTS_GUIDE.md) for new features
- Check [docs-code-bank-arch.md](docs/docs-code-bank-arch.md) for architecture overview

---

**Last Updated**: 2025-12-21
**System Version**: v1.2.0
**Services**: Backend (FastAPI) + Frontend (Vite/React)
