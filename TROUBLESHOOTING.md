# GNDP System - Quick Troubleshooting Reference

## 🚀 Quick Fixes

### System Won't Start
```powershell
# 1. Stop everything
.\stop-system-v2.ps1

# 2. Clean restart
.\start-system-v2.ps1

# 3. If still failing, skip Neo4j
.\start-system-v2.ps1 -SkipNeo4j
```

### Port Conflicts
```powershell
# Kill processes on specific ports
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use stop script
.\stop-system-v2.ps1
```

### Python Dependencies Missing
```powershell
# Reinstall
.\venv\Scripts\pip install -r requirements.txt

# Nuclear option: recreate venv
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
```

## 🔍 Diagnostic Commands

### Check What's Running
```powershell
# Check ports
netstat -ano | findstr ":8000 :5173 :7474"

# Check processes
Get-Process | Where-Object {$_.Name -match "node|python|uvicorn"}

# Check Docker
docker ps | findstr gndp-neo4j
```

### Test Services Manually
```powershell
# Backend health
curl http://127.0.0.1:8000/health

# Frontend (in browser)
http://localhost:5173

# Neo4j (in browser)
http://localhost:7474
```

### View Logs
```powershell
# Startup logs
Get-ChildItem logs\startup-*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content

# Docker logs
docker logs gndp-neo4j --tail 50
```

## ⚠️ Common Error Messages

### "Port 8000 is already in use"
```
ERROR: [Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)
```
**Fix:**
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### "ModuleNotFoundError: No module named 'fastapi'"
```
ModuleNotFoundError: No module named 'fastapi'
```
**Fix:**
```powershell
.\venv\Scripts\pip install -r requirements.txt
```

### "Docker not found"
```
docker: The term 'docker' is not recognized
```
**Fix Options:**
1. Install Docker Desktop, OR
2. Run with `-SkipNeo4j` flag

### "Cannot connect to Neo4j"
```
ServiceUnavailable: Connection to Neo4j failed
```
**Fix:**
```powershell
# Start Neo4j
docker start gndp-neo4j

# Or skip it
.\start-system-v2.ps1 -SkipNeo4j
```

### "EADDRINUSE: address already in use :::5173"
```
Error: listen EADDRINUSE: address already in use :::5173
```
**Fix:**
```powershell
Get-Process -Name node | Stop-Process -Force
```

## 🛠️ Service-Specific Issues

### Backend Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| ImportError | Missing dependencies | `pip install -r requirements.txt` |
| Port 8000 in use | Previous process running | Kill process on port 8000 |
| Neo4j connection failed | Neo4j not running | Start Neo4j or use `-SkipNeo4j` |
| API_ADMIN_TOKEN not set | Missing .env | Copy from .env.example |
| RAG initialization failed | Missing OpenAI key | Set OPENAI_API_KEY in .env |

### Frontend Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Cannot find module" | Missing node_modules | `npm install` |
| Port 5173 in use | Previous process running | Kill Node processes |
| White screen | Backend not running | Start backend first |
| Build errors | Cache corruption | Delete `.vite` and `node_modules/.vite` |
| Slow startup | Large node_modules | Normal on first run |

### Neo4j Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Container not found | Never created | `docker-compose up -d neo4j` |
| Container exists but not running | Stopped | `docker start gndp-neo4j` |
| Port 7474 in use | Another Neo4j instance | Stop other instance |
| Out of memory | Insufficient Docker resources | Increase Docker memory limit |
| Connection refused | Still starting up | Wait 30 seconds, check logs |

## 📊 Health Check Matrix

| Service | URL | Expected Response | Timeout |
|---------|-----|-------------------|---------|
| Backend | http://127.0.0.1:8000/health | `{"status":"ok"}` | 30s |
| Frontend | http://localhost:5173 | HTML page (200) | 30s |
| Neo4j | http://localhost:7474 | HTML page (200) | 60s |
| RAG | http://127.0.0.1:8000/api/rag/health | `{"status":"initialized"}` | 30s |

## 🔧 Reset Procedures

### Soft Reset (Recommended)
```powershell
.\stop-system-v2.ps1
.\start-system-v2.ps1
```

### Medium Reset (Clear Caches)
```powershell
.\stop-system-v2.ps1
Remove-Item -Recurse -Force .vite, node_modules/.vite, dist
.\start-system-v2.ps1
```

### Hard Reset (Nuclear Option)
```powershell
# Stop everything
.\stop-system-v2.ps1

# Remove all generated files
Remove-Item -Recurse -Force venv, node_modules, .vite, dist, logs

# Reinstall dependencies
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
npm install

# Restart
.\start-system-v2.ps1
```

### Database Reset (Neo4j)
```powershell
# Stop and remove container
docker stop gndp-neo4j
docker rm gndp-neo4j

# Remove volumes (WARNING: Deletes all data)
docker volume rm fullsystem_neo4j_data

# Recreate
docker-compose up -d neo4j
```

## 🐛 Debug Mode

### Enable Verbose Logging
```powershell
# V2 Script
.\start-system-v2.ps1 -Verbose

# Backend manually
.\venv\Scripts\python -m uvicorn api.server:app --host 127.0.0.1 --port 8000 --log-level debug

# Frontend manually
npm run dev -- --debug
```

### Check Startup Logs
```powershell
# View latest startup log
notepad (Get-ChildItem logs\startup-*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
```

## 📝 Environment Variables Checklist

Verify `.env` file contains:

- [ ] `ANTHROPIC_API_KEY` (required for Claude)
- [ ] `OPENAI_API_KEY` (required for RAG/embeddings)
- [ ] `NEO4J_BOLT_URI=bolt://localhost:7687`
- [ ] `NEO4J_USER=neo4j`
- [ ] `NEO4J_PASSWORD=password`
- [ ] `API_ADMIN_TOKEN` (any secure string)

```powershell
# Quick check
Get-Content .env | Select-String "API_KEY"
```

## 🔄 Dependency Version Issues

### Check Versions
```powershell
# Node & npm
node --version  # Should be 18+
npm --version

# Python
python --version  # Should be 3.11+

# Docker
docker --version
```

### Update Dependencies
```powershell
# Update Node packages
npm update

# Update Python packages
.\venv\Scripts\pip install --upgrade -r requirements.txt

# Check for outdated packages
npm outdated
.\venv\Scripts\pip list --outdated
```

## 🚨 Emergency Procedures

### System Completely Unresponsive
```powershell
# 1. Force kill everything
Get-Process | Where-Object {$_.Name -match "node|python"} | Stop-Process -Force

# 2. Stop Docker
docker stop $(docker ps -aq)

# 3. Reboot if necessary
# Then start fresh
.\start-system-v2.ps1
```

### Backend Won't Stop
```powershell
# Find and kill by port
$pid = (netstat -ano | findstr :8000 | Select-String LISTENING).ToString().Trim() -split '\s+' | Select-Object -Last 1
taskkill /PID $pid /F
```

### Frontend Won't Stop
```powershell
# Kill all Node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

## 📚 Additional Resources

- **Full Guide**: [STARTUP-GUIDE.md](STARTUP-GUIDE.md)
- **API Docs**: http://localhost:8000/docs (when running)
- **Logs Directory**: `./logs/`
- **Environment Example**: `.env.example`

## 🔍 Still Having Issues?

1. **Check the logs**
   - Startup log: `logs/startup-*.log`
   - Backend window output
   - Frontend window output
   - Docker logs: `docker logs gndp-neo4j`

2. **Gather system info**
   ```powershell
   @"
   Node: $(node --version)
   npm: $(npm --version)
   Python: $(python --version)
   Docker: $(docker --version 2>$null)
   OS: $([System.Environment]::OSVersion)
   "@ | Out-File system-info.txt
   ```

3. **Create GitHub issue**
   - Include `system-info.txt`
   - Include relevant log files
   - Describe what you were doing when the error occurred

## 💡 Pro Tips

1. **Keep service windows visible** during development to catch errors early
2. **Use V2 scripts** for better error messages and logging
3. **Don't close service windows directly** - use stop script
4. **Check logs first** before asking for help
5. **Keep dependencies updated** but test after updates
6. **Use `-SkipNeo4j`** if you don't need graph features
7. **Increase timeout** if on slower hardware: `-HealthCheckTimeout 90`

## 🎯 Quick Decision Tree

```
System won't start?
├─ Ports in use?
│  └─ Run stop-system-v2.ps1
├─ Missing dependencies?
│  └─ pip install -r requirements.txt && npm install
├─ Docker issues?
│  └─ Use -SkipNeo4j flag
└─ Still failing?
   └─ Check logs/startup-*.log
```

## ⏱️ Expected Timing

| Stage | Expected Time | What If Longer? |
|-------|--------------|-----------------|
| Prerequisites check | 5s | Check if tools installed |
| Python env setup | 10-30s | First time: 2-3 min |
| Neo4j startup | 20-40s | Check Docker resources |
| Backend startup | 10-20s | Check Python errors |
| Frontend startup | 10-30s | Check npm errors |
| **Total** | **1-2 min** | **First run: 3-5 min** |

---

**Last Updated**: 2025-01-30
**Version**: 2.0
**Maintainer**: GNDP Development Team
