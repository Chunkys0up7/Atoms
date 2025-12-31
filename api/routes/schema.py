"""
Schema Management API

Provides endpoints for managing ontology schemas including:
- Domain definitions
- Edge constraints
- Schema validation rules
- Atom validation against schemas
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Schema storage path
SCHEMA_CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "schema_config.json"


class DomainDefinition(BaseModel):
    """Domain definition with constraints"""

    id: str
    name: str
    description: str
    allowed_types: List[str]
    required_attributes: List[str]
    validation_rules: List[str]


class EdgeConstraint(BaseModel):
    """Edge constraint definition"""

    id: str
    edge_type: str
    source_type: str
    target_type: str
    description: str
    is_required: bool = False


class SchemaConfig(BaseModel):
    """Complete schema configuration"""

    domains: List[DomainDefinition]
    constraints: List[EdgeConstraint]
    version: str = "1.0.0"
    updated_at: Optional[str] = None


class AtomValidationResult(BaseModel):
    """Result of validating an atom against schema"""

    atom_id: str
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []


def load_schema_config() -> SchemaConfig:
    """Load schema configuration from file"""
    if not SCHEMA_CONFIG_PATH.exists():
        # Return default schema if file doesn't exist
        return get_default_schema()

    try:
        with open(SCHEMA_CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return SchemaConfig(**data)
    except Exception as e:
        print(f"Error loading schema config: {e}", file=sys.stderr)
        return get_default_schema()


def save_schema_config(config: SchemaConfig) -> None:
    """Save schema configuration to file"""
    # Ensure config directory exists
    SCHEMA_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(SCHEMA_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config.dict(), f, indent=2)
    except Exception as e:
        print(f"Error saving schema config: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to save schema: {str(e)}")


def get_default_schema() -> SchemaConfig:
    """Get default schema configuration"""
    from datetime import datetime

    return SchemaConfig(
        version="1.0.0",
        updated_at=datetime.utcnow().isoformat(),
        domains=[
            DomainDefinition(
                id="loan-origination",
                name="Loan Origination",
                description="Core loan origination processes and workflows",
                allowed_types=["PROCESS", "DOCUMENT", "POLICY", "CONTROL"],
                required_attributes=["name", "type", "category"],
                validation_rules=["Must have at least one PROCESS atom", "DOCUMENT atoms must specify document_type"],
            ),
            DomainDefinition(
                id="risk-management",
                name="Risk Management",
                description="Risk assessment and mitigation processes",
                allowed_types=["PROCESS", "POLICY", "CONTROL", "DECISION"],
                required_attributes=["name", "type", "category", "criticality"],
                validation_rules=[
                    "All atoms must have criticality defined",
                    "DECISION atoms must specify decision criteria",
                ],
            ),
            DomainDefinition(
                id="compliance",
                name="Compliance & Regulatory",
                description="Regulatory compliance and policy enforcement",
                allowed_types=["POLICY", "CONTROL", "DOCUMENT", "PROCESS"],
                required_attributes=["name", "type", "category", "steward"],
                validation_rules=["POLICY atoms must have steward assigned", "Must reference applicable regulations"],
            ),
        ],
        constraints=[
            # Dependency constraints
            EdgeConstraint(
                id="process-requires-system",
                edge_type="REQUIRES",
                source_type="PROCESS",
                target_type="SYSTEM",
                description="Process atoms can require system atoms",
                is_required=False,
            ),
            EdgeConstraint(
                id="process-requires-role",
                edge_type="REQUIRES",
                source_type="PROCESS",
                target_type="ROLE",
                description="Process atoms can require role atoms",
                is_required=False,
            ),
            # Composition constraints
            EdgeConstraint(
                id="process-produces-document",
                edge_type="PRODUCES",
                source_type="PROCESS",
                target_type="DOCUMENT",
                description="Process atoms can produce document atoms",
                is_required=False,
            ),
            EdgeConstraint(
                id="process-consumes-document",
                edge_type="CONSUMES",
                source_type="PROCESS",
                target_type="DOCUMENT",
                description="Process atoms can consume document atoms",
                is_required=False,
            ),
            # Governance constraints
            EdgeConstraint(
                id="process-implements-policy",
                edge_type="IMPLEMENTS",
                source_type="PROCESS",
                target_type="POLICY",
                description="Process atoms implement policy atoms",
                is_required=False,
            ),
            EdgeConstraint(
                id="control-enforces-policy",
                edge_type="ENFORCES",
                source_type="CONTROL",
                target_type="POLICY",
                description="Control atoms enforce policy atoms",
                is_required=False,
            ),
            # Workflow constraints
            EdgeConstraint(
                id="process-triggers-process",
                edge_type="TRIGGERS",
                source_type="PROCESS",
                target_type="PROCESS",
                description="Process atoms can trigger other process atoms",
                is_required=False,
            ),
            EdgeConstraint(
                id="decision-leads-to-process",
                edge_type="LEADS_TO",
                source_type="DECISION",
                target_type="PROCESS",
                description="Decision atoms lead to process atoms",
                is_required=False,
            ),
        ],
    )


@router.get("/api/schema/config")
def get_schema_config() -> SchemaConfig:
    """
    Get complete schema configuration.

    Returns:
        SchemaConfig with all domain definitions and constraints
    """
    return load_schema_config()


@router.get("/api/schema/domains")
def get_domains() -> List[DomainDefinition]:
    """
    Get all domain definitions.

    Returns:
        List of domain definitions
    """
    config = load_schema_config()
    return config.domains


@router.post("/api/schema/domains")
def update_domains(domains: List[DomainDefinition]) -> Dict[str, Any]:
    """
    Update domain definitions.

    Args:
        domains: List of domain definitions to save

    Returns:
        Success message with updated domain count
    """
    from datetime import datetime

    config = load_schema_config()
    config.domains = domains
    config.updated_at = datetime.utcnow().isoformat()

    save_schema_config(config)

    return {"status": "success", "message": f"Updated {len(domains)} domain definitions", "domain_count": len(domains)}


@router.get("/api/schema/constraints")
def get_constraints() -> List[EdgeConstraint]:
    """
    Get all edge constraints.

    Returns:
        List of edge constraint definitions
    """
    config = load_schema_config()
    return config.constraints


@router.post("/api/schema/constraints")
def update_constraints(constraints: List[EdgeConstraint]) -> Dict[str, Any]:
    """
    Update edge constraints.

    Args:
        constraints: List of edge constraints to save

    Returns:
        Success message with updated constraint count
    """
    from datetime import datetime

    config = load_schema_config()
    config.constraints = constraints
    config.updated_at = datetime.utcnow().isoformat()

    save_schema_config(config)

    return {
        "status": "success",
        "message": f"Updated {len(constraints)} edge constraints",
        "constraint_count": len(constraints),
    }


@router.post("/api/schema/validate-atom")
def validate_atom(atom_data: Dict[str, Any]) -> AtomValidationResult:
    """
    Validate an atom against schema rules.

    Args:
        atom_data: Atom data to validate

    Returns:
        Validation result with errors and warnings
    """
    atom_id = atom_data.get("id", "unknown")
    atom_type = atom_data.get("type", "")
    domain = atom_data.get("ontologyDomain", "")

    errors = []
    warnings = []

    config = load_schema_config()

    # Find domain definition
    domain_def = None
    for d in config.domains:
        if d.id == domain or d.name == domain:
            domain_def = d
            break

    if not domain_def:
        warnings.append(f"Domain '{domain}' not found in schema definitions")
    else:
        # Check if type is allowed in domain
        if atom_type not in domain_def.allowed_types:
            errors.append(
                f"Type '{atom_type}' not allowed in domain '{domain}'. "
                f"Allowed types: {', '.join(domain_def.allowed_types)}"
            )

        # Check required attributes
        for attr in domain_def.required_attributes:
            if attr not in atom_data or not atom_data[attr]:
                errors.append(f"Required attribute '{attr}' is missing or empty")

    # Validate edges against constraints
    edges = atom_data.get("edges", [])
    for edge in edges:
        edge_type = edge.get("type", "")
        target_id = edge.get("target", "")

        # Check if this edge type is allowed for this source type
        valid_constraint = False
        for constraint in config.constraints:
            if constraint.source_type == atom_type and constraint.edge_type == edge_type:
                valid_constraint = True
                break

        if not valid_constraint:
            warnings.append(f"Edge type '{edge_type}' from '{atom_type}' may not be defined in schema")

    is_valid = len(errors) == 0

    return AtomValidationResult(atom_id=atom_id, is_valid=is_valid, errors=errors, warnings=warnings)


@router.post("/api/schema/validate-edge")
def validate_edge(source_type: str, edge_type: str, target_type: str) -> Dict[str, Any]:
    """
    Validate if an edge is allowed by schema constraints.

    Args:
        source_type: Type of source atom
        edge_type: Type of edge/relationship
        target_type: Type of target atom

    Returns:
        Validation result with is_valid flag and message
    """
    config = load_schema_config()

    # Check if constraint exists
    for constraint in config.constraints:
        if (
            constraint.source_type == source_type
            and constraint.edge_type == edge_type
            and constraint.target_type == target_type
        ):
            return {
                "is_valid": True,
                "message": f"Valid edge: {constraint.description}",
                "constraint_id": constraint.id,
            }

    # No exact match found
    return {
        "is_valid": False,
        "message": f"No schema constraint allows {edge_type} edge from {source_type} to {target_type}",
        "suggestion": "Add this constraint to schema or choose a different edge type",
    }


@router.get("/api/schema/stats")
def get_schema_stats() -> Dict[str, Any]:
    """
    Get schema statistics.

    Returns:
        Statistics about schema definitions
    """
    config = load_schema_config()

    # Calculate stats
    total_allowed_types = set()
    for domain in config.domains:
        total_allowed_types.update(domain.allowed_types)

    constraint_by_category = {}
    for constraint in config.constraints:
        edge_type = constraint.edge_type
        if edge_type not in constraint_by_category:
            constraint_by_category[edge_type] = 0
        constraint_by_category[edge_type] += 1

    return {
        "domain_count": len(config.domains),
        "constraint_count": len(config.constraints),
        "unique_types": len(total_allowed_types),
        "edge_types": len(constraint_by_category),
        "constraint_by_edge_type": constraint_by_category,
        "version": config.version,
        "last_updated": config.updated_at,
    }


@router.post("/api/schema/import")
def import_schema(schema_data: SchemaConfig) -> Dict[str, Any]:
    """
    Import complete schema configuration.

    Args:
        schema_data: Complete schema configuration to import

    Returns:
        Import status and statistics
    """
    from datetime import datetime

    # Update version and timestamp
    schema_data.version = schema_data.version or "1.0.0"
    schema_data.updated_at = datetime.utcnow().isoformat()

    # Validate data before saving
    if len(schema_data.domains) == 0:
        raise HTTPException(status_code=400, detail="Schema must contain at least one domain")

    # Save configuration
    save_schema_config(schema_data)

    return {
        "status": "success",
        "message": "Schema imported successfully",
        "domain_count": len(schema_data.domains),
        "constraint_count": len(schema_data.constraints),
        "version": schema_data.version,
    }


@router.get("/api/schema/export")
def export_schema() -> SchemaConfig:
    """
    Export complete schema configuration.

    Returns:
        Complete schema configuration in JSON format
    """
    return load_schema_config()


@router.post("/api/schema/reset")
def reset_schema() -> Dict[str, Any]:
    """
    Reset schema to default configuration.

    Returns:
        Reset status message
    """
    default_schema = get_default_schema()
    save_schema_config(default_schema)

    return {
        "status": "success",
        "message": "Schema reset to defaults",
        "domain_count": len(default_schema.domains),
        "constraint_count": len(default_schema.constraints),
    }


@router.post("/api/schema/impact-analysis")
async def analyze_constraint_impact(constraint_change: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze impact of adding, removing, or modifying a constraint.

    Args:
        constraint_change: Description of the constraint change
            {
                "action": "add|remove|modify",
                "constraint": EdgeConstraint object
            }

    Returns:
        Impact analysis with affected atoms and validation changes
    """
    from pathlib import Path

    import httpx
    import yaml

    action = constraint_change.get("action")
    constraint_data = constraint_change.get("constraint", {})

    if not action or not constraint_data:
        raise HTTPException(status_code=400, detail="Must provide 'action' and 'constraint' fields")

    # Load all atoms to analyze
    atoms_base = Path(__file__).parent.parent.parent / "atoms"
    affected_atoms = []
    total_atoms = 0

    for yaml_file in atoms_base.rglob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as f:
                atom_data = yaml.safe_load(f)

            if not atom_data:
                continue

            total_atoms += 1
            atom_type = atom_data.get("type", "")
            edges = atom_data.get("edges", [])

            # Check if this atom is affected by the constraint change
            is_affected = False

            if action == "add":
                # New constraint might restrict existing edges
                for edge in edges:
                    if edge.get("type") == constraint_data.get("edge_type") and atom_type == constraint_data.get(
                        "source_type"
                    ):
                        is_affected = True
                        break

            elif action == "remove":
                # Removing constraint might invalidate dependent validations
                for edge in edges:
                    if edge.get("type") == constraint_data.get("edge_type") and atom_type == constraint_data.get(
                        "source_type"
                    ):
                        is_affected = True
                        break

            elif action == "modify":
                # Modified constraint affects atoms using that edge type
                for edge in edges:
                    if edge.get("type") == constraint_data.get("edge_type"):
                        is_affected = True
                        break

            if is_affected:
                affected_atoms.append(
                    {
                        "atom_id": atom_data.get("id"),
                        "atom_type": atom_type,
                        "affected_edges": [e for e in edges if e.get("type") == constraint_data.get("edge_type")],
                    }
                )

        except Exception as e:
            print(f"Error analyzing atom {yaml_file}: {e}", file=sys.stderr)
            continue

    return {
        "action": action,
        "constraint": constraint_data,
        "total_atoms_analyzed": total_atoms,
        "affected_atom_count": len(affected_atoms),
        "affected_atoms": affected_atoms[:50],  # Limit to first 50 for response size
        "has_more": len(affected_atoms) > 50,
        "impact_level": "HIGH" if len(affected_atoms) > 10 else "MEDIUM" if len(affected_atoms) > 0 else "LOW",
        "recommendation": get_impact_recommendation(action, len(affected_atoms)),
    }


def get_impact_recommendation(action: str, affected_count: int) -> str:
    """Get recommendation based on impact analysis."""
    if affected_count == 0:
        return f"Safe to {action} - no atoms currently affected"

    if action == "add":
        return f"Adding this constraint may require updating {affected_count} atom(s) to ensure compliance"
    elif action == "remove":
        return (
            f"Removing this constraint will affect validation for {affected_count} atom(s). Ensure this is intentional."
        )
    elif action == "modify":
        return f"Modifying this constraint impacts {affected_count} atom(s). Review each carefully before applying."

    return "Review affected atoms before proceeding"


@router.get("/api/schema/templates")
def get_schema_templates() -> List[Dict[str, Any]]:
    """
    Get predefined schema templates for common use cases.

    Returns:
        List of schema template definitions
    """
    templates = [
        {
            "id": "financial-services",
            "name": "Financial Services Standard",
            "description": "Schema template for financial services organizations with compliance, risk, and lending domains",
            "domains": [
                {
                    "id": "lending-operations",
                    "name": "Lending Operations",
                    "description": "Loan origination, processing, and servicing",
                    "allowed_types": ["PROCESS", "DOCUMENT", "DECISION", "CONTROL"],
                    "required_attributes": ["owner", "criticality", "compliance_score"],
                    "validation_rules": ["All loan processes must have compliance_score >= 0.8"],
                },
                {
                    "id": "risk-compliance",
                    "name": "Risk & Compliance",
                    "description": "Risk management and regulatory compliance",
                    "allowed_types": ["RISK", "POLICY", "REGULATION", "CONTROL", "METRIC"],
                    "required_attributes": ["regulatory_context", "steward", "effective_date"],
                    "validation_rules": ["All REGULATION atoms must reference external regulation ID"],
                },
                {
                    "id": "customer-experience",
                    "name": "Customer Experience",
                    "description": "Customer-facing processes and touchpoints",
                    "allowed_types": ["PROCESS", "DOCUMENT", "GATEWAY", "EVENT"],
                    "required_attributes": ["customer_impact", "channel"],
                    "validation_rules": ["Customer-facing processes must define SLA"],
                },
            ],
            "constraints": [
                {"edge_type": "REQUIRES", "source_type": "PROCESS", "target_type": "SYSTEM"},
                {"edge_type": "GOVERNED_BY", "source_type": "PROCESS", "target_type": "POLICY"},
                {"edge_type": "IMPLEMENTS", "source_type": "CONTROL", "target_type": "POLICY"},
                {"edge_type": "PRODUCES", "source_type": "PROCESS", "target_type": "DOCUMENT"},
            ],
        },
        {
            "id": "healthcare",
            "name": "Healthcare & Medical",
            "description": "Schema for healthcare organizations with patient care, clinical, and administrative domains",
            "domains": [
                {
                    "id": "clinical-care",
                    "name": "Clinical Care",
                    "description": "Patient care processes and clinical workflows",
                    "allowed_types": ["PROCESS", "PROTOCOL", "DECISION", "ASSESSMENT"],
                    "required_attributes": ["clinical_owner", "patient_safety_impact", "evidence_level"],
                    "validation_rules": ["Clinical processes must reference evidence-based guidelines"],
                },
                {
                    "id": "administrative",
                    "name": "Administrative Operations",
                    "description": "Administrative and operational processes",
                    "allowed_types": ["PROCESS", "DOCUMENT", "SYSTEM", "CONTROL"],
                    "required_attributes": ["department", "hipaa_applicable"],
                    "validation_rules": ["HIPAA-applicable processes must have privacy controls"],
                },
                {
                    "id": "regulatory-quality",
                    "name": "Regulatory & Quality",
                    "description": "Regulatory compliance and quality management",
                    "allowed_types": ["REGULATION", "POLICY", "CONTROL", "AUDIT"],
                    "required_attributes": ["regulatory_body", "compliance_level", "review_frequency"],
                    "validation_rules": ["All regulations must be reviewed annually"],
                },
            ],
            "constraints": [
                {"edge_type": "REQUIRES", "source_type": "PROCESS", "target_type": "PROTOCOL"},
                {"edge_type": "GOVERNED_BY", "source_type": "PROCESS", "target_type": "REGULATION"},
                {"edge_type": "VALIDATES", "source_type": "CONTROL", "target_type": "PROCESS"},
            ],
        },
        {
            "id": "manufacturing",
            "name": "Manufacturing & Supply Chain",
            "description": "Schema for manufacturing with production, quality, and supply chain domains",
            "domains": [
                {
                    "id": "production",
                    "name": "Production Operations",
                    "description": "Manufacturing processes and production workflows",
                    "allowed_types": ["PROCESS", "PROCEDURE", "EQUIPMENT", "METRIC"],
                    "required_attributes": ["line", "shift_applicable", "safety_critical"],
                    "validation_rules": ["Safety-critical processes must have redundant controls"],
                },
                {
                    "id": "quality-control",
                    "name": "Quality Control",
                    "description": "Quality assurance and testing",
                    "allowed_types": ["CONTROL", "TEST", "INSPECTION", "STANDARD"],
                    "required_attributes": ["quality_standard", "inspection_frequency", "tolerance"],
                    "validation_rules": ["All quality controls must specify tolerances"],
                },
                {
                    "id": "supply-chain",
                    "name": "Supply Chain",
                    "description": "Procurement, logistics, and inventory",
                    "allowed_types": ["PROCESS", "SYSTEM", "METRIC", "SUPPLIER"],
                    "required_attributes": ["lead_time", "criticality"],
                    "validation_rules": ["Critical suppliers must have backup alternatives"],
                },
            ],
            "constraints": [
                {"edge_type": "REQUIRES", "source_type": "PROCESS", "target_type": "EQUIPMENT"},
                {"edge_type": "VALIDATED_BY", "source_type": "PROCESS", "target_type": "CONTROL"},
                {"edge_type": "PRODUCES", "source_type": "PROCESS", "target_type": "METRIC"},
            ],
        },
        {
            "id": "minimal",
            "name": "Minimal Starter",
            "description": "Simple starter schema with basic domains for any organization",
            "domains": [
                {
                    "id": "core-operations",
                    "name": "Core Operations",
                    "description": "Primary business processes",
                    "allowed_types": ["PROCESS", "DOCUMENT", "SYSTEM"],
                    "required_attributes": ["name", "owner"],
                    "validation_rules": [],
                },
                {
                    "id": "governance",
                    "name": "Governance",
                    "description": "Policies and controls",
                    "allowed_types": ["POLICY", "CONTROL", "REGULATION"],
                    "required_attributes": ["name", "owner", "effective_date"],
                    "validation_rules": [],
                },
            ],
            "constraints": [
                {"edge_type": "REQUIRES", "source_type": "PROCESS", "target_type": "SYSTEM"},
                {"edge_type": "GOVERNED_BY", "source_type": "PROCESS", "target_type": "POLICY"},
            ],
        },
    ]

    return templates


@router.post("/api/schema/apply-template/{template_id}")
def apply_schema_template(template_id: str, merge: bool = False) -> Dict[str, Any]:
    """
    Apply a predefined schema template.

    Args:
        template_id: ID of template to apply
        merge: If True, merge with existing schema. If False, replace entirely.

    Returns:
        Applied schema configuration
    """
    from datetime import datetime

    # Get template
    templates = get_schema_templates()
    template = next((t for t in templates if t["id"] == template_id), None)

    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    if merge:
        # Merge with existing schema
        existing = load_schema_config()

        # Combine domains (no duplicates by ID)
        existing_domain_ids = {d.id for d in existing.domains}
        new_domains = [DomainDefinition(**d) for d in template["domains"] if d["id"] not in existing_domain_ids]
        all_domains = existing.domains + new_domains

        # Combine constraints
        existing_constraint_keys = {(c.edge_type, c.source_type, c.target_type) for c in existing.constraints}
        new_constraints = [
            EdgeConstraint(
                id=f"{c['edge_type'].lower()}-{c['source_type'].lower()}-{c['target_type'].lower()}",
                edge_type=c["edge_type"],
                source_type=c["source_type"],
                target_type=c["target_type"],
                description=f"{c['source_type']} {c['edge_type']} {c['target_type']}",
                is_required=False,
            )
            for c in template["constraints"]
            if (c["edge_type"], c["source_type"], c["target_type"]) not in existing_constraint_keys
        ]
        all_constraints = existing.constraints + new_constraints

        new_schema = SchemaConfig(
            domains=all_domains,
            constraints=all_constraints,
            version=existing.version,
            updated_at=datetime.utcnow().isoformat(),
        )
    else:
        # Replace entirely with template
        new_schema = SchemaConfig(
            domains=[DomainDefinition(**d) for d in template["domains"]],
            constraints=[
                EdgeConstraint(
                    id=f"{c['edge_type'].lower()}-{c['source_type'].lower()}-{c['target_type'].lower()}",
                    edge_type=c["edge_type"],
                    source_type=c["source_type"],
                    target_type=c["target_type"],
                    description=f"{c['source_type']} {c['edge_type']} {c['target_type']}",
                    is_required=False,
                )
                for c in template["constraints"]
            ],
            version="1.0.0",
            updated_at=datetime.utcnow().isoformat(),
        )

    # Save the new schema
    save_schema_config(new_schema)

    return {
        "status": "success",
        "message": f"Applied template '{template['name']}'",
        "mode": "merged" if merge else "replaced",
        "domain_count": len(new_schema.domains),
        "constraint_count": len(new_schema.constraints),
    }


@router.get("/api/schema/documentation")
def generate_schema_documentation(format: str = "markdown") -> Dict[str, Any]:
    """
    Generate human-readable documentation from schema.

    Args:
        format: Output format - 'markdown', 'html', or 'json'

    Returns:
        Generated documentation
    """
    config = load_schema_config()

    if format == "markdown":
        doc = generate_markdown_docs(config)
    elif format == "html":
        doc = generate_html_docs(config)
    elif format == "json":
        return {"documentation": config.dict()}
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

    return {"format": format, "documentation": doc, "version": config.version, "generated_at": config.updated_at}


def generate_markdown_docs(config: SchemaConfig) -> str:
    """Generate Markdown documentation from schema."""
    from datetime import datetime

    md = []
    md.append(f"# Schema Documentation\n")
    md.append(f"**Version:** {config.version}  ")
    md.append(f"**Last Updated:** {config.updated_at}\n")
    md.append(f"---\n")

    # Table of Contents
    md.append("## Table of Contents\n")
    md.append("1. [Overview](#overview)")
    md.append("2. [Domains](#domains)")
    md.append("3. [Edge Constraints](#edge-constraints)")
    md.append("4. [Statistics](#statistics)\n")

    # Overview
    md.append("## Overview\n")
    md.append(
        f"This schema defines **{len(config.domains)} domains** and **{len(config.constraints)} edge constraints** "
    )
    md.append(f"for the Graph-Native Documentation Platform.\n")

    # Domains
    md.append("## Domains\n")
    for i, domain in enumerate(config.domains, 1):
        md.append(f"### {i}. {domain.name}\n")
        md.append(f"**ID:** `{domain.id}`  ")
        md.append(f"**Description:** {domain.description}\n")

        if domain.allowed_types:
            md.append(f"**Allowed Types:**")
            for atype in domain.allowed_types:
                md.append(f"- `{atype}`")
            md.append("")

        if domain.required_attributes:
            md.append(f"**Required Attributes:**")
            for attr in domain.required_attributes:
                md.append(f"- `{attr}`")
            md.append("")

        if domain.validation_rules:
            md.append(f"**Validation Rules:**")
            for rule in domain.validation_rules:
                md.append(f"- {rule}")
            md.append("")

    # Edge Constraints
    md.append("## Edge Constraints\n")
    md.append("| Edge Type | Source Type | Target Type | Description | Required |")
    md.append("|-----------|-------------|-------------|-------------|----------|")

    for constraint in config.constraints:
        required_mark = "✓" if constraint.is_required else ""
        md.append(
            f"| `{constraint.edge_type}` | `{constraint.source_type}` | "
            f"`{constraint.target_type}` | {constraint.description} | {required_mark} |"
        )

    md.append("")

    # Statistics
    md.append("## Statistics\n")
    total_types = set()
    for domain in config.domains:
        total_types.update(domain.allowed_types)

    md.append(f"- **Total Domains:** {len(config.domains)}")
    md.append(f"- **Total Constraints:** {len(config.constraints)}")
    md.append(f"- **Unique Atom Types:** {len(total_types)}")
    md.append(f"- **Schema Version:** {config.version}")

    return "\n".join(md)


def generate_html_docs(config: SchemaConfig) -> str:
    """Generate HTML documentation from schema."""
    html = []
    html.append("<!DOCTYPE html>")
    html.append("<html lang='en'>")
    html.append("<head>")
    html.append("  <meta charset='UTF-8'>")
    html.append("  <meta name='viewport' content='width=device-width, initial-scale=1.0'>")
    html.append("  <title>Schema Documentation</title>")
    html.append("  <style>")
    html.append(
        "    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; line-height: 1.6; }"
    )
    html.append("    h1 { color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }")
    html.append("    h2 { color: #334155; margin-top: 30px; }")
    html.append("    h3 { color: #475569; }")
    html.append("    .domain { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }")
    html.append(
        "    .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin: 2px; }"
    )
    html.append("    table { width: 100%; border-collapse: collapse; margin: 20px 0; }")
    html.append("    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }")
    html.append("    th { background: #f1f5f9; font-weight: 600; }")
    html.append("    code { background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-family: monospace; }")
    html.append("  </style>")
    html.append("</head>")
    html.append("<body>")

    html.append(f"  <h1>Schema Documentation</h1>")
    html.append(
        f"  <p><strong>Version:</strong> {config.version} | <strong>Last Updated:</strong> {config.updated_at}</p>"
    )

    html.append(f"  <h2>Domains ({len(config.domains)})</h2>")
    for domain in config.domains:
        html.append(f"  <div class='domain'>")
        html.append(f"    <h3>{domain.name}</h3>")
        html.append(f"    <p><code>{domain.id}</code></p>")
        html.append(f"    <p>{domain.description}</p>")

        if domain.allowed_types:
            html.append(f"    <p><strong>Allowed Types:</strong> ")
            for atype in domain.allowed_types:
                html.append(f"<span class='badge'>{atype}</span> ")
            html.append(f"</p>")

        if domain.required_attributes:
            html.append(
                f"    <p><strong>Required Attributes:</strong> {', '.join([f'<code>{a}</code>' for a in domain.required_attributes])}</p>"
            )

        html.append(f"  </div>")

    html.append(f"  <h2>Edge Constraints ({len(config.constraints)})</h2>")
    html.append(f"  <table>")
    html.append(
        f"    <thead><tr><th>Edge Type</th><th>Source</th><th>Target</th><th>Description</th><th>Required</th></tr></thead>"
    )
    html.append(f"    <tbody>")

    for constraint in config.constraints:
        req = "✓" if constraint.is_required else ""
        html.append(
            f"      <tr>"
            f"<td><code>{constraint.edge_type}</code></td>"
            f"<td><code>{constraint.source_type}</code></td>"
            f"<td><code>{constraint.target_type}</code></td>"
            f"<td>{constraint.description}</td>"
            f"<td>{req}</td>"
            f"</tr>"
        )

    html.append(f"    </tbody>")
    html.append(f"  </table>")

    html.append("</body>")
    html.append("</html>")

    return "\n".join(html)
