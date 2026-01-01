# Operations Guide

**System**: GNDP - Graph-Native Documentation Platform
**Version**: 1.0.0
**Last Updated**: 2025-12-25

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Monitoring](#monitoring)
3. [Backup & Recovery](#backup--recovery)
4. [Incident Response](#incident-response)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Performance Tuning](#performance-tuning)
7. [User Management](#user-management)
8. [Data Management](#data-management)

---

## Daily Operations

### Morning Health Check (5 minutes)

```bash
#!/bin/bash
# /usr/local/bin/morning-healthcheck.sh

echo "=== GNDP Health Check $(date) ==="

# 1. Check backend service
echo "1. Backend Service:"
systemctl is-active gndp-backend && echo "✓ Running" || echo "✗ Down"

# 2. Check API health endpoint
echo "2. API Health:"
curl -s http://localhost:8000/health | jq .status || echo "✗ API unreachable"

# 3. Check Neo4j
echo "3. Neo4j:"
systemctl is-active neo4j && echo "✓ Running" || echo "✗ Down"

# 4. Check disk space
echo "4. Disk Usage:"
df -h / | tail -1 | awk '{print $5 " used"}'

# 5. Check memory
echo "5. Memory Usage:"
free -h | grep Mem | awk '{print $3 "/" $2}'

# 6. Recent errors (last hour)
echo "6. Recent Errors:"
journalctl -u gndp-backend --since "1 hour ago" | grep -i error | wc -l

echo "=== Health Check Complete ==="
```

### Key Performance Indicators (KPIs)

Monitor daily:
- **API Uptime**: Target 99.9%
- **Response Time**: p95 < 2 seconds
- **Error Rate**: < 1%
- **Active Users**: Track concurrent sessions
- **Database Size**: Monitor growth rate

---

## Monitoring

### 1. Application Monitoring

#### Prometheus Metrics

Create metrics endpoint in `api/server.py`:

```python
from prometheus_fastapi_instrumentator import Instrumentator

@app.on_event("startup")
async def startup():
    Instrumentator().instrument(app).expose(app)
```

Access metrics:
```bash
curl http://localhost:8000/metrics
```

#### Key Metrics to Track

```yaml
# Application Metrics
- http_requests_total: Total HTTP requests
- http_request_duration_seconds: Request latency
- http_requests_exceptions_total: Exception count
- active_users: Concurrent users

# Database Metrics
- neo4j_queries_total: Query count
- neo4j_query_duration: Query latency
- chroma_index_size: Vector index size

# System Metrics
- cpu_usage_percent: CPU utilization
- memory_usage_bytes: Memory consumption
- disk_usage_bytes: Disk space used
```

### 2. Log Monitoring

#### Centralized Logging

```bash
# Install Filebeat for log shipping
sudo apt-get install filebeat

# Configure Filebeat
sudo vim /etc/filebeat/filebeat.yml
```

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/gndp/*.log
      - /var/log/nginx/*.log

output.elasticsearch:
  hosts: ["localhost:9200"]

setup.kibana:
  host: "localhost:5601"
```

#### Log Rotation

```bash
# /etc/logrotate.d/gndp
/var/log/gndp/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload gndp-backend
    endscript
}
```

### 3. Alert Configuration

#### Alertmanager Rules

```yaml
# /etc/prometheus/alert.rules.yml
groups:
  - name: gndp_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_exceptions_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      - alert: APIDown
        expr: up{job="gndp-backend"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "GNDP API is down"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Disk space below 10%"
```

### 4. Uptime Monitoring

#### External Monitoring

Use services like:
- **UptimeRobot**: Free tier for basic HTTP monitoring
- **Pingdom**: Comprehensive uptime monitoring
- **StatusCake**: Multi-location checks

Basic curl-based monitoring:
```bash
#!/bin/bash
# /usr/local/bin/uptime-check.sh

URL="https://yourdomain.com/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -ne 200 ]; then
    echo "ALERT: API health check failed with status $RESPONSE" | \
    mail -s "GNDP Down Alert" ops@yourdomain.com
fi
```

---

## Backup & Recovery

### 1. Backup Strategy

#### Full Backup Schedule

```
Daily:   Application data + incremental DB
Weekly:  Full database dump
Monthly: Complete system snapshot
```

#### Automated Backup Script

```bash
#!/bin/bash
# /usr/local/bin/gndp-backup.sh

set -e

BACKUP_DIR="/backups/gndp"
DATE=$(date +%Y%m%d_%H%M%S)
DAY=$(date +%A)

mkdir -p $BACKUP_DIR/{daily,weekly,monthly}

# Daily backup
echo "Starting daily backup..."

# 1. Application data
tar -czf $BACKUP_DIR/daily/data-$DATE.tar.gz \
    /var/www/gndp/data/atoms/ \
    /var/www/gndp/data/modules/ \
    /var/www/gndp/data/rules/

# 2. Neo4j incremental
neo4j-admin backup --backup-dir=$BACKUP_DIR/daily/neo4j-$DATE \
    --database=neo4j --type=incremental || \
neo4j-admin backup --backup-dir=$BACKUP_DIR/daily/neo4j-$DATE \
    --database=neo4j --type=full

# 3. Chroma vector DB
tar -czf $BACKUP_DIR/daily/chroma-$DATE.tar.gz \
    /var/lib/chroma/

# Weekly full backup (Sundays)
if [ "$DAY" == "Sunday" ]; then
    echo "Running weekly full backup..."

    neo4j-admin dump --database=neo4j \
        --to=$BACKUP_DIR/weekly/neo4j-full-$DATE.dump

    tar -czf $BACKUP_DIR/weekly/complete-$DATE.tar.gz \
        /var/www/gndp/
fi

# Monthly snapshot (1st of month)
if [ $(date +%d) == "01" ]; then
    echo "Running monthly snapshot..."

    tar -czf $BACKUP_DIR/monthly/full-system-$DATE.tar.gz \
        /var/www/gndp/ \
        /var/lib/chroma/ \
        /etc/nginx/sites-available/gndp \
        /etc/systemd/system/gndp-backend.service
fi

# Cleanup old backups
find $BACKUP_DIR/daily -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR/weekly -name "*.dump" -mtime +60 -delete
find $BACKUP_DIR/monthly -name "*.tar.gz" -mtime +365 -delete

# Verify latest backup
echo "Verifying backup integrity..."
tar -tzf $BACKUP_DIR/daily/data-$DATE.tar.gz > /dev/null && \
    echo "✓ Backup verified successfully"

# Log backup completion
echo "$(date): Backup completed successfully" >> /var/log/gndp/backup.log
```

Add to crontab:
```bash
# Daily at 2 AM
0 2 * * * /usr/local/bin/gndp-backup.sh
```

### 2. Offsite Backup

#### S3 Sync

```bash
#!/bin/bash
# /usr/local/bin/s3-sync-backups.sh

aws s3 sync /backups/gndp/ s3://your-backup-bucket/gndp/ \
    --storage-class GLACIER \
    --exclude "*/daily/*" \
    --exclude "*/weekly/*" \
    --delete

echo "$(date): S3 sync completed" >> /var/log/gndp/s3-sync.log
```

### 3. Recovery Procedures

#### Scenario 1: Application Data Corruption

```bash
# 1. Stop services
sudo systemctl stop gndp-backend nginx

# 2. Restore from latest backup
LATEST_BACKUP=$(ls -t /backups/gndp/daily/data-*.tar.gz | head -1)
tar -xzf $LATEST_BACKUP -C /

# 3. Verify data integrity
python /var/www/gndp/scripts/validate_schemas.py

# 4. Restart services
sudo systemctl start gndp-backend nginx

# 5. Verify
curl http://localhost:8000/health
```

#### Scenario 2: Database Recovery

```bash
# 1. Stop Neo4j
sudo systemctl stop neo4j

# 2. Restore from dump
neo4j-admin load --from=/backups/gndp/weekly/neo4j-full-20251224.dump \
    --database=neo4j --force

# 3. Start Neo4j
sudo systemctl start neo4j

# 4. Verify
cypher-shell -u neo4j -p <password> "MATCH (n) RETURN count(n)"
```

#### Scenario 3: Complete System Failure

```bash
# 1. Provision new server
# 2. Install dependencies (see DEPLOYMENT.md)

# 3. Restore complete system
tar -xzf /backups/gndp/monthly/full-system-20251201.tar.gz -C /

# 4. Restore databases
neo4j-admin load --from=/backups/gndp/weekly/neo4j-full-20251224.dump \
    --database=neo4j --force

tar -xzf /backups/gndp/daily/chroma-20251225.tar.gz -C /

# 5. Restore configurations
cp /backups/nginx.conf /etc/nginx/sites-available/gndp
cp /backups/gndp-backend.service /etc/systemd/system/

# 6. Start all services
sudo systemctl daemon-reload
sudo systemctl enable --now gndp-backend neo4j nginx

# 7. Verify full system
/usr/local/bin/morning-healthcheck.sh
```

### 4. Backup Verification

Monthly backup restoration test:

```bash
#!/bin/bash
# /usr/local/bin/test-restore.sh

# Create test environment
docker run -d --name test-restore \
    -v /backups/gndp:/backups \
    python:3.12-slim

# Restore and verify
docker exec test-restore bash -c "
    tar -xzf /backups/daily/data-*.tar.gz -C /tmp &&
    cd /tmp/var/www/gndp &&
    python scripts/validate_schemas.py
"

if [ $? -eq 0 ]; then
    echo "✓ Backup restoration test passed"
else
    echo "✗ Backup restoration test FAILED" | \
    mail -s "Backup Test Failure" ops@yourdomain.com
fi

# Cleanup
docker rm -f test-restore
```

---

## Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0 - Critical** | Complete outage | 15 minutes | API down, database unreachable |
| **P1 - High** | Major feature broken | 1 hour | Publishing fails, search broken |
| **P2 - Medium** | Minor feature impacted | 4 hours | Slow queries, UI glitch |
| **P3 - Low** | Cosmetic issue | 1 business day | Typo, minor styling |

### Incident Response Procedure

#### 1. Detection & Triage (0-5 minutes)

```bash
# Quick diagnostic script
#!/bin/bash
# /usr/local/bin/incident-triage.sh

echo "=== Incident Triage $(date) ==="

# Check all services
systemctl status gndp-backend neo4j nginx

# API health
curl -v http://localhost:8000/health

# Recent errors
journalctl -u gndp-backend --since "10 minutes ago" | grep -i error | tail -20

# Resource usage
top -bn1 | head -20

# Network connectivity
ping -c 3 8.8.8.8
```

#### 2. Immediate Mitigation (5-15 minutes)

```bash
# Common quick fixes:

# Restart backend
sudo systemctl restart gndp-backend

# Clear cache
redis-cli FLUSHALL

# Restart database connection pool
curl -X POST http://localhost:8000/admin/reset-pool

# Emergency rate limiting
sudo iptables -A INPUT -p tcp --dport 80 -m limit \
    --limit 10/minute --limit-burst 20 -j ACCEPT
```

#### 3. Investigation & Root Cause (15-60 minutes)

```bash
# Log analysis
tail -500 /var/log/gndp/error.log | grep -A 5 -B 5 "ERROR"

# Database query analysis
cypher-shell -u neo4j -p <password> "
CALL dbms.listQueries()
YIELD query, elapsedTimeMillis
WHERE elapsedTimeMillis > 1000
RETURN query, elapsedTimeMillis
ORDER BY elapsedTimeMillis DESC
"

# Check for resource exhaustion
dmesg | grep -i "out of memory"
```

#### 4. Resolution & Verification

```bash
# After fix applied:

# 1. Verify health
curl http://localhost:8000/health

# 2. Run smoke tests
python scripts/smoke_tests.py

# 3. Monitor for 15 minutes
watch -n 10 'curl -s http://localhost:8000/metrics | grep http_requests'
```

#### 5. Post-Incident Review

Document in incident log:
```markdown
## Incident Report: [DATE] - [TITLE]

**Severity**: P[0-3]
**Duration**: [START] - [END]
**Impact**: [Description of user impact]

### Timeline
- HH:MM - Issue detected
- HH:MM - Mitigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Verified resolved

### Root Cause
[Detailed explanation]

### Resolution
[What was done to fix]

### Prevention
- [ ] Action item 1
- [ ] Action item 2
```

---

## Maintenance Procedures

### 1. Routine Maintenance Windows

**Schedule**: First Sunday of each month, 2:00 AM - 4:00 AM

**Pre-Maintenance Checklist**:
- [ ] Notify users 72 hours in advance
- [ ] Full backup completed
- [ ] Rollback plan prepared
- [ ] Change request approved

### 2. Dependency Updates

```bash
#!/bin/bash
# /usr/local/bin/update-dependencies.sh

# 1. Backup current state
/usr/local/bin/gndp-backup.sh

# 2. Update Python packages
cd /var/www/gndp
source venv/bin/activate
pip list --outdated
pip install --upgrade -r requirements.txt

# 3. Update Node packages
npm outdated
npm update

# 4. Rebuild frontend
npm run build

# 5. Run tests
pytest tests/
npm test

# 6. Restart services
sudo systemctl restart gndp-backend
sudo systemctl reload nginx

# 7. Verify
curl http://localhost:8000/health
```

### 3. Database Maintenance

```bash
# Neo4j maintenance
cypher-shell -u neo4j -p <password> "
// Rebuild indexes
CALL db.index.fulltext.awaitEventuallyConsistentIndexRefresh();

// Clean up old transactions
CALL dbms.listTransactions() YIELD transactionId, elapsedTimeMillis
WHERE elapsedTimeMillis > 60000
RETURN transactionId;
"

# Chroma maintenance
python << EOF
import chromadb
client = chromadb.Client()
client.heartbeat()  # Health check
# Re-index if needed
EOF
```

### 4. Log Cleanup

```bash
# Manual log cleanup (if needed)
find /var/log/gndp/ -name "*.log" -mtime +90 -delete
journalctl --vacuum-time=90d
```

---

## Performance Tuning

### 1. API Optimization

```python
# Enable connection pooling
# In api/server.py

from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)
```

### 2. Database Query Optimization

```cypher
// Identify slow queries
CALL dbms.listQueries()
YIELD query, elapsedTimeMillis, allocatedBytes
WHERE elapsedTimeMillis > 1000
RETURN query, elapsedTimeMillis, allocatedBytes
ORDER BY elapsedTimeMillis DESC
LIMIT 10;

// Add indexes for frequent queries
CREATE INDEX atom_type_status IF NOT EXISTS
FOR (a:Atom) ON (a.type, a.status);
```

### 3. Frontend Optimization

```bash
# Analyze bundle size
npm run build -- --analyze

# Enable CDN for static assets
# Update nginx configuration
location /assets {
    expires 1y;
    add_header Cache-Control "public, immutable";
    proxy_pass https://cdn.yourdomain.com;
}
```

### 4. Caching Strategy

```python
# Add Redis caching
from redis import Redis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

redis = Redis(host='localhost', port=6379)
FastAPICache.init(RedisBackend(redis), prefix="gndp:")

@app.get("/api/atoms")
@cache(expire=300)  # Cache for 5 minutes
async def get_atoms():
    # Expensive query cached
    return atoms
```

---

## User Management

### 1. Access Control

```bash
# Add new user with specific role
python scripts/add_user.py \
    --username "john.doe" \
    --email "john@yourdomain.com" \
    --role "editor"

# Revoke access
python scripts/revoke_access.py --username "john.doe"

# List active users
python scripts/list_users.py --active
```

### 2. Audit Logging

```python
# Track all user actions
# In api/middleware.py

@app.middleware("http")
async def log_user_actions(request: Request, call_next):
    user = request.state.user
    action = f"{request.method} {request.url.path}"

    logger.info(f"User: {user.username} | Action: {action}")

    response = await call_next(request)
    return response
```

---

## Data Management

### 1. Data Retention Policy

```yaml
# Retention periods
- Active atoms: Indefinite
- Archived atoms: 7 years
- Audit logs: 1 year
- Performance metrics: 90 days
- Error logs: 30 days
```

### 2. Data Archival

```bash
#!/bin/bash
# /usr/local/bin/archive-old-data.sh

ARCHIVE_DATE=$(date -d "7 years ago" +%Y-%m-%d)

# Archive old atoms
python << EOF
import json
from pathlib import Path
from datetime import datetime

atoms_dir = Path("/var/www/gndp/data/atoms")
archive_dir = Path("/var/www/gndp/data/archive")

for atom_file in atoms_dir.glob("*.json"):
    with open(atom_file) as f:
        atom = json.load(f)

    if atom.get("archived_date") and \
       atom["archived_date"] < "$ARCHIVE_DATE":
        # Move to archive
        atom_file.rename(archive_dir / atom_file.name)
        print(f"Archived: {atom_file.name}")
EOF
```

### 3. Data Quality Checks

```bash
# Weekly data quality validation
python scripts/validate_schemas.py --strict
python scripts/check_orphans.py
python scripts/validate_relationships.py
```

---

## Escalation Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| **On-Call Engineer** | oncall@yourdomain.com | 24/7 |
| **DevOps Lead** | devops-lead@yourdomain.com | Business hours |
| **System Architect** | architect@yourdomain.com | Business hours |
| **CTO** | cto@yourdomain.com | Emergency only |

---

## Additional Resources

- [Deployment Guide](DEPLOYMENT.md)
- [Incident Runbooks](runbooks/)
- [API Documentation](https://yourdomain.com/docs)
- [Monitoring Dashboard](https://grafana.yourdomain.com)

---

**Document Version**: 1.0
**Last Reviewed**: 2025-12-25
**Next Review**: 2026-01-25
