/**
 * NotificationCenter Component
 *
 * Displays user notifications with real-time updates via WebSocket.
 * Supports filtering, marking as read, and different notification types.
 */

import React, { useState, useEffect } from 'react';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';

interface Notification {
  id: string;
  type: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
  metadata: Record<string, any>;
}

interface NotificationCenterProps {
  user_id: string;
  user_name?: string;
}

export default function NotificationCenter({ user_id, user_name }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // WebSocket for real-time notifications
  const { isConnected, addEventListener } = useWebSocket({
    user_id,
    name: user_name,
    autoConnect: true
  });

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Poll for updates every 30 seconds (fallback if WebSocket fails)
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [user_id, filter]);

  // Listen for real-time notifications via WebSocket
  useEffect(() => {
    const unsubscribe = addEventListener('notification', (message: WebSocketMessage) => {
      // Add new notification to list
      const newNotification: Notification = {
        id: message.notification_id || `notif-${Date.now()}`,
        type: message.notification_type || 'system',
        user_id: user_id,
        title: message.title || 'New Notification',
        message: message.message || '',
        link: message.link,
        read: false,
        created_at: new Date().toISOString(),
        metadata: message.metadata || {}
      };

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(newNotification.title, {
          body: newNotification.message,
          icon: '/icon.png'
        });
      }
    });

    return unsubscribe;
  }, [addEventListener, user_id]);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const unreadOnly = filter === 'unread';
      const response = await fetch(
        `http://localhost:8000/api/notifications?user_id=${user_id}&unread_only=${unreadOnly}&limit=50`
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      } else {
        setError('Failed to load notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/notifications/unread-count?user_id=${user_id}`
      );

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const markAsRead = async (notification_id: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/notifications/${notification_id}/read`,
        { method: 'POST' }
      );

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notification_id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/notifications/mark-all-read?user_id=${user_id}`,
        { method: 'POST' }
      );

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (notification_id: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/notifications/${notification_id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notification_id));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'change':
        return '✏️';
      case 'mention':
        return '@';
      case 'assignment':
        return '📋';
      case 'comment':
        return '💬';
      case 'system':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'change':
        return '#3b82f6'; // blue
      case 'mention':
        return '#8b5cf6'; // purple
      case 'assignment':
        return '#f59e0b'; // orange
      case 'comment':
        return '#10b981'; // green
      case 'system':
        return '#6b7280'; // gray
      default:
        return '#3b82f6';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: '8px 12px',
          backgroundColor: isOpen ? '#f3f4f6' : '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '18px'
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: '600',
              borderRadius: '10px',
              padding: '2px 6px',
              minWidth: '18px',
              textAlign: 'center'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '45px',
            right: '0',
            width: '400px',
            maxHeight: '600px',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Notifications
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Connection indicator */}
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#10b981' : '#9ca3af'
                }}
                title={isConnected ? 'Connected' : 'Disconnected'}
              />
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    fontSize: '12px',
                    color: '#3b82f6',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px'
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              gap: '16px'
            }}
          >
            <button
              onClick={() => setFilter('all')}
              style={{
                fontSize: '13px',
                fontWeight: filter === 'all' ? '600' : '400',
                color: filter === 'all' ? '#3b82f6' : '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                borderBottom: filter === 'all' ? '2px solid #3b82f6' : 'none'
              }}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                fontSize: '13px',
                fontWeight: filter === 'unread' ? '600' : '400',
                color: filter === 'unread' ? '#3b82f6' : '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                borderBottom: filter === 'unread' ? '2px solid #3b82f6' : 'none'
              }}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Notifications List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                Loading notifications...
              </div>
            ) : error ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: notification.read ? '#fff' : '#f9fafb',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.read ? '#fff' : '#f9fafb';
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: getNotificationColor(notification.type) + '20',
                        color: getNotificationColor(notification.type),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        flexShrink: 0
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: notification.read ? '400' : '600',
                          color: '#111827',
                          marginBottom: '4px'
                        }}
                      >
                        {notification.title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {notification.message}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {formatTimestamp(notification.created_at)}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        fontSize: '14px',
                        flexShrink: 0
                      }}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
