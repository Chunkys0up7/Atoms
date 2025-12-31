"""
Graph Constraints API

Creates and manages Neo4j database constraints for graph integrity:
- Unique constraints on atom IDs
- Relationship type constraints
- Property existence constraints
- Schema validation at database level
"""

import sys
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from ..neo4j_client import get_neo4j_client
except ImportError:
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).parent.parent))
    from neo4j_client import get_neo4j_client

router = APIRouter()


class Constraint(BaseModel):
    """Database constraint definition"""

    name: str
    type: str  # 'unique', 'exists', 'relationship'
    entity: str  # 'node' or 'relationship'
    label: Optional[str] = None
    property: Optional[str] = None
    description: str
    cypher: str
    is_active: bool = False


class ConstraintResult(BaseModel):
    """Result of constraint operation"""

    constraint_name: str
    status: str
    message: str
    error: Optional[str] = None


def get_recommended_constraints() -> List[Constraint]:
    """Get recommended constraints for GNDP schema"""
    return [
        Constraint(
            name="atom_id_unique",
            type="unique",
            entity="node",
            label="Atom",
            property="id",
            description="Ensures each Atom has a unique ID",
            cypher="CREATE CONSTRAINT atom_id_unique IF NOT EXISTS FOR (a:Atom) REQUIRE a.id IS UNIQUE",
        ),
        Constraint(
            name="atom_type_exists",
            type="exists",
            entity="node",
            label="Atom",
            property="type",
            description="Ensures every Atom has a type property",
            cypher="CREATE CONSTRAINT atom_type_exists IF NOT EXISTS FOR (a:Atom) REQUIRE a.type IS NOT NULL",
        ),
        Constraint(
            name="atom_name_exists",
            type="exists",
            entity="node",
            label="Atom",
            property="name",
            description="Ensures every Atom has a name property",
            cypher="CREATE CONSTRAINT atom_name_exists IF NOT EXISTS FOR (a:Atom) REQUIRE a.name IS NOT NULL",
        ),
        Constraint(
            name="module_id_unique",
            type="unique",
            entity="node",
            label="Module",
            property="id",
            description="Ensures each Module has a unique ID",
            cypher="CREATE CONSTRAINT module_id_unique IF NOT EXISTS FOR (m:Module) REQUIRE m.id IS UNIQUE",
        ),
        Constraint(
            name="phase_id_unique",
            type="unique",
            entity="node",
            label="Phase",
            property="id",
            description="Ensures each Phase has a unique ID",
            cypher="CREATE CONSTRAINT phase_id_unique IF NOT EXISTS FOR (p:Phase) REQUIRE p.id IS UNIQUE",
        ),
    ]


def get_existing_constraints(neo4j_client) -> List[Dict[str, Any]]:
    """Get all existing constraints from Neo4j"""
    try:
        with neo4j_client.driver.session() as session:
            result = session.run("SHOW CONSTRAINTS")
            constraints = []

            for record in result:
                constraints.append(
                    {
                        "id": record.get("id"),
                        "name": record.get("name"),
                        "type": record.get("type"),
                        "entityType": record.get("entityType"),
                        "labelsOrTypes": record.get("labelsOrTypes"),
                        "properties": record.get("properties"),
                        "ownedIndexId": record.get("ownedIndexId"),
                    }
                )

            return constraints

    except Exception as e:
        print(f"Error getting constraints: {e}", file=sys.stderr)
        return []


@router.get("/api/graph/constraints")
def list_constraints() -> Dict[str, Any]:
    """
    List all graph constraints (both recommended and existing).

    Returns:
        Dictionary with recommended and existing constraints
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        # Get recommended constraints
        recommended = get_recommended_constraints()

        # Get existing constraints
        existing = get_existing_constraints(neo4j_client)
        existing_names = {c["name"] for c in existing}

        # Mark which recommended constraints are active
        for constraint in recommended:
            constraint.is_active = constraint.name in existing_names

        return {
            "recommended": [c.dict() for c in recommended],
            "existing": existing,
            "total_recommended": len(recommended),
            "total_existing": len(existing),
            "active_count": sum(1 for c in recommended if c.is_active),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error listing constraints: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to list constraints: {str(e)}")


@router.post("/api/graph/constraints/create")
def create_constraint(constraint_name: str) -> ConstraintResult:
    """
    Create a specific constraint by name.

    Args:
        constraint_name: Name of the recommended constraint to create

    Returns:
        Result of constraint creation
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        # Find the constraint definition
        recommended = get_recommended_constraints()
        constraint = next((c for c in recommended if c.name == constraint_name), None)

        if not constraint:
            raise HTTPException(status_code=404, detail=f"Constraint '{constraint_name}' not found in recommendations")

        # Create the constraint
        with neo4j_client.driver.session() as session:
            try:
                session.run(constraint.cypher)

                return ConstraintResult(
                    constraint_name=constraint_name,
                    status="success",
                    message=f"Created constraint: {constraint.description}",
                )

            except Exception as e:
                error_msg = str(e)

                # Check if constraint already exists
                if "already exists" in error_msg.lower() or "equivalent" in error_msg.lower():
                    return ConstraintResult(
                        constraint_name=constraint_name,
                        status="already_exists",
                        message=f"Constraint already exists: {constraint_name}",
                        error=error_msg,
                    )

                raise

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating constraint: {e}", file=sys.stderr)
        return ConstraintResult(
            constraint_name=constraint_name, status="error", message=f"Failed to create constraint", error=str(e)
        )


@router.post("/api/graph/constraints/create-all")
def create_all_constraints() -> Dict[str, Any]:
    """
    Create all recommended constraints.

    Returns:
        Results for each constraint creation attempt
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        recommended = get_recommended_constraints()
        results = []

        for constraint in recommended:
            result = create_constraint(constraint.name)
            results.append(result.dict())

        success_count = sum(1 for r in results if r["status"] == "success")
        already_exist_count = sum(1 for r in results if r["status"] == "already_exists")
        error_count = sum(1 for r in results if r["status"] == "error")

        return {
            "results": results,
            "summary": {
                "total": len(results),
                "created": success_count,
                "already_existed": already_exist_count,
                "errors": error_count,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating all constraints: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to create constraints: {str(e)}")


@router.delete("/api/graph/constraints/{constraint_name}")
def drop_constraint(constraint_name: str) -> ConstraintResult:
    """
    Drop a specific constraint.

    Args:
        constraint_name: Name of the constraint to drop

    Returns:
        Result of constraint deletion
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        # Drop the constraint
        with neo4j_client.driver.session() as session:
            try:
                session.run(f"DROP CONSTRAINT {constraint_name} IF EXISTS")

                return ConstraintResult(
                    constraint_name=constraint_name, status="success", message=f"Dropped constraint: {constraint_name}"
                )

            except Exception as e:
                return ConstraintResult(
                    constraint_name=constraint_name, status="error", message=f"Failed to drop constraint", error=str(e)
                )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error dropping constraint: {e}", file=sys.stderr)
        return ConstraintResult(
            constraint_name=constraint_name, status="error", message=f"Failed to drop constraint", error=str(e)
        )


@router.get("/api/graph/constraints/validate")
def validate_graph_against_constraints() -> Dict[str, Any]:
    """
    Validate the graph against active constraints.

    Returns:
        Validation report with constraint violations
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        violations = []

        with neo4j_client.driver.session() as session:
            # Check for duplicate atom IDs (if unique constraint not enforced)
            result = session.run(
                """
                MATCH (a:Atom)
                WITH a.id as atom_id, count(*) as count
                WHERE count > 1
                RETURN atom_id, count
            """
            )

            for record in result:
                violations.append(
                    {
                        "type": "duplicate_id",
                        "severity": "error",
                        "entity": "Atom",
                        "property": "id",
                        "value": record["atom_id"],
                        "count": record["count"],
                        "message": f"Atom ID '{record['atom_id']}' is duplicated {record['count']} times",
                    }
                )

            # Check for atoms without type
            result = session.run(
                """
                MATCH (a:Atom)
                WHERE a.type IS NULL OR a.type = ''
                RETURN a.id as atom_id
                LIMIT 50
            """
            )

            for record in result:
                violations.append(
                    {
                        "type": "missing_property",
                        "severity": "error",
                        "entity": "Atom",
                        "property": "type",
                        "atom_id": record["atom_id"],
                        "message": f"Atom '{record['atom_id']}' is missing required property 'type'",
                    }
                )

            # Check for atoms without name
            result = session.run(
                """
                MATCH (a:Atom)
                WHERE a.name IS NULL OR a.name = ''
                RETURN a.id as atom_id
                LIMIT 50
            """
            )

            for record in result:
                violations.append(
                    {
                        "type": "missing_property",
                        "severity": "warning",
                        "entity": "Atom",
                        "property": "name",
                        "atom_id": record["atom_id"],
                        "message": f"Atom '{record['atom_id']}' is missing property 'name'",
                    }
                )

        # Get constraint status
        existing = get_existing_constraints(neo4j_client)

        return {
            "status": "completed",
            "violations": violations,
            "total_violations": len(violations),
            "errors": sum(1 for v in violations if v["severity"] == "error"),
            "warnings": sum(1 for v in violations if v["severity"] == "warning"),
            "active_constraints": len(existing),
            "is_valid": len([v for v in violations if v["severity"] == "error"]) == 0,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error validating graph: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.get("/api/graph/constraints/stats")
def get_constraint_stats() -> Dict[str, Any]:
    """
    Get statistics about graph constraints.

    Returns:
        Statistics about constraints and their enforcement
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        recommended = get_recommended_constraints()
        existing = get_existing_constraints(neo4j_client)
        existing_names = {c["name"] for c in existing}

        # Count by type
        constraint_types = {}
        for c in existing:
            ctype = c.get("type", "unknown")
            constraint_types[ctype] = constraint_types.get(ctype, 0) + 1

        return {
            "total_recommended": len(recommended),
            "total_existing": len(existing),
            "implemented_count": sum(1 for c in recommended if c.name in existing_names),
            "implementation_percentage": (
                round(100 * sum(1 for c in recommended if c.name in existing_names) / len(recommended))
                if recommended
                else 0
            ),
            "constraint_types": constraint_types,
            "missing_recommended": [c.name for c in recommended if c.name not in existing_names],
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting constraint stats: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")
