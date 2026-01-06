# Ontology for Graph-Native Documentation Platform (GNDP)

**Version:** 1.0.0  
**Created:** 2025-12-19  

Semantic contract for entity types and relationships in docs-as-code system

## Entity Types

Core atoms that make up the knowledge graph.

```mermaid
classDiagram
    class Requirement {
        Business, functional, or compliance requirements
        ID: ^REQ-[0-9]{3}$
    }
    class Design {
        Technical designs and architectural decisions
        ID: ^DES-[0-9]{3}$
    }
    class Procedure {
        Standard operating procedures and workflows
        ID: ^PROC-[0-9]{3}$
    }
    class Validation {
        Tests, checks, and validation procedures
        ID: ^VAL-[0-9]{3}$
    }
    class Policy {
        Organizational policies and governance rules
        ID: ^POL-[0-9]{3}$
    }
    class Risk {
        Identified risks and risk scenarios
        ID: ^RISK-[0-9]{3}$
    }
```

| Type | Label | Description | ID Pattern | Examples |
|------|-------|-------------|------------|----------|
| `requirement` | Requirement | Business, functional, or compliance requirements | `^REQ-[0-9]{3}$` | REQ-001, REQ-002 |
| `design` | Design | Technical designs and architectural decisions | `^DES-[0-9]{3}$` | DES-001, DES-002 |
| `procedure` | Procedure | Standard operating procedures and workflows | `^PROC-[0-9]{3}$` | PROC-001 |
| `validation` | Validation | Tests, checks, and validation procedures | `^VAL-[0-9]{3}$` | VAL-001 |
| `policy` | Policy | Organizational policies and governance rules | `^POL-[0-9]{3}$` | POL-001 |
| `risk` | Risk | Identified risks and risk scenarios | `^RISK-[0-9]{3}$` | RISK-001 |

## Relationship Types

Allowed edges between atoms.

| Name | Label | Description | Inverse |
|------|-------|-------------|---------|
| `requires` | Requires | Dependency relationship - source requires target | `required_by` |
| `implements` | Implements | Implementation relationship - source implements target | `implemented_by` |
| `validates` | Validates | Validation relationship - source validates target | `validated_by` |
| `depends_on` | Depends On | Technical dependency - source depends on target | `depended_on_by` |
| `mitigates` | Mitigates | Risk mitigation - source mitigates target risk | `mitigated_by` |
| `owns` | Owns | Ownership relationship - source owns target | `owned_by` |
| `affects` | Affects | Impact relationship - source affects target | `affected_by` |

## Traversal Patterns

Common graph traversal patterns used for RAG.

### Upstream Dependencies
Find all upstream dependencies (what this atom requires)

- **Relationships:** `requires, depends_on`
- **Direction:** `outgoing`
- **Max Depth:** `3`

### Downstream Impacts
Find all downstream impacts (what depends on this atom)

- **Relationships:** `required_by, depends_on, affects`
- **Direction:** `incoming`
- **Max Depth:** `3`

### Implementation Chain
Follow requirement → design → procedure → validation chain

- **Relationships:** `implemented_by, validated_by`
- **Direction:** `outgoing`
- **Max Depth:** `4`

### Full Context
Get comprehensive context (2-hop bidirectional)

- **Relationships:** ``
- **Direction:** `both`
- **Max Depth:** `2`

