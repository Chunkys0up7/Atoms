"""
WebSocket Connection Manager

Manages WebSocket connections, presence tracking, and message broadcasting
for real-time collaboration features.
"""

from typing import Dict, Set, Optional, List
from fastapi import WebSocket
from datetime import datetime
import json
import asyncio
from collections import defaultdict


class ConnectionManager:
    """
    Manages WebSocket connections for real-time collaboration
    """

    def __init__(self):
        # Active connections: {user_id: WebSocket}
        self.active_connections: Dict[str, WebSocket] = {}

        # User presence: {user_id: user_info}
        self.user_presence: Dict[str, dict] = {}

        # Room memberships: {room_id: Set[user_id]}
        self.rooms: Dict[str, Set[str]] = defaultdict(set)

        # User rooms: {user_id: Set[room_id]}
        self.user_rooms: Dict[str, Set[str]] = defaultdict(set)

        # Message history per room (last 50 messages)
        self.room_history: Dict[str, List[dict]] = defaultdict(lambda: [])

    async def connect(self, websocket: WebSocket, user_id: str, user_info: dict):
        """
        Accept a new WebSocket connection
        """
        await websocket.accept()
        self.active_connections[user_id] = websocket

        # Store user presence info
        self.user_presence[user_id] = {
            **user_info,
            'connected_at': datetime.now().isoformat(),
            'last_seen': datetime.now().isoformat(),
            'status': 'online'
        }

        print(f"[WebSocket] User {user_id} connected. Total connections: {len(self.active_connections)}")

        # Notify others of user connection
        await self.broadcast_system_message({
            'type': 'user_connected',
            'user_id': user_id,
            'user_info': self.user_presence[user_id]
        })

    async def disconnect(self, user_id: str):
        """
        Remove a WebSocket connection
        """
        if user_id in self.active_connections:
            del self.active_connections[user_id]

        # Remove from all rooms
        if user_id in self.user_rooms:
            for room_id in list(self.user_rooms[user_id]):
                await self.leave_room(user_id, room_id)
            del self.user_rooms[user_id]

        # Update presence
        if user_id in self.user_presence:
            self.user_presence[user_id]['status'] = 'offline'
            self.user_presence[user_id]['disconnected_at'] = datetime.now().isoformat()

        print(f"[WebSocket] User {user_id} disconnected. Total connections: {len(self.active_connections)}")

        # Notify others of user disconnection
        await self.broadcast_system_message({
            'type': 'user_disconnected',
            'user_id': user_id
        })

    async def join_room(self, user_id: str, room_id: str):
        """
        Add user to a room (e.g., atom editor, module viewer)
        """
        self.rooms[room_id].add(user_id)
        self.user_rooms[user_id].add(room_id)

        print(f"[WebSocket] User {user_id} joined room {room_id}")

        # Update user presence
        if user_id in self.user_presence:
            self.user_presence[user_id]['current_room'] = room_id

        # Notify room members
        await self.broadcast_to_room(room_id, {
            'type': 'user_joined_room',
            'room_id': room_id,
            'user_id': user_id,
            'user_info': self.user_presence.get(user_id, {}),
            'room_members': list(self.rooms[room_id])
        })

        # Send room history to new member
        if room_id in self.room_history:
            await self.send_personal_message(user_id, {
                'type': 'room_history',
                'room_id': room_id,
                'history': self.room_history[room_id][-50:]  # Last 50 messages
            })

    async def leave_room(self, user_id: str, room_id: str):
        """
        Remove user from a room
        """
        if room_id in self.rooms:
            self.rooms[room_id].discard(user_id)

            # Clean up empty rooms
            if not self.rooms[room_id]:
                del self.rooms[room_id]
                if room_id in self.room_history:
                    del self.room_history[room_id]

        if user_id in self.user_rooms:
            self.user_rooms[user_id].discard(room_id)

        print(f"[WebSocket] User {user_id} left room {room_id}")

        # Update user presence
        if user_id in self.user_presence:
            self.user_presence[user_id]['current_room'] = None

        # Notify room members
        await self.broadcast_to_room(room_id, {
            'type': 'user_left_room',
            'room_id': room_id,
            'user_id': user_id,
            'room_members': list(self.rooms.get(room_id, set()))
        })

    async def send_personal_message(self, user_id: str, message: dict):
        """
        Send message to a specific user
        """
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except Exception as e:
                print(f"[WebSocket] Error sending to {user_id}: {e}")
                await self.disconnect(user_id)

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user: Optional[str] = None):
        """
        Send message to all users in a room
        """
        if room_id not in self.rooms:
            return

        # Add message to room history
        message_with_timestamp = {
            **message,
            'timestamp': datetime.now().isoformat()
        }
        self.room_history[room_id].append(message_with_timestamp)

        # Keep only last 50 messages
        if len(self.room_history[room_id]) > 50:
            self.room_history[room_id] = self.room_history[room_id][-50:]

        # Broadcast to all members
        disconnected_users = []
        for user_id in self.rooms[room_id]:
            if exclude_user and user_id == exclude_user:
                continue

            if user_id in self.active_connections:
                try:
                    await self.active_connections[user_id].send_text(json.dumps(message_with_timestamp))
                except Exception as e:
                    print(f"[WebSocket] Error broadcasting to {user_id}: {e}")
                    disconnected_users.append(user_id)

        # Clean up disconnected users
        for user_id in disconnected_users:
            await self.disconnect(user_id)

    async def broadcast_to_all(self, message: dict, exclude_user: Optional[str] = None):
        """
        Send message to all connected users
        """
        disconnected_users = []
        for user_id, connection in self.active_connections.items():
            if exclude_user and user_id == exclude_user:
                continue

            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                print(f"[WebSocket] Error broadcasting to {user_id}: {e}")
                disconnected_users.append(user_id)

        # Clean up disconnected users
        for user_id in disconnected_users:
            await self.disconnect(user_id)

    async def broadcast_system_message(self, message: dict):
        """
        Send system-level message to all users
        """
        system_message = {
            **message,
            'system': True,
            'timestamp': datetime.now().isoformat()
        }
        await self.broadcast_to_all(system_message)

    def get_room_members(self, room_id: str) -> List[dict]:
        """
        Get list of users in a room with their presence info
        """
        if room_id not in self.rooms:
            return []

        members = []
        for user_id in self.rooms[room_id]:
            if user_id in self.user_presence:
                members.append({
                    'user_id': user_id,
                    **self.user_presence[user_id]
                })

        return members

    def get_online_users(self) -> List[dict]:
        """
        Get list of all online users
        """
        return [
            {'user_id': user_id, **info}
            for user_id, info in self.user_presence.items()
            if info.get('status') == 'online'
        ]

    def get_user_info(self, user_id: str) -> Optional[dict]:
        """
        Get presence info for a specific user
        """
        return self.user_presence.get(user_id)

    def update_user_status(self, user_id: str, status: str):
        """
        Update user's status (online, away, busy)
        """
        if user_id in self.user_presence:
            self.user_presence[user_id]['status'] = status
            self.user_presence[user_id]['last_seen'] = datetime.now().isoformat()

    async def handle_heartbeat(self, user_id: str):
        """
        Handle heartbeat from client to keep connection alive
        """
        if user_id in self.user_presence:
            self.user_presence[user_id]['last_seen'] = datetime.now().isoformat()

            # If status was 'away', change to 'online'
            if self.user_presence[user_id].get('status') == 'away':
                self.user_presence[user_id]['status'] = 'online'

    def get_stats(self) -> dict:
        """
        Get WebSocket statistics
        """
        return {
            'total_connections': len(self.active_connections),
            'total_rooms': len(self.rooms),
            'online_users': len([u for u in self.user_presence.values() if u.get('status') == 'online']),
            'rooms': {
                room_id: len(members)
                for room_id, members in self.rooms.items()
            }
        }


# Global instance
connection_manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """
    Get the global connection manager instance
    """
    return connection_manager
