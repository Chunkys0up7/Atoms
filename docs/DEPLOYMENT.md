# Production Deployment Guide

**System**: GNDP - Graph-Native Documentation Platform
**Version**: 1.0.0
**Last Updated**: 2025-12-25

---

## Overview

This guide covers production deployment of the GNDP system, including frontend (React/Vite), backend (FastAPI), and supporting services (Neo4j, Chroma vector DB).

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Architecture                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Frontend   │         │   Backend    │                  │
│  │  React/Vite  │────────▶│   FastAPI    │                  │
│  │  Port: 5173  │         │  Port: 8000  │                  │
│  └──────────────┘         └──────┬───────┘                  │
│                                   │                          │
│                          ┌────────┴────────┐                 │
│                          │                 │                 │
│                    ┌─────▼─────┐    ┌─────▼─────┐          │
│                    │  Neo4j    │    │  Chroma   │          │
│                    │  Graph DB │    │ Vector DB │          │
│                    │ Port: 7474│    │ Embedded  │          │
│                    └───────────┘    └───────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### System Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 8GB
- Disk: 20GB SSD
- OS: Ubuntu 20.04 LTS / Windows Server 2019 / macOS 12+

**Recommended:**
- CPU: 8 cores
- RAM: 16GB
- Disk: 50GB SSD
- OS: Ubuntu 22.04 LTS

### Software Dependencies

- **Node.js**: 18.x or higher
- **Python**: 3.12 or higher
- **Neo4j**: 5.x (optional, for graph features)
- **Git**: 2.x
- **Web Server**: Nginx 1.18+ or Apache 2.4+

---

## Environment Configuration

### 1. Environment Variables

Create `.env.production` file:

```bash
# API Configuration
VITE_API_URL=https://api.yourdomain.com
GEMINI_API_KEY=your-production-gemini-key

# Database URLs
NEO4J_URI=bolt://production-neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<secure-password>

# Security
SECRET_KEY=<generate-secure-random-key>
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Performance
WORKERS=4
MAX_CONNECTIONS=100

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
LOG_LEVEL=INFO
```

### 2. Generate Secure Keys

```bash
# Generate SECRET_KEY (Python)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate API key
openssl rand -hex 32
```

---

## Deployment Options

### Option A: Docker Deployment (Recommended)

#### 1. Create Dockerfile for Backend

```dockerfile
# Dockerfile.backend
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY api/ ./api/
COPY data/ ./data/

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "api.server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

#### 2. Create Dockerfile for Frontend

```dockerfile
# Dockerfile.frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 3. Docker Compose Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
      - "443:443"
    environment:
      - VITE_API_URL=http://backend:8000
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - NEO4J_URI=${NEO4J_URI}
      - NEO4J_USER=${NEO4J_USER}
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    volumes:
      - ./data:/app/data
    depends_on:
      - neo4j
      - chroma
    restart: unless-stopped

  neo4j:
    image: neo4j:5-community
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=${NEO4J_USER}/${NEO4J_PASSWORD}
      - NEO4J_dbms_memory_heap_max__size=2G
    volumes:
      - neo4j_data:/data
    restart: unless-stopped

  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma
    restart: unless-stopped

volumes:
  neo4j_data:
  chroma_data:
```

#### 4. Deploy with Docker

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

---

### Option B: Manual Deployment

#### 1. Backend Deployment

```bash
# Navigate to project directory
cd /var/www/gndp

# Create virtual environment
python3.12 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run with gunicorn (production WSGI server)
gunicorn api.server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile /var/log/gndp/access.log \
  --error-logfile /var/log/gndp/error.log \
  --daemon
```

#### 2. Frontend Deployment

```bash
# Build frontend
npm ci
npm run build

# Copy to web server
sudo cp -r dist/* /var/www/html/gndp/

# Set permissions
sudo chown -R www-data:www-data /var/www/html/gndp
```

#### 3. Nginx Configuration

```nginx
# /etc/nginx/sites-available/gndp
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /var/www/html/gndp;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/gndp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/TLS Configuration

### Using Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

---

## Database Setup

### Neo4j Production Configuration

```bash
# Edit Neo4j configuration
sudo vim /etc/neo4j/neo4j.conf

# Key settings:
dbms.memory.heap.initial_size=2G
dbms.memory.heap.max_size=4G
dbms.memory.pagecache.size=2G
dbms.security.auth_enabled=true
```

### Initialize Graph Database

```bash
# Run sync script
python scripts/sync_neo4j.py

# Verify
cypher-shell -u neo4j -p <password>
MATCH (n) RETURN count(n);
```

### Chroma Vector DB Setup

```bash
# Chroma runs embedded by default
# For production, consider running as a service

# Generate embeddings
python scripts/generate_embeddings.py
```

---

## Systemd Service Configuration

### Backend Service

```ini
# /etc/systemd/system/gndp-backend.service
[Unit]
Description=GNDP Backend API
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/gndp
Environment="PATH=/var/www/gndp/venv/bin"
ExecStart=/var/www/gndp/venv/bin/gunicorn \
  api.server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable gndp-backend
sudo systemctl start gndp-backend
sudo systemctl status gndp-backend
```

---

## Health Checks

### Backend Health Check

```bash
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-12-25T12:00:00Z"
}
```

### Frontend Health Check

```bash
curl http://localhost/

# Should return HTML with status 200
```

### Database Connectivity

```bash
# Neo4j
cypher-shell -u neo4j -p <password> "RETURN 1"

# Chroma (via API)
curl http://localhost:8000/api/rag/health
```

---

## Performance Optimization

### 1. Frontend Optimization

```bash
# Enable gzip compression in Nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript
           application/x-javascript application/xml+rss
           application/javascript application/json;
```

### 2. Backend Optimization

```python
# In api/server.py, enable caching
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost")
    FastAPICache.init(RedisBackend(redis), prefix="gndp:")
```

### 3. Database Indexes

```cypher
// Neo4j indexes
CREATE INDEX atom_id FOR (a:Atom) ON (a.id);
CREATE INDEX atom_type FOR (a:Atom) ON (a.type);
CREATE INDEX module_id FOR (m:Module) ON (m.id);
```

---

## Monitoring

### 1. Application Monitoring

**Recommended Tools:**
- Sentry (error tracking)
- Prometheus + Grafana (metrics)
- ELK Stack (logs)

### 2. Key Metrics to Monitor

- **API Response Time**: p50, p95, p99 latency
- **Error Rate**: 4xx and 5xx responses
- **Database Queries**: Query execution time
- **Memory Usage**: Backend and database memory
- **Disk Usage**: Database and log files

### 3. Log Files

```bash
# Backend logs
tail -f /var/log/gndp/error.log

# Nginx access logs
tail -f /var/log/nginx/access.log

# System logs
journalctl -u gndp-backend -f
```

---

## Backup Strategy

### 1. Database Backup

```bash
# Neo4j backup
neo4j-admin dump --database=neo4j --to=/backups/neo4j-$(date +%Y%m%d).dump

# Chroma backup (copy directory)
tar -czf /backups/chroma-$(date +%Y%m%d).tar.gz /var/lib/chroma/
```

### 2. Application Data Backup

```bash
# Backup atoms and modules
tar -czf /backups/data-$(date +%Y%m%d).tar.gz /var/www/gndp/data/
```

### 3. Automated Backup Script

```bash
#!/bin/bash
# /usr/local/bin/backup-gndp.sh

BACKUP_DIR=/backups/gndp
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Neo4j
neo4j-admin dump --database=neo4j --to=$BACKUP_DIR/neo4j-$DATE.dump

# Backup application data
tar -czf $BACKUP_DIR/data-$DATE.tar.gz /var/www/gndp/data/

# Backup Chroma
tar -czf $BACKUP_DIR/chroma-$DATE.tar.gz /var/lib/chroma/

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.dump" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

```bash
# Add to crontab
0 2 * * * /usr/local/bin/backup-gndp.sh
```

---

## Security Checklist

### Pre-Production Security

- [ ] Change all default passwords
- [ ] Generate secure API keys and secrets
- [ ] Enable HTTPS/TLS with valid certificate
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Set up rate limiting
- [ ] Enable CORS with specific origins only
- [ ] Disable debug mode in production
- [ ] Set secure HTTP headers
- [ ] Implement API authentication (JWT/OAuth)
- [ ] Regular security updates (OS, dependencies)
- [ ] Database connection encryption
- [ ] Environment variable protection (no .env in git)

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Rollback Procedure

### Quick Rollback

```bash
# Docker deployment
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# Manual deployment
cd /var/www/gndp
git checkout <previous-commit>
npm run build
sudo systemctl restart gndp-backend
sudo systemctl reload nginx
```

### Database Rollback

```bash
# Restore Neo4j from backup
neo4j-admin load --from=/backups/neo4j-20251224.dump --database=neo4j --force

# Restore Chroma
tar -xzf /backups/chroma-20251224.tar.gz -C /var/lib/
```

---

## Troubleshooting

### Common Issues

**Issue**: Backend not responding
**Solution**: Check systemd service status, review logs
```bash
sudo systemctl status gndp-backend
journalctl -u gndp-backend -n 50
```

**Issue**: Frontend shows 404
**Solution**: Check nginx configuration, verify build directory
```bash
sudo nginx -t
ls -la /var/www/html/gndp/
```

**Issue**: Database connection failed
**Solution**: Verify database is running, check credentials
```bash
sudo systemctl status neo4j
cypher-shell -u neo4j -p <password>
```

**Issue**: High memory usage
**Solution**: Reduce workers, check for memory leaks
```bash
htop
# Reduce workers in gunicorn command
```

---

## Post-Deployment Verification

### Checklist

1. [ ] Frontend accessible at https://yourdomain.com
2. [ ] API health check returns 200
3. [ ] All components visible and functional
4. [ ] Database connectivity confirmed
5. [ ] SSL certificate valid
6. [ ] Logs rotating correctly
7. [ ] Backups running on schedule
8. [ ] Monitoring alerts configured
9. [ ] Performance metrics within acceptable range
10. [ ] Security scan completed (no critical vulnerabilities)

### Smoke Tests

```bash
# Test API endpoints
curl https://yourdomain.com/api/atoms
curl https://yourdomain.com/api/modules
curl https://yourdomain.com/api/graph/full

# Test frontend routes
curl -I https://yourdomain.com/
curl -I https://yourdomain.com/ontology
curl -I https://yourdomain.com/glossary
```

---

## Support and Maintenance

### Update Procedure

```bash
# 1. Backup current version
/usr/local/bin/backup-gndp.sh

# 2. Pull latest code
cd /var/www/gndp
git pull origin main

# 3. Update dependencies
pip install -r requirements.txt
npm ci

# 4. Rebuild frontend
npm run build

# 5. Restart services
sudo systemctl restart gndp-backend
sudo systemctl reload nginx

# 6. Verify deployment
curl http://localhost:8000/health
```

### Maintenance Window

Recommended: Sunday 2:00 AM - 4:00 AM local time

---

## Additional Resources

- [FastAPI Deployment Docs](https://fastapi.tiangolo.com/deployment/)
- [Nginx Optimization Guide](https://www.nginx.com/blog/tuning-nginx/)
- [Neo4j Production Checklist](https://neo4j.com/docs/operations-manual/current/installation/)
- [Docker Production Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Document Version**: 1.0
**Last Reviewed**: 2025-12-25
**Next Review**: 2026-03-25
