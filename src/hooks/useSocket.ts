import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export const useSocket = (onFsEvent?: (data: { event: string, path: string }) => void) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onFsEventRef = useRef(onFsEvent);

  useEffect(() => {
    onFsEventRef.current = onFsEvent;
  }, [onFsEvent]);

  useEffect(() => {
    const s = io(API_BASE, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      toast.success('Connected to workspace sync');
    });

    s.on('connect_error', (err) => {
      setIsConnected(false);
      console.error('Socket connection error:', err);
      toast.error('Sync service offline. Retrying...');
    });

    s.on('fs-event', (data) => {
      console.log('File system event:', data);
      if (onFsEventRef.current) onFsEventRef.current(data);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
      toast.warning('Disconnected from workspace sync');
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, isConnected };
};
