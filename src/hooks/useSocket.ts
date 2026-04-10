import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export const useSocket = (onFsEvent?: (data: { event: string, path: string }) => void) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const onFsEventRef = useRef(onFsEvent);

  useEffect(() => {
    onFsEventRef.current = onFsEvent;
  }, [onFsEvent]);

  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  useEffect(() => {
    const s = io(API_BASE);
    if (isMounted.current) setSocket(s);

    s.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    s.on('fs-event', (data) => {
      console.log('File system event:', data);
      if (onFsEventRef.current) onFsEventRef.current(data);
    });

    s.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    return () => {
      s.disconnect();
      if (!isMounted.current) return;
    };
  }, []);

  return socket;
};
