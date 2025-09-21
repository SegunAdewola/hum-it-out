import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useWebSocket(userId) {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [sessionUpdates, setSessionUpdates] = useState({});

  useEffect(() => {
    if (!userId) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
    const newSocket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      retries: 3
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      
      // Join user-specific room for updates
      newSocket.emit('join_user_room', userId);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('disconnected');
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      setConnectionStatus('connected');
    });

    newSocket.on('reconnecting', (attemptNumber) => {
      console.log('WebSocket reconnecting, attempt:', attemptNumber);
      setConnectionStatus('connecting');
    });

    // Session-specific events
    newSocket.on('session_update', (update) => {
      console.log('Session update received:', update);
      setSessionUpdates(prev => ({
        ...prev,
        [update.sessionId]: update
      }));
    });

    newSocket.on('processing_started', (data) => {
      console.log('Processing started:', data);
      setSessionUpdates(prev => ({
        ...prev,
        [data.sessionId]: { ...data, status: 'processing' }
      }));
    });

    newSocket.on('processing_complete', (data) => {
      console.log('Processing completed:', data);
      setSessionUpdates(prev => ({
        ...prev,
        [data.sessionId]: { ...data, status: 'completed' }
      }));
      
      // Trigger a custom event for components to refresh data
      window.dispatchEvent(new CustomEvent('session_completed', { detail: data }));
    });

    newSocket.on('processing_failed', (data) => {
      console.log('Processing failed:', data);
      setSessionUpdates(prev => ({
        ...prev,
        [data.sessionId]: { ...data, status: 'failed' }
      }));
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [userId]);

  // Function to send real-time messages
  const sendMessage = (event, data) => {
    if (socket && connectionStatus === 'connected') {
      socket.emit(event, data);
    }
  };

  return {
    socket,
    connectionStatus,
    sessionUpdates,
    sendMessage,
    isConnected: connectionStatus === 'connected'
  };
}
