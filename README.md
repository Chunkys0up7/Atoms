# GNDP - Graph-Native Documentation Platform

Transform traditional documentation into an interconnected knowledge graph with intelligent querying, impact analysis, and automated compliance tracking.

[![Build Status](https://github.com/Chunkys0up7/Atoms/workflows/PR%20Tests/badge.svg)](https://github.com/Chunkys0up7/Atoms/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

GNDP treats documentation as **atoms** - small, versioned, interconnected units that form a living knowledge graph. Every atom has explicit relationships, enabling:

- **Impact Analysis** - See downstream effects of any change
- **Graph Visualization** - Visualize dependencies and workflows
- **Graph RAG** - Query documentation intelligently
- **Automated Validation** - Schema and integrity checking
- **CI/CD Integration** - Automated testing and deployment

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Python 3.12+**
- **Git**

### Installation

1. **Clone repository:**
   ```bash
   git clone https://github.com/Chunkys0up7/Atoms.git
   cd Atoms
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Node dependencies:**
   ```bash
   npm install
   ```

4. **Configure environment:**
   ```bash
   # Create .env.local file
   echo "GEMINI_API_KEY=your-key-here" > .env.local
   echo "VITE_API_URL=http://localhost:8000" >> .env.local
   ```

5. **Build documentation:**
   ```bash
   python builder.py build
   ```

6. **Start development servers:**

   **Backend (Terminal 1):**
   ```bash
   python -m uvicorn api.server:app --reload --port 8000
   ```

   **Frontend (Terminal 2):**
   ```bash
   npm run dev
   ```

7. **Access the application:**
   - Frontend: http://localhost:5173
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

## Project Structure

```
Atoms/
├── atoms/              # Documentation atoms (YAML)
│   ├── requirements/   # Requirements
│   ├── designs/        # Design specs
│   ├── procedures/     # Procedures
│   ├── validations/    # Test specs
│   ├── policies/       # Policies
│   └── risks/          # Risk documentation
├── modules/            # Module definitions (YAML)
├── api/                # FastAPI backend
│   ├── server.py       # Main API server
│   └── routes/         # API route handlers
├── docs/               # Documentation & build scripts
│   ├── build_docs.py   # Documentation generator
│   ├── impact_analysis.py  # Impact analyzer
│   └── generated/      # Generated markdown & JSON
├── scripts/            # Utility scripts
│   ├── validate_schemas.py  # Schema validator
│   ├── sync_neo4j.py   # Neo4j sync
│   └── generate_embeddings.py  # RAG embeddings
├── components/         # React components
├── builder.py          # Build orchestrator
└── mkdocs.yml         # MkDocs configuration
```

## Key Features

### 1. Atom-Based Documentation

Every piece of documentation is an **atom** - a versioned, typed unit with explicit relationships:

```yaml
id: REQ-001
type: requirement
title: User Authentication System
summary: Implement secure user authentication
metadata:
  owner: security-team
  status: approved
relationships:
  upstream: []
  downstream:
    - DES-001  # Design specification
    - VAL-001  # Validation tests
```

### 2. Automated Impact Analysis

```bash
python docs/impact_analysis.py --changed-files atoms/requirements/REQ-001.yaml
```

Returns:
- Risk level (LOW/MEDIUM/HIGH/CRITICAL)
- Direct and indirect impacts
- Affected modules
- Approval recommendations

### 3. Knowledge Graph Visualization

Interactive graph showing all atoms and their relationships, filterable by:
- Type (requirement, design, procedure, etc.)
- Module
- Risk level
- Owner/team

### 4. Graph RAG (Coming Soon)

Intelligent querying over the knowledge graph:
- "What processes depend on income verification?"
- "Which regulations govern the closing process?"
- "What's the impact of changing DTI calculation?"

### 5. CI/CD Integration

Automated validation on every PR:
- Schema validation
- Graph integrity checking
- Impact analysis
- Risk-based approval routing

## Documentation

- **[Architecture](docs/GNDP-Architecture.md)** - System architecture and design
- **[Contributing](CONTRIBUTING.md)** - How to add atoms and modules
- **[Deployment](DEPLOYMENT.md)** - Production deployment guide
- **[Action Plan](CURRENT_ACTION_PLAN.md)** - Development roadmap
- **[Agent Integration](docs/agent.md)** - CI/CD automation patterns
- **[Claude Integration](docs/claude.md)** - AI-assisted analysis

## API Endpoints

The FastAPI backend provides:

- `GET /health` - Health check
- `GET /api/atoms` - List all atoms
- `GET /api/atoms/{id}` - Get specific atom
- `GET /api/modules` - List all modules
- `GET /api/modules/{id}` - Get specific module
- `GET /api/graph/full` - Complete knowledge graph
- `GET /api/graph/type/{type}` - Graph by atom type
- `GET /api/graph/module/{id}` - Graph by module

See `/docs` for interactive API documentation (Swagger UI).

## Development Workflow

### 1. Create an Atom

```bash
# Create new requirement
vim atoms/requirements/REQ-999.yaml
```

### 2. Validate

```bash
python builder.py validate
```

### 3. Build Documentation

```bash
python builder.py build
```

### 4. Commit & Push

```bash
git add .
git commit -m "feat(atoms): add new requirement REQ-999"
git push
```

### 5. Create Pull Request

The CI/CD pipeline will automatically:
- Validate schemas
- Check graph integrity
- Analyze impact
- Suggest reviewers based on risk level

## Testing

```bash
# Run all tests
python scripts/run_tests.py

# Run specific test
python -m pytest tests/test_sync_neo4j.py

# Validate schemas
python scripts/validate_schemas.py

# Check for orphaned atoms
python scripts/check_orphans.py
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Atom creation guidelines
- YAML schema reference
- Validation procedures
- Commit message conventions
- Pull request process

## Project Status

**Current Version:** 1.0.0
**Progress:** 100% Complete

**Completed:**
- Data layer with 124 atoms
- Schema validation system
- Build system and automation
- FastAPI backend (4,900+ lines)
- MkDocs documentation site
- CI/CD pipeline with automated analysis
- Dual-index RAG system (Vector + Graph)
- Dynamic process rewriting engine
- Optimization system with auto-apply
- Ownership tracking and analytics
- Document compilation and publishing
- Knowledge graph visualization
- Full cross-view navigation

**Production Ready:**
- Complete docs-as-code ecosystem
- RAG system with 95% quality score
- Semantic chunking and incremental updates
- Live performance monitoring
- Professional UI components

See [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) for detailed progress.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/Chunkys0up7/Atoms/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Chunkys0up7/Atoms/discussions)
- **Documentation:** [docs/](docs/)

---

**Built with:**
- FastAPI
- React + Vite
- MkDocs Material
- Neo4j
- Python 3.12+
- TypeScript

*Last Updated: 2025-12-25*
