/**
 * PresenceIndicator Component
 *
 * Displays online users and room members with avatars and status indicators.
 */

import React, { useState, useEffect } from 'react';

export interface UserPresence {
  user_id: string;
  name: string;
  avatar: string;
  role: string;
  status: string;
  last_seen: string;
  current_room?: string;
}

interface PresenceIndicatorProps {
  room_id?: string;
  maxDisplay?: number;
  showNames?: boolean;
}

export default function PresenceIndicator({
  room_id,
  maxDisplay = 5,
  showNames = false
}: PresenceIndicatorProps) {
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPresence();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchPresence, 10000);

    return () => clearInterval(interval);
  }, [room_id]);

  const fetchPresence = async () => {
    try {
      const endpoint = room_id
        ? `http://localhost:8000/api/presence/room/${room_id}`
        : 'http://localhost:8000/api/presence/online';

      const response = await fetch(endpoint);

      if (response.ok) {
        const data = await response.json();

        // Handle room response vs. online users response
        if (room_id && data.members) {
          setUsers(data.members);
        } else if (!room_id && Array.isArray(data)) {
          setUsers(data);
        }

        setError(null);
      } else {
        setError('Failed to load presence');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'online':
        return '#10b981'; // green
      case 'away':
        return '#f59e0b'; // orange
      case 'busy':
        return '#ef4444'; // red
      default:
        return '#9ca3af'; // gray
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserColor = (user_id: string): string => {
    // Generate consistent color from user_id
    const colors = [
      '#3b82f6', // blue
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#f59e0b', // orange
      '#10b981', // green
      '#06b6d4', // cyan
      '#6366f1'  // indigo
    ];

    const hash = user_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (loading) {
    return (
      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontSize: '12px', color: '#ef4444' }}>
        {error}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
        {room_id ? 'No one viewing' : 'No users online'}
      </div>
    );
  }

  const displayedUsers = users.slice(0, maxDisplay);
  const overflowCount = users.length - maxDisplay;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* Avatar stack */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {displayedUsers.map((user, index) => (
          <div
            key={user.user_id}
            style={{
              position: 'relative',
              marginLeft: index > 0 ? '-8px' : '0',
              zIndex: displayedUsers.length - index
            }}
            title={`${user.name} (${user.status})`}
          >
            {/* Avatar */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: getUserColor(user.user_id),
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                border: '2px solid #fff',
                cursor: 'pointer'
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                getInitials(user.name)
              )}
            </div>

            {/* Status indicator */}
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(user.status),
                border: '2px solid #fff'
              }}
            />
          </div>
        ))}

        {/* Overflow count */}
        {overflowCount > 0 && (
          <div
            style={{
              marginLeft: '-8px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '600',
              border: '2px solid #fff'
            }}
            title={`+${overflowCount} more`}
          >
            +{overflowCount}
          </div>
        )}
      </div>

      {/* User names (optional) */}
      {showNames && (
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          {users.length === 1
            ? users[0].name
            : `${users.length} ${room_id ? 'viewing' : 'online'}`}
        </div>
      )}
    </div>
  );
}
