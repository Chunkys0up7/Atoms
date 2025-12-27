"""
Presence API Routes

REST endpoints for querying user presence and room membership.
Complements the WebSocket real-time updates.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

try:
    from ..websocket_manager import get_connection_manager
except ImportError:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from websocket_manager import get_connection_manager


router = APIRouter()


class UserPresence(BaseModel):
    """User presence information"""
    user_id: str
    name: str
    avatar: str
    role: str
    status: str  # online, away, busy, offline
    connected_at: Optional[str] = None
    last_seen: str
    current_room: Optional[str] = None


class RoomInfo(BaseModel):
    """Room information with members"""
    room_id: str
    member_count: int
    members: List[UserPresence]


class PresenceStats(BaseModel):
    """WebSocket and presence statistics"""
    total_connections: int
    total_rooms: int
    online_users: int
    rooms: Dict[str, int]


@router.get("/api/presence/online")
def get_online_users() -> List[UserPresence]:
    """
    Get list of all online users

    Returns:
        List of user presence objects
    """
    manager = get_connection_manager()
    online_users = manager.get_online_users()

    return [
        UserPresence(
            user_id=user['user_id'],
            name=user.get('name', f"User {user['user_id']}"),
            avatar=user.get('avatar', ''),
            role=user.get('role', 'user'),
            status=user.get('status', 'online'),
            connected_at=user.get('connected_at'),
            last_seen=user.get('last_seen', datetime.now().isoformat()),
            current_room=user.get('current_room')
        )
        for user in online_users
    ]


@router.get("/api/presence/user/{user_id}")
def get_user_presence(user_id: str) -> UserPresence:
    """
    Get presence information for a specific user

    Args:
        user_id: User identifier

    Returns:
        User presence object

    Raises:
        HTTPException: If user not found
    """
    manager = get_connection_manager()
    user_info = manager.get_user_info(user_id)

    if not user_info:
        raise HTTPException(
            status_code=404,
            detail=f"User {user_id} not found or offline"
        )

    return UserPresence(
        user_id=user_id,
        name=user_info.get('name', f"User {user_id}"),
        avatar=user_info.get('avatar', ''),
        role=user_info.get('role', 'user'),
        status=user_info.get('status', 'offline'),
        connected_at=user_info.get('connected_at'),
        last_seen=user_info.get('last_seen', datetime.now().isoformat()),
        current_room=user_info.get('current_room')
    )


@router.get("/api/presence/room/{room_id}")
def get_room_members(room_id: str) -> RoomInfo:
    """
    Get list of users currently in a room

    Args:
        room_id: Room identifier (e.g., 'atom:atom-bo-credit-analysis')

    Returns:
        Room information with member list
    """
    manager = get_connection_manager()
    members_data = manager.get_room_members(room_id)

    members = [
        UserPresence(
            user_id=member['user_id'],
            name=member.get('name', f"User {member['user_id']}"),
            avatar=member.get('avatar', ''),
            role=member.get('role', 'user'),
            status=member.get('status', 'online'),
            connected_at=member.get('connected_at'),
            last_seen=member.get('last_seen', datetime.now().isoformat()),
            current_room=member.get('current_room')
        )
        for member in members_data
    ]

    return RoomInfo(
        room_id=room_id,
        member_count=len(members),
        members=members
    )


@router.get("/api/presence/stats")
def get_presence_stats() -> PresenceStats:
    """
    Get WebSocket and presence statistics

    Returns:
        Statistics about connections, rooms, and online users
    """
    manager = get_connection_manager()
    stats = manager.get_stats()

    return PresenceStats(
        total_connections=stats['total_connections'],
        total_rooms=stats['total_rooms'],
        online_users=stats['online_users'],
        rooms=stats['rooms']
    )


@router.post("/api/presence/heartbeat")
def send_heartbeat(user_id: str) -> Dict[str, Any]:
    """
    Send heartbeat to update user's last_seen timestamp

    This is typically called periodically by clients who don't have
    an active WebSocket connection but want to maintain presence.

    Args:
        user_id: User identifier

    Returns:
        Success confirmation
    """
    manager = get_connection_manager()

    # Check if user exists in presence
    user_info = manager.get_user_info(user_id)

    if user_info:
        # Update last seen via manager method
        import asyncio
        asyncio.create_task(manager.handle_heartbeat(user_id))

        return {
            "status": "ok",
            "user_id": user_id,
            "last_seen": datetime.now().isoformat()
        }
    else:
        raise HTTPException(
            status_code=404,
            detail=f"User {user_id} not found in presence system"
        )


@router.get("/api/presence/rooms")
def get_all_rooms() -> List[RoomInfo]:
    """
    Get list of all active rooms with member counts

    Returns:
        List of room information objects
    """
    manager = get_connection_manager()
    stats = manager.get_stats()

    rooms = []
    for room_id, member_count in stats['rooms'].items():
        members_data = manager.get_room_members(room_id)

        members = [
            UserPresence(
                user_id=member['user_id'],
                name=member.get('name', f"User {member['user_id']}"),
                avatar=member.get('avatar', ''),
                role=member.get('role', 'user'),
                status=member.get('status', 'online'),
                connected_at=member.get('connected_at'),
                last_seen=member.get('last_seen', datetime.now().isoformat()),
                current_room=member.get('current_room')
            )
            for member in members_data
        ]

        rooms.append(RoomInfo(
            room_id=room_id,
            member_count=member_count,
            members=members
        ))

    return rooms
