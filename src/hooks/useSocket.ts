import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useFirebase } from '../contexts/FirebaseContext';
import { auth } from '../firebase';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export const useSocket = (onFsEvent?: (data: { event: string, path: string }) => void) => {
  const { idToken } = useFirebase();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onFsEventRef = useRef(onFsEvent);

  useEffect(() => {
    onFsEventRef.current = onFsEvent;
  }, [onFsEvent]);

  useEffect(() => {
    let socketInstance: Socket | null = null;
    
    async function connect() {
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken(true); // Force refresh

      const s = io(API_BASE, {
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket'],
      });

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

      setSocket(s);
      socketInstance = s;
    }

    connect();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [idToken]);

  return { socket, isConnected };
};
