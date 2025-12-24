# RAG System Setup Guide

**Dual-Index Architecture Implementation**
Following guidance from [RAG.md](../RAG.md)

## Overview

The GNDP RAG system implements a **dual-index architecture** combining:
- **Vector Database** (Chroma): Semantic similarity search
- **Graph Database** (Neo4j): Relationship traversal and context expansion
- **LLM** (Claude): Natural language answer generation

This architecture achieves **35% better accuracy** than vector-only RAG by combining semantic understanding with relational context.

---

## Architecture

### Query Flow
```
User Query
    ↓
1. Vector Search (Chroma)
    → Semantic embedding
    → Find top 20-50 candidate atoms
    ↓
2. Graph Traversal (Neo4j)
    → Bounded 2-3 hop expansion
    → Add related atoms via relationships
    ↓
3. Re-Ranking
    → 60% vector relevance
    → 30% graph context
    → 10% metadata (criticality, owner, etc.)
    ↓
4. LLM Generation (Claude)
    → Top 5-10 atoms passed as context
    → Natural language answer
    → Source citations
```

### RAG Modes

1. **Entity Mode** (`rag_mode: "entity"`)
   - Pure vector similarity search
   - Fast candidate generation
   - Use for: "Find atoms related to X"

2. **Path Mode** (`rag_mode: "path"`)
   - Vector search + graph traversal
   - Expands context via relationships
   - Use for: "Show connections between X and Y"

3. **Impact Mode** (`rag_mode: "impact"`)
   - Downstream dependency analysis
   - 3-hop traversal following DEPENDS_ON edges
   - Use for: "What breaks if we change X?"

---

## Installation

### 1. Install Dependencies

```bash
# Python dependencies
pip install chromadb openai neo4j anthropic

# Optional: For better embeddings
pip install sentence-transformers
```

### 2. Set Environment Variables

Create `.env` file:
```bash
# OpenAI for embeddings (recommended)
OPENAI_API_KEY=sk-...

# Neo4j connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# Claude for LLM (optional but recommended)
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Start Neo4j

**Option A: Docker** (Recommended)
```bash
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest
```

**Option B: Neo4j Aura** (Cloud - Free Tier)
```
1. Sign up at https://neo4j.com/cloud/aura/
2. Create free instance
3. Copy connection URI and credentials to .env
```

**Option C: Local Install**
```bash
# Download from https://neo4j.com/download/
# Set password during setup
# Start Neo4j Desktop
```

### 4. Initialize Vector Database

```bash
# Navigate to project root
cd f:\Projects\FullSytem

# Run vector initialization
python scripts/initialize_vectors.py
```

**Expected Output:**
```
=============================================================
GNDP Vector Database Initialization
Following RAG.md Dual-Index Architecture
=============================================================

✓ Loaded 124 atoms from disk
✓ Prepared 124 documents for indexing
✓ Using OpenAI embeddings (text-embedding-3-small)
✓ Created Chroma collection: gndp_atoms

Indexing 124 atoms in batches of 100...
  ✓ Indexed batch 1 (100/124 atoms)
  ✓ Indexed batch 2 (124/124 atoms)

✓ Successfully indexed 124 atoms

Testing Vector Index
  Query: 'loan application process'
    1. atom-cust-loan-app (distance: 0.234)
    2. atom-bo-credit-check (distance: 0.456)
    3. atom-sys-doc-verify (distance: 0.512)

✓ Vector database initialization complete!
```

### 5. Populate Graph Database

```bash
# Ensure Neo4j is running (check http://localhost:7474)

# Run graph population
python scripts/sync_graph_to_neo4j.py
```

**Expected Output:**
```
=============================================================
GNDP Neo4j Graph Population
Following RAG.md Dual-Index Architecture
=============================================================

Connecting to Neo4j at bolt://localhost:7687...
✓ Connected to Neo4j
Clearing existing graph data...
✓ Database cleared
Creating indexes...
✓ Indexes created

✓ Loaded 124 atoms from disk
✓ Loaded 45 modules from file

Creating 124 atom nodes...
  ✓ Created 25/124 atoms
  ✓ Created 50/124 atoms
  ...
  ✓ Created 124/124 atoms

Creating atom relationships...
Creating 45 module nodes...

=============================================================
✓ Graph population complete!
=============================================================

Statistics:
  Atoms created:         124
  Modules created:       45
  Phases created:        0
  Journeys created:      0
  Relationships created: 387

Neo4j Browser: http://localhost:7474
```

### 6. Verify RAG System

```bash
# Check RAG health
curl http://localhost:8001/api/rag/health
```

**Expected Response:**
```json
{
  "chromadb_installed": true,
  "vector_db_exists": true,
  "collection_count": 124,
  "neo4j_connected": true,
  "graph_atom_count": 124,
  "graph_relationship_count": 387,
  "claude_api_available": true,
  "claude_model": "claude-3-5-sonnet-20241022",
  "dual_index_ready": true,
  "full_rag_ready": true
}
```

---

## Usage

### API Endpoint

**POST** `/api/rag/query`

**Request:**
```json
{
  "query": "What procedures implement compliance controls?",
  "top_k": 5,
  "atom_type": "PROCESS",  // Optional filter
  "rag_mode": "path"       // entity | path | impact
}
```

**Response:**
```json
{
  "answer": "Based on the knowledge graph, the following procedures implement compliance controls: ...",
  "sources": [
    {
      "id": "atom-bo-kyc-check",
      "type": "PROCESS",
      "file_path": "data/atoms/atom-bo-kyc-check.json",
      "distance": 0.234
    }
  ],
  "context_atoms": ["atom-bo-kyc-check", "atom-sys-aml-screen", ...]
}
```

### UI Component

The enhanced AI Assistant (`AIAssistantEnhanced.tsx`) provides:

1. **RAG Mode Selector**
   - Radio buttons for entity/path/impact modes
   - Visual mode descriptions

2. **System Status Dashboard**
   - Vector DB status (atom count)
   - Graph DB status (node count)
   - LLM availability
   - Dual-index readiness

3. **Source Citations**
   - Lists atoms used for answer
   - Shows similarity scores
   - Displays RAG mode used

4. **Suggested Questions**
   - Mode-specific query examples
   - One-click query execution

---

## Maintenance

### Re-Index After Atom Changes

```bash
# Full re-index (slow but complete)
python scripts/initialize_vectors.py

# Incremental update (future enhancement)
python scripts/incremental_update.py --changed atom-xyz-123
```

### Update Graph After Module Changes

```bash
# Full graph rebuild
python scripts/sync_graph_to_neo4j.py

# Incremental graph update (future enhancement)
python scripts/update_graph.py --module module-abc
```

### Monitor Performance

```bash
# Check query latency
curl http://localhost:8001/api/rag/query \
  -d '{"query": "test", "rag_mode": "path"}' \
  -w "\nTime: %{time_total}s\n"

# Target: < 2s for P95 latency
```

---

## Troubleshooting

### Vector DB Not Found

**Error:** `Vector database not found at rag-index`
**Fix:** Run `python scripts/initialize_vectors.py`

### Neo4j Connection Failed

**Error:** `Failed to connect to Neo4j: ServiceUnavailable`
**Fix:**
```bash
# Check Neo4j is running
docker ps | grep neo4j

# Restart Neo4j
docker restart neo4j

# Verify connection
curl http://localhost:7474
```

### Low Quality Results

**Problem:** RAG returns irrelevant atoms
**Diagnosis:**
```python
# Test vector search quality
from api.routes.rag import entity_rag
results = entity_rag("your query", top_k=10)
print(results)
```

**Solutions:**
1. **Better embeddings**: Use domain-specific fine-tuned model
2. **Semantic chunking**: Implement document chunking for long atoms
3. **Re-ranking**: Adjust weights (vector/graph/metadata)

### Slow Queries

**Problem:** Queries take > 5s
**Solutions:**
1. **Reduce top_k**: Lower from 50 to 20
2. **Limit graph hops**: Change from 3 to 2 hops
3. **Add indexes**: Ensure Neo4j indexes exist
   ```cypher
   SHOW INDEXES
   ```

---

## Future Enhancements

### Phase 2: Semantic Chunking

Implement semantic boundary detection for long documents:

```python
# scripts/semantic_chunking.py
from langchain.text_splitter import SemanticChunker

def chunk_document(doc_text: str) -> List[str]:
    """Split document by semantic boundaries."""
    chunker = SemanticChunker(
        similarity_threshold=0.8,
        embedding_function=openai_embeddings
    )
    return chunker.split_text(doc_text)
```

### Phase 3: Incremental Updates

30x faster updates (RAG.md guidance):

```python
# scripts/incremental_update.py
def update_atom(atom_id: str):
    """Update only changed atom in vector & graph DB."""
    # 1. Re-embed changed atom only
    # 2. Update vector DB (single document)
    # 3. Update Neo4j (targeted subgraph)
    # Result: milliseconds vs. minutes
```

### Phase 4: Domain-Specific Embeddings

Fine-tune on banking/compliance corpus (15-30% accuracy gain):

```python
# scripts/finetune_embeddings.py
from sentence_transformers import SentenceTransformer, InputExample

# Create training pairs from atom relationships
# Fine-tune on domain vocabulary
# Deploy custom embedding model
```

---

## Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| **Retrieval Quality** | MRR > 0.8 | TBD |
| **Performance** | P95 < 2s | TBD |
| **Data Health** | Duplicate rate < 2% | TBD |
| **LLM Quality** | Accuracy > 85% | TBD |

---

## References

- [RAG.md](../RAG.md) - Architecture guidance
- [Chroma Docs](https://docs.trychroma.com/)
- [Neo4j Python Driver](https://neo4j.com/docs/api/python-driver/current/)
- [Claude API](https://docs.anthropic.com/)
- [GraphRAG Paper](https://arxiv.org/abs/2404.16130)

---

**Last Updated:** 2025-12-23
**Status:** Production-Ready (Dual-Index Architecture)
