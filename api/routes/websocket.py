"""
WebSocket Routes

Handles WebSocket connections for real-time collaboration features.
"""

import asyncio
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

try:
    from ..websocket_manager import get_connection_manager
except ImportError:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).parent.parent))
    from websocket_manager import get_connection_manager


router = APIRouter()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    name: Optional[str] = Query(None),
    avatar: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for real-time collaboration

    Connection URL: ws://localhost:8000/ws/{user_id}?name=Alice&avatar=...&role=admin

    Message Types (Client → Server):
    - join: Join a room
    - leave: Leave a room
    - change: Broadcast a change to room
    - cursor: Update cursor position
    - heartbeat: Keep-alive ping
    - status: Update user status

    Message Types (Server → Client):
    - user_joined_room: User joined the room
    - user_left_room: User left the room
    - change: Content changed by another user
    - cursor_update: Another user's cursor moved
    - user_connected: User came online
    - user_disconnected: User went offline
    - room_history: Historical messages for room
    - error: Error message
    """
    manager = get_connection_manager()

    # User info from query parameters
    user_info = {"name": name or f"User {user_id}", "avatar": avatar or "", "role": role or "user"}

    # Connect user
    await manager.connect(websocket, user_id, user_info)

    try:
        # Main message loop
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                message_type = message.get("type")

                print(f"[WebSocket] Received {message_type} from {user_id}: {message}")

                # Handle different message types
                if message_type == "join":
                    # Join a room
                    room_id = message.get("room_id")
                    if room_id:
                        await manager.join_room(user_id, room_id)

                elif message_type == "leave":
                    # Leave a room
                    room_id = message.get("room_id")
                    if room_id:
                        await manager.leave_room(user_id, room_id)

                elif message_type == "change":
                    # Broadcast change to room
                    room_id = message.get("room_id")
                    if room_id:
                        await manager.broadcast_to_room(
                            room_id,
                            {
                                "type": "change",
                                "room_id": room_id,
                                "user_id": user_id,
                                "user_name": user_info["name"],
                                "change": message.get("change"),
                                "timestamp": datetime.now().isoformat(),
                            },
                            exclude_user=user_id,
                        )

                elif message_type == "cursor":
                    # Broadcast cursor position to room
                    room_id = message.get("room_id")
                    if room_id:
                        await manager.broadcast_to_room(
                            room_id,
                            {
                                "type": "cursor_update",
                                "room_id": room_id,
                                "user_id": user_id,
                                "user_name": user_info["name"],
                                "cursor": message.get("cursor"),
                            },
                            exclude_user=user_id,
                        )

                elif message_type == "heartbeat":
                    # Update last seen timestamp
                    await manager.handle_heartbeat(user_id)

                    # Send pong response
                    await manager.send_personal_message(
                        user_id, {"type": "pong", "timestamp": datetime.now().isoformat()}
                    )

                elif message_type == "status":
                    # Update user status (online, away, busy)
                    status = message.get("status", "online")
                    manager.update_user_status(user_id, status)

                    # Broadcast status change
                    await manager.broadcast_system_message(
                        {"type": "user_status_changed", "user_id": user_id, "status": status}
                    )

                elif message_type == "typing":
                    # Typing indicator for room
                    room_id = message.get("room_id")
                    field = message.get("field")
                    is_typing = message.get("is_typing", True)

                    if room_id:
                        await manager.broadcast_to_room(
                            room_id,
                            {
                                "type": "typing",
                                "room_id": room_id,
                                "user_id": user_id,
                                "user_name": user_info["name"],
                                "field": field,
                                "is_typing": is_typing,
                            },
                            exclude_user=user_id,
                        )

                elif message_type == "comment":
                    # Broadcast comment/mention to room
                    room_id = message.get("room_id")
                    comment_text = message.get("text", "")
                    mentions = message.get("mentions", [])

                    if room_id:
                        # Broadcast to room
                        await manager.broadcast_to_room(
                            room_id,
                            {
                                "type": "comment",
                                "room_id": room_id,
                                "user_id": user_id,
                                "user_name": user_info["name"],
                                "text": comment_text,
                                "mentions": mentions,
                                "timestamp": datetime.now().isoformat(),
                            },
                        )

                        # Send direct notifications to mentioned users
                        for mentioned_user_id in mentions:
                            await manager.send_personal_message(
                                mentioned_user_id,
                                {
                                    "type": "mention",
                                    "from_user_id": user_id,
                                    "from_user_name": user_info["name"],
                                    "room_id": room_id,
                                    "text": comment_text,
                                },
                            )

                elif message_type == "get_presence":
                    # Get presence info for room or all users
                    room_id = message.get("room_id")

                    if room_id:
                        members = manager.get_room_members(room_id)
                        await manager.send_personal_message(
                            user_id, {"type": "room_presence", "room_id": room_id, "members": members}
                        )
                    else:
                        online_users = manager.get_online_users()
                        await manager.send_personal_message(user_id, {"type": "online_users", "users": online_users})

                else:
                    # Unknown message type
                    await manager.send_personal_message(
                        user_id, {"type": "error", "error": f"Unknown message type: {message_type}"}
                    )

            except json.JSONDecodeError:
                await manager.send_personal_message(user_id, {"type": "error", "error": "Invalid JSON message"})
            except Exception as e:
                print(f"[WebSocket] Error handling message: {e}")
                await manager.send_personal_message(user_id, {"type": "error", "error": str(e)})

    except WebSocketDisconnect:
        print(f"[WebSocket] Client {user_id} disconnected")
        await manager.disconnect(user_id)
    except Exception as e:
        print(f"[WebSocket] Error in connection: {e}")
        await manager.disconnect(user_id)
