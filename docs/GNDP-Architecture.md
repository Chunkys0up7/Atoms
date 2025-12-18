# Graph-Native Documentation Platform (GNDP)

## A Bottom-Up, Docs-as-Code System with Graph RAG and Impact Analysis

---

## Executive Summary

This document outlines a comprehensive platform that transforms traditional documentation into a **graph-native knowledge system**. By treating every piece of documentation as interconnected atoms with explicit relationships (edges), we enable:

- **Intelligent conversion** of existing documents into atomic, versioned units
- **Graph-based storage** that captures the true structure of business processes
- **CI/CD pipelines** with automated risk scoring and approval routing
- **Graph RAG** for intelligent querying across the knowledge base
- **Impact analysis** that reveals cascading effects of any change

---

## Core Concepts

### The Atom

The **atom** is the fundamental unit of documentation—the smallest meaningful piece that:
- Has a unique identity and version
- Can be independently authored, reviewed, and updated
- Contains metadata about ownership, risk, and compliance
- Declares explicit relationships to other atoms

```yaml
atom:
  id: PROC-LO-001
  type: PROCESS
  name: "Receive Loan Application"
  version: 3.2.1
  status: ACTIVE
  
  classification:
    domain: loan_origination
    workflow: application_intake
    criticality: HIGH
    
  ownership:
    team: loan_operations
    owner: intake_supervisor
    last_reviewer: compliance_team
    
  timing:
    sla_hours: 4
    average_duration_minutes: 45
    
  content:
    summary: "Initial intake and validation of borrower loan application"
    steps:
      - "Receive application via portal, email, or in-person"
      - "Validate completeness of required fields"
      - "Generate unique loan identifier"
      - "Route to appropriate processor queue"
    exceptions:
      - condition: "Missing SSN"
        action: "Return to borrower with checklist"
      - condition: "Duplicate application detected"
        action: "Route to fraud review queue"
```

### Edge Types

Edges define **semantic relationships** between atoms. Unlike traditional documentation that implies relationships through proximity or headers, our system makes relationships explicit and queryable.

| Edge Type | Description | Example |
|-----------|-------------|---------|
| `TRIGGERS` | Completion of A starts B | "Receive Application" → "Credit Check" |
| `REQUIRES` | A cannot complete without B | "Underwriting" → "Income Verification" |
| `PRODUCES` | A creates B as output | "Closing" → "Note Document" |
| `PERFORMED_BY` | A is executed by role B | "Appraisal Review" → "Appraiser" |
| `GOVERNED_BY` | A must comply with B | "Disclosure" → "TRID Regulation" |
| `USES` | A operates on/with B | "Rate Lock" → "Pricing Engine" |
| `MEASURED_BY` | A's success measured by B | "Processing" → "Cycle Time KPI" |
| `MITIGATES` | A reduces risk B | "Fraud Check" → "Identity Theft Risk" |
| `ESCALATES_TO` | Exception in A goes to B | "Processing" → "Supervisor Review" |
| `VARIANT_OF` | A is alternative to B | "Jumbo Process" → "Standard Process" |

### Modules

Modules are **logical groupings** of atoms that represent complete workflows, processes, or documents:

```yaml
module:
  id: MOD-INTAKE
  name: "Loan Application Intake Module"
  type: BPM_WORKFLOW
  
  atoms:
    - PROC-LO-001  # Receive Application
    - PROC-LO-002  # Validate Completeness
    - DEC-LO-001   # Complete? Decision
    - PROC-LO-003  # Request Missing Items
    - PROC-LO-004  # Assign Processor
    
  entry_points:
    - PROC-LO-001
    
  exit_points:
    - PROC-LO-004
    - PROC-LO-003  # Loop back
    
  external_dependencies:
    - SYS-001     # LOS System
    - ROLE-005    # Loan Officer
```

---

## System Architecture

### Layer 1: Document Ingestion

The ingestion layer converts existing documentation into our atomic structure.

```
┌─────────────────────────────────────────────────────────────────┐
│                    INGESTION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│   │  Word   │    │  PDF    │    │ Visio/  │    │  JSON/  │     │
│   │  Docs   │    │  Files  │    │  BPMN   │    │  YAML   │     │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘     │
│        │              │              │              │           │
│        └──────────────┴──────────────┴──────────────┘           │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │  Universal  │                              │
│                    │   Parser    │                              │
│                    └──────┬──────┘                              │
│                           │                                     │
│            ┌──────────────┼──────────────┐                      │
│            │              │              │                      │
│     ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐              │
│     │    Atom     │ │   Edge    │ │   Schema    │              │
│     │  Extractor  │ │  Inferrer │ │  Validator  │              │
│     └──────┬──────┘ └─────┬─────┘ └──────┬──────┘              │
│            │              │              │                      │
│            └──────────────┴──────────────┘                      │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │   Staging   │                              │
│                    │    Queue    │                              │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

**Key Components:**

1. **Universal Parser**: Handles multiple input formats
   - Word/PDF: NLP extraction of steps, decisions, roles
   - BPMN/Visio: Direct mapping of swimlanes and flows
   - Structured (JSON/YAML): Schema validation and import

2. **Atom Extractor**: Uses LLM assistance to:
   - Identify discrete process steps
   - Classify atom types
   - Extract metadata (owners, timing, etc.)
   - Suggest atom boundaries

3. **Edge Inferrer**: Analyzes content to detect relationships
   - Sequential steps → `TRIGGERS`
   - "Requires" language → `REQUIRES`
   - Role mentions → `PERFORMED_BY`
   - Regulation references → `GOVERNED_BY`

4. **Schema Validator**: Ensures atoms conform to type schemas

### Layer 2: Graph Storage

The storage layer uses a **property graph database** with Git-based version control.

```
┌─────────────────────────────────────────────────────────────────┐
│                    GRAPH STORAGE LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │                    Neo4j Graph DB                      │    │
│   │  ┌─────────────────────────────────────────────────┐  │    │
│   │  │              Atom Nodes                          │  │    │
│   │  │  (PROC) ──TRIGGERS──> (PROC) ──TRIGGERS──> (DEC)│  │    │
│   │  │    │                    │                    │   │  │    │
│   │  │    │PERFORMED_BY        │REQUIRES            │   │  │    │
│   │  │    ▼                    ▼                    ▼   │  │    │
│   │  │  (ROLE)              (DOC)               (PROC) │  │    │
│   │  │    │                    │                    │   │  │    │
│   │  │    │GOVERNED_BY         │PRODUCES            │   │  │    │
│   │  │    ▼                    ▼                    ▼   │  │    │
│   │  │  (REG)               (DOC)               (SYS)  │  │    │
│   │  └─────────────────────────────────────────────────┘  │    │
│   └───────────────────────────────────────────────────────┘    │
│                           │                                     │
│   ┌───────────────────────┴───────────────────────────────┐    │
│   │                    Git Repository                      │    │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │    │
│   │  │ atoms/  │  │modules/ │  │schemas/ │  │ config/ │   │    │
│   │  │ *.yaml  │  │ *.yaml  │  │ *.json  │  │ *.yaml  │   │    │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Sync Strategy:**
- Git is the **source of truth** for atom definitions
- Neo4j is rebuilt from Git on each merge to main
- Enables branching/PR workflow for documentation changes
- Full audit trail through git history

**Graph Schema:**

```cypher
// Node Labels
(:Atom:Process)
(:Atom:Decision)
(:Atom:Role)
(:Atom:System)
(:Atom:Document)
(:Atom:Regulation)
(:Atom:Metric)
(:Atom:Risk)
(:Module)
(:Version)

// Relationship Types
[:TRIGGERS {condition: string, probability: float}]
[:REQUIRES {optional: boolean}]
[:PRODUCES {document_type: string}]
[:PERFORMED_BY {primary: boolean}]
[:GOVERNED_BY {regulation_section: string}]
[:USES {access_type: string}]
[:MEASURED_BY {threshold: float, unit: string}]
[:CONTAINS] // Module -> Atom
[:VERSION_OF] // Atom -> Version
```

### Layer 3: CI/CD & Governance

The governance layer handles change management with automated impact analysis.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CI/CD & GOVERNANCE LAYER                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────┐                                                   │
│   │  PR     │ ──────────────────────────────────────┐           │
│   │ Created │                                       │           │
│   └────┬────┘                                       │           │
│        │                                            │           │
│        ▼                                            ▼           │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐   ┌─────────┐      │
│   │ Schema  │───▶│ Impact  │───▶│  Risk   │──▶│ Route   │      │
│   │  Valid  │    │ Analyze │    │  Score  │   │Approval │      │
│   └─────────┘    └─────────┘    └─────────┘   └────┬────┘      │
│                       │                            │            │
│                       ▼                            ▼            │
│              ┌────────────────┐          ┌────────────────┐     │
│              │ Impact Report  │          │   Approval     │     │
│              │ - Direct deps  │          │   Workflow     │     │
│              │ - Indirect     │          │ ┌────────────┐ │     │
│              │ - Cross-module │          │ │ LOW: Auto  │ │     │
│              │ - Reg impacts  │          │ │ MED: Team  │ │     │
│              └────────────────┘          │ │ HIGH: Lead │ │     │
│                                          │ │ CRIT: Exec │ │     │
│                                          │ └────────────┘ │     │
│                                          └───────┬────────┘     │
│                                                  │              │
│                                                  ▼              │
│                                          ┌────────────┐         │
│                                          │   Merge &  │         │
│                                          │   Deploy   │         │
│                                          └────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

**Risk Scoring Algorithm:**

```python
def calculate_risk_score(changed_atoms: List[Atom]) -> RiskScore:
    score = 0
    
    for atom in changed_atoms:
        # Base score by atom type
        type_weights = {
            'REGULATION': 50,
            'SYSTEM': 30,
            'PROCESS': 20,
            'DECISION': 25,
            'ROLE': 15,
            'DOCUMENT': 10,
            'METRIC': 10
        }
        score += type_weights.get(atom.type, 10)
        
        # Multiply by downstream impact
        downstream = get_all_downstream(atom)
        score += len(downstream) * 5
        
        # Cross-module penalty
        affected_modules = get_affected_modules(downstream)
        if len(affected_modules) > 1:
            score += (len(affected_modules) - 1) * 20
            
        # Regulation cascade multiplier
        reg_impacts = [d for d in downstream if d.type == 'REGULATION']
        score *= (1 + len(reg_impacts) * 0.5)
        
    return RiskScore(
        value=score,
        level='LOW' if score < 30 else 
              'MEDIUM' if score < 70 else 
              'HIGH' if score < 150 else 'CRITICAL'
    )
```

### Layer 4: Graph RAG

The RAG layer provides intelligent querying over the knowledge graph.

```
┌─────────────────────────────────────────────────────────────────┐
│                       GRAPH RAG LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    Query Router                          │  │
│   │   "What happens if we change the income verification?"  │  │
│   └───────────────────────────┬─────────────────────────────┘  │
│                               │                                 │
│           ┌───────────────────┼───────────────────┐             │
│           │                   │                   │             │
│           ▼                   ▼                   ▼             │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐    │
│   │  Entity RAG   │   │   Path RAG    │   │  Impact RAG   │    │
│   │               │   │               │   │               │    │
│   │ "Find atoms   │   │ "How does X   │   │ "What breaks  │    │
│   │  matching..." │   │  connect to Y"│   │  if X changes"│    │
│   └───────────────┘   └───────────────┘   └───────────────┘    │
│           │                   │                   │             │
│           └───────────────────┴───────────────────┘             │
│                               │                                 │
│                       ┌───────▼───────┐                         │
│                       │    Context    │                         │
│                       │    Builder    │                         │
│                       │               │                         │
│                       │ Assembles:    │                         │
│                       │ - Atom content│                         │
│                       │ - Edge context│                         │
│                       │ - Module info │                         │
│                       │ - History     │                         │
│                       └───────┬───────┘                         │
│                               │                                 │
│                       ┌───────▼───────┐                         │
│                       │      LLM      │                         │
│                       │   Response    │                         │
│                       │   Generator   │                         │
│                       └───────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**RAG Strategies:**

1. **Entity RAG**: Traditional vector search enhanced with graph metadata
   ```python
   # Query: "Find all processes involving income verification"
   entities = vector_search("income verification", type_filter="PROCESS")
   # Returns atoms with similarity score + graph context
   ```

2. **Path RAG**: Relationship-aware retrieval
   ```python
   # Query: "How does appraisal connect to closing?"
   paths = graph.find_paths(
       start="PROC-APPRAISAL",
       end="PROC-CLOSING",
       max_hops=5
   )
   # Returns all paths with intermediate atoms
   ```

3. **Impact RAG**: Change-centric queries
   ```python
   # Query: "What breaks if we change credit score threshold?"
   impacts = graph.traverse_downstream(
       atom="DEC-CREDIT-THRESHOLD",
       depth=10,
       include_indirect=True
   )
   # Returns dependency tree with risk annotations
   ```

4. **Semantic RAG**: Natural language over graph
   ```python
   # Query: "Who is responsible for compliance in the disclosure process?"
   # 1. Parse intent (find ROLE atoms)
   # 2. Scope to module (disclosure process)
   # 3. Filter by edge type (PERFORMED_BY + GOVERNED_BY)
   # 4. Generate natural language response
   ```

**Multi-RAG Composition:**

Complex queries automatically compose multiple RAG strategies:

```
Query: "If we change the DTI calculation, which regulations 
        are affected and who needs to approve?"

Strategy Composition:
1. Entity RAG → Find "DTI calculation" atom
2. Impact RAG → Traverse downstream, filter REGULATION type
3. Path RAG → Find paths to ROLE atoms via GOVERNED_BY
4. Context Build → Assemble atoms, edges, approval rules
5. LLM Generate → Natural language response with specifics
```

### Layer 5: Output Generation

The output layer produces consumable artifacts from the graph.

```
┌─────────────────────────────────────────────────────────────────┐
│                    OUTPUT GENERATION LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    Output Router                         │  │
│   └─────────────────────────────┬───────────────────────────┘  │
│                                 │                               │
│     ┌───────────────┬───────────┼───────────┬───────────┐      │
│     │               │           │           │           │      │
│     ▼               ▼           ▼           ▼           ▼      │
│ ┌─────────┐   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │Markdown │   │  Graph  │ │ Impact  │ │  API    │ │  BPMN   │ │
│ │  Docs   │   │  Viz    │ │ Reports │ │Endpoint │ │ Export  │ │
│ └─────────┘   └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Markdown Generation:**

Every atom can be rendered to markdown:

```markdown
# PROC-LO-001: Receive Loan Application

**Type:** Process  
**Status:** Active  
**Version:** 3.2.1  
**Owner:** Intake Supervisor (Loan Operations)

## Summary
Initial intake and validation of borrower loan application.

## Steps
1. Receive application via portal, email, or in-person
2. Validate completeness of required fields
3. Generate unique loan identifier
4. Route to appropriate processor queue

## Exceptions
| Condition | Action |
|-----------|--------|
| Missing SSN | Return to borrower with checklist |
| Duplicate detected | Route to fraud review queue |

## Relationships

### Triggered By
- [TRIG-001: Application Submitted](./trig-001.md)

### Triggers
- [PROC-LO-002: Validate Completeness](./proc-lo-002.md)

### Performed By
- [ROLE-005: Loan Officer](../roles/role-005.md)

### Governed By
- [REG-012: TRID Initial Disclosure](../regulations/reg-012.md)

### Uses
- [SYS-001: Loan Origination System](../systems/sys-001.md)

---
*Last Updated: 2024-01-15 | [View History](./proc-lo-001.history.md)*
```

---

## Workflow Type Support

The platform supports multiple workflow types through configurable schemas:

### BPM (Business Process Management)

```yaml
workflow_type: BPM
schema:
  required_atom_types:
    - PROCESS
    - DECISION
    - GATEWAY
  required_edge_types:
    - TRIGGERS
    - GATEWAY_BRANCH
  swimlane_support: true
  timing_required: true
```

### SOP (Standard Operating Procedure)

```yaml
workflow_type: SOP
schema:
  required_atom_types:
    - PROCEDURE
    - STEP
    - WARNING
    - NOTE
  required_edge_types:
    - NEXT_STEP
    - REFERENCES
  numbered_steps: true
  revision_tracking: true
```

### Customer Journey

```yaml
workflow_type: CUSTOMER_JOURNEY
schema:
  required_atom_types:
    - TOUCHPOINT
    - EMOTION_STATE
    - CHANNEL
    - NEED
  required_edge_types:
    - TRANSITIONS_TO
    - PRODUCES_EMOTION
    - OCCURS_VIA
  persona_support: true
  emotion_tracking: true
```

### Custom Workflow

```yaml
workflow_type: CUSTOM
name: "Compliance Audit Trail"
schema:
  atom_types:
    - name: CONTROL
      fields: [control_id, objective, frequency]
    - name: EVIDENCE
      fields: [evidence_type, retention_period]
    - name: FINDING
      fields: [severity, remediation_date]
  edge_types:
    - name: VALIDATES
      from: [EVIDENCE]
      to: [CONTROL]
    - name: IDENTIFIES
      from: [CONTROL]
      to: [FINDING]
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Deliverables:**
- [ ] Core atom schema definitions
- [ ] Git repository structure
- [ ] Basic Neo4j graph setup
- [ ] Simple YAML-to-graph sync
- [ ] CLI for adding/viewing atoms

**Milestone:** Can manually create atoms and see them in graph

### Phase 2: Ingestion (Weeks 5-8)

**Deliverables:**
- [ ] Word document parser (using python-docx + LLM)
- [ ] PDF parser (using PyMuPDF + LLM)
- [ ] Edge inference engine
- [ ] Staging/review UI for imports
- [ ] Schema validation pipeline

**Milestone:** Can import existing SOPs and convert to atoms

### Phase 3: CI/CD (Weeks 9-12)

**Deliverables:**
- [ ] GitHub Actions integration
- [ ] Impact analysis queries
- [ ] Risk scoring algorithm
- [ ] Approval routing system
- [ ] Merge automation

**Milestone:** PRs auto-analyzed for impact and routed appropriately

### Phase 4: RAG (Weeks 13-16)

**Deliverables:**
- [ ] Vector embeddings for atoms
- [ ] Entity RAG implementation
- [ ] Path RAG with Cypher generation
- [ ] Impact RAG with traversal
- [ ] Chat interface for queries

**Milestone:** Can ask natural language questions about documentation

### Phase 5: Polish (Weeks 17-20)

**Deliverables:**
- [ ] Full markdown generation
- [ ] Interactive graph visualization
- [ ] Impact report generation
- [ ] API endpoints
- [ ] Multi-workflow support

**Milestone:** Production-ready documentation platform

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Graph DB | Neo4j | Rich Cypher queries, APOC for traversal |
| Version Control | Git | Industry standard, audit trail |
| Ingestion | Python + LangChain | Flexible parsing, LLM integration |
| CI/CD | GitHub Actions | Native Git integration |
| RAG | LangGraph + Neo4j Vector | Graph-aware retrieval |
| Frontend | React + D3.js | Interactive visualization |
| API | FastAPI | Async, type hints, auto-docs |
| Search | Neo4j Vector Index | Unified with graph storage |

---

## Key Queries Reference

### Impact Analysis

```cypher
// Find all downstream impacts of changing an atom
MATCH (changed:Atom {id: $atomId})
CALL apoc.path.subgraphNodes(changed, {
    relationshipFilter: "TRIGGERS>|REQUIRES>|PRODUCES>",
    maxLevel: 10
}) YIELD node
WITH changed, collect(node) as impacted
RETURN changed, impacted, size(impacted) as impact_count
```

### Cross-Module Dependencies

```cypher
// Find atoms that create cross-module dependencies
MATCH (a:Atom)-[r]->(b:Atom)
WHERE (a)-[:CONTAINED_IN]->(:Module {id: $moduleA})
  AND (b)-[:CONTAINED_IN]->(:Module {id: $moduleB})
RETURN a.id, type(r), b.id
```

### Regulation Coverage

```cypher
// Find all processes governed by a regulation
MATCH (reg:Atom:Regulation {id: $regId})<-[:GOVERNED_BY]-(proc:Atom:Process)
OPTIONAL MATCH (proc)-[:CONTAINED_IN]->(mod:Module)
RETURN proc.id, proc.name, collect(mod.name) as modules
```

### Orphan Detection

```cypher
// Find atoms with no incoming or outgoing edges
MATCH (a:Atom)
WHERE NOT (a)-[]-()
RETURN a.id, a.type, a.name
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Document Conversion Rate | 90% automated | Atoms requiring manual intervention |
| Impact Analysis Accuracy | 95% | Downstream effects correctly identified |
| Change Cycle Time | 50% reduction | Time from PR to merge |
| Query Response Quality | 4.5/5 user rating | RAG response usefulness |
| Cross-Module Visibility | 100% | All dependencies explicitly mapped |

---

## Appendix: Sample Atom Directory Structure

```
repository/
├── atoms/
│   ├── processes/
│   │   ├── loan-origination/
│   │   │   ├── proc-lo-001.yaml
│   │   │   ├── proc-lo-002.yaml
│   │   │   └── ...
│   │   └── underwriting/
│   │       └── ...
│   ├── decisions/
│   ├── roles/
│   ├── systems/
│   ├── documents/
│   ├── regulations/
│   ├── metrics/
│   └── risks/
├── modules/
│   ├── mod-intake.yaml
│   ├── mod-processing.yaml
│   └── ...
├── schemas/
│   ├── atom-types.json
│   ├── edge-types.json
│   └── workflow-types/
│       ├── bpm.yaml
│       ├── sop.yaml
│       └── customer-journey.yaml
├── config/
│   ├── risk-weights.yaml
│   ├── approval-rules.yaml
│   └── rag-config.yaml
└── .github/
    └── workflows/
        ├── validate.yaml
        ├── impact-analysis.yaml
        └── deploy.yaml
```

---

*This architecture document is itself an atom in the GNDP system.*
