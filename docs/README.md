# GNDP Documentation Compilation System

## MkDocs + Custom HTML Browser + CI/CD Pipeline

This directory contains everything needed to compile your graph-native documentation into browsable, searchable documentation sites.

---

## 📁 Directory Structure

```
mkdocs-gndp/
├── mkdocs.yml                    # MkDocs configuration with Material theme
├── docs/
│   ├── stylesheets/
│   │   └── gndp.css             # Custom styles for atoms, graphs, risk badges
│   └── javascripts/
│       └── graph-viz.js         # D3.js interactive graph visualization
├── scripts/
│   ├── build_docs.py            # Generates markdown from atom/module YAML
│   └── impact_analysis.py       # CI/CD impact analysis for PRs
├── standalone/
│   └── GNDPBrowser.jsx          # React-based standalone documentation browser
└── .github/
    └── workflows/
        └── documentation.yml     # Full CI/CD pipeline
```

---

## 🚀 Quick Start

### Option 1: MkDocs (Recommended)

```bash
# Install dependencies
pip install mkdocs mkdocs-material mkdocs-awesome-pages-plugin \
            mkdocs-gen-files mkdocs-macros-plugin \
            mkdocs-git-revision-date-localized-plugin \
            pyyaml jinja2 networkx

# Generate markdown from graph data
python scripts/build_docs.py --source /path/to/repo --output docs/

# Build site
mkdocs build

# Preview locally
mkdocs serve
```

### Option 2: Standalone React Browser

```bash
# Use the GNDPBrowser.jsx component in your React app
# It fetches graph data from /api/graph/full.json

# Or build standalone:
npm create vite@latest gndp-browser -- --template react
cd gndp-browser
npm install d3
# Copy GNDPBrowser.jsx to src/
# Import and use <GNDPBrowser dataUrl="/api/graph/full.json" />
```

---

## 📖 What Gets Generated

### From Each Atom YAML

```yaml
# atoms/processes/proc-lo-001.yaml
atom_id: PROC-LO-001
type: PROCESS
name: "Receive Loan Application"
description: "Initial intake..."
edges:
  - type: TRIGGERS
    target: PROC-LO-002
```

**Generates:**

1. **Markdown page** (`docs/atoms/processes/proc_lo_001.md`)
   - Formatted documentation with metadata badges
   - Steps, exceptions, notes
   - Clickable relationship links
   - Mermaid flow diagrams

2. **Graph node** (in `api/graph/full.json`)
   - ID, type, label, description
   - URL for navigation

3. **Search index entry** (via MkDocs search plugin)

### From Each Module YAML

```yaml
# modules/mod-intake.yaml
module_id: MOD-INTAKE
name: "Loan Intake Module"
workflow_type: BPM
atoms:
  - PROC-LO-001
  - PROC-LO-002
```

**Generates:**

1. **Module overview page** with:
   - Interactive subgraph visualization
   - Entry/exit points
   - Atom table
   - External dependencies

2. **Module-specific graph JSON** (`api/graph/module/MOD-INTAKE.json`)

---

## 🎨 Styling & Theming

### Atom Cards

The system generates styled cards for each atom type:

```html
<div class="atom-card" data-type="PROCESS">
  <!-- Styled based on atom type -->
</div>
```

Color scheme:
- **PROCESS**: Blue (#3B82F6)
- **DECISION**: Amber (#F59E0B)
- **ROLE**: Emerald (#10B981)
- **SYSTEM**: Violet (#8B5CF6)
- **REGULATION**: Pink (#EC4899)
- **RISK**: Red (#EF4444)

### Risk Indicators

```html
<span class="risk-indicator low">LOW</span>
<span class="risk-indicator medium">MEDIUM</span>
<span class="risk-indicator high">HIGH</span>
<span class="risk-indicator critical">CRITICAL</span>
```

### Graph Visualization

The `graph-viz.js` provides:
- Pan/zoom with mouse
- Node dragging
- Click to select/highlight
- Edge labels on hover
- Export to PNG
- Search/filter

---

## ⚙️ CI/CD Pipeline

The GitHub Actions workflow (`documentation.yml`) handles:

### On Pull Request

1. **Schema Validation** - Ensures YAML files conform to schemas
2. **Impact Analysis** - Calculates downstream effects
3. **Risk Scoring** - Assigns LOW/MEDIUM/HIGH/CRITICAL
4. **Approval Routing** - Requests appropriate reviewers

### Impact Report (Posted to PR)

```markdown
## 📊 Impact Analysis Report

### Risk Assessment
| Metric | Value |
|--------|-------|
| Risk Level | 🟡 **MEDIUM** |
| Risk Score | 45 |
| Approval Required | TEAM |

### Direct Impacts
- `PROC-002` (TRIGGERS)
- `DEC-001` (TRIGGERS)

### Recommendations
- Coordinate with owners of 3 affected modules
```

### On Merge to Main

1. **Build Documentation** - Runs `build_docs.py`
2. **Deploy to GitHub Pages** - Publishes site
3. **Sync to Neo4j** (optional) - Updates graph database
4. **Update RAG Index** (optional) - Regenerates embeddings

---

## 🔍 Search Configuration

MkDocs Material provides excellent search out of the box:

```yaml
plugins:
  - search:
      separator: '[\s\-,:!=\[\]()"/]+|(?!\b)(?=[A-Z][a-z])'
      lang: en
```

Enhanced with:
- Atom ID search (`PROC-001`)
- Type filtering
- Tag-based search
- Full-text across all content

---

## 📊 Graph Data Format

### Full Graph (`api/graph/full.json`)

```json
{
  "nodes": [
    {
      "id": "PROC-001",
      "type": "PROCESS",
      "label": "Receive Application",
      "description": "...",
      "status": "ACTIVE",
      "owner": "intake_supervisor",
      "url": "atoms/processes/proc_001.md"
    }
  ],
  "edges": [
    {
      "source": "PROC-001",
      "target": "PROC-002",
      "type": "TRIGGERS",
      "properties": {}
    }
  ]
}
```

### Module Graph (`api/graph/module/MOD-INTAKE.json`)

Same format, filtered to atoms within the module.

---

## 🧩 Extending the System

### Custom Atom Types

1. Add to `schemas/atom-types.json`
2. Update `gndp.css` with colors
3. Update `graph-viz.js` with node styling

### Custom Edge Types

1. Add to `schemas/edge-types.json`
2. Update `PROPAGATING_EDGES` in `impact_analysis.py`
3. Add to Mermaid diagram generation

### Custom Workflow Types

1. Create schema in `schemas/workflow-types/`
2. Add template in `templates/` if needed
3. Update `build_docs.py` to handle new type

---

## 📦 Dependencies

### Python
```
mkdocs>=1.5
mkdocs-material>=9.0
mkdocs-awesome-pages-plugin
mkdocs-gen-files
mkdocs-macros-plugin
mkdocs-git-revision-date-localized-plugin
mkdocs-minify-plugin
pyyaml
jinja2
networkx
```

### JavaScript (for standalone browser)
```
react>=18
d3>=7
```

---

## 🔗 Integration Points

### With Neo4j
```python
# After build, sync graph to Neo4j
python scripts/sync_neo4j.py \
    --graph-json docs/api/graph/full.json \
    --uri bolt://localhost:7687
```

### With RAG System
```python
# Generate embeddings for RAG
python scripts/generate_embeddings.py \
    --atoms-dir atoms/ \
    --output rag-index/
```

### With LLM Queries
The graph JSON can be used directly in LLM context:
```python
context = f"""
Graph Data:
{json.dumps(graph_data, indent=2)}

Query: What processes does changing income verification affect?
"""
```

---

## 📝 License

MIT License - Use freely in your documentation projects.
