# GNDP Deployment Guide

Complete deployment guide for the Graph-Native Documentation Platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Environment Variables](#environment-variables)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Database Setup](#database-setup)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Monitoring & Logging](#monitoring--logging)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Python 3.12+**
- **Node.js 18+** and npm
- **Git**
- **Neo4j 5.x** (optional, for graph database features)

### Optional Tools

- **Docker** & Docker Compose (for containerized deployment)
- **MkDocs** (for documentation site)
- **Chroma** or **Pinecone** (for vector embeddings)

---

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/Chunkys0up7/Atoms.git
cd Atoms
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Current requirements:
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pyyaml>=6.0.1
neo4j>=5.14.0
python-multipart>=0.0.6
```

### 3. Install Node Dependencies (for Frontend)

```bash
npm install
```

### 4. Environment Setup

Create `.env.local` file:

```bash
# API Configuration
VITE_API_URL=http://localhost:8000
GEMINI_API_KEY=your-gemini-api-key-here

# Backend Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
API_ADMIN_TOKEN=your-secure-admin-token

# Neo4j Configuration (optional)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password

# Claude API (for PR analysis)
CLAUDE_API_KEY=your-claude-api-key

# OpenAI API (for embeddings)
OPENAI_API_KEY=your-openai-api-key
```

### 5. Build Documentation

```bash
# Validate schema
python builder.py validate

# Generate documentation
python builder.py build
```

### 6. Start Development Servers

**Backend (Terminal 1):**
```bash
python -m uvicorn api.server:app --reload --host 127.0.0.1 --port 8000
```

**Frontend (Terminal 2):**
```bash
npm run dev
```

**MkDocs Documentation (Terminal 3 - optional):**
```bash
mkdocs serve
```

### 7. Verify Setup

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health
- MkDocs Site: http://localhost:8000 (if running)

---

## Environment Variables

### Frontend (.env.local)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000` | No |
| `GEMINI_API_KEY` | Google Gemini API key for AI features | - | Yes* |

*Required only if using AI Assistant features

### Backend (Environment or .env)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `http://localhost:3000,...` | No |
| `API_ADMIN_TOKEN` | Admin token for `/api/trigger/sync` | - | Yes* |
| `NEO4J_URI` | Neo4j database connection URI | `bolt://localhost:7687` | No |
| `NEO4J_USER` | Neo4j username | `neo4j` | No |
| `NEO4J_PASSWORD` | Neo4j password | - | Yes** |
| `CLAUDE_API_KEY` | Claude API key for PR analysis | - | No |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | - | No |

*Required for admin operations
**Required if using Neo4j

---

## Backend Deployment

### Option 1: Traditional Server (Linux/Ubuntu)

#### 1. Install System Dependencies

```bash
sudo apt update
sudo apt install python3.12 python3.12-venv nginx
```

#### 2. Create Virtual Environment

```bash
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 3. Configure systemd Service

Create `/etc/systemd/system/gndp-api.service`:

```ini
[Unit]
Description=GNDP FastAPI Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/gndp
Environment="PATH=/var/www/gndp/venv/bin"
EnvironmentFile=/var/www/gndp/.env
ExecStart=/var/www/gndp/venv/bin/uvicorn api.server:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

#### 4. Configure Nginx

Create `/etc/nginx/sites-available/gndp`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /var/www/gndp/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/gndp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Enable and Start Services

```bash
sudo systemctl enable gndp-api
sudo systemctl start gndp-api
sudo systemctl status gndp-api
```

#### 6. Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile (Backend)

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "api.server:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - API_ADMIN_TOKEN=${API_ADMIN_TOKEN}
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USER=neo4j
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
    depends_on:
      - neo4j
    volumes:
      - ./atoms:/app/atoms:ro
      - ./modules:/app/modules:ro
      - ./docs/generated:/app/docs/generated

  neo4j:
    image: neo4j:5-community
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
    volumes:
      - neo4j_data:/data

volumes:
  neo4j_data:
```

#### 3. Deploy

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

---

## Frontend Deployment

### Option 1: Static Hosting (GitHub Pages, Netlify, Vercel)

#### 1. Build Production Bundle

```bash
npm run build
```

This creates optimized files in `dist/`.

#### 2. Deploy to GitHub Pages

Update `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/Atoms/',  // Replace with your repo name
  // ... rest of config
});
```

Add to `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

#### 3. Configure Environment

For GitHub Pages, create `.env.production`:

```bash
VITE_API_URL=https://your-api-domain.com
```

### Option 2: Nginx Static Files

```bash
# Build
npm run build

# Copy to nginx directory
sudo cp -r dist/* /var/www/gndp/
```

---

## Database Setup

### Neo4j Setup

#### Local Installation

```bash
# macOS
brew install neo4j
neo4j start

# Linux (Debian/Ubuntu)
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | sudo tee /etc/apt/sources.list.d/neo4j.list
sudo apt update
sudo apt install neo4j
sudo systemctl start neo4j
```

#### Configure Neo4j

Edit `/etc/neo4j/neo4j.conf`:

```conf
# Enable remote connections
dbms.default_listen_address=0.0.0.0

# Set memory limits
dbms.memory.heap.initial_size=512m
dbms.memory.heap.max_size=2G
dbms.memory.pagecache.size=1G
```

#### Initialize Graph

```bash
# Sync atoms and modules to Neo4j
python scripts/sync_neo4j.py --graph docs/generated/api/graph/full.json
```

### Vector Store Setup (Chroma)

#### Install Chroma

```bash
pip install chromadb
```

#### Generate Embeddings

```bash
# Generate embeddings for all atoms
python scripts/generate_embeddings.py --atoms atoms/ --output rag-index/
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

Current workflows in `.github/workflows/`:

#### 1. PR Validation (`pr-tests.yml`)

Runs on every pull request:
- Schema validation
- Integrity checks
- Unit tests
- Impact analysis

#### 2. Build & Deploy (`deploy.yml`)

Create this file for production deployment:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Validate schemas
        run: python builder.py validate

      - name: Build documentation
        run: python builder.py build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: generated-docs
          path: docs/generated/

  deploy-api:
    needs: build-docs
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /var/www/gndp
            git pull
            source venv/bin/activate
            pip install -r requirements.txt
            sudo systemctl restart gndp-api
```

### Required GitHub Secrets

Configure in repository settings → Secrets:

- `CLAUDE_API_KEY` - For PR analysis
- `DEPLOY_HOST` - Production server hostname
- `DEPLOY_USER` - SSH username
- `DEPLOY_KEY` - SSH private key
- `NEO4J_URI` - Production Neo4j URL
- `NEO4J_PASSWORD` - Neo4j password
- `OPENAI_API_KEY` - For embeddings generation

---

## Monitoring & Logging

### Application Logging

Add to FastAPI server:

```python
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/gndp/api.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
```

### Health Monitoring

Use `/health` endpoint for monitoring:

```bash
# Simple monitoring script
curl -f http://localhost:8000/health || systemctl restart gndp-api
```

### Log Rotation

Configure `/etc/logrotate.d/gndp`:

```
/var/log/gndp/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload gndp-api > /dev/null 2>&1 || true
    endscript
}
```

---

## Security

### Best Practices

1. **HTTPS Only** - Always use SSL/TLS in production
2. **Environment Variables** - Never commit secrets to Git
3. **CORS** - Restrict to known origins only
4. **Rate Limiting** - Implement API rate limiting
5. **Authentication** - Add OAuth/JWT for sensitive endpoints
6. **Input Validation** - Validate all user inputs
7. **Security Headers** - Use helmet.js or similar

### Nginx Security Headers

Add to nginx config:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

### API Rate Limiting

Install slowapi:

```bash
pip install slowapi
```

Add to `api/server.py`:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/atoms")
@limiter.limit("100/minute")
def list_atoms(request: Request):
    # ... existing code
```

---

## Troubleshooting

### Common Issues

#### 1. ModuleNotFoundError: No module named 'api'

**Problem:** Running uvicorn from wrong directory

**Solution:**
```bash
# Wrong
cd api && python -m uvicorn server:app

# Correct
python -m uvicorn api.server:app
```

#### 2. CORS Errors in Browser

**Problem:** Frontend can't access API

**Solution:** Check `ALLOWED_ORIGINS` environment variable:
```bash
export ALLOWED_ORIGINS="http://localhost:5173,https://yourdomain.com"
```

#### 3. Graph Not Found (404)

**Problem:** Documentation not generated

**Solution:**
```bash
python builder.py build
```

#### 4. Neo4j Connection Refused

**Problem:** Neo4j not running or wrong credentials

**Solution:**
```bash
# Check Neo4j status
sudo systemctl status neo4j

# Check connection
curl http://localhost:7474

# Verify credentials in .env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

#### 5. UTF-8 Encoding Errors on Windows

**Problem:** Unicode characters fail to encode

**Solution:** Already fixed in all Python scripts with `encoding='utf-8'`

### Log Files

Check these locations for debugging:

- **API Logs:** `/var/log/gndp/api.log` (or `stderr` in development)
- **Nginx Logs:** `/var/log/nginx/error.log`
- **Neo4j Logs:** `/var/log/neo4j/neo4j.log`
- **systemd Logs:** `journalctl -u gndp-api -f`

### Performance Issues

1. **Slow API Responses:**
   - Check database query performance
   - Enable caching for static graph data
   - Consider CDN for static assets

2. **High Memory Usage:**
   - Limit Neo4j heap size in neo4j.conf
   - Use pagination for large atom lists
   - Profile Python code with cProfile

3. **Build Takes Too Long:**
   - Run validation and build separately
   - Cache build artifacts
   - Use incremental builds

---

## Production Checklist

Before deploying to production:

- [ ] All environment variables configured
- [ ] HTTPS/SSL enabled
- [ ] CORS properly restricted
- [ ] Rate limiting enabled
- [ ] API admin token set
- [ ] Neo4j password changed from default
- [ ] Backups configured
- [ ] Monitoring & alerts set up
- [ ] Log rotation configured
- [ ] Security headers added
- [ ] Error tracking (Sentry, etc.) configured
- [ ] Load testing completed
- [ ] Documentation site deployed
- [ ] CI/CD pipeline tested
- [ ] Rollback procedure documented

---

## Support & Resources

- **GitHub Repository:** https://github.com/Chunkys0up7/Atoms
- **Documentation:** See [docs/](docs/) directory
- **Architecture:** [docs/GNDP-Architecture.md](docs/GNDP-Architecture.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Action Plan:** [CURRENT_ACTION_PLAN.md](CURRENT_ACTION_PLAN.md)

---

*Last Updated: 2025-12-18*
*Version: 0.1.0*
