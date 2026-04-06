import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (onFsEvent?: (data: { event: string, path: string }) => void) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const onFsEventRef = useRef(onFsEvent);

  useEffect(() => {
    onFsEventRef.current = onFsEvent;
  }, [onFsEvent]);

  useEffect(() => {
    const s = io();
    setSocket(s);

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
    };
  }, []);

  return socket;
};
