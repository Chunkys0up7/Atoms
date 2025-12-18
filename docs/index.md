# GNDP - Graph-Native Documentation Platform

Welcome to the Graph-Native Documentation Platform, a system that transforms traditional documentation into an interconnected knowledge graph.

## What is GNDP?

GNDP treats documentation as **atoms** - small, versioned, interconnected units - that form a living knowledge graph. Every piece of documentation has explicit relationships, making it possible to:

- **Track dependencies** between requirements, designs, and procedures
- **Analyze impact** of changes automatically
- **Ensure compliance** through relationship tracking
- **Query intelligently** using graph-aware RAG

## Key Concepts

### Atoms

The fundamental unit of documentation. Each atom has:

- A unique identifier (e.g., `REQ-001`, `DES-002`)
- A type (requirement, design, procedure, validation, policy, risk)
- Metadata (owner, status, version)
- **Explicit relationships** to other atoms

[Browse all atoms →](generated/atoms/index.md)

### Modules

Logical groupings of atoms that represent complete workflows or systems:

- Authentication System
- API Gateway
- Data Layer
- Knowledge Graph
- AI Agent

[Browse all modules →](generated/modules/index.md)

### Relationships

Edges that connect atoms with semantic meaning:

- `REQUIRES` - Dependencies
- `TRIGGERS` - Sequential flow
- `MITIGATES` - Risk controls
- `VALIDATED_BY` - Testing relationships
- `GOVERNED_BY` - Compliance mapping

[Visualize the graph →](graph.md)

## Getting Started

### For Developers

1. **Create an atom**: Add a YAML file to `atoms/<category>/`
2. **Define relationships**: Specify upstream/downstream connections
3. **Validate**: Run `python builder.py validate`
4. **Build docs**: Run `python builder.py build`

[Contributing Guide →](../CONTRIBUTING.md)

### For Compliance Teams

- View all requirements and their relationships
- Check which procedures implement which policies
- Analyze risk coverage with control mappings
- Generate compliance reports

### For Architects

- Visualize system dependencies
- Perform impact analysis on design changes
- Track technical debt through the graph
- Ensure consistency across modules

## System Status

| Metric | Status |
|--------|--------|
| Total Atoms | 23 |
| Total Modules | 5 |
| Validation | ✅ Passing |
| Graph Coverage | 100% connected |
| Documentation | 🟢 Up to date |

## Architecture

The GNDP system consists of:

1. **Data Layer**: YAML files versioned in Git
2. **Graph Database**: Neo4j for querying relationships
3. **Build System**: Python scripts generate markdown and JSON
4. **Documentation Site**: MkDocs Material theme
5. **CI/CD Pipeline**: Automated validation and impact analysis

[Full Architecture →](docs/GNDP-Architecture.md)

## Quick Links

- [Action Plan](docs/ACTION_PLAN.md) - Current development roadmap
- [Agent Integration](docs/agent.md) - CI/CD automation
- [Claude Integration](docs/claude.md) - AI-assisted analysis
- [Implementation Roadmap](docs/implementation-roadmap.md) - Banking-specific features

---

*Last updated: 2025-12-18*
*Powered by GNDP v0.1.0*
