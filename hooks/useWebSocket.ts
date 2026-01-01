/**
 * useWebSocket Hook
 *
 * Custom React hook for managing WebSocket connections with auto-reconnect,
 * message queuing, and typed event handling.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface WebSocketOptions {
  user_id: string;
  name?: string;
  avatar?: string;
  role?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  joinRoom: (room_id: string) => void;
  leaveRoom: (room_id: string) => void;
  addEventListener: (type: string, handler: (message: any) => void) => () => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(options: WebSocketOptions): WebSocketHookReturn {
  const {
    user_id,
    name,
    avatar,
    role,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const eventListenersRef = useRef<Map<string, Set<(message: any) => void>>>(new Map());
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Build WebSocket URL with query parameters
  const getWebSocketURL = useCallback(() => {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (avatar) params.append('avatar', avatar);
    if (role) params.append('role', role);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '8000'; // Backend port

    return `${protocol}//${host}:${port}/ws/${user_id}?${params.toString()}`;
  }, [user_id, name, avatar, role]);

  // Send message
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for sending when connected
      messageQueueRef.current.push(message);
    }
  }, []);

  // Join room
  const joinRoom = useCallback((room_id: string) => {
    sendMessage({ type: 'join', room_id });
  }, [sendMessage]);

  // Leave room
  const leaveRoom = useCallback((room_id: string) => {
    sendMessage({ type: 'leave', room_id });
  }, [sendMessage]);

  // Add event listener
  const addEventListener = useCallback((type: string, handler: (message: any) => void) => {
    if (!eventListenersRef.current.has(type)) {
      eventListenersRef.current.set(type, new Set());
    }
    eventListenersRef.current.get(type)!.add(handler);

    // Return cleanup function
    return () => {
      const listeners = eventListenersRef.current.get(type);
      if (listeners) {
        listeners.delete(handler);
        if (listeners.size === 0) {
          eventListenersRef.current.delete(type);
        }
      }
    };
  }, []);

  // Dispatch event to listeners
  const dispatchEvent = useCallback((message: WebSocketMessage) => {
    const listeners = eventListenersRef.current.get(message.type);
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`[WebSocket] Error in event handler for ${message.type}:`, error);
        }
      });
    }
  }, []);

  // Send heartbeat
  const sendHeartbeat = useCallback(() => {
    sendMessage({ type: 'heartbeat' });
  }, [sendMessage]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    const url = getWebSocketURL();
    console.log('[WebSocket] Connecting to:', url);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift();
          if (message) {
            ws.send(JSON.stringify(message));
          }
        }

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000); // Every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('[WebSocket] Received:', message);
          dispatchEvent(message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectInterval * Math.min(reconnectAttemptsRef.current, 5); // Exponential backoff

          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('[WebSocket] Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
    }
  }, [getWebSocketURL, maxReconnectAttempts, reconnectInterval, dispatchEvent, sendHeartbeat]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    joinRoom,
    leaveRoom,
    addEventListener,
    connect,
    disconnect
  };
}
