// hooks/useSocket.js
// -------------------
// React hook managing real-time WebSocket connection via Socket.IO client.
// Follows our core architecture rule:
//   Receives lightweight events and triggers an authoritative re-fetch from
//   the REST API, keeping client state perfectly synchronized.

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket(onEvent) {
  const socketRef = useRef(null);

  useEffect(() => {
    // In dev, connect to backend URL or current origin
    const socketUrl = window.location.port === '5173'
      ? 'http://localhost:3001'
      : window.location.origin;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('ticket:created', (data) => {
      if (onEvent) onEvent('created', data);
    });

    socket.on('ticket:updated', (data) => {
      if (onEvent) onEvent('updated', data);
    });

    socket.on('ticket:deleted', (data) => {
      if (onEvent) onEvent('deleted', data);
    });

    return () => {
      socket.disconnect();
    };
  }, [onEvent]);

  return socketRef.current;
}
