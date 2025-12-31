"""
Glossary API

Provides endpoints for managing business glossary terms:
- Term CRUD operations
- Category management
- Term search and filtering
- Term usage tracking
- Export functionality
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Data storage path
GLOSSARY_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "glossary.json"


class GlossaryTerm(BaseModel):
    """Glossary term model"""

    id: str
    term: str
    definition: str
    category: str
    synonyms: Optional[List[str]] = []
    related_terms: Optional[List[str]] = []
    usage_count: Optional[int] = 0
    linked_atoms: Optional[List[str]] = []
    linked_modules: Optional[List[str]] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None


def load_glossary() -> List[GlossaryTerm]:
    """Load glossary from JSON file."""
    if not GLOSSARY_DATA_PATH.exists():
        return get_default_glossary()

    try:
        with open(GLOSSARY_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [GlossaryTerm(**t) for t in data]
    except Exception as e:
        print(f"Error loading glossary: {e}", file=sys.stderr)
        return get_default_glossary()


def save_glossary(terms: List[GlossaryTerm]) -> None:
    """Save glossary to JSON file."""
    GLOSSARY_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(GLOSSARY_DATA_PATH, "w", encoding="utf-8") as f:
            json.dump([t.dict() for t in terms], f, indent=2)
    except Exception as e:
        print(f"Error saving glossary: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to save glossary: {str(e)}")


def get_default_glossary() -> List[GlossaryTerm]:
    """Get default glossary terms."""
    now = datetime.utcnow().isoformat()

    return [
        GlossaryTerm(
            id="atom",
            term="Atom",
            definition="The smallest unit of business logic in the GNDP system. Atoms represent discrete processes, decisions, documents, or controls that can be composed into modules.",
            category="System",
            synonyms=["Business Atom", "Process Atom"],
            related_terms=["Module", "Edge", "Graph"],
            created_at=now,
        ),
        GlossaryTerm(
            id="module",
            term="Module",
            definition="A collection of related atoms that work together to accomplish a specific business function or workflow.",
            category="System",
            synonyms=["Workflow Module", "Process Module"],
            related_terms=["Atom", "Phase", "Journey"],
            created_at=now,
        ),
        GlossaryTerm(
            id="phase",
            term="Phase",
            definition="A major stage in a customer journey that groups related modules. Phases have entry/exit criteria and duration targets.",
            category="System",
            synonyms=["Journey Phase", "Process Phase"],
            related_terms=["Journey", "Module"],
            created_at=now,
        ),
        GlossaryTerm(
            id="journey",
            term="Journey",
            definition="A complete end-to-end customer experience composed of sequential phases.",
            category="System",
            synonyms=["Customer Journey", "Process Journey"],
            related_terms=["Phase", "Module"],
            created_at=now,
        ),
        GlossaryTerm(
            id="edge",
            term="Edge",
            definition="A directed relationship between two atoms representing dependencies, data flow, or logical connections.",
            category="System",
            synonyms=["Relationship", "Connection"],
            related_terms=["Atom", "Graph"],
            created_at=now,
        ),
        GlossaryTerm(
            id="criticality",
            term="Criticality",
            definition="A measure of how important an atom or module is to business operations. Values: LOW, MEDIUM, HIGH, CRITICAL.",
            category="Governance",
            related_terms=["SLA", "Risk"],
            created_at=now,
        ),
        GlossaryTerm(
            id="ontology-domain",
            term="Ontology Domain",
            definition="A business domain that categorizes atoms by their purpose and governance requirements.",
            category="Governance",
            synonyms=["Domain", "Business Domain"],
            related_terms=["Schema", "Atom"],
            created_at=now,
        ),
        GlossaryTerm(
            id="schema",
            term="Schema",
            definition="A set of rules that define allowed atom types, relationships, and constraints within domains.",
            category="Governance",
            related_terms=["Ontology Domain", "Constraint"],
            created_at=now,
        ),
        GlossaryTerm(
            id="dtl",
            term="DTI (Debt-to-Income)",
            definition="A ratio comparing a borrower's total monthly debt payments to their gross monthly income.",
            category="Lending",
            synonyms=["Debt-to-Income Ratio"],
            related_terms=["Underwriting", "Credit Analysis"],
            created_at=now,
        ),
        GlossaryTerm(
            id="ltv",
            term="LTV (Loan-to-Value)",
            definition="A ratio comparing the loan amount to the appraised value of the property.",
            category="Lending",
            synonyms=["Loan-to-Value Ratio"],
            related_terms=["Appraisal", "Underwriting"],
            created_at=now,
        ),
        GlossaryTerm(
            id="trid",
            term="TRID",
            definition="TILA-RESPA Integrated Disclosure rule requiring specific disclosure forms and timing for mortgage loans.",
            category="Compliance",
            synonyms=["TILA-RESPA"],
            related_terms=["Closing Disclosure", "Loan Estimate"],
            created_at=now,
        ),
        GlossaryTerm(
            id="aus",
            term="AUS (Automated Underwriting System)",
            definition="Computer-based system that evaluates borrower creditworthiness and loan eligibility automatically.",
            category="Technology",
            synonyms=["Automated Underwriting"],
            related_terms=["Underwriting", "Credit Analysis"],
            created_at=now,
        ),
    ]


@router.get("/api/glossary")
def get_all_terms(category: Optional[str] = None, search: Optional[str] = None) -> List[GlossaryTerm]:
    """
    Get all glossary terms with optional filtering.

    Args:
        category: Filter by category
        search: Search in term and definition

    Returns:
        List of glossary terms
    """
    terms = load_glossary()

    if category:
        terms = [t for t in terms if t.category.lower() == category.lower()]

    if search:
        search_lower = search.lower()
        terms = [t for t in terms if search_lower in t.term.lower() or search_lower in t.definition.lower()]

    return terms


@router.get("/api/glossary/{term_id}")
def get_term(term_id: str) -> GlossaryTerm:
    """
    Get a specific glossary term.

    Args:
        term_id: Term ID

    Returns:
        Glossary term
    """
    terms = load_glossary()
    term = next((t for t in terms if t.id == term_id), None)

    if not term:
        raise HTTPException(status_code=404, detail=f"Term '{term_id}' not found")

    return term


@router.post("/api/glossary")
def create_term(term: GlossaryTerm) -> GlossaryTerm:
    """
    Create a new glossary term.

    Args:
        term: Term definition

    Returns:
        Created term
    """
    terms = load_glossary()

    # Check for duplicate ID or term
    if any(t.id == term.id for t in terms):
        raise HTTPException(status_code=400, detail=f"Term with ID '{term.id}' already exists")

    if any(t.term.lower() == term.term.lower() for t in terms):
        raise HTTPException(status_code=400, detail=f"Term '{term.term}' already exists")

    # Set timestamps
    now = datetime.utcnow().isoformat()
    term.created_at = now
    term.updated_at = now

    terms.append(term)
    save_glossary(terms)

    return term


@router.put("/api/glossary/{term_id}")
def update_term(term_id: str, term: GlossaryTerm) -> GlossaryTerm:
    """
    Update an existing glossary term.

    Args:
        term_id: Term ID to update
        term: Updated term definition

    Returns:
        Updated term
    """
    terms = load_glossary()
    index = next((i for i, t in enumerate(terms) if t.id == term_id), None)

    if index is None:
        raise HTTPException(status_code=404, detail=f"Term '{term_id}' not found")

    # Preserve created_at, update updated_at
    term.created_at = terms[index].created_at
    term.updated_at = datetime.utcnow().isoformat()

    terms[index] = term
    save_glossary(terms)

    return term


@router.delete("/api/glossary/{term_id}")
def delete_term(term_id: str) -> Dict[str, Any]:
    """
    Delete a glossary term.

    Args:
        term_id: Term ID to delete

    Returns:
        Deletion confirmation
    """
    terms = load_glossary()
    original_count = len(terms)
    terms = [t for t in terms if t.id != term_id]

    if len(terms) == original_count:
        raise HTTPException(status_code=404, detail=f"Term '{term_id}' not found")

    save_glossary(terms)

    return {"status": "success", "message": f"Term '{term_id}' deleted"}


@router.get("/api/glossary/categories/list")
def get_categories() -> List[str]:
    """
    Get all unique categories.

    Returns:
        List of category names
    """
    terms = load_glossary()
    categories = sorted(set(t.category for t in terms))

    return categories


@router.get("/api/glossary/stats")
def get_glossary_stats() -> Dict[str, Any]:
    """
    Get glossary statistics.

    Returns:
        Statistics about glossary
    """
    terms = load_glossary()

    category_counts = {}
    for term in terms:
        category_counts[term.category] = category_counts.get(term.category, 0) + 1

    total_synonyms = sum(len(t.synonyms or []) for t in terms)
    total_links = sum(len(t.linked_atoms or []) + len(t.linked_modules or []) for t in terms)

    return {
        "total_terms": len(terms),
        "total_categories": len(category_counts),
        "category_counts": category_counts,
        "total_synonyms": total_synonyms,
        "total_linked_items": total_links,
        "avg_definition_length": round(sum(len(t.definition) for t in terms) / len(terms)) if terms else 0,
    }


@router.get("/api/glossary/export")
def export_glossary(format: str = "json") -> Dict[str, Any]:
    """
    Export glossary in various formats.

    Args:
        format: Export format (json, csv, markdown)

    Returns:
        Exported glossary data
    """
    terms = load_glossary()

    if format == "json":
        return {"format": "json", "data": [t.dict() for t in terms]}
    elif format == "csv":
        csv_lines = ["ID,Term,Definition,Category"]
        for t in terms:
            csv_lines.append(f'"{t.id}","{t.term}","{t.definition}","{t.category}"')

        return {"format": "csv", "data": "\n".join(csv_lines)}
    elif format == "markdown":
        md_lines = ["# Glossary\n"]

        # Group by category
        by_category = {}
        for t in terms:
            if t.category not in by_category:
                by_category[t.category] = []
            by_category[t.category].append(t)

        for category in sorted(by_category.keys()):
            md_lines.append(f"## {category}\n")
            for term in sorted(by_category[category], key=lambda x: x.term):
                md_lines.append(f"### {term.term}\n")
                md_lines.append(f"{term.definition}\n")
                if term.synonyms:
                    md_lines.append(f"**Synonyms:** {', '.join(term.synonyms)}\n")
                md_lines.append("")

        return {"format": "markdown", "data": "\n".join(md_lines)}
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
