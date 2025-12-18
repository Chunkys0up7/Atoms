# GNDP Full Implementation Action Plan

**Generated**: 2025-12-18
**Branch**: chore/gndp-agent
**Status**: UI Complete, Backend Infrastructure 70%, Integration Pending

---

## Executive Summary

The GNDP (Graph-Native Documentation Platform) project has completed its frontend UI layer with 11 React components and core backend Python scripts. However, critical gaps exist in data structures, validation infrastructure, and service integration. This plan outlines the path to full production implementation.

### Current State

**✅ Complete (40%)**
- React/TypeScript frontend UI (11 components)
- Core Python backend scripts (build_docs.py, impact_analysis.py)
- GitHub Actions workflow stubs
- Documentation architecture

**⚠️ Partial (30%)**
- CI/CD workflows (missing scripts)
- Neo4j integration (dry-run only)
- Embeddings generation (stub)
- Static assets (partial)

**❌ Missing (30%)**
- Atom/Module YAML data structures
- Schema validation layer
- MkDocs template overrides
- Frontend-backend API integration
- Production database writes

---

## Phase 1: Data Foundation (Priority: CRITICAL)

### 1.1 Create Sample Data Structures

**Objective**: Establish real atom and module YAML files to test the system end-to-end.

**Tasks**:
- [ ] Create `atoms/` directory structure with categories:
  ```
  atoms/
  ├── requirements/
  ├── designs/
  ├── procedures/
  ├── validations/
  ├── policies/
  └── risks/
  ```

- [ ] Create at least 15-20 sample atoms covering:
  - **Requirements**: REQ-001 through REQ-005 (user auth, data storage, API access, security, performance)
  - **Designs**: DES-001 through DES-003 (system architecture, API design, database schema)
  - **Procedures**: PROC-001 through PROC-003 (deployment, rollback, incident response)
  - **Validations**: VAL-001 through VAL-003 (test plans for each design)
  - **Policies**: POL-001 through POL-002 (data retention, access control)
  - **Risks**: RISK-001 through RISK-003 (security vulnerabilities, performance bottlenecks, compliance)

- [ ] YAML Schema format for atoms:
  ```yaml
  id: REQ-001
  type: requirement
  title: User Authentication System
  summary: Implement secure user authentication with OAuth 2.0
  content: |
    Full markdown content here...
  metadata:
    priority: high
    status: draft
    owner: engineering-team
    created: 2025-12-18
    updated: 2025-12-18
  upstream_ids: []
  downstream_ids:
    - DES-001
    - RISK-001
  tags:
    - authentication
    - security
    - oauth
  ```

- [ ] Create `modules/` directory with 3-5 sample modules:
  ```
  modules/
  ├── authentication-system.yaml
  ├── data-layer.yaml
  └── api-gateway.yaml
  ```

- [ ] Module YAML format:
  ```yaml
  module_id: auth-system
  name: Authentication System
  description: Complete user authentication and authorization
  atom_ids:
    - REQ-001
    - DES-001
    - PROC-001
    - VAL-001
  metadata:
    owner: security-team
    criticality: high
  ```

**Success Criteria**:
- `build_docs.py --validate` runs without errors
- Graph visualization shows connected nodes
- Impact analysis can trace downstream effects

**Estimated Effort**: 4-6 hours

---

## Phase 2: Validation Infrastructure (Priority: CRITICAL)

### 2.1 Implement Schema Validation

**Objective**: Add JSON schema validation for atom and module YAML files.

**Tasks**:
- [ ] Create `schemas/` directory:
  ```
  schemas/
  ├── atom-schema.json
  ├── module-schema.json
  └── edge-schema.json
  ```

- [ ] Define `atom-schema.json`:
  ```json
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["id", "type", "title", "summary"],
    "properties": {
      "id": {
        "type": "string",
        "pattern": "^[A-Z]+-[0-9]+$"
      },
      "type": {
        "enum": ["requirement", "design", "procedure", "validation", "policy", "risk"]
      },
      "title": {"type": "string", "minLength": 5},
      "summary": {"type": "string", "minLength": 10},
      "content": {"type": "string"},
      "metadata": {
        "type": "object",
        "required": ["priority", "status", "owner"],
        "properties": {
          "priority": {"enum": ["low", "medium", "high", "critical"]},
          "status": {"enum": ["draft", "review", "approved", "deprecated"]},
          "owner": {"type": "string"}
        }
      },
      "upstream_ids": {"type": "array", "items": {"type": "string"}},
      "downstream_ids": {"type": "array", "items": {"type": "string"}},
      "tags": {"type": "array", "items": {"type": "string"}}
    }
  }
  ```

- [ ] Define similar schemas for modules and edges

### 2.2 Create Validation Scripts

**Tasks**:
- [ ] Implement `scripts/validate_schemas.py`:
  ```python
  """Validate all YAML files against JSON schemas."""
  import yaml
  import jsonschema
  from pathlib import Path

  def validate_atom(atom_path: Path) -> list[str]:
      """Returns list of validation errors, empty if valid."""
      with open(atom_path) as f:
          atom_data = yaml.safe_load(f)
      with open('schemas/atom-schema.json') as f:
          schema = json.load(f)

      errors = []
      try:
          jsonschema.validate(atom_data, schema)
      except jsonschema.ValidationError as e:
          errors.append(f"{atom_path}: {e.message}")
      return errors

  def main():
      errors = []
      for atom_file in Path('atoms').rglob('*.yaml'):
          errors.extend(validate_atom(atom_file))

      if errors:
          print("\n".join(errors))
          sys.exit(1)
      else:
          print(f"✓ All atoms valid")
  ```

- [ ] Implement `scripts/check_orphans.py`:
  ```python
  """Detect orphaned atoms and broken references."""
  def find_orphans(graph: dict) -> list[str]:
      """Find atoms with no upstream or downstream connections."""
      orphans = []
      for atom_id, atom in graph['atoms'].items():
          if not atom['upstream_ids'] and not atom['downstream_ids']:
              orphans.append(atom_id)
      return orphans

  def find_broken_refs(graph: dict) -> list[str]:
      """Find references to non-existent atoms."""
      all_ids = set(graph['atoms'].keys())
      broken = []
      for atom_id, atom in graph['atoms'].items():
          for ref_id in atom['upstream_ids'] + atom['downstream_ids']:
              if ref_id not in all_ids:
                  broken.append(f"{atom_id} -> {ref_id} (missing)")
      return broken
  ```

- [ ] Update GitHub Actions workflow to call these scripts

**Success Criteria**:
- Schema validation catches malformed YAML
- Orphan detection identifies disconnected atoms
- CI fails on validation errors

**Estimated Effort**: 6-8 hours

---

## Phase 3: MkDocs Integration (Priority: HIGH)

### 3.1 Create Template Overrides

**Objective**: Custom rendering for atom pages in MkDocs Material theme.

**Tasks**:
- [ ] Create `overrides/` directory structure:
  ```
  overrides/
  ├── partials/
  │   ├── atom-card.html
  │   ├── atom-header.html
  │   ├── atom-graph.html
  │   └── module-overview.html
  └── main.html
  ```

- [ ] Implement `overrides/partials/atom-card.html`:
  ```jinja2
  {% macro render_atom(atom) %}
  <div class="atom-card atom-{{ atom.type }}">
    <div class="atom-header">
      <span class="atom-id">{{ atom.id }}</span>
      <span class="atom-type">{{ atom.type | upper }}</span>
      <span class="atom-status status-{{ atom.metadata.status }}">
        {{ atom.metadata.status }}
      </span>
    </div>
    <h3 class="atom-title">{{ atom.title }}</h3>
    <p class="atom-summary">{{ atom.summary }}</p>

    {% if atom.upstream_ids %}
    <div class="atom-links">
      <strong>Depends on:</strong>
      {% for up_id in atom.upstream_ids %}
        <a href="/atoms/{{ up_id }}/">{{ up_id }}</a>
      {% endfor %}
    </div>
    {% endif %}

    {% if atom.downstream_ids %}
    <div class="atom-links">
      <strong>Enables:</strong>
      {% for down_id in atom.downstream_ids %}
        <a href="/atoms/{{ down_id }}/">{{ down_id }}</a>
      {% endfor %}
    </div>
    {% endif %}
  </div>
  {% endmacro %}
  ```

- [ ] Add graph visualization embed:
  ```jinja2
  <div id="atom-graph-{{ atom.id }}" class="atom-graph-container"></div>
  <script>
    renderAtomGraph("{{ atom.id }}", {{ graph_data | tojson }});
  </script>
  ```

### 3.2 Implement Graph Generation Scripts

**Tasks**:
- [ ] Create `scripts/gen_atom_index.py`:
  ```python
  """Generate index pages for atoms by type."""
  def generate_atom_index(atoms: dict, atom_type: str) -> str:
      """Create markdown index page for atom type."""
      filtered = [a for a in atoms.values() if a['type'] == atom_type]
      md = f"# {atom_type.title()}s\n\n"
      md += f"Total: {len(filtered)}\n\n"

      for atom in sorted(filtered, key=lambda x: x['id']):
          md += f"## [{atom['id']}]({atom['id']}/)\n"
          md += f"{atom['summary']}\n\n"

      return md
  ```

- [ ] Create `scripts/gen_module_index.py` (similar pattern)

- [ ] Create `scripts/gen_graph_pages.py`:
  ```python
  """Generate interactive graph visualization pages."""
  def generate_full_graph_page(graph_data: dict) -> str:
      """Create page with full graph visualization."""
      return f"""
  # Knowledge Graph

  <div id="full-graph-container"></div>

  <script>
  const graphData = {json.dumps(graph_data)};
  renderFullGraph(graphData);
  </script>
  """
  ```

**Success Criteria**:
- MkDocs builds successfully with custom templates
- Atom pages render with proper styling
- Graph visualizations embed correctly
- Index pages auto-generate from YAML data

**Estimated Effort**: 8-10 hours

---

## Phase 4: API and Service Integration (Priority: HIGH)

### 4.1 Create Backend API Layer

**Objective**: Bridge frontend React UI with Python backend services.

**Tasks**:
- [ ] Choose API framework (Flask or FastAPI recommended)

- [ ] Create `api/` directory:
  ```
  api/
  ├── __init__.py
  ├── server.py
  ├── routes/
  │   ├── atoms.py
  │   ├── modules.py
  │   ├── graph.py
  │   ├── impact.py
  │   └── validation.py
  └── models.py
  ```

- [ ] Implement `api/server.py`:
  ```python
  from fastapi import FastAPI
  from fastapi.middleware.cors import CORSMiddleware
  from api.routes import atoms, modules, graph, impact, validation

  app = FastAPI(title="GNDP API", version="1.0.0")

  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:5173"],  # Vite dev server
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )

  app.include_router(atoms.router, prefix="/api/atoms", tags=["atoms"])
  app.include_router(modules.router, prefix="/api/modules", tags=["modules"])
  app.include_router(graph.router, prefix="/api/graph", tags=["graph"])
  app.include_router(impact.router, prefix="/api/impact", tags=["impact"])
  app.include_router(validation.router, prefix="/api/validation", tags=["validation"])
  ```

- [ ] Implement `api/routes/atoms.py`:
  ```python
  from fastapi import APIRouter, HTTPException
  from typing import List
  from pathlib import Path
  import yaml

  router = APIRouter()

  @router.get("/", response_model=List[dict])
  async def list_atoms():
      """Return all atoms."""
      atoms = []
      for atom_file in Path('atoms').rglob('*.yaml'):
          with open(atom_file) as f:
              atoms.append(yaml.safe_load(f))
      return atoms

  @router.get("/{atom_id}", response_model=dict)
  async def get_atom(atom_id: str):
      """Get specific atom by ID."""
      for atom_file in Path('atoms').rglob('*.yaml'):
          with open(atom_file) as f:
              atom = yaml.safe_load(f)
              if atom['id'] == atom_id:
                  return atom
      raise HTTPException(status_code=404, detail="Atom not found")

  @router.post("/", response_model=dict)
  async def create_atom(atom: dict):
      """Create new atom."""
      # Validate schema
      # Write YAML file
      # Return created atom
      pass
  ```

- [ ] Implement similar routes for modules, graph, impact analysis

- [ ] Update frontend services to call API:
  ```typescript
  // Update constants.tsx
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  export async function fetchAtoms(): Promise<Atom[]> {
    const response = await fetch(`${API_BASE_URL}/atoms`);
    if (!response.ok) throw new Error('Failed to fetch atoms');
    return response.json();
  }

  export async function fetchGraph(): Promise<GraphData> {
    const response = await fetch(`${API_BASE_URL}/graph`);
    if (!response.ok) throw new Error('Failed to fetch graph');
    return response.json();
  }

  export async function runImpactAnalysis(atomId: string): Promise<ImpactReport> {
    const response = await fetch(`${API_BASE_URL}/impact/${atomId}`);
    if (!response.ok) throw new Error('Failed to run impact analysis');
    return response.json();
  }
  ```

- [ ] Update React components to use real API calls instead of mock data

**Success Criteria**:
- API server runs on port 8000
- Frontend connects to API successfully
- CRUD operations work for atoms and modules
- Impact analysis returns real results

**Estimated Effort**: 10-12 hours

---

## Phase 5: Claude API Modernization (Priority: MEDIUM)

### 5.1 Update to Messages API

**Objective**: Replace deprecated Claude 2 completion API with modern Messages API.

**Tasks**:
- [ ] Update `scripts/claude_helper.py`:
  ```python
  import anthropic
  import os
  import json

  client = anthropic.Anthropic(
      api_key=os.environ.get("CLAUDE_API_KEY")
  )

  def analyze_pr_impact(pr_context: dict) -> dict:
      """Use Claude to analyze PR impact."""
      prompt = f"""
  You are analyzing a pull request to a graph-native documentation system.

  Context:
  {json.dumps(pr_context, indent=2)}

  Provide a JSON response with:
  - summary: One paragraph explaining the change impact
  - risk_level: LOW | MEDIUM | HIGH | CRITICAL
  - affected_modules: Array of module IDs impacted
  - suggested_reviewers: Array of usernames who should review
  - downstream_effects: Number of atoms affected downstream

  Only return valid JSON.
  """

      message = client.messages.create(
          model="claude-sonnet-4-5-20250929",
          max_tokens=1024,
          temperature=0.0,
          messages=[
              {"role": "user", "content": prompt}
          ]
      )

      response_text = message.content[0].text

      # Parse JSON response
      try:
          return json.loads(response_text)
      except json.JSONDecodeError:
          # Fallback to deterministic analysis
          return fallback_analysis(pr_context)

  def fallback_analysis(pr_context: dict) -> dict:
      """Deterministic fallback if Claude fails."""
      num_atoms_changed = len(pr_context.get('changed_atoms', []))
      num_downstream = pr_context.get('downstream_count', 0)

      if num_downstream > 50:
          risk_level = "CRITICAL"
      elif num_downstream > 20:
          risk_level = "HIGH"
      elif num_downstream > 5:
          risk_level = "MEDIUM"
      else:
          risk_level = "LOW"

      return {
          "summary": f"Changes affect {num_atoms_changed} atoms with {num_downstream} downstream dependencies.",
          "risk_level": risk_level,
          "affected_modules": [],
          "suggested_reviewers": [],
          "downstream_effects": num_downstream
      }
  ```

- [ ] Add proper error handling and rate limiting

- [ ] Update `scripts/post_pr_report.py` to format Claude's analysis:
  ```python
  def format_pr_comment(analysis: dict) -> str:
      """Format Claude analysis as GitHub comment."""
      risk_emoji = {
          "LOW": "🟢",
          "MEDIUM": "🟡",
          "HIGH": "🟠",
          "CRITICAL": "🔴"
      }

      emoji = risk_emoji.get(analysis['risk_level'], "⚪")

      comment = f"""## Impact Analysis {emoji}

  **Risk Level**: {analysis['risk_level']}

  {analysis['summary']}

  ### Details
  - **Downstream Effects**: {analysis['downstream_effects']} atoms impacted
  - **Affected Modules**: {', '.join(analysis['affected_modules']) or 'None'}
  - **Suggested Reviewers**: {', '.join([f"@{r}" for r in analysis['suggested_reviewers']]) or 'Team default'}

  ---
  🤖 Generated by GNDP Agent with Claude Sonnet 4.5
  """
      return comment
  ```

- [ ] Test with real PR data

**Success Criteria**:
- Claude API calls succeed with modern endpoint
- Analysis results are accurate and well-formatted
- Fallback mechanism works when API fails
- PR comments appear correctly on GitHub

**Estimated Effort**: 4-6 hours

---

## Phase 6: Production Database Integration (Priority: MEDIUM)

### 6.1 Implement Neo4j Sync

**Objective**: Remove dry-run stubs and implement real database writes.

**Tasks**:
- [ ] Update `scripts/sync_neo4j.py`:
  ```python
  from neo4j import GraphDatabase
  import os
  import yaml
  from pathlib import Path

  class Neo4jSync:
      def __init__(self):
          self.driver = GraphDatabase.driver(
              os.environ['NEO4J_BOLT_URI'],
              auth=(
                  os.environ['NEO4J_USER'],
                  os.environ['NEO4J_PASSWORD']
              )
          )

      def sync_atoms(self, atoms: list[dict]):
          """Sync all atoms to Neo4j."""
          with self.driver.session() as session:
              # Clear existing data
              session.run("MATCH (n) DETACH DELETE n")

              # Create atom nodes
              for atom in atoms:
                  session.run("""
                      CREATE (a:Atom {
                          id: $id,
                          type: $type,
                          title: $title,
                          summary: $summary,
                          status: $status,
                          priority: $priority,
                          owner: $owner
                      })
                  """, **atom)

              # Create edges
              for atom in atoms:
                  for downstream_id in atom.get('downstream_ids', []):
                      session.run("""
                          MATCH (a:Atom {id: $from_id})
                          MATCH (b:Atom {id: $to_id})
                          CREATE (a)-[:DEPENDS_ON]->(b)
                      """, from_id=atom['id'], to_id=downstream_id)

      def close(self):
          self.driver.close()

  def main():
      # Load all atoms
      atoms = []
      for atom_file in Path('atoms').rglob('*.yaml'):
          with open(atom_file) as f:
              atoms.append(yaml.safe_load(f))

      # Sync to Neo4j
      syncer = Neo4jSync()
      try:
          syncer.sync_atoms(atoms)
          print(f"✓ Synced {len(atoms)} atoms to Neo4j")
      finally:
          syncer.close()
  ```

- [ ] Add Cypher queries for common operations:
  ```python
  def get_downstream_impact(atom_id: str, max_depth: int = 5) -> list[str]:
      """Get all downstream atoms using graph traversal."""
      with self.driver.session() as session:
          result = session.run("""
              MATCH path = (a:Atom {id: $atom_id})-[:DEPENDS_ON*1..%d]->(downstream)
              RETURN DISTINCT downstream.id as id
          """ % max_depth, atom_id=atom_id)
          return [record['id'] for record in result]
  ```

- [ ] Update GitHub Actions workflow to use real sync (remove `--dry-run`)

- [ ] Add health checks and monitoring

**Success Criteria**:
- Atoms and edges sync to Neo4j successfully
- Graph queries return accurate results
- CI job completes without errors
- Database credentials stored securely

**Estimated Effort**: 6-8 hours

### 6.2 Implement Embeddings Generation

**Objective**: Generate vector embeddings for RAG functionality.

**Tasks**:
- [ ] Choose embeddings provider (OpenAI, Cohere, or local model)

- [ ] Update `scripts/generate_embeddings.py`:
  ```python
  import openai
  import numpy as np
  from pathlib import Path
  import yaml
  import json

  openai.api_key = os.environ['OPENAI_API_KEY']

  def generate_embedding(text: str) -> list[float]:
      """Generate embedding using OpenAI."""
      response = openai.embeddings.create(
          model="text-embedding-3-small",
          input=text
      )
      return response.data[0].embedding

  def embed_atom(atom: dict) -> dict:
      """Generate embedding for atom."""
      # Combine relevant fields
      text = f"{atom['title']} {atom['summary']} {atom.get('content', '')}"
      embedding = generate_embedding(text)

      return {
          'atom_id': atom['id'],
          'embedding': embedding,
          'metadata': {
              'type': atom['type'],
              'title': atom['title']
          }
      }

  def main():
      embeddings = []

      for atom_file in Path('atoms').rglob('*.yaml'):
          with open(atom_file) as f:
              atom = yaml.safe_load(f)

          embedding_data = embed_atom(atom)
          embeddings.append(embedding_data)
          print(f"✓ Embedded {atom['id']}")

      # Save to vector store (e.g., Pinecone, Weaviate, or local JSON)
      with open('embeddings.json', 'w') as f:
          json.dump(embeddings, f)

      print(f"✓ Generated {len(embeddings)} embeddings")
  ```

- [ ] Integrate with RAG system in `AIAssistant.tsx`:
  ```typescript
  async function semanticSearch(query: string): Promise<Atom[]> {
    const queryEmbedding = await generateEmbedding(query);

    // Find nearest neighbors
    const results = await fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify({ embedding: queryEmbedding, top_k: 5 })
    });

    return results.json();
  }
  ```

**Success Criteria**:
- Embeddings generated for all atoms
- Semantic search returns relevant results
- RAG chat uses embeddings for context retrieval

**Estimated Effort**: 8-10 hours

---

## Phase 7: Static Assets and UI Polish (Priority: LOW)

### 7.1 Complete Missing Static Assets

**Tasks**:
- [ ] Create `docs/stylesheets/graph.css`:
  ```css
  .graph-container {
      width: 100%;
      height: 600px;
      border: 1px solid var(--md-default-fg-color--lightest);
      border-radius: 4px;
  }

  .node {
      cursor: pointer;
      transition: all 0.2s ease;
  }

  .node:hover {
      stroke-width: 3px;
  }

  .node.requirement { fill: #3b82f6; }
  .node.design { fill: #8b5cf6; }
  .node.procedure { fill: #10b981; }
  .node.validation { fill: #f59e0b; }
  .node.policy { fill: #6366f1; }
  .node.risk { fill: #ef4444; }
  ```

- [ ] Create `docs/stylesheets/atoms.css`:
  ```css
  .atom-card {
      border-left: 4px solid var(--atom-color);
      padding: 1rem;
      margin: 1rem 0;
      background: var(--md-code-bg-color);
      border-radius: 4px;
  }

  .atom-header {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
  }

  .atom-id {
      font-family: var(--md-code-font-family);
      font-weight: bold;
  }

  .atom-type {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      background: var(--md-accent-bg-color);
  }
  ```

- [ ] Create `docs/javascripts/atom-links.js`:
  ```javascript
  // Make atom ID references clickable
  document.addEventListener('DOMContentLoaded', function() {
      const atomIdPattern = /\b([A-Z]+-\d+)\b/g;

      document.querySelectorAll('.md-content p, .md-content li').forEach(el => {
          el.innerHTML = el.innerHTML.replace(
              atomIdPattern,
              '<a href="/atoms/$1/" class="atom-link">$1</a>'
          );
      });
  });
  ```

- [ ] Create `docs/javascripts/search-enhance.js`:
  ```javascript
  // Enhance MkDocs search with atom metadata
  document.addEventListener('DOMContentLoaded', function() {
      const searchInput = document.querySelector('.md-search__input');

      searchInput.addEventListener('input', function(e) {
          const query = e.target.value.toLowerCase();

          // Show atom type filters
          if (query.length > 2) {
              showAtomTypeFilters();
          }
      });
  });
  ```

**Success Criteria**:
- MkDocs site has consistent styling
- Graph visualizations render properly
- Atom links are automatically generated
- Search includes atom metadata

**Estimated Effort**: 4-6 hours

---

## Phase 8: End-to-End Testing and Builder (Priority: HIGH)

### 8.1 Implement builder.py

**Objective**: Create orchestration script that runs full build pipeline.

**Tasks**:
- [ ] Implement `builder.py`:
  ```python
  #!/usr/bin/env python3
  """
  GNDP Builder - Orchestrates full documentation build pipeline.

  Steps:
  1. Validate all atom and module schemas
  2. Check for orphans and broken references
  3. Run impact analysis on changed atoms
  4. Build documentation with MkDocs
  5. Generate graph visualization data
  6. Sync to Neo4j (optional)
  7. Generate embeddings (optional)
  """

  import subprocess
  import sys
  from pathlib import Path
  import argparse

  class GNDPBuilder:
      def __init__(self, dry_run=False, skip_db=False):
          self.dry_run = dry_run
          self.skip_db = skip_db
          self.errors = []

      def run_step(self, name: str, command: list[str]) -> bool:
          """Run a build step and capture output."""
          print(f"\n{'='*60}")
          print(f"Step: {name}")
          print(f"{'='*60}")

          if self.dry_run:
              print(f"[DRY RUN] Would execute: {' '.join(command)}")
              return True

          result = subprocess.run(
              command,
              capture_output=True,
              text=True
          )

          print(result.stdout)

          if result.returncode != 0:
              self.errors.append(f"{name}: {result.stderr}")
              print(f"✗ FAILED: {name}")
              return False

          print(f"✓ SUCCESS: {name}")
          return True

      def build(self) -> bool:
          """Run complete build pipeline."""
          steps = [
              ("Schema Validation", ["python", "scripts/validate_schemas.py"]),
              ("Orphan Check", ["python", "scripts/check_orphans.py"]),
              ("Build Documentation", ["python", "docs/build_docs.py"]),
              ("Generate Indexes", ["python", "scripts/gen_atom_index.py"]),
          ]

          if not self.skip_db:
              steps.extend([
                  ("Sync Neo4j", ["python", "scripts/sync_neo4j.py"]),
                  ("Generate Embeddings", ["python", "scripts/generate_embeddings.py"]),
              ])

          for name, command in steps:
              if not self.run_step(name, command):
                  print(f"\n❌ Build failed at step: {name}")
                  return False

          print(f"\n{'='*60}")
          print("✓ Build completed successfully!")
          print(f"{'='*60}")
          return True

  def main():
      parser = argparse.ArgumentParser(description="GNDP Builder")
      parser.add_argument('--dry-run', action='store_true', help="Show steps without executing")
      parser.add_argument('--skip-db', action='store_true', help="Skip database operations")
      args = parser.parse_args()

      builder = GNDPBuilder(dry_run=args.dry_run, skip_db=args.skip_db)
      success = builder.build()
      sys.exit(0 if success else 1)

  if __name__ == '__main__':
      main()
  ```

- [ ] Make builder.py executable: `chmod +x builder.py`

- [ ] Update GitHub Actions to use builder:
  ```yaml
  - name: Run GNDP Builder
    run: python builder.py --skip-db  # Skip DB in CI for now
  ```

### 8.2 End-to-End Testing

**Tasks**:
- [ ] Test full pipeline with sample data:
  ```bash
  # Validate
  python scripts/validate_schemas.py

  # Build
  python builder.py

  # Check outputs
  ls -la site/  # MkDocs output
  cat embeddings.json  # Embeddings
  ```

- [ ] Test UI with real backend:
  ```bash
  # Start API server
  uvicorn api.server:app --reload

  # Start frontend
  npm run dev

  # Open http://localhost:5173
  ```

- [ ] Test GitHub Actions workflows:
  ```bash
  # Create test PR
  git checkout -b test/validation
  # Modify an atom
  git add atoms/
  git commit -m "test: modify REQ-001"
  git push origin test/validation
  # Open PR and check CI runs
  ```

**Success Criteria**:
- Builder runs all steps without errors
- MkDocs site builds correctly
- Frontend UI displays real data
- Graph visualizations work
- Impact analysis produces correct results
- CI workflows pass on test PR

**Estimated Effort**: 6-8 hours

---

## Phase 9: Documentation and Deployment (Priority: MEDIUM)

### 9.1 Update Documentation

**Tasks**:
- [ ] Update README.md with:
  - Complete setup instructions
  - API documentation
  - Development workflow
  - Deployment guide

- [ ] Create CONTRIBUTING.md:
  - How to add atoms
  - YAML schema reference
  - Graph best practices
  - PR guidelines

- [ ] Create DEPLOYMENT.md:
  - Environment variables
  - Database setup (Neo4j)
  - Secrets configuration
  - GitHub Pages setup

### 9.2 Production Deployment

**Tasks**:
- [ ] Set up GitHub Secrets:
  - `CLAUDE_API_KEY`
  - `NEO4J_BOLT_URI`
  - `NEO4J_USER`
  - `NEO4J_PASSWORD`
  - `OPENAI_API_KEY` (for embeddings)

- [ ] Configure GitHub Pages:
  - Enable Pages in repository settings
  - Set source to `gh-pages` branch
  - Update `mkdocs.yml` with correct site_url

- [ ] Deploy Neo4j instance:
  - Use Neo4j Aura (cloud) or self-hosted
  - Configure firewall rules
  - Set up automated backups

- [ ] Deploy API server:
  - Use Railway, Render, or similar
  - Configure CORS for production domain
  - Set up health checks

**Success Criteria**:
- Documentation site live at GitHub Pages URL
- API accessible from production domain
- Neo4j database operational
- CI/CD pipeline runs on all PRs

**Estimated Effort**: 4-6 hours

---

## Summary Timeline

| Phase | Priority | Effort | Dependencies |
|-------|----------|--------|--------------|
| 1. Data Foundation | CRITICAL | 4-6 hrs | None |
| 2. Validation Infrastructure | CRITICAL | 6-8 hrs | Phase 1 |
| 3. MkDocs Integration | HIGH | 8-10 hrs | Phase 1, 2 |
| 4. API Integration | HIGH | 10-12 hrs | Phase 1 |
| 5. Claude API Modernization | MEDIUM | 4-6 hrs | Phase 1, 2 |
| 6. Database Integration | MEDIUM | 14-18 hrs | Phase 1, 2 |
| 7. Static Assets | LOW | 4-6 hrs | Phase 3 |
| 8. Testing & Builder | HIGH | 6-8 hrs | All above |
| 9. Documentation & Deployment | MEDIUM | 4-6 hrs | Phase 8 |

**Total Estimated Effort**: 60-80 hours (1.5-2 weeks full-time)

---

## Recommended Implementation Order

### Week 1 (Critical Path):
1. **Day 1-2**: Phase 1 - Create sample data structures
2. **Day 2-3**: Phase 2 - Implement validation infrastructure
3. **Day 3-5**: Phase 4 - Build API layer and connect frontend

### Week 2 (Integration & Polish):
1. **Day 1-2**: Phase 3 - MkDocs templates and graph generation
2. **Day 2-3**: Phase 6 - Database integration (Neo4j + embeddings)
3. **Day 4**: Phase 5 - Claude API modernization
4. **Day 5**: Phase 8 - End-to-end testing with builder.py

### Week 3 (Optional - Deployment & Polish):
1. **Day 1**: Phase 7 - Static assets and UI polish
2. **Day 2**: Phase 9 - Documentation and production deployment
3. **Day 3+**: Bug fixes, performance optimization, monitoring

---

## Success Metrics

**Phase 1 Complete**:
- [ ] 15+ sample atoms created
- [ ] 3+ sample modules created
- [ ] `build_docs.py` processes YAML successfully

**Phase 2 Complete**:
- [ ] Schema validation catches all malformed YAML
- [ ] Orphan detection identifies disconnected nodes
- [ ] CI fails on validation errors

**Phase 3 Complete**:
- [ ] MkDocs builds with custom templates
- [ ] Graph visualizations render on atom pages
- [ ] Index pages auto-generate

**Phase 4 Complete**:
- [ ] API server runs and responds to requests
- [ ] Frontend fetches real data from API
- [ ] CRUD operations work for atoms/modules

**Phase 5 Complete**:
- [ ] Claude API calls succeed with modern endpoint
- [ ] PR comments posted automatically
- [ ] Analysis is accurate and helpful

**Phase 6 Complete**:
- [ ] Neo4j contains complete graph
- [ ] Embeddings generated for all atoms
- [ ] Semantic search returns relevant results

**Phase 8 Complete**:
- [ ] `builder.py` runs full pipeline without errors
- [ ] CI/CD passes on test PR
- [ ] All systems integrated end-to-end

---

## Risk Mitigation

**Risk**: Sample data doesn't reflect real-world complexity
- **Mitigation**: Create diverse atom types with realistic dependencies

**Risk**: API integration delays frontend testing
- **Mitigation**: Keep mock data option in frontend for parallel development

**Risk**: Neo4j sync fails in production
- **Mitigation**: Implement comprehensive error handling and fallback to JSON storage

**Risk**: Claude API costs exceed budget
- **Mitigation**: Implement rate limiting and fallback to deterministic analysis

**Risk**: Embeddings generation too slow
- **Mitigation**: Run as async background job, cache results

---

## Next Steps

**Immediate Actions** (Start Today):
1. Create `atoms/` directory with 5 sample atoms
2. Create `modules/` directory with 1 sample module
3. Test `build_docs.py` with sample data
4. Verify graph visualization works with real data

**This Week**:
1. Complete Phase 1 (Data Foundation)
2. Begin Phase 2 (Validation Infrastructure)
3. Draft API specification for Phase 4

**Next Week**:
1. Complete Phase 2 and Phase 4
2. Connect frontend to backend API
3. Begin Phase 3 (MkDocs integration)

---

*Generated by Claude Code on 2025-12-18*
*This plan is a living document and should be updated as implementation progresses.*
