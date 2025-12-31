"""
Change History API Routes

Tracks and manages change history for atoms with audit trail,
version comparison, and revert capabilities.
"""

import sys
from datetime import datetime
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


class Change(BaseModel):
    """Change record"""

    id: str
    atom_id: str
    user_id: str
    user_name: str
    timestamp: str
    change_type: str  # create, update, delete
    field: Optional[str] = None
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    description: Optional[str] = None


class ChangeStats(BaseModel):
    """Change statistics"""

    total_changes: int
    by_user: Dict[str, int]
    by_type: Dict[str, int]
    recent_changes: int  # Last 24 hours


class DiffResult(BaseModel):
    """Difference between two versions"""

    atom_id: str
    version_1: str
    version_2: str
    differences: List[Dict[str, Any]]


@router.get("/api/history/atom/{atom_id}")
def get_atom_history(atom_id: str, limit: int = 50, offset: int = 0) -> List[Change]:
    """
    Get change history for an atom

    Args:
        atom_id: Atom identifier
        limit: Maximum number of changes to return
        offset: Number of changes to skip

    Returns:
        List of changes ordered by timestamp (newest first)
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        with neo4j_client.driver.session() as session:
            query = """
                MATCH (c:Change {atom_id: $atom_id})
                RETURN c
                ORDER BY c.timestamp DESC
                SKIP $offset
                LIMIT $limit
            """

            result = session.run(query, atom_id=atom_id, offset=offset, limit=limit)

            changes = []
            for record in result:
                c = record["c"]
                changes.append(
                    Change(
                        id=c.get("id"),
                        atom_id=c.get("atom_id"),
                        user_id=c.get("user_id"),
                        user_name=c.get("user_name"),
                        timestamp=c.get("timestamp"),
                        change_type=c.get("change_type"),
                        field=c.get("field"),
                        old_value=c.get("old_value"),
                        new_value=c.get("new_value"),
                        description=c.get("description"),
                    )
                )

            return changes

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting atom history: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to get atom history: {str(e)}")


@router.get("/api/history/user/{user_id}")
def get_user_history(user_id: str, limit: int = 50, offset: int = 0) -> List[Change]:
    """
    Get all changes made by a user

    Args:
        user_id: User identifier
        limit: Maximum number of changes to return
        offset: Number of changes to skip

    Returns:
        List of changes ordered by timestamp (newest first)
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        with neo4j_client.driver.session() as session:
            query = """
                MATCH (c:Change {user_id: $user_id})
                RETURN c
                ORDER BY c.timestamp DESC
                SKIP $offset
                LIMIT $limit
            """

            result = session.run(query, user_id=user_id, offset=offset, limit=limit)

            changes = []
            for record in result:
                c = record["c"]
                changes.append(
                    Change(
                        id=c.get("id"),
                        atom_id=c.get("atom_id"),
                        user_id=c.get("user_id"),
                        user_name=c.get("user_name"),
                        timestamp=c.get("timestamp"),
                        change_type=c.get("change_type"),
                        field=c.get("field"),
                        old_value=c.get("old_value"),
                        new_value=c.get("new_value"),
                        description=c.get("description"),
                    )
                )

            return changes

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user history: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to get user history: {str(e)}")


@router.post("/api/history/track")
def track_change(change: Change) -> Change:
    """
    Track a new change

    Args:
        change: Change to track

    Returns:
        Created change record
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        # Generate change ID if not provided
        if not change.id:
            change.id = f"change-{datetime.now().timestamp()}"

        # Set timestamp if not provided
        if not change.timestamp:
            change.timestamp = datetime.now().isoformat()

        with neo4j_client.driver.session() as session:
            query = """
                CREATE (c:Change {
                    id: $id,
                    atom_id: $atom_id,
                    user_id: $user_id,
                    user_name: $user_name,
                    timestamp: $timestamp,
                    change_type: $change_type,
                    field: $field,
                    old_value: $old_value,
                    new_value: $new_value,
                    description: $description
                })
                RETURN c
            """

            result = session.run(
                query,
                id=change.id,
                atom_id=change.atom_id,
                user_id=change.user_id,
                user_name=change.user_name,
                timestamp=change.timestamp,
                change_type=change.change_type,
                field=change.field,
                old_value=change.old_value,
                new_value=change.new_value,
                description=change.description,
            )

            record = result.single()
            if not record:
                raise HTTPException(status_code=500, detail="Failed to track change")

            return change

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error tracking change: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to track change: {str(e)}")


@router.post("/api/history/revert/{change_id}")
def revert_change(change_id: str) -> Dict[str, Any]:
    """
    Revert a specific change (restore old value)

    Args:
        change_id: Change identifier

    Returns:
        Success confirmation with reverted values
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        with neo4j_client.driver.session() as session:
            # Get the change
            get_query = """
                MATCH (c:Change {id: $id})
                RETURN c
            """

            result = session.run(get_query, id=change_id)
            record = result.single()

            if not record:
                raise HTTPException(status_code=404, detail=f"Change {change_id} not found")

            change = record["c"]

            # Get the atom and revert the field
            atom_id = change.get("atom_id")
            field = change.get("field")
            old_value = change.get("old_value")

            if not atom_id or not field:
                raise HTTPException(status_code=400, detail="Cannot revert: missing atom_id or field")

            # Update the atom with old value
            update_query = f"""
                MATCH (a:Atom {{id: $atom_id}})
                SET a.{field} = $old_value
                RETURN a
            """

            update_result = session.run(update_query, atom_id=atom_id, old_value=old_value)
            update_record = update_result.single()

            if not update_record:
                raise HTTPException(status_code=404, detail=f"Atom {atom_id} not found")

            # Create a new change record for the revert
            revert_change_id = f"change-{datetime.now().timestamp()}"
            track_query = """
                CREATE (c:Change {
                    id: $id,
                    atom_id: $atom_id,
                    user_id: 'system',
                    user_name: 'System (Revert)',
                    timestamp: $timestamp,
                    change_type: 'revert',
                    field: $field,
                    old_value: $new_value,
                    new_value: $old_value,
                    description: $description
                })
                RETURN c
            """

            session.run(
                track_query,
                id=revert_change_id,
                atom_id=atom_id,
                timestamp=datetime.now().isoformat(),
                field=field,
                new_value=change.get("new_value"),
                old_value=old_value,
                description=f"Reverted change {change_id}",
            )

            return {
                "status": "ok",
                "change_id": change_id,
                "reverted_to": old_value,
                "atom_id": atom_id,
                "field": field,
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error reverting change: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to revert change: {str(e)}")


@router.get("/api/history/diff/{change_id_1}/{change_id_2}")
def get_diff(change_id_1: str, change_id_2: str) -> DiffResult:
    """
    Get differences between two versions

    Args:
        change_id_1: First change identifier
        change_id_2: Second change identifier

    Returns:
        Diff result with field-by-field differences
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        with neo4j_client.driver.session() as session:
            # Get both changes
            query = """
                MATCH (c:Change)
                WHERE c.id = $id1 OR c.id = $id2
                RETURN c
            """

            result = session.run(query, id1=change_id_1, id2=change_id_2)

            changes = {}
            for record in result:
                c = record["c"]
                changes[c.get("id")] = c

            if change_id_1 not in changes or change_id_2 not in changes:
                raise HTTPException(status_code=404, detail="One or both changes not found")

            c1 = changes[change_id_1]
            c2 = changes[change_id_2]

            # Ensure same atom
            if c1.get("atom_id") != c2.get("atom_id"):
                raise HTTPException(status_code=400, detail="Changes are for different atoms")

            # Build differences
            differences = []

            # Compare fields
            field1 = c1.get("field")
            field2 = c2.get("field")

            if field1 == field2:
                differences.append(
                    {
                        "field": field1,
                        "version_1_value": c1.get("new_value"),
                        "version_2_value": c2.get("new_value"),
                        "changed": c1.get("new_value") != c2.get("new_value"),
                    }
                )
            else:
                differences.append(
                    {"field": field1, "version_1_value": c1.get("new_value"), "version_2_value": None, "changed": True}
                )
                differences.append(
                    {"field": field2, "version_1_value": None, "version_2_value": c2.get("new_value"), "changed": True}
                )

            return DiffResult(
                atom_id=c1.get("atom_id"), version_1=change_id_1, version_2=change_id_2, differences=differences
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting diff: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to get diff: {str(e)}")


@router.get("/api/history/stats")
def get_history_stats() -> ChangeStats:
    """
    Get overall change history statistics

    Returns:
        Change statistics
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        with neo4j_client.driver.session() as session:
            # Total changes
            total_query = """
                MATCH (c:Change)
                RETURN count(c) as total
            """
            total_result = session.run(total_query)
            total_record = total_result.single()
            total = total_record["total"] if total_record else 0

            # By user
            user_query = """
                MATCH (c:Change)
                RETURN c.user_name as user, count(c) as count
            """
            user_result = session.run(user_query)
            by_user = {}
            for record in user_result:
                by_user[record["user"]] = record["count"]

            # By type
            type_query = """
                MATCH (c:Change)
                RETURN c.change_type as type, count(c) as count
            """
            type_result = session.run(type_query)
            by_type = {}
            for record in type_result:
                by_type[record["type"]] = record["count"]

            # Recent changes (last 24 hours)
            from datetime import timedelta

            yesterday = (datetime.now() - timedelta(days=1)).isoformat()

            recent_query = """
                MATCH (c:Change)
                WHERE c.timestamp > $yesterday
                RETURN count(c) as count
            """
            recent_result = session.run(recent_query, yesterday=yesterday)
            recent_record = recent_result.single()
            recent = recent_record["count"] if recent_record else 0

            return ChangeStats(total_changes=total, by_user=by_user, by_type=by_type, recent_changes=recent)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting history stats: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to get history stats: {str(e)}")
