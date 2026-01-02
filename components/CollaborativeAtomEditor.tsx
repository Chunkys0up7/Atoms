/**
 * CollaborativeAtomEditor Component
 *
 * Real-time collaborative editor for atoms with:
 * - Live presence indicators
 * - Change broadcasting
 * - Optimistic UI updates
 * - Conflict detection
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';

import { Atom } from '../types';

interface UserPresence {
  user_id: string;
  user_name: string;
  color: string;
  editing_field?: string;
}

interface CollaborativeAtomEditorProps {
  atom_id: string;
  user_id: string;
  user_name: string;
  onSave?: (atom: Atom) => Promise<void>;
  onConflict?: (conflicts: any[]) => void;
}

export default function CollaborativeAtomEditor({
  atom_id,
  user_id,
  user_name,
  onSave,
  onConflict
}: CollaborativeAtomEditorProps) {
  const [atom, setAtom] = useState<Atom | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Collaborative features
  const [roomMembers, setRoomMembers] = useState<UserPresence[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);

  // Track base version for conflict detection
  const baseVersionRef = useRef<Atom | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const roomId = `atom:${atom_id}`;

  // WebSocket connection
  const { isConnected, joinRoom, leaveRoom, sendMessage, addEventListener } = useWebSocket({
    user_id,
    name: user_name,
    autoConnect: true
  });

  // Generate user color
  const getUserColor = useCallback((id: string): string => {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }, []);

  // Load atom data
  useEffect(() => {
    fetchAtom();
  }, [atom_id]);

  // Join WebSocket room
  useEffect(() => {
    if (isConnected && atom_id) {
      joinRoom(roomId);

      return () => {
        leaveRoom(roomId);
      };
    }
  }, [isConnected, atom_id, roomId, joinRoom, leaveRoom]);

  // Listen for changes from other users
  useEffect(() => {
    const unsubscribe = addEventListener('change', (message: WebSocketMessage) => {
      if (message.room_id === roomId && message.user_id !== user_id) {
        handleRemoteChange(message.change);
      }
    });

    return unsubscribe;
  }, [addEventListener, roomId, user_id]);

  // Listen for room presence updates
  useEffect(() => {
    const unsubscribeJoin = addEventListener('user_joined_room', (message: WebSocketMessage) => {
      if (message.room_id === roomId) {
        updateRoomMembers(message.room_members);
      }
    });

    const unsubscribeLeave = addEventListener('user_left_room', (message: WebSocketMessage) => {
      if (message.room_id === roomId) {
        updateRoomMembers(message.room_members);
      }
    });

    return () => {
      unsubscribeJoin();
      unsubscribeLeave();
    };
  }, [addEventListener, roomId]);

  // Listen for typing indicators
  useEffect(() => {
    const unsubscribe = addEventListener('typing', (message: WebSocketMessage) => {
      if (message.room_id === roomId && message.user_id !== user_id) {
        updateUserEditingField(message.user_id, message.field, message.is_typing);
      }
    });

    return unsubscribe;
  }, [addEventListener, roomId, user_id]);

  const fetchAtom = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/atoms/${atom_id}`);

      if (response.ok) {
        const data = await response.json();
        setAtom(data);
        baseVersionRef.current = JSON.parse(JSON.stringify(data)); // Deep copy
      } else {
        setError('Failed to load atom');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updateRoomMembers = (memberIds: string[]) => {
    // Fetch presence info for each member
    const members: UserPresence[] = memberIds
      .filter(id => id !== user_id)
      .map(id => ({
        user_id: id,
        user_name: `User ${id.slice(0, 8)}`,
        color: getUserColor(id)
      }));

    setRoomMembers(members);
  };

  const updateUserEditingField = (userId: string, field: string, isTyping: boolean) => {
    setRoomMembers(prev =>
      prev.map(member =>
        member.user_id === userId
          ? { ...member, editing_field: isTyping ? field : undefined }
          : member
      )
    );
  };

  const handleFieldChange = (field: keyof Atom, value: any) => {
    if (!atom) return;

    // Optimistic update
    setAtom(prev => prev ? { ...prev, [field]: value } : null);
    setHasUnsavedChanges(true);

    // Broadcast change with debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      broadcastChange(field, value);
    }, 500);
  };

  const handleFieldFocus = (field: string) => {
    setEditingField(field);

    // Notify others that we're editing this field
    sendMessage({
      type: 'typing',
      room_id: roomId,
      field,
      is_typing: true
    });
  };

  const handleFieldBlur = (field: string) => {
    setEditingField(null);

    // Notify others that we stopped editing
    sendMessage({
      type: 'typing',
      room_id: roomId,
      field,
      is_typing: false
    });
  };

  const broadcastChange = (field: string, value: any) => {
    sendMessage({
      type: 'change',
      room_id: roomId,
      change: {
        field,
        value,
        timestamp: new Date().toISOString()
      }
    });
  };

  const handleRemoteChange = (change: any) => {
    if (!atom) return;

    const { field, value, timestamp } = change;

    // Check for conflicts
    const baseValue = baseVersionRef.current?.[field as keyof Atom];
    const localValue = atom[field as keyof Atom];

    if (localValue !== baseValue && localValue !== value) {
      // Conflict detected!
      const conflict = {
        field,
        base_value: baseValue,
        local_value: localValue,
        remote_value: value,
        timestamp
      };

      setConflicts(prev => [...prev, conflict]);

      if (onConflict) {
        onConflict([conflict]);
      }

      // For now, accept remote change (last-write-wins)
      // In production, show conflict resolution UI
    }

    // Apply remote change
    setAtom(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = async () => {
    if (!atom || !onSave) return;

    setSaving(true);
    setError(null);

    try {
      await onSave(atom);

      // Update base version
      baseVersionRef.current = JSON.parse(JSON.stringify(atom));
      setHasUnsavedChanges(false);
      setConflicts([]);

      // Track change in history
      await trackChange('update', 'Saved atom changes');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const trackChange = async (changeType: string, description: string) => {
    if (!atom) return;

    try {
      await fetch('http://localhost:8000/api/history/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atom_id: atom.id,
          user_id,
          user_name,
          change_type: changeType,
          description,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error('Failed to track change:', err);
    }
  };

  const getFieldIndicator = (field: string) => {
    const editingUser = roomMembers.find(m => m.editing_field === field);
    if (!editingUser) return null;

    return (
      <span
        style={{
          fontSize: '11px',
          color: editingUser.color,
          marginLeft: '8px',
          fontWeight: '500'
        }}
      >
        {editingUser.user_name} is editing...
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading atom...</p>
      </div>
    );
  }

  if (error || !atom) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        <p>{error || 'Atom not found'}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header with presence */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Edit Atom: {atom.name}</h2>

        {/* Presence indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Connection status */}
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#ef4444'
            }}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />

          {/* Room members */}
          {roomMembers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {roomMembers.map(member => (
                <div
                  key={member.user_id}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: member.color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}
                  title={member.user_name}
                >
                  {member.user_name.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            className="btn-primary"
            style={{
              opacity: !hasUnsavedChanges || saving ? 0.5 : 1,
              cursor: !hasUnsavedChanges || saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Conflicts warning */}
      {conflicts.length > 0 && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            marginBottom: '20px'
          }}
        >
          <strong>⚠️ {conflicts.length} conflict(s) detected</strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
            Changes from other users conflict with your local edits. Remote changes have been applied.
          </p>
        </div>
      )}

      {/* Editor fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Name */}
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Name {getFieldIndicator('name')}
          </label>
          <input
            type="text"
            value={atom.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            onFocus={() => handleFieldFocus('name')}
            onBlur={() => handleFieldBlur('name')}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              outline: editingField === 'name' ? '2px solid #3b82f6' : 'none'
            }}
          />
        </div>

        {/* Type */}
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Type {getFieldIndicator('type')}
          </label>
          <select
            value={atom.type}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            onFocus={() => handleFieldFocus('type')}
            onBlur={() => handleFieldBlur('type')}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              outline: editingField === 'type' ? '2px solid #3b82f6' : 'none'
            }}
          >
            <option value="PROCESS">PROCESS</option>
            <option value="DOCUMENT">DOCUMENT</option>
            <option value="SYSTEM">SYSTEM</option>
            <option value="ROLE">ROLE</option>
            <option value="POLICY">POLICY</option>
            <option value="CONTROL">CONTROL</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Description {getFieldIndicator('description')}
          </label>
          <textarea
            value={atom.content?.description || ''}
            onChange={(e) => handleFieldChange('content', { ...atom.content, description: e.target.value })}
            onFocus={() => handleFieldFocus('content.description')}
            onBlur={() => handleFieldBlur('content.description')}
            rows={6}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: editingField === 'content.description' ? '2px solid #3b82f6' : 'none'
            }}
          />
        </div>

        {/* Category */}
        {atom.category !== undefined && (
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Category {getFieldIndicator('category')}
            </label>
            <input
              type="text"
              value={atom.category || ''}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              onFocus={() => handleFieldFocus('category')}
              onBlur={() => handleFieldBlur('category')}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                outline: editingField === 'category' ? '2px solid #3b82f6' : 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* Footer info */}
      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '13px', color: '#6b7280' }}>
        {roomMembers.length === 0 ? (
          <p style={{ margin: 0 }}>You are editing alone</p>
        ) : (
          <p style={{ margin: 0 }}>
            {roomMembers.length} other {roomMembers.length === 1 ? 'person' : 'people'} viewing this atom
          </p>
        )}
      </div>
    </div>
  );
}
