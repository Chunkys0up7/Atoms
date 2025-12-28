"""
Anomaly Detection API

Detects unusual patterns in the knowledge graph:
- Structural anomalies (isolated clusters, unusual degrees)
- Semantic anomalies (mismatched types, incorrect relationships)
- Temporal anomalies (stale atoms, recent changes)
- Quality anomalies (missing attributes, inconsistent data)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path
import sys
from datetime import datetime, timedelta

try:
    from ..neo4j_client import get_neo4j_client
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from neo4j_client import get_neo4j_client

router = APIRouter()


class Anomaly(BaseModel):
    """Detected anomaly"""
    id: str
    type: str  # 'structural', 'semantic', 'temporal', 'quality'
    severity: str  # 'critical', 'high', 'medium', 'low'
    category: str
    atom_id: Optional[str] = None
    atom_name: Optional[str] = None
    description: str
    details: Dict[str, Any]
    suggested_action: str
    confidence: float


class AnomalyReport(BaseModel):
    """Anomaly detection report"""
    status: str
    scan_timestamp: str
    total_anomalies: int
    by_severity: Dict[str, int]
    by_type: Dict[str, int]
    anomalies: List[Anomaly]
    recommendations: List[str]


def detect_structural_anomalies(neo4j_client) -> List[Anomaly]:
    """Detect structural graph anomalies"""
    anomalies = []

    with neo4j_client.driver.session() as session:
        # Anomaly 1: Isolated atoms (no connections)
        result = session.run("""
            MATCH (a:Atom)
            WHERE NOT (a)-[]-()
            RETURN a.id as atom_id, a.name as atom_name, a.type as atom_type
            LIMIT 20
        """)

        for record in result:
            anomalies.append(Anomaly(
                id=f"struct-isolated-{record['atom_id']}",
                type="structural",
                severity="high",
                category="isolated_atom",
                atom_id=record['atom_id'],
                atom_name=record.get('atom_name', 'Unknown'),
                description=f"Atom is completely isolated with no relationships",
                details={
                    "atom_type": record.get('atom_type'),
                    "connection_count": 0
                },
                suggested_action="Add DEPENDS_ON, ENABLES, or RELATED_TO relationships",
                confidence=1.0
            ))

        # Anomaly 2: Over-connected atoms (potential hubs or anti-patterns)
        result = session.run("""
            MATCH (a:Atom)-[r]-()
            WITH a, count(r) as degree
            WHERE degree > 20
            RETURN a.id as atom_id, a.name as atom_name, a.type as atom_type, degree
            ORDER BY degree DESC
            LIMIT 10
        """)

        for record in result:
            anomalies.append(Anomaly(
                id=f"struct-overconnected-{record['atom_id']}",
                type="structural",
                severity="medium",
                category="over_connected",
                atom_id=record['atom_id'],
                atom_name=record.get('atom_name', 'Unknown'),
                description=f"Atom has unusually high degree ({record['degree']} connections)",
                details={
                    "degree": record['degree'],
                    "atom_type": record.get('atom_type'),
                    "threshold": 20
                },
                suggested_action="Consider breaking down into smaller atoms or reviewing relationship accuracy",
                confidence=0.8
            ))

        # Anomaly 3: Singleton clusters (small disconnected groups)
        result = session.run("""
            MATCH (a:Atom)-[*1..2]-(connected:Atom)
            WITH a, collect(DISTINCT connected.id) as cluster
            WHERE size(cluster) <= 3 AND size(cluster) > 0
            WITH a, cluster, size(cluster) as cluster_size
            OPTIONAL MATCH (a)-[*3..]-(outside:Atom)
            WHERE NOT outside.id IN cluster
            WITH a, cluster_size, count(outside) as external_connections
            WHERE external_connections = 0
            RETURN a.id as atom_id, a.name as atom_name, cluster_size
            LIMIT 10
        """)

        for record in result:
            anomalies.append(Anomaly(
                id=f"struct-singleton-{record['atom_id']}",
                type="structural",
                severity="medium",
                category="singleton_cluster",
                atom_id=record['atom_id'],
                atom_name=record.get('atom_name', 'Unknown'),
                description=f"Part of small disconnected cluster ({record['cluster_size']} atoms)",
                details={
                    "cluster_size": record['cluster_size']
                },
                suggested_action="Connect cluster to main graph or verify if atoms are obsolete",
                confidence=0.7
            ))

    return anomalies


def detect_semantic_anomalies(neo4j_client) -> List[Anomaly]:
    """Detect semantic mismatches and type errors"""
    anomalies = []

    with neo4j_client.driver.session() as session:
        # Anomaly 1: PROCESS atoms without PERFORMED_BY
        result = session.run("""
            MATCH (a:Atom)
            WHERE a.type = 'PROCESS' OR a.type = 'process'
            AND NOT (a)-[:PERFORMED_BY]->()
            RETURN a.id as atom_id, a.name as atom_name
            LIMIT 20
        """)

        for record in result:
            anomalies.append(Anomaly(
                id=f"sem-no-performer-{record['atom_id']}",
                type="semantic",
                severity="critical",
                category="missing_performer",
                atom_id=record['atom_id'],
                atom_name=record.get('atom_name', 'Unknown'),
                description="PROCESS atom missing PERFORMED_BY relationship to ROLE",
                details={
                    "atom_type": "PROCESS",
                    "missing_relationship": "PERFORMED_BY"
                },
                suggested_action="Add PERFORMED_BY edge to appropriate ROLE atom",
                confidence=1.0
            ))

        # Anomaly 2: DOCUMENT atoms without creator
        result = session.run("""
            MATCH (a:Atom)
            WHERE a.type = 'DOCUMENT' OR a.type = 'document'
            AND NOT (a)-[:CREATED_BY|MODIFIED_BY]->()
            RETURN a.id as atom_id, a.name as atom_name
            LIMIT 20
        """)

        for record in result:
            anomalies.append(Anomaly(
                id=f"sem-no-creator-{record['atom_id']}",
                type="semantic",
                severity="high",
                category="missing_creator",
                atom_id=record['atom_id'],
                atom_name=record.get('atom_name', 'Unknown'),
                description="DOCUMENT atom missing CREATED_BY or MODIFIED_BY relationship",
                details={
                    "atom_type": "DOCUMENT",
                    "missing_relationship": "CREATED_BY or MODIFIED_BY"
                },
                suggested_action="Add CREATED_BY edge to PROCESS or ROLE that creates this document",
                confidence=0.9
            ))

        # Anomaly 3: Mismatched edge types (e.g., DOCUMENT -> PERFORMS)
        result = session.run("""
            MATCH (a:Atom)-[r:PERFORMED_BY]->(b:Atom)
            WHERE a.type <> 'PROCESS' AND a.type <> 'process'
            RETURN a.id as atom_id, a.name as atom_name, a.type as source_type,
                   type(r) as edge_type, b.type as target_type
            LIMIT 10
        """)

        for record in result:
            anomalies.append(Anomaly(
                id=f"sem-mismatch-{record['atom_id']}",
                type="semantic",
                severity="high",
                category="type_mismatch",
                atom_id=record['atom_id'],
                atom_name=record.get('atom_name', 'Unknown'),
                description=f"Invalid edge type: {record['source_type']} -{record['edge_type']}-> {record['target_type']}",
                details={
                    "source_type": record['source_type'],
                    "edge_type": record['edge_type'],
                    "target_type": record['target_type'],
                    "expected": "Only PROCESS atoms should have PERFORMED_BY edges"
                },
                suggested_action="Change edge type or correct atom type",
                confidence=1.0
            ))

    return anomalies


def detect_temporal_anomalies(neo4j_client) -> List[Anomaly]:
    """Detect time-based anomalies"""
    anomalies = []

    with neo4j_client.driver.session() as session:
        # Anomaly 1: Stale atoms (no updates in long time)
        # Note: Requires lastModified property on atoms
        result = session.run("""
            MATCH (a:Atom)
            WHERE a.lastModified IS NOT NULL
            WITH a, duration.between(datetime(a.lastModified), datetime()).days as days_old
            WHERE days_old > 365
            RETURN a.id as atom_id, a.name as atom_name, a.type as atom_type, days_old
            LIMIT 10
        """)

        for record in result:
            anomalies.append(Anomaly(
                id=f"temp-stale-{record['atom_id']}",
                type="temporal",
                severity="low",
                category="stale_atom",
                atom_id=record['atom_id'],
                atom_name=record.get('atom_name', 'Unknown'),
                description=f"Atom hasn't been updated in {record['days_old']} days",
                details={
                    "days_old": record['days_old'],
                    "atom_type": record.get('atom_type')
                },
                suggested_action="Review atom relevance and update if still applicable",
                confidence=0.6
            ))

        # Anomaly 2: Rapidly changing atoms (potential instability)
        # Would require change history tracking

    return anomalies


def detect_quality_anomalies(neo4j_client) -> List[Anomaly]:
    """Detect data quality issues"""
    anomalies = []

    with neo4j_client.driver.session() as session:
        # Anomaly 1: Missing required attributes
        result = session.run("""
            MATCH (a:Atom)
            WHERE a.name IS NULL OR a.name = ''
            OR a.type IS NULL OR a.type = ''
            RETURN a.id as atom_id,
                   a.name IS NULL OR a.name = '' as missing_name,
                   a.type IS NULL OR a.type = '' as missing_type
            LIMIT 20
        """)

        for record in result:
            missing_attrs = []
            if record['missing_name']:
                missing_attrs.append('name')
            if record['missing_type']:
                missing_attrs.append('type')

            anomalies.append(Anomaly(
                id=f"qual-missing-{record['atom_id']}",
                type="quality",
                severity="critical",
                category="missing_attributes",
                atom_id=record['atom_id'],
                atom_name="[Missing Name]",
                description=f"Missing required attributes: {', '.join(missing_attrs)}",
                details={
                    "missing_attributes": missing_attrs
                },
                suggested_action="Add missing required attributes to atom definition",
                confidence=1.0
            ))

        # Anomaly 2: Duplicate atoms (same name, different IDs)
        result = session.run("""
            MATCH (a:Atom)
            WHERE a.name IS NOT NULL
            WITH a.name as name, collect(a.id) as atom_ids
            WHERE size(atom_ids) > 1
            RETURN name, atom_ids, size(atom_ids) as count
            LIMIT 10
        """)

        for record in result:
            for atom_id in record['atom_ids']:
                anomalies.append(Anomaly(
                    id=f"qual-duplicate-{atom_id}",
                    type="quality",
                    severity="high",
                    category="duplicate_name",
                    atom_id=atom_id,
                    atom_name=record['name'],
                    description=f"Duplicate name found ({record['count']} atoms with name '{record['name']}')",
                    details={
                        "duplicate_count": record['count'],
                        "all_ids": record['atom_ids']
                    },
                    suggested_action="Merge duplicate atoms or make names unique",
                    confidence=0.9
                ))

        # Anomaly 3: Incomplete descriptions
        result = session.run("""
            MATCH (a:Atom)
            WHERE a.description IS NULL OR a.description = '' OR size(a.description) < 20
            RETURN a.id as atom_id, a.name as atom_name, a.type as atom_type,
                   coalesce(size(a.description), 0) as desc_length
            LIMIT 20
        """)

        for record in result:
            anomalies.append(Anomaly(
                id=f"qual-incomplete-{record['atom_id']}",
                type="quality",
                severity="low",
                category="incomplete_description",
                atom_id=record['atom_id'],
                atom_name=record.get('atom_name', 'Unknown'),
                description=f"Description too short ({record['desc_length']} chars)",
                details={
                    "description_length": record['desc_length'],
                    "recommended_min": 50
                },
                suggested_action="Add detailed description to improve discoverability",
                confidence=0.5
            ))

    return anomalies


@router.post("/api/anomalies/detect")
def detect_anomalies(
    include_structural: bool = True,
    include_semantic: bool = True,
    include_temporal: bool = True,
    include_quality: bool = True,
    min_severity: Optional[str] = None
) -> AnomalyReport:
    """
    Run anomaly detection scan on the knowledge graph.

    Args:
        include_structural: Include structural anomalies
        include_semantic: Include semantic anomalies
        include_temporal: Include temporal anomalies
        include_quality: Include quality anomalies
        min_severity: Minimum severity to include (critical/high/medium/low)

    Returns:
        Anomaly detection report
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Neo4j database not connected"
            )

        all_anomalies = []

        # Run detection modules
        if include_structural:
            all_anomalies.extend(detect_structural_anomalies(neo4j_client))

        if include_semantic:
            all_anomalies.extend(detect_semantic_anomalies(neo4j_client))

        if include_temporal:
            all_anomalies.extend(detect_temporal_anomalies(neo4j_client))

        if include_quality:
            all_anomalies.extend(detect_quality_anomalies(neo4j_client))

        # Filter by severity if specified
        severity_order = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        if min_severity:
            min_level = severity_order.get(min_severity.lower(), 0)
            all_anomalies = [
                a for a in all_anomalies
                if severity_order.get(a.severity, 0) >= min_level
            ]

        # Calculate statistics
        by_severity = {}
        by_type = {}
        for anomaly in all_anomalies:
            by_severity[anomaly.severity] = by_severity.get(anomaly.severity, 0) + 1
            by_type[anomaly.type] = by_type.get(anomaly.type, 0) + 1

        # Generate recommendations
        recommendations = generate_recommendations(all_anomalies)

        return AnomalyReport(
            status="completed",
            scan_timestamp=datetime.utcnow().isoformat(),
            total_anomalies=len(all_anomalies),
            by_severity=by_severity,
            by_type=by_type,
            anomalies=all_anomalies,
            recommendations=recommendations
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error detecting anomalies: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Anomaly detection failed: {str(e)}"
        )


def generate_recommendations(anomalies: List[Anomaly]) -> List[str]:
    """Generate high-level recommendations based on detected anomalies"""
    recommendations = []

    # Count by category
    categories = {}
    for anomaly in anomalies:
        categories[anomaly.category] = categories.get(anomaly.category, 0) + 1

    # Generate recommendations
    if categories.get('isolated_atom', 0) > 5:
        recommendations.append(
            f"Found {categories['isolated_atom']} isolated atoms. "
            "Consider adding relationships or removing obsolete atoms."
        )

    if categories.get('missing_performer', 0) > 0:
        recommendations.append(
            f"Found {categories['missing_performer']} PROCESS atoms without PERFORMED_BY edges. "
            "Add role assignments to clarify responsibilities."
        )

    if categories.get('duplicate_name', 0) > 0:
        recommendations.append(
            f"Found {categories['duplicate_name']} atoms with duplicate names. "
            "Review and merge or rename to ensure uniqueness."
        )

    if categories.get('over_connected', 0) > 0:
        recommendations.append(
            f"Found {categories['over_connected']} over-connected atoms. "
            "Consider breaking down complex atoms into smaller units."
        )

    # Critical issues
    critical_count = sum(1 for a in anomalies if a.severity == 'critical')
    if critical_count > 0:
        recommendations.insert(0,
            f"⚠️ {critical_count} critical issues detected. Address these first for graph integrity."
        )

    return recommendations


@router.get("/api/anomalies/stats")
def get_anomaly_stats() -> Dict[str, Any]:
    """
    Get anomaly detection statistics.

    Returns:
        Statistics about anomaly detection capabilities
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Neo4j database not connected"
            )

        with neo4j_client.driver.session() as session:
            # Get total atoms
            total_atoms = session.run("MATCH (a:Atom) RETURN count(a) as count").single()['count']

            # Quick anomaly counts
            isolated = session.run("""
                MATCH (a:Atom)
                WHERE NOT (a)-[]-()
                RETURN count(a) as count
            """).single()['count']

            missing_type = session.run("""
                MATCH (a:Atom)
                WHERE a.type IS NULL OR a.type = ''
                RETURN count(a) as count
            """).single()['count']

            return {
                "total_atoms": total_atoms,
                "quick_scan": {
                    "isolated_atoms": isolated,
                    "missing_type": missing_type
                },
                "detection_modules": {
                    "structural": True,
                    "semantic": True,
                    "temporal": True,
                    "quality": True
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting anomaly stats: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get stats: {str(e)}"
        )


@router.get("/api/anomalies/categories")
def get_anomaly_categories() -> List[Dict[str, str]]:
    """
    Get list of anomaly categories with descriptions.

    Returns:
        List of anomaly categories
    """
    return [
        {
            "category": "isolated_atom",
            "type": "structural",
            "severity": "high",
            "description": "Atoms with no relationships to other atoms"
        },
        {
            "category": "over_connected",
            "type": "structural",
            "severity": "medium",
            "description": "Atoms with unusually high number of connections"
        },
        {
            "category": "singleton_cluster",
            "type": "structural",
            "severity": "medium",
            "description": "Small disconnected groups of atoms"
        },
        {
            "category": "missing_performer",
            "type": "semantic",
            "severity": "critical",
            "description": "PROCESS atoms without PERFORMED_BY relationship"
        },
        {
            "category": "missing_creator",
            "type": "semantic",
            "severity": "high",
            "description": "DOCUMENT atoms without CREATED_BY relationship"
        },
        {
            "category": "type_mismatch",
            "type": "semantic",
            "severity": "high",
            "description": "Invalid edge types for atom types"
        },
        {
            "category": "stale_atom",
            "type": "temporal",
            "severity": "low",
            "description": "Atoms not updated in over a year"
        },
        {
            "category": "missing_attributes",
            "type": "quality",
            "severity": "critical",
            "description": "Missing required attributes like name or type"
        },
        {
            "category": "duplicate_name",
            "type": "quality",
            "severity": "high",
            "description": "Multiple atoms with identical names"
        },
        {
            "category": "incomplete_description",
            "type": "quality",
            "severity": "low",
            "description": "Description too short or missing"
        }
    ]
