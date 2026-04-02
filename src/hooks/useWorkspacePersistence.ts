import { useEffect } from 'react';

export const useWorkspacePersistence = (
  workspaceName: string | null,
  messages: any[],
  setMessages: (messages: any[]) => void
) => {
  // Persistence for chat messages
  useEffect(() => {
    if (workspaceName) {
      const saved = localStorage.getItem(`chat_messages_${workspaceName}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        } catch (e) {
          console.error('Failed to load chat messages', e);
        }
      } else {
        setMessages([]);
      }
    }
  }, [workspaceName, setMessages]);

  useEffect(() => {
    if (workspaceName && messages.length > 0) {
      localStorage.setItem(`chat_messages_${workspaceName}`, JSON.stringify(messages));
    }
  }, [messages, workspaceName]);
};
