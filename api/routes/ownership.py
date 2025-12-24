"""
Ownership Analytics API

Provides bulk reporting and analysis of ownership assignments across the knowledge graph.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from pathlib import Path
import json
from collections import Counter, defaultdict

router = APIRouter()


# Data Models
class OwnershipCoverage(BaseModel):
    """Coverage statistics for ownership assignments."""
    total_atoms: int
    atoms_with_owner: int
    atoms_with_steward: int
    atoms_with_both: int
    atoms_with_neither: int
    owner_coverage_pct: float
    steward_coverage_pct: float
    full_coverage_pct: float


class OwnerStats(BaseModel):
    """Statistics for a specific owner/steward."""
    name: str
    atom_count: int
    domains: List[str]
    atom_types: Dict[str, int]
    criticality_breakdown: Dict[str, int]
    avg_compliance_score: Optional[float]


class AtomOwnershipInfo(BaseModel):
    """Ownership information for a single atom."""
    atom_id: str
    name: str
    atom_type: str
    domain: Optional[str]
    owner: Optional[str]
    steward: Optional[str]
    criticality: str
    compliance_score: Optional[float]
    last_modified: Optional[str]
    has_owner: bool
    has_steward: bool


class OwnershipReport(BaseModel):
    """Complete ownership analysis report."""
    coverage: OwnershipCoverage
    top_owners: List[OwnerStats]
    top_stewards: List[OwnerStats]
    domain_coverage: Dict[str, OwnershipCoverage]
    unassigned_atoms: List[AtomOwnershipInfo]
    ownership_gaps: List[str]


# Helper Functions
def load_atoms() -> List[Dict[str, Any]]:
    """Load all atoms from storage."""
    atoms_dir = Path(__file__).parent.parent.parent / "data" / "atoms"
    atoms = []

    if not atoms_dir.exists():
        return atoms

    for file_path in atoms_dir.glob("atom-*.json"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                atom = json.load(f)
                atoms.append(atom)
        except Exception as e:
            print(f"Error loading atom {file_path}: {e}")

    return atoms


def calculate_coverage(atoms: List[Dict[str, Any]]) -> OwnershipCoverage:
    """Calculate ownership coverage statistics."""
    total = len(atoms)
    with_owner = sum(1 for a in atoms if a.get("owner"))
    with_steward = sum(1 for a in atoms if a.get("steward"))
    with_both = sum(1 for a in atoms if a.get("owner") and a.get("steward"))
    with_neither = sum(1 for a in atoms if not a.get("owner") and not a.get("steward"))

    return OwnershipCoverage(
        total_atoms=total,
        atoms_with_owner=with_owner,
        atoms_with_steward=with_steward,
        atoms_with_both=with_both,
        atoms_with_neither=with_neither,
        owner_coverage_pct=round((with_owner / total * 100) if total > 0 else 0, 1),
        steward_coverage_pct=round((with_steward / total * 100) if total > 0 else 0, 1),
        full_coverage_pct=round((with_both / total * 100) if total > 0 else 0, 1)
    )


def get_owner_stats(atoms: List[Dict[str, Any]], field: str = "owner") -> List[OwnerStats]:
    """Calculate statistics for owners or stewards."""
    # Group atoms by owner/steward
    grouped = defaultdict(list)
    for atom in atoms:
        value = atom.get(field)
        if value:
            grouped[value].append(atom)

    stats = []
    for name, atom_list in grouped.items():
        # Calculate domain distribution
        domains = list(set(a.get("domain", "Unknown") for a in atom_list))

        # Calculate atom type distribution
        type_counts = Counter(a.get("type", "unknown") for a in atom_list)

        # Calculate criticality breakdown
        criticality_counts = Counter(a.get("criticality", "MEDIUM") for a in atom_list)

        # Calculate average compliance score
        scores = [a.get("compliance_score") for a in atom_list if a.get("compliance_score") is not None]
        avg_score = round(sum(scores) / len(scores), 2) if scores else None

        stats.append(OwnerStats(
            name=name,
            atom_count=len(atom_list),
            domains=domains,
            atom_types=dict(type_counts),
            criticality_breakdown=dict(criticality_counts),
            avg_compliance_score=avg_score
        ))

    # Sort by atom count (descending)
    stats.sort(key=lambda s: s.atom_count, reverse=True)
    return stats


def get_domain_coverage(atoms: List[Dict[str, Any]]) -> Dict[str, OwnershipCoverage]:
    """Calculate ownership coverage by domain."""
    # Group atoms by domain
    by_domain = defaultdict(list)
    for atom in atoms:
        domain = atom.get("domain", "Unknown")
        by_domain[domain].append(atom)

    # Calculate coverage for each domain
    coverage_by_domain = {}
    for domain, domain_atoms in by_domain.items():
        coverage_by_domain[domain] = calculate_coverage(domain_atoms)

    return coverage_by_domain


def get_unassigned_atoms(atoms: List[Dict[str, Any]], limit: int = 100) -> List[AtomOwnershipInfo]:
    """Get atoms missing ownership assignments."""
    unassigned = []

    for atom in atoms:
        has_owner = bool(atom.get("owner"))
        has_steward = bool(atom.get("steward"))

        # Only include atoms missing at least one assignment
        if not has_owner or not has_steward:
            unassigned.append(AtomOwnershipInfo(
                atom_id=atom.get("id", "unknown"),
                name=atom.get("name", "Unnamed"),
                atom_type=atom.get("type", "unknown"),
                domain=atom.get("domain"),
                owner=atom.get("owner"),
                steward=atom.get("steward"),
                criticality=atom.get("criticality", "MEDIUM"),
                compliance_score=atom.get("compliance_score"),
                last_modified=atom.get("updated_at"),
                has_owner=has_owner,
                has_steward=has_steward
            ))

    # Sort by criticality (CRITICAL first), then by name
    criticality_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    unassigned.sort(key=lambda a: (criticality_order.get(a.criticality, 4), a.name))

    return unassigned[:limit]


def identify_gaps(coverage: OwnershipCoverage, domain_coverage: Dict[str, OwnershipCoverage]) -> List[str]:
    """Identify ownership gaps and generate recommendations."""
    gaps = []

    # Overall coverage gaps
    if coverage.owner_coverage_pct < 90:
        gaps.append(f"Only {coverage.owner_coverage_pct}% of atoms have an owner assigned (target: 90%)")

    if coverage.steward_coverage_pct < 90:
        gaps.append(f"Only {coverage.steward_coverage_pct}% of atoms have a steward assigned (target: 90%)")

    if coverage.full_coverage_pct < 80:
        gaps.append(f"Only {coverage.full_coverage_pct}% of atoms have both owner and steward (target: 80%)")

    # Domain-specific gaps
    for domain, domain_cov in domain_coverage.items():
        if domain_cov.owner_coverage_pct < 80:
            gaps.append(f"Domain '{domain}' has low owner coverage: {domain_cov.owner_coverage_pct}%")
        if domain_cov.steward_coverage_pct < 80:
            gaps.append(f"Domain '{domain}' has low steward coverage: {domain_cov.steward_coverage_pct}%")

    return gaps


# API Endpoints
@router.get("/api/ownership/report")
def get_ownership_report() -> OwnershipReport:
    """
    Generate comprehensive ownership analysis report.

    Returns:
        OwnershipReport with coverage stats, top owners/stewards, domain breakdown, and gaps
    """
    try:
        # Load all atoms
        atoms = load_atoms()

        if not atoms:
            raise HTTPException(status_code=404, detail="No atoms found")

        # Calculate overall coverage
        coverage = calculate_coverage(atoms)

        # Get top owners and stewards
        top_owners = get_owner_stats(atoms, "owner")
        top_stewards = get_owner_stats(atoms, "steward")

        # Get domain coverage
        domain_coverage = get_domain_coverage(atoms)

        # Get unassigned atoms
        unassigned_atoms = get_unassigned_atoms(atoms)

        # Identify gaps
        gaps = identify_gaps(coverage, domain_coverage)

        return OwnershipReport(
            coverage=coverage,
            top_owners=top_owners,
            top_stewards=top_stewards,
            domain_coverage=domain_coverage,
            unassigned_atoms=unassigned_atoms,
            ownership_gaps=gaps
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate ownership report: {str(e)}")


@router.get("/api/ownership/coverage")
def get_coverage_stats() -> OwnershipCoverage:
    """
    Get high-level ownership coverage statistics.

    Returns:
        OwnershipCoverage with overall assignment percentages
    """
    atoms = load_atoms()
    if not atoms:
        raise HTTPException(status_code=404, detail="No atoms found")

    return calculate_coverage(atoms)


@router.get("/api/ownership/owners")
def list_owners(top_n: int = 10) -> List[OwnerStats]:
    """
    List owners with statistics.

    Args:
        top_n: Number of top owners to return (default: 10)

    Returns:
        List of OwnerStats ordered by atom count
    """
    atoms = load_atoms()
    if not atoms:
        raise HTTPException(status_code=404, detail="No atoms found")

    stats = get_owner_stats(atoms, "owner")
    return stats[:top_n]


@router.get("/api/ownership/stewards")
def list_stewards(top_n: int = 10) -> List[OwnerStats]:
    """
    List stewards with statistics.

    Args:
        top_n: Number of top stewards to return (default: 10)

    Returns:
        List of OwnerStats ordered by atom count
    """
    atoms = load_atoms()
    if not atoms:
        raise HTTPException(status_code=404, detail="No atoms found")

    stats = get_owner_stats(atoms, "steward")
    return stats[:top_n]


@router.get("/api/ownership/unassigned")
def get_unassigned(limit: int = 100) -> List[AtomOwnershipInfo]:
    """
    Get atoms with missing ownership assignments.

    Args:
        limit: Maximum number of atoms to return (default: 100)

    Returns:
        List of atoms missing owner or steward, sorted by criticality
    """
    atoms = load_atoms()
    if not atoms:
        raise HTTPException(status_code=404, detail="No atoms found")

    return get_unassigned_atoms(atoms, limit)


@router.get("/api/ownership/domains")
def get_domain_breakdown() -> Dict[str, OwnershipCoverage]:
    """
    Get ownership coverage breakdown by domain.

    Returns:
        Dictionary mapping domain names to their coverage statistics
    """
    atoms = load_atoms()
    if not atoms:
        raise HTTPException(status_code=404, detail="No atoms found")

    return get_domain_coverage(atoms)


@router.get("/api/ownership/atoms/{owner_name}")
def get_atoms_by_owner(owner_name: str, role: str = "owner") -> List[AtomOwnershipInfo]:
    """
    Get all atoms owned or stewarded by a specific person.

    Args:
        owner_name: Name of the owner/steward
        role: Either "owner" or "steward" (default: "owner")

    Returns:
        List of atoms assigned to the specified person
    """
    atoms = load_atoms()
    if not atoms:
        raise HTTPException(status_code=404, detail="No atoms found")

    # Filter atoms by owner/steward
    filtered = []
    for atom in atoms:
        if atom.get(role) == owner_name:
            filtered.append(AtomOwnershipInfo(
                atom_id=atom.get("id", "unknown"),
                name=atom.get("name", "Unnamed"),
                atom_type=atom.get("type", "unknown"),
                domain=atom.get("domain"),
                owner=atom.get("owner"),
                steward=atom.get("steward"),
                criticality=atom.get("criticality", "MEDIUM"),
                compliance_score=atom.get("compliance_score"),
                last_modified=atom.get("updated_at"),
                has_owner=bool(atom.get("owner")),
                has_steward=bool(atom.get("steward"))
            ))

    if not filtered:
        raise HTTPException(status_code=404, detail=f"No atoms found for {role} '{owner_name}'")

    # Sort by criticality
    criticality_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    filtered.sort(key=lambda a: (criticality_order.get(a.criticality, 4), a.name))

    return filtered
