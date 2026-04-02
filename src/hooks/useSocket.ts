import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

export const useSocket = (onFsEvent?: (data: { event: string, path: string }) => void) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('fs-event', (data) => {
      console.log('File system event:', data);
      if (onFsEvent) onFsEvent(data);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
};
