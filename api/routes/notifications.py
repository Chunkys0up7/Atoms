"""
Notifications API Routes

Manages user notifications for collaboration events (changes, mentions, assignments).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import sys

try:
    from ..neo4j_client import get_neo4j_client
except ImportError:
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from neo4j_client import get_neo4j_client


router = APIRouter()


class Notification(BaseModel):
    """Notification object"""
    id: str
    type: str  # change, mention, assignment, comment, system
    user_id: str
    title: str
    message: str
    link: Optional[str] = None
    read: bool = False
    created_at: str
    metadata: Dict[str, Any] = {}


class CreateNotificationRequest(BaseModel):
    """Request to create a notification"""
    type: str
    user_id: str
    title: str
    message: str
    link: Optional[str] = None
    metadata: Dict[str, Any] = {}


class NotificationStats(BaseModel):
    """Notification statistics"""
    total: int
    unread: int
    by_type: Dict[str, int]


@router.get("/api/notifications")
def get_notifications(
    user_id: str,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0
) -> List[Notification]:
    """
    Get notifications for a user

    Args:
        user_id: User identifier
        unread_only: If True, only return unread notifications
        limit: Maximum number of notifications to return
        offset: Number of notifications to skip

    Returns:
        List of notifications
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Neo4j database not connected"
            )

        with neo4j_client.driver.session() as session:
            # Build query
            if unread_only:
                query = """
                    MATCH (n:Notification {user_id: $user_id, read: false})
                    RETURN n
                    ORDER BY n.created_at DESC
                    SKIP $offset
                    LIMIT $limit
                """
            else:
                query = """
                    MATCH (n:Notification {user_id: $user_id})
                    RETURN n
                    ORDER BY n.created_at DESC
                    SKIP $offset
                    LIMIT $limit
                """

            result = session.run(query, user_id=user_id, offset=offset, limit=limit)

            notifications = []
            for record in result:
                n = record['n']
                notifications.append(Notification(
                    id=n.get('id'),
                    type=n.get('type'),
                    user_id=n.get('user_id'),
                    title=n.get('title'),
                    message=n.get('message'),
                    link=n.get('link'),
                    read=n.get('read', False),
                    created_at=n.get('created_at'),
                    metadata=n.get('metadata', {})
                ))

            return notifications

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting notifications: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get notifications: {str(e)}"
        )


@router.post("/api/notifications")
def create_notification(request: CreateNotificationRequest) -> Notification:
    """
    Create a new notification

    Args:
        request: Notification creation request

    Returns:
        Created notification
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Neo4j database not connected"
            )

        # Generate notification ID
        notification_id = f"notif-{datetime.now().timestamp()}"
        created_at = datetime.now().isoformat()

        with neo4j_client.driver.session() as session:
            # Create notification
            query = """
                CREATE (n:Notification {
                    id: $id,
                    type: $type,
                    user_id: $user_id,
                    title: $title,
                    message: $message,
                    link: $link,
                    read: false,
                    created_at: $created_at,
                    metadata: $metadata
                })
                RETURN n
            """

            result = session.run(
                query,
                id=notification_id,
                type=request.type,
                user_id=request.user_id,
                title=request.title,
                message=request.message,
                link=request.link,
                created_at=created_at,
                metadata=request.metadata
            )

            record = result.single()
            if not record:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create notification"
                )

            n = record['n']
            return Notification(
                id=n.get('id'),
                type=n.get('type'),
                user_id=n.get('user_id'),
                title=n.get('title'),
                message=n.get('message'),
                link=n.get('link'),
                read=n.get('read', False),
                created_at=n.get('created_at'),
                metadata=n.get('metadata', {})
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating notification: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create notification: {str(e)}"
        )


@router.post("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str) -> Dict[str, Any]:
    """
    Mark a notification as read

    Args:
        notification_id: Notification identifier

    Returns:
        Success confirmation
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Neo4j database not connected"
            )

        with neo4j_client.driver.session() as session:
            query = """
                MATCH (n:Notification {id: $id})
                SET n.read = true
                RETURN n
            """

            result = session.run(query, id=notification_id)
            record = result.single()

            if not record:
                raise HTTPException(
                    status_code=404,
                    detail=f"Notification {notification_id} not found"
                )

            return {
                "status": "ok",
                "notification_id": notification_id,
                "read": True
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking notification as read: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to mark notification as read: {str(e)}"
        )


@router.post("/api/notifications/mark-all-read")
def mark_all_read(user_id: str) -> Dict[str, Any]:
    """
    Mark all notifications as read for a user

    Args:
        user_id: User identifier

    Returns:
        Success confirmation with count
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Neo4j database not connected"
            )

        with neo4j_client.driver.session() as session:
            query = """
                MATCH (n:Notification {user_id: $user_id, read: false})
                SET n.read = true
                RETURN count(n) as count
            """

            result = session.run(query, user_id=user_id)
            record = result.single()

            count = record['count'] if record else 0

            return {
                "status": "ok",
                "user_id": user_id,
                "marked_read": count
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking all notifications as read: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to mark all notifications as read: {str(e)}"
        )


@router.delete("/api/notifications/{notification_id}")
def delete_notification(notification_id: str) -> Dict[str, Any]:
    """
    Delete a notification

    Args:
        notification_id: Notification identifier

    Returns:
        Success confirmation
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Neo4j database not connected"
            )

        with neo4j_client.driver.session() as session:
            query = """
                MATCH (n:Notification {id: $id})
                DELETE n
                RETURN count(n) as deleted
            """

            result = session.run(query, id=notification_id)
            record = result.single()

            if not record or record['deleted'] == 0:
                raise HTTPException(
                    status_code=404,
                    detail=f"Notification {notification_id} not found"
                )

            return {
                "status": "ok",
                "notification_id": notification_id,
                "deleted": True
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting notification: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete notification: {str(e)}"
        )


@router.get("/api/notifications/stats")
def get_notification_stats(user_id: str) -> NotificationStats:
    """
    Get notification statistics for a user

    Args:
        user_id: User identifier

    Returns:
        Notification statistics
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Neo4j database not connected"
            )

        with neo4j_client.driver.session() as session:
            # Total count
            total_query = """
                MATCH (n:Notification {user_id: $user_id})
                RETURN count(n) as count
            """
            total_result = session.run(total_query, user_id=user_id)
            total_record = total_result.single()
            total = total_record['count'] if total_record else 0

            # Unread count
            unread_query = """
                MATCH (n:Notification {user_id: $user_id, read: false})
                RETURN count(n) as count
            """
            unread_result = session.run(unread_query, user_id=user_id)
            unread_record = unread_result.single()
            unread = unread_record['count'] if unread_record else 0

            # By type
            type_query = """
                MATCH (n:Notification {user_id: $user_id})
                RETURN n.type as type, count(n) as count
            """
            type_result = session.run(type_query, user_id=user_id)

            by_type = {}
            for record in type_result:
                by_type[record['type']] = record['count']

            return NotificationStats(
                total=total,
                unread=unread,
                by_type=by_type
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting notification stats: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get notification stats: {str(e)}"
        )


@router.get("/api/notifications/unread-count")
def get_unread_count(user_id: str) -> Dict[str, int]:
    """
    Get count of unread notifications (lightweight endpoint for polling)

    Args:
        user_id: User identifier

    Returns:
        Unread count
    """
    try:
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Neo4j database not connected"
            )

        with neo4j_client.driver.session() as session:
            query = """
                MATCH (n:Notification {user_id: $user_id, read: false})
                RETURN count(n) as count
            """

            result = session.run(query, user_id=user_id)
            record = result.single()

            count = record['count'] if record else 0

            return {"unread_count": count}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting unread count: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get unread count: {str(e)}"
        )
