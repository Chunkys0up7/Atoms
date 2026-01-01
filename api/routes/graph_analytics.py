"""
Graph Analytics API

Provides graph algorithm endpoints for deeper insights:
- Centrality analysis (betweenness, PageRank)
- Community detection (Louvain algorithm)
- Graph integrity validation
- Relationship inference suggestions
- Bottleneck identification
"""

import sys
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from ..neo4j_client import get_neo4j_client
except ImportError:
    # Fallback if neo4j_client is not available
    get_neo4j_client = None

router = APIRouter()


class CentralityResult(BaseModel):
    """Centrality analysis result for an atom"""

    atom_id: str
    atom_name: str
    atom_type: str
    betweenness_score: float
    pagerank_score: float
    degree_centrality: int
    is_bottleneck: bool
    rank: int


class Community(BaseModel):
    """Community detection result"""

    community_id: int
    atom_ids: List[str]
    atom_count: int
    suggested_module_name: Optional[str] = None
    cohesion_score: float
    primary_types: List[str]


class IntegrityIssue(BaseModel):
    """Graph integrity validation issue"""

    atom_id: str
    atom_name: str
    atom_type: str
    issue_type: str  # 'orphan', 'circular_dependency', 'missing_performer', 'invalid_edge'
    severity: str  # 'error', 'warning', 'info'
    description: str
    suggested_fix: Optional[str] = None


class RelationshipSuggestion(BaseModel):
    """Suggested relationship between atoms"""

    source_atom_id: str
    target_atom_id: str
    suggested_edge_type: str
    confidence: float
    reason: str


def _ensure_neo4j():
    """Ensure Neo4j client is available"""
    if get_neo4j_client is None:
        raise HTTPException(
            status_code=503, detail="Neo4j client not available. Check NEO4J_PASSWORD environment variable."
        )

    client = get_neo4j_client()
    if not client.is_connected():
        raise HTTPException(status_code=503, detail="Neo4j database is not connected. Check connection settings.")

    return client


@router.get("/api/graph/analytics/centrality")
def analyze_centrality(limit: int = 50) -> List[CentralityResult]:
    """
    Calculate centrality metrics for all atoms.

    Identifies:
    - Bottleneck atoms (high betweenness)
    - Important atoms (high PageRank)
    - Highly connected atoms (high degree)

    Args:
        limit: Maximum number of results to return (default: 50)

    Returns:
        List of atoms ranked by centrality scores
    """
    client = _ensure_neo4j()

    try:
        with client.driver.session() as session:
            # Calculate degree centrality (simple count of relationships)
            degree_query = """
            MATCH (a:Atom)
            OPTIONAL MATCH (a)-[r]-()
            WITH a, count(r) as degree
            RETURN a.id as atom_id,
                   a.name as atom_name,
                   a.type as atom_type,
                   degree
            ORDER BY degree DESC
            LIMIT $limit
            """

            degree_result = session.run(degree_query, limit=limit)
            degree_map = {record["atom_id"]: record["degree"] for record in degree_result}

            # Calculate betweenness centrality (approximation via shortest paths)
            # In production, use Neo4j GDS library for accurate betweenness
            betweenness_query = """
            MATCH (a:Atom)
            OPTIONAL MATCH path = shortestPath((s:Atom)-[*]-(t:Atom))
            WHERE a IN nodes(path) AND s <> t AND s.id < t.id
            WITH a, count(path) as paths_through
            RETURN a.id as atom_id,
                   a.name as atom_name,
                   a.type as atom_type,
                   paths_through
            ORDER BY paths_through DESC
            LIMIT $limit
            """

            betweenness_result = session.run(betweenness_query, limit=limit)
            betweenness_records = list(betweenness_result)

            # Simple PageRank approximation (in-degree weighted by source importance)
            # In production, use Neo4j GDS library for accurate PageRank
            pagerank_query = """
            MATCH (a:Atom)
            OPTIONAL MATCH (source:Atom)-[r]->(a)
            WITH a, count(r) as incoming_edges
            RETURN a.id as atom_id,
                   a.name as atom_name,
                   a.type as atom_type,
                   incoming_edges
            ORDER BY incoming_edges DESC
            LIMIT $limit
            """

            pagerank_result = session.run(pagerank_query, limit=limit)
            pagerank_map = {record["atom_id"]: record["incoming_edges"] for record in pagerank_result}

            # Combine results
            results = []
            for idx, record in enumerate(betweenness_records):
                atom_id = record["atom_id"]
                degree = degree_map.get(atom_id, 0)
                pagerank = pagerank_map.get(atom_id, 0)
                betweenness = record["paths_through"]

                # Normalize scores (simple 0-1 scaling)
                max_betweenness = betweenness_records[0]["paths_through"] if betweenness_records else 1
                max_pagerank = max(pagerank_map.values()) if pagerank_map else 1

                betweenness_score = betweenness / max_betweenness if max_betweenness > 0 else 0
                pagerank_score = pagerank / max_pagerank if max_pagerank > 0 else 0

                # Identify bottlenecks (high betweenness + high degree)
                is_bottleneck = betweenness_score > 0.7 and degree > 5

                results.append(
                    CentralityResult(
                        atom_id=atom_id,
                        atom_name=record["atom_name"] or atom_id,
                        atom_type=record["atom_type"] or "unknown",
                        betweenness_score=round(betweenness_score, 3),
                        pagerank_score=round(pagerank_score, 3),
                        degree_centrality=degree,
                        is_bottleneck=is_bottleneck,
                        rank=idx + 1,
                    )
                )

            return results

    except Exception as e:
        print(f"Error calculating centrality: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to calculate centrality metrics: {str(e)}")


@router.get("/api/graph/analytics/communities")
def detect_communities(min_size: int = 3) -> List[Community]:
    """
    Detect communities (clusters) of related atoms.

    Uses graph structure to identify natural groupings that could
    become modules or indicate missing relationships.

    Args:
        min_size: Minimum atoms per community (default: 3)

    Returns:
        List of detected communities with suggested module names
    """
    client = _ensure_neo4j()

    try:
        with client.driver.session() as session:
            # Simple community detection via connected components
            # In production, use Neo4j GDS Louvain or Label Propagation
            query = """
            MATCH (a:Atom)
            OPTIONAL MATCH path = (a)-[*1..2]-(connected:Atom)
            WITH a, collect(DISTINCT connected.id) as neighbors
            WHERE size(neighbors) >= $min_size
            RETURN a.id as seed_id,
                   a.name as seed_name,
                   a.type as seed_type,
                   neighbors,
                   size(neighbors) as community_size
            ORDER BY community_size DESC
            LIMIT 20
            """

            result = session.run(query, min_size=min_size)
            records = list(result)

            communities = []
            processed_atoms = set()

            for idx, record in enumerate(records):
                seed_id = record["seed_id"]

                # Skip if this atom already in a community
                if seed_id in processed_atoms:
                    continue

                neighbors = record["neighbors"]
                atom_ids = [seed_id] + [n for n in neighbors if n not in processed_atoms]

                # Mark as processed
                processed_atoms.update(atom_ids)

                # Get atom types in this community
                type_query = """
                UNWIND $atom_ids as atom_id
                MATCH (a:Atom {id: atom_id})
                RETURN a.type as type, count(*) as count
                ORDER BY count DESC
                """

                type_result = session.run(type_query, atom_ids=atom_ids)
                type_counts = [(r["type"], r["count"]) for r in type_result]
                primary_types = [t[0] for t in type_counts[:3]]

                # Calculate cohesion (ratio of actual edges to possible edges)
                cohesion_query = """
                UNWIND $atom_ids as id1
                UNWIND $atom_ids as id2
                WITH id1, id2 WHERE id1 < id2
                OPTIONAL MATCH (a:Atom {id: id1})-[r]-(b:Atom {id: id2})
                RETURN count(r) as actual_edges,
                       count(*) as possible_edges
                """

                cohesion_result = session.run(cohesion_query, atom_ids=atom_ids).single()
                actual = cohesion_result["actual_edges"] or 0
                possible = cohesion_result["possible_edges"] or 1
                cohesion = actual / possible if possible > 0 else 0

                # Suggest module name based on primary type
                primary_type = primary_types[0] if primary_types else "unknown"
                suggested_name = f"{primary_type.title()} Cluster {idx + 1}"

                communities.append(
                    Community(
                        community_id=idx + 1,
                        atom_ids=atom_ids,
                        atom_count=len(atom_ids),
                        suggested_module_name=suggested_name,
                        cohesion_score=round(cohesion, 3),
                        primary_types=primary_types,
                    )
                )

            return communities

    except Exception as e:
        print(f"Error detecting communities: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to detect communities: {str(e)}")


@router.get("/api/graph/analytics/integrity")
def validate_integrity() -> Dict[str, Any]:
    """
    Validate graph integrity and identify issues.

    Checks for:
    - Orphan atoms (no relationships)
    - Circular dependencies
    - Missing PERFORMED_BY edges for PROCESS atoms
    - Invalid edge types for atom types

    Returns:
        Validation report with issues and statistics
    """
    client = _ensure_neo4j()

    try:
        with client.driver.session() as session:
            issues = []

            # Check 1: Orphan atoms (no relationships)
            orphan_query = """
            MATCH (a:Atom)
            WHERE NOT (a)-[]-()
            RETURN a.id as atom_id,
                   a.name as atom_name,
                   a.type as atom_type
            """

            orphan_result = session.run(orphan_query)
            for record in orphan_result:
                issues.append(
                    IntegrityIssue(
                        atom_id=record["atom_id"],
                        atom_name=record["atom_name"] or record["atom_id"],
                        atom_type=record["atom_type"] or "unknown",
                        issue_type="orphan",
                        severity="warning",
                        description="Atom has no relationships to other atoms",
                        suggested_fix="Add DEPENDS_ON or ENABLES relationships, or consider removing if obsolete",
                    )
                )

            # Check 2: Circular dependencies (cycles in DEPENDS_ON)
            # Note: This is a simplified check. Full cycle detection is complex.
            cycle_query = """
            MATCH path = (a:Atom)-[:DEPENDS_ON*2..5]->(a)
            RETURN DISTINCT a.id as atom_id,
                   a.name as atom_name,
                   a.type as atom_type,
                   length(path) as cycle_length
            LIMIT 20
            """

            cycle_result = session.run(cycle_query)
            for record in cycle_result:
                issues.append(
                    IntegrityIssue(
                        atom_id=record["atom_id"],
                        atom_name=record["atom_name"] or record["atom_id"],
                        atom_type=record["atom_type"] or "unknown",
                        issue_type="circular_dependency",
                        severity="error",
                        description=f"Circular dependency detected (cycle length: {record['cycle_length']})",
                        suggested_fix="Break dependency cycle by restructuring relationships or adding intermediary atoms",  # noqa: E501
                    )
                )

            # Check 3: PROCESS atoms without PERFORMED_BY edges
            process_query = """
            MATCH (a:Atom)
            WHERE a.type = 'process'
            AND NOT (a)-[:PERFORMED_BY]->(:Atom)
            RETURN a.id as atom_id,
                   a.name as atom_name,
                   a.type as atom_type
            """

            process_result = session.run(process_query)
            for record in process_result:
                issues.append(
                    IntegrityIssue(
                        atom_id=record["atom_id"],
                        atom_name=record["atom_name"] or record["atom_id"],
                        atom_type=record["atom_type"],
                        issue_type="missing_performer",
                        severity="error",
                        description="PROCESS atom has no PERFORMED_BY relationship to a ROLE",
                        suggested_fix="Add PERFORMED_BY edge to appropriate ROLE atom",
                    )
                )

            # Check 4: DOCUMENT atoms without CREATED_BY or MODIFIED_BY
            document_query = """
            MATCH (a:Atom)
            WHERE a.type = 'document'
            AND NOT (a)-[:CREATED_BY|MODIFIED_BY]->(:Atom)
            RETURN a.id as atom_id,
                   a.name as atom_name,
                   a.type as atom_type
            """

            document_result = session.run(document_query)
            for record in document_result:
                issues.append(
                    IntegrityIssue(
                        atom_id=record["atom_id"],
                        atom_name=record["atom_name"] or record["atom_id"],
                        atom_type=record["atom_type"],
                        issue_type="missing_performer",
                        severity="warning",
                        description="DOCUMENT atom has no CREATED_BY or MODIFIED_BY relationship",
                        suggested_fix="Add CREATED_BY or MODIFIED_BY edge to appropriate PROCESS or ROLE atom",
                    )
                )

            # Get summary statistics
            total_atoms = session.run("MATCH (a:Atom) RETURN count(a) as count").single()["count"]
            total_edges = session.run("MATCH ()-[r]->() RETURN count(r) as count").single()["count"]

            # Group issues by severity
            errors = [i for i in issues if i.severity == "error"]
            warnings = [i for i in issues if i.severity == "warning"]
            infos = [i for i in issues if i.severity == "info"]

            return {
                "status": "completed",
                "summary": {
                    "total_atoms": total_atoms,
                    "total_relationships": total_edges,
                    "total_issues": len(issues),
                    "errors": len(errors),
                    "warnings": len(warnings),
                    "info": len(infos),
                },
                "issues": [issue.dict() for issue in issues],
                "health_score": round(100 * (1 - len(errors) / max(total_atoms, 1)), 1),
            }

    except Exception as e:
        print(f"Error validating integrity: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to validate graph integrity: {str(e)}")


@router.get("/api/graph/analytics/suggestions")
def suggest_relationships(limit: int = 20) -> List[RelationshipSuggestion]:
    """
    Suggest missing relationships based on graph structure.

    Identifies potential edges by analyzing:
    - Atoms with similar names or types
    - Common neighbors (if A->C and B->C, maybe A relates to B)
    - Transitive closures (if A->B->C, maybe A->C is direct)

    Args:
        limit: Maximum number of suggestions (default: 20)

    Returns:
        List of suggested relationships with confidence scores
    """
    client = _ensure_neo4j()

    try:
        with client.driver.session() as session:
            suggestions = []

            # Strategy 1: Common neighbors (collaborative filtering)
            # If A and B both relate to C, they might relate to each other
            common_neighbor_query = """
            MATCH (a:Atom)-[r1]->(c:Atom)<-[r2]-(b:Atom)
            WHERE a.id < b.id
            AND NOT (a)-[]-(b)
            WITH a, b, c, count(c) as common_count
            WHERE common_count >= 2
            RETURN a.id as source_id,
                   b.id as target_id,
                   a.type as source_type,
                   b.type as target_type,
                   common_count
            ORDER BY common_count DESC
            LIMIT $limit
            """

            common_result = session.run(common_neighbor_query, limit=limit)
            for record in common_result:
                # Suggest edge type based on types
                source_type = record["source_type"]
                target_type = record["target_type"]

                suggested_edge = "RELATED_TO"
                if source_type == "process" and target_type == "process":
                    suggested_edge = "ENABLES"
                elif source_type == "document" and target_type == "process":
                    suggested_edge = "CREATED_BY"
                elif target_type == "document" and source_type == "process":
                    suggested_edge = "USES"

                confidence = min(0.8, 0.4 + (record["common_count"] * 0.1))

                suggestions.append(
                    RelationshipSuggestion(
                        source_atom_id=record["source_id"],
                        target_atom_id=record["target_id"],
                        suggested_edge_type=suggested_edge,
                        confidence=round(confidence, 2),
                        reason=f"Atoms share {record['common_count']} common neighbors",
                    )
                )

            # Strategy 2: Transitive closure candidates
            # If A->B->C and path length is consistently 2, maybe A->C is direct
            transitive_query = """
            MATCH path = (a:Atom)-[r1]->(b:Atom)-[r2]->(c:Atom)
            WHERE NOT (a)-[]->(c)
            AND type(r1) = type(r2)
            WITH a, c, type(r1) as edge_type, count(path) as path_count
            WHERE path_count >= 2
            RETURN a.id as source_id,
                   c.id as target_id,
                   edge_type,
                   path_count
            ORDER BY path_count DESC
            LIMIT $limit
            """

            transitive_result = session.run(transitive_query, limit=min(limit, 10))
            for record in transitive_result:
                confidence = min(0.7, 0.3 + (record["path_count"] * 0.05))

                suggestions.append(
                    RelationshipSuggestion(
                        source_atom_id=record["source_id"],
                        target_atom_id=record["target_id"],
                        suggested_edge_type=record["edge_type"],
                        confidence=round(confidence, 2),
                        reason=f"Found {record['path_count']} transitive paths with {record['edge_type']} relationships",  # noqa: E501
                    )
                )

            return suggestions[:limit]

    except Exception as e:
        print(f"Error suggesting relationships: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to suggest relationships: {str(e)}")


@router.get("/api/graph/analytics/bottlenecks")
def identify_bottlenecks(threshold: float = 0.6) -> Dict[str, Any]:
    """
    Identify bottleneck atoms that are critical to workflow.

    Bottlenecks are atoms with:
    - High betweenness centrality (many paths go through them)
    - High degree (many connections)
    - Type = PROCESS or SYSTEM

    Args:
        threshold: Minimum betweenness score to be considered a bottleneck (0-1)

    Returns:
        List of bottleneck atoms with impact analysis
    """
    # Use centrality analysis
    centrality_results = analyze_centrality(limit=100)

    bottlenecks = [
        result for result in centrality_results if result.is_bottleneck and result.betweenness_score >= threshold
    ]

    return {
        "total_bottlenecks": len(bottlenecks),
        "threshold": threshold,
        "bottlenecks": [b.dict() for b in bottlenecks],
        "recommendation": "Consider adding redundant paths or breaking down bottleneck atoms into smaller components",
    }


@router.get("/api/graph/analytics/stats")
def get_analytics_stats() -> Dict[str, Any]:
    """
    Get comprehensive analytics statistics.

    Returns:
        Summary statistics across all analytics dimensions
    """
    client = _ensure_neo4j()

    try:
        with client.driver.session() as session:
            # Basic counts
            atom_count = session.run("MATCH (a:Atom) RETURN count(a) as count").single()["count"]
            edge_count = session.run("MATCH ()-[r]->() RETURN count(r) as count").single()["count"]

            # Average degree
            avg_degree_result = session.run(
                """
                MATCH (a:Atom)
                OPTIONAL MATCH (a)-[r]-()
                WITH a, count(r) as degree
                RETURN avg(degree) as avg_degree, max(degree) as max_degree
            """
            ).single()

            # Count by type
            type_counts = session.run(
                """
                MATCH (a:Atom)
                RETURN a.type as type, count(*) as count
                ORDER BY count DESC
            """
            )
            type_distribution = {r["type"]: r["count"] for r in type_counts}

            # Edge type distribution
            edge_type_counts = session.run(
                """
                MATCH ()-[r]->()
                RETURN type(r) as edge_type, count(*) as count
                ORDER BY count DESC
            """
            )
            edge_distribution = {r["edge_type"]: r["count"] for r in edge_type_counts}

            return {
                "graph_size": {
                    "atoms": atom_count,
                    "relationships": edge_count,
                    "density": round(edge_count / max(atom_count * (atom_count - 1), 1), 4),
                },
                "connectivity": {
                    "avg_degree": round(avg_degree_result["avg_degree"], 2),
                    "max_degree": avg_degree_result["max_degree"],
                },
                "distribution": {"atom_types": type_distribution, "edge_types": edge_distribution},
            }

    except Exception as e:
        print(f"Error getting analytics stats: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to get analytics statistics: {str(e)}")
