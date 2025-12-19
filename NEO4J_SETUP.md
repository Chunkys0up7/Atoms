# Neo4j Setup Guide for GNDP

Complete guide for setting up Neo4j graph database for the Graph-Native Documentation Platform.

## Prerequisites

- Docker and Docker Compose OR
- Neo4j Desktop OR
- Neo4j Server (self-hosted)

## Option 1: Docker Compose (Recommended for Development)

### Quick Start

```bash
# Start all services (Neo4j + API + Frontend)
docker-compose up -d

# Check Neo4j is running
docker-compose logs neo4j

# Access Neo4j Browser
open http://localhost:7474

# Default credentials
Username: neo4j
Password: password
```

### Verify Connection

```bash
# Check health
curl http://localhost:8000/api/rag/health

# Expected output
{
  "neo4j_connected": true,
  "graph_atom_count": 0,
  "neo4j_uri": "bolt://neo4j:7687"
}
```

### Load Data

```bash
# Build graph from atoms
docker-compose exec api python docs/build_docs.py --source atoms --output docs/generated

# Sync to Neo4j
docker-compose exec api python scripts/sync_neo4j.py --graph docs/generated/api/graph/full.json
```

## Option 2: Neo4j Desktop (Recommended for Local Development)

### Install

1. Download Neo4j Desktop: https://neo4j.com/download/
2. Install and create a new project
3. Create a new database:
   - Name: GNDP
   - Version: 5.15 or later
   - Password: password (or your choice)

### Configure

1. Start the database
2. Note the Bolt URL (usually `bolt://localhost:7687`)
3. Update `.env`:

```bash
NEO4J_BOLT_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

### Install Plugins (Optional but Recommended)

1. Open database settings
2. Go to Plugins tab
3. Install:
   - APOC (Awesome Procedures on Cypher)
   - Graph Data Science Library

## Option 3: Neo4j Aura (Cloud/Production)

### Setup

1. Go to https://neo4j.com/cloud/aura/
2. Create free instance or paid tier
3. Note connection details:
   - URI: `neo4j+s://xxxxx.databases.neo4j.io`
   - Username: `neo4j`
   - Password: (generated)

### Configure

Update `.env`:

```bash
NEO4J_BOLT_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-generated-password
```

## Verify Installation

### 1. Test Connection

```python
# test_neo4j.py
from neo4j import GraphDatabase

uri = "bolt://localhost:7687"
driver = GraphDatabase.driver(uri, auth=("neo4j", "password"))

with driver.session() as session:
    result = session.run("RETURN 1 as num")
    print(f"Connection successful: {result.single()['num']}")

driver.close()
```

Run:
```bash
python test_neo4j.py
```

### 2. Test with API

```bash
# Start API
python -m uvicorn api.server:app --reload

# Check health
curl http://localhost:8000/api/rag/health | jq .neo4j_connected

# Should return: true
```

## Load GNDP Data

### Build Graph

```bash
# Generate graph JSON from atoms
python docs/build_docs.py --source atoms --output docs/generated

# Verify graph file exists
ls -lh docs/generated/api/graph/full.json
```

### Sync to Neo4j

```bash
# Dry run (validate only)
python scripts/sync_neo4j.py --graph docs/generated/api/graph/full.json --dry-run

# Actual sync
python scripts/sync_neo4j.py --graph docs/generated/api/graph/full.json

# Expected output:
# Graph OK: 23 nodes, 45 edges in docs/generated/api/graph/full.json
# Neo4j sync complete
```

### Verify Data

Open Neo4j Browser (http://localhost:7474) and run:

```cypher
// Count atoms
MATCH (a:Atom) RETURN count(a) as atom_count

// Count relationships
MATCH ()-[r]->() RETURN count(r) as rel_count

// Show sample
MATCH (a:Atom) RETURN a LIMIT 10

// Show relationship types
MATCH ()-[r]->() RETURN type(r), count(r) ORDER BY count(r) DESC
```

## Query Examples

### Find All Requirements

```cypher
MATCH (a:Atom {type: 'requirement'})
RETURN a.id, a.title, a.summary
```

### Find Implementation Chain

```cypher
MATCH (req:Atom {id: 'REQ-001', type: 'requirement'})
OPTIONAL MATCH (req)<-[:implements]-(design:Atom {type: 'design'})
OPTIONAL MATCH (design)<-[:implements]-(proc:Atom {type: 'procedure'})
OPTIONAL MATCH (design)<-[:validates]-(val:Atom {type: 'validation'})
RETURN req, design, proc, val
```

### Find Downstream Impacts

```cypher
MATCH (a:Atom {id: 'REQ-001'})<-[r:requires|depends_on|affects*1..3]-(downstream)
RETURN downstream.id, downstream.type, [rel in r | type(rel)] as path
```

## Troubleshooting

### Connection Refused

**Problem:** `Neo4j connection failed: Could not resolve address`

**Solution:**
1. Check Neo4j is running: `docker-compose ps` or Neo4j Desktop
2. Verify port 7687 is open: `netstat -an | grep 7687`
3. Check firewall settings
4. Verify URI in .env matches your setup

### Authentication Failed

**Problem:** `AuthError: The client is unauthorized`

**Solution:**
1. Verify credentials in .env
2. Check default password hasn't changed
3. Reset password in Neo4j Browser if needed

### Out of Memory

**Problem:** `java.lang.OutOfMemoryError`

**Solution:**
Edit `docker-compose.yml`:
```yaml
environment:
  - NEO4J_dbms_memory_heap_max__size=4G  # Increase from 2G
  - NEO4J_dbms_memory_pagecache_size=2G  # Increase from 1G
```

### No Data After Sync

**Problem:** `atom_count: 0` after sync

**Solution:**
1. Check graph JSON exists and has data:
   ```bash
   cat docs/generated/api/graph/full.json | jq '.nodes | length'
   ```
2. Verify sync ran without errors:
   ```bash
   python scripts/sync_neo4j.py --graph docs/generated/api/graph/full.json
   ```
3. Clear database and retry:
   ```cypher
   MATCH (n) DETACH DELETE n
   ```

## Performance Tuning

### Indexes

Create indexes for faster queries:

```cypher
// Index on atom IDs
CREATE INDEX atom_id_index IF NOT EXISTS FOR (a:Atom) ON (a.id);

// Index on atom types
CREATE INDEX atom_type_index IF NOT EXISTS FOR (a:Atom) ON (a.type);

// Show indexes
SHOW INDEXES;
```

### Memory Configuration

For production (edit neo4j.conf or docker-compose.yml):

```
# Heap size (JVM)
NEO4J_dbms_memory_heap_initial__size=4G
NEO4J_dbms_memory_heap_max__size=8G

# Page cache (graph data)
NEO4J_dbms_memory_pagecache_size=4G

# Transaction log
NEO4J_dbms_tx__log_rotation_retention__policy=7 days
```

## Backup and Restore

### Backup

```bash
# Using docker-compose
docker-compose exec neo4j neo4j-admin database dump neo4j --to-path=/backups

# Copy backup from container
docker cp gndp-neo4j:/backups/neo4j.dump ./backups/
```

### Restore

```bash
# Copy backup to container
docker cp ./backups/neo4j.dump gndp-neo4j:/backups/

# Stop database
docker-compose stop neo4j

# Restore
docker-compose exec neo4j neo4j-admin database load neo4j --from-path=/backups

# Start database
docker-compose start neo4j
```

## Monitoring

### Health Check

```bash
# API endpoint
curl http://localhost:8000/api/rag/health

# Direct Neo4j
curl http://localhost:7474/db/neo4j/tx/commit \
  -H "Content-Type: application/json" \
  -u neo4j:password \
  -d '{"statements":[{"statement":"RETURN 1"}]}'
```

### Metrics

Access Neo4j Browser → System tab for:
- Memory usage
- Query performance
- Transaction throughput
- Cache statistics

## Security

### Production Checklist

- [ ] Change default password
- [ ] Enable authentication
- [ ] Configure SSL/TLS for Bolt
- [ ] Restrict network access
- [ ] Regular backups
- [ ] Monitor logs
- [ ] Update plugins
- [ ] Use secrets management (AWS/Vault)

### SSL Configuration

```yaml
# docker-compose.yml
environment:
  - NEO4J_dbms_ssl_policy_bolt_enabled=true
  - NEO4J_dbms_ssl_policy_bolt_base__directory=/ssl
volumes:
  - ./ssl:/ssl
```

## References

- [Neo4j Documentation](https://neo4j.com/docs/)
- [Neo4j Python Driver](https://neo4j.com/docs/python-manual/current/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/)
- [APOC Documentation](https://neo4j.com/labs/apoc/)
- [ontology.yaml](ontology.yaml) - GNDP ontology and query templates
