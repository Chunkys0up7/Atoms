# Tier 3: Real-Time Collaboration - Implementation Plan

## Executive Summary

Tier 3 transforms the GNDP system into a **collaborative platform** where multiple users can work together in real-time. This enables teams to edit atoms, modules, and workflows simultaneously with live updates, presence awareness, and conflict resolution.

**Goal**: Enable multi-user collaboration with real-time synchronization

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend Clients                            │
│  (Multiple browser sessions with WebSocket connections)          │
└───────────────────────────┬───────────────────────────────────────┘
                            │ WebSocket Protocol
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WebSocket Server (FastAPI)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Connection   │  │ Broadcasting │  │ Presence         │      │
│  │ Manager      │  │ Service      │  │ Tracking         │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    State Management Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Redis Cache  │  │ Change Queue │  │ Conflict         │      │
│  │ (Real-time)  │  │ (Events)     │  │ Resolution       │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Persistence Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Neo4j Graph  │  │ YAML Files   │  │ Change History   │      │
│  │ Database     │  │ (Source)     │  │ (Audit Log)      │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features to Implement

### 1. WebSocket Infrastructure

#### Backend Components

**File**: `api/websocket_manager.py` (300 lines)
- `ConnectionManager` class
  - Active connections tracking (dict of session_id → WebSocket)
  - User presence management (who's online, viewing what)
  - Room-based organization (atom rooms, module rooms)
  - Broadcast methods (to all, to room, to user)

**File**: `api/routes/websocket.py` (400 lines)
- WebSocket endpoint: `ws://localhost:8000/ws/{user_id}`
- Message types:
  - `join`: User joins a room (atom/module)
  - `leave`: User leaves a room
  - `edit`: User is editing content
  - `change`: Content changed (broadcast to room)
  - `cursor`: Cursor position update
  - `presence`: Heartbeat for online status
- Authentication via WebSocket handshake
- Connection lifecycle management

**Dependencies**:
```python
# Add to requirements.txt
websockets==12.0
python-socketio==5.11.0  # Alternative: Socket.IO support
redis==5.0.1  # For pub/sub if scaling
```

#### Frontend Components

**File**: `hooks/useWebSocket.ts` (200 lines)
- Custom React hook for WebSocket connection
- Auto-reconnect logic with exponential backoff
- Message queuing for offline scenarios
- Event subscription system

**File**: `services/CollaborationService.ts` (250 lines)
- WebSocket wrapper with typed messages
- Presence tracking
- Room management
- Event emitter for change notifications

---

### 2. Real-Time Atom Editing

**File**: `components/CollaborativeAtomEditor.tsx` (500 lines)

**Features**:
1. **Live Presence Indicators**
   - Avatars showing who's viewing the atom
   - Color-coded user badges
   - "Currently editing" status

2. **Operational Transformation (OT)**
   - Conflict-free concurrent editing
   - Text field synchronization
   - Field-level locking (optional)

3. **Change Broadcasting**
   - Debounced change events (500ms)
   - Optimistic UI updates
   - Server confirmation

4. **Cursor Tracking**
   - Show other users' cursor positions
   - Field focus indicators

**Example Message Flow**:
```typescript
// User A edits atom description
{
  type: 'change',
  room: 'atom:atom-bo-credit-analysis',
  user: { id: 'user-a', name: 'Alice', color: '#3b82f6' },
  change: {
    field: 'description',
    value: 'Updated credit analysis process...',
    timestamp: '2025-01-15T10:30:00Z'
  }
}

// Broadcast to User B, C, D
// They see the change in real-time
```

---

### 3. Presence System

**File**: `components/PresenceIndicator.tsx` (150 lines)

**Features**:
- Online users list (avatar stack)
- "X people viewing" counter
- User status (active, idle, away)
- Last activity timestamp

**File**: `api/routes/presence.py` (200 lines)

**Endpoints**:
- `GET /api/presence/online` - List all online users
- `GET /api/presence/room/{room_id}` - Users in specific room
- `POST /api/presence/heartbeat` - Update user activity

**Redis Structure**:
```
presence:user:{user_id} = {
  "name": "Alice",
  "avatar": "...",
  "status": "active",
  "current_room": "atom:atom-bo-credit-analysis",
  "last_seen": "2025-01-15T10:30:00Z"
}
TTL: 30 seconds (auto-expire if no heartbeat)

presence:room:{room_id} = Set[user_id1, user_id2, ...]
```

---

### 4. Conflict Resolution

**File**: `api/services/conflict_resolver.py` (350 lines)

**Strategies**:

1. **Last-Write-Wins (LWW)**
   - Simple timestamp-based resolution
   - User notified if their change was overwritten

2. **Field-Level Merging**
   - Different fields can be edited concurrently
   - Only conflict if same field edited

3. **Three-Way Merge**
   - Common ancestor (last saved state)
   - User A's changes
   - User B's changes
   - Merge algorithm produces final state

**Example**:
```python
def resolve_conflict(base, local, remote):
    """
    Three-way merge for atom fields
    """
    result = {}

    for field in set(base.keys()) | set(local.keys()) | set(remote.keys()):
        base_val = base.get(field)
        local_val = local.get(field)
        remote_val = remote.get(field)

        if local_val == remote_val:
            result[field] = local_val
        elif local_val == base_val:
            result[field] = remote_val  # Accept remote change
        elif remote_val == base_val:
            result[field] = local_val   # Accept local change
        else:
            # True conflict - requires manual resolution
            result[field] = {
                'conflict': True,
                'local': local_val,
                'remote': remote_val
            }

    return result
```

---

### 5. Change History & Audit Trail

**File**: `api/routes/history.py` (300 lines)

**Features**:
- Track all changes with user attribution
- Revert to previous versions
- Diff view between versions
- Blame view (who changed what)

**Database Schema** (Neo4j):
```cypher
CREATE (change:Change {
  id: 'change-uuid',
  atom_id: 'atom-bo-credit-analysis',
  user_id: 'user-a',
  user_name: 'Alice',
  timestamp: datetime(),
  field: 'description',
  old_value: '...',
  new_value: '...',
  change_type: 'update'  // create, update, delete
})
```

**Endpoints**:
- `GET /api/history/atom/{atom_id}` - Change history for atom
- `GET /api/history/user/{user_id}` - Changes by user
- `POST /api/history/revert/{change_id}` - Revert a change
- `GET /api/history/diff/{v1}/{v2}` - Diff between versions

---

### 6. Notification System

**File**: `components/NotificationCenter.tsx` (250 lines)

**Notification Types**:
1. **Change Notifications**
   - "Alice updated Module MOD-001"
   - "Bob added a new atom: Credit Verification"

2. **Mention Notifications**
   - "@alice Can you review this process?"
   - Comment system with @mentions

3. **Conflict Notifications**
   - "Your change to atom-bo-credit-analysis was overwritten"
   - "Conflict detected - manual merge required"

4. **Presence Notifications**
   - "Alice joined the session"
   - "Bob is now viewing the same atom"

**Backend**: `api/routes/notifications.py` (200 lines)
- Store notifications in Neo4j
- Real-time delivery via WebSocket
- Mark as read/unread
- Notification preferences

---

### 7. Collaborative Workflow Builder

**File**: `components/CollaborativeWorkflowCanvas.tsx` (600 lines)

**Features**:
- Real-time workflow diagram editing
- Multi-user cursor tracking on canvas
- Node drag-and-drop with conflict resolution
- Live updates when atoms are added/removed
- Undo/redo with operational transformation

**Technical Approach**:
- Use Y.js (CRDT library) for conflict-free editing
- WebRTC for peer-to-peer synchronization (optional)
- Centralized server mode via WebSocket

---

## API Endpoints Summary

### WebSocket
```
WS   /ws/{user_id}  - WebSocket connection
```

### Presence
```
GET  /api/presence/online
GET  /api/presence/room/{room_id}
POST /api/presence/heartbeat
```

### History
```
GET  /api/history/atom/{atom_id}
GET  /api/history/user/{user_id}
POST /api/history/revert/{change_id}
GET  /api/history/diff/{v1}/{v2}
```

### Notifications
```
GET  /api/notifications
POST /api/notifications/mark-read/{notification_id}
GET  /api/notifications/unread-count
```

**Total New Endpoints**: ~10 REST + 1 WebSocket

---

## Implementation Phases

### Phase 1: Infrastructure (Week 1)
- [ ] WebSocket server setup
- [ ] Connection manager
- [ ] Redis integration for pub/sub
- [ ] Frontend WebSocket hook
- [ ] Basic message types (join/leave/change)

### Phase 2: Presence & Notifications (Week 2)
- [ ] Presence tracking system
- [ ] Online users display
- [ ] Room-based presence
- [ ] Notification center component
- [ ] Real-time notification delivery

### Phase 3: Collaborative Editing (Week 3)
- [ ] CollaborativeAtomEditor component
- [ ] Field-level change broadcasting
- [ ] Optimistic UI updates
- [ ] Conflict detection

### Phase 4: Conflict Resolution (Week 4)
- [ ] Three-way merge algorithm
- [ ] Conflict UI display
- [ ] Manual resolution interface
- [ ] Testing with concurrent edits

### Phase 5: History & Audit (Week 5)
- [ ] Change history tracking
- [ ] Version comparison
- [ ] Revert functionality
- [ ] Audit log viewer

### Phase 6: Advanced Features (Week 6)
- [ ] Collaborative workflow canvas
- [ ] Cursor tracking
- [ ] Comment system with @mentions
- [ ] Integration with existing components

---

## Technology Stack

### Backend
- **FastAPI WebSocket** - WebSocket server
- **Redis** - Pub/sub, presence cache, session storage
- **Neo4j** - Change history, audit trail
- **Python asyncio** - Async message handling

### Frontend
- **WebSocket API** - Browser WebSocket connection
- **React Context** - Global WebSocket state
- **Custom Hooks** - useWebSocket, usePresence, useCollaboration
- **Optimistic UI** - Immediate feedback with rollback

### Optional Advanced
- **Y.js** - CRDT for conflict-free editing
- **Socket.IO** - Alternative to raw WebSocket (fallback support)
- **WebRTC** - Peer-to-peer for low-latency updates

---

## Performance Considerations

### Scalability
- **Connection Limits**: 10,000 concurrent WebSocket connections per server
- **Redis Cluster**: Horizontal scaling for pub/sub
- **Load Balancer**: Sticky sessions for WebSocket

### Optimization
- **Message Batching**: Group small changes into batches
- **Debouncing**: Wait 500ms before broadcasting changes
- **Compression**: gzip WebSocket messages
- **Throttling**: Rate limit per user (100 messages/minute)

### Monitoring
- **Active Connections**: Track connection count
- **Message Rate**: Messages per second
- **Latency**: Round-trip time for messages
- **Error Rate**: Failed deliveries, disconnections

---

## Security Considerations

### Authentication
- WebSocket token in handshake URL: `ws://...?token=jwt`
- Validate JWT on connection
- Refresh token mechanism

### Authorization
- Room-based permissions (can user edit this atom?)
- Rate limiting to prevent spam
- Input validation on all messages

### Data Privacy
- End-to-end encryption for sensitive content (optional)
- Audit log for security events
- Session timeout after 30 minutes idle

---

## Testing Strategy

### Unit Tests
- Connection manager logic
- Conflict resolution algorithms
- Presence tracking

### Integration Tests
- WebSocket message flow
- Multi-user scenarios
- Broadcast delivery

### E2E Tests (Playwright)
- Two users editing same atom
- Conflict resolution UI
- Presence indicators

### Load Tests (Locust)
- 1,000 concurrent users
- 10,000 messages per second
- Connection stability

---

## Migration Path

### Backward Compatibility
- Non-collaborative mode still works (no WebSocket)
- Graceful degradation if WebSocket unavailable
- Existing API endpoints unchanged

### Rollout Strategy
1. Deploy WebSocket server (non-critical)
2. Enable for beta users
3. Monitor performance
4. Gradual rollout to all users
5. Make collaborative mode default

---

## Success Metrics

### Technical
- ✅ WebSocket uptime > 99.9%
- ✅ Message latency < 100ms (p95)
- ✅ Conflict rate < 1% of edits
- ✅ Zero data loss

### User Experience
- ✅ Real-time updates within 200ms
- ✅ Presence visible within 1 second
- ✅ Conflicts resolved in < 5 clicks
- ✅ No "phantom edits" or lost changes

---

## Estimated Effort

| Component | Lines of Code | Effort (Days) |
|-----------|---------------|---------------|
| WebSocket Infrastructure | 700 | 3 |
| Presence System | 350 | 2 |
| Collaborative Editing | 500 | 4 |
| Conflict Resolution | 350 | 3 |
| History & Audit | 300 | 2 |
| Notifications | 450 | 2 |
| Frontend Components | 1,200 | 5 |
| Testing & Docs | 500 | 3 |
| **Total** | **4,350** | **24 days** |

---

## Files to Create

### Backend (8 files)
1. `api/websocket_manager.py` (300 lines)
2. `api/routes/websocket.py` (400 lines)
3. `api/routes/presence.py` (200 lines)
4. `api/routes/history.py` (300 lines)
5. `api/routes/notifications.py` (200 lines)
6. `api/services/conflict_resolver.py` (350 lines)
7. `api/services/change_tracker.py` (250 lines)
8. `api/middleware/websocket_auth.py` (100 lines)

### Frontend (7 files)
1. `hooks/useWebSocket.ts` (200 lines)
2. `services/CollaborationService.ts` (250 lines)
3. `components/CollaborativeAtomEditor.tsx` (500 lines)
4. `components/PresenceIndicator.tsx` (150 lines)
5. `components/NotificationCenter.tsx` (250 lines)
6. `components/CollaborativeWorkflowCanvas.tsx` (600 lines)
7. `context/WebSocketContext.tsx` (150 lines)

### Configuration
1. `.env` - Add REDIS_URL, WS_SECRET_KEY
2. `docker-compose.yml` - Add Redis service

**Total**: 15 new files, ~4,350 lines of code

---

## Dependencies to Add

```bash
# Backend
pip install websockets==12.0
pip install python-socketio==5.11.0
pip install redis==5.0.1
pip install aioredis==2.0.1

# Frontend (package.json)
npm install socket.io-client@4.6.0
npm install @types/socket.io-client@3.0.0
npm install yjs@13.6.0  # CRDT library (optional)
npm install y-websocket@1.5.0
```

---

## Next Steps

After planning review:
1. Set up Redis instance (Docker or cloud)
2. Implement WebSocket infrastructure (Phase 1)
3. Build presence system (Phase 2)
4. Create collaborative atom editor (Phase 3)
5. Add conflict resolution (Phase 4)
6. Implement history tracking (Phase 5)
7. Polish UI and add advanced features (Phase 6)

---

## Status

📋 **Status**: Planning Complete - Ready for Implementation

**Blockers**: None
**Dependencies**: Redis required for production deployment

**Next Action**: Proceed with Phase 1 implementation after approval
