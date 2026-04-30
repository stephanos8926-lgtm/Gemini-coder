import { useEffect } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useChatStore } from '../store/useChatStore';
import { useFileStore } from '../store/useFileStore';
import { useSocket } from './useSocket';
import { filesystemService } from '../lib/filesystemService';
import { nexusPersist } from '../lib/persistence/NexusPersistence';
import { generateId } from '../lib/projectStore';

export function useAppInitialization() {
  const { user } = useFirebase();
  const { setFileStore } = useFileStore();
  const { setMessages, RW_messages } = useChatStore();

  const { socket } = useSocket((data: { event: string, path: string }) => {
    filesystemService.loadAllFiles().then(setFileStore);
  });

  useEffect(() => {
    import('../lib/persistence/adapters/IndexedDBAdapter').then(({ IndexedDBAdapter }) => {
      nexusPersist.setLocalAdapter(new IndexedDBAdapter());
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('security-alert', (data: { path: string, issues: any[] }) => {
      if (data.issues && data.issues.length > 0) {
          const issueMsg = `[SECURITY ALERT] Issues detected in ${data.path}:\n${data.issues.map(i => `- ${i.message}`).join('\n')}`;
          setMessages([...RW_messages, { id: generateId(), role: 'model', content: issueMsg }]);
      }
    });

    return () => {
      socket.off('security-alert');
    };
  }, [socket, RW_messages, setMessages]);

  return { socket, user };
}
