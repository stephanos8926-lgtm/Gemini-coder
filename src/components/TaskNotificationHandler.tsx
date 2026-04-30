import React, { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

/**
 * @component TaskNotificationHandler
 * @description Listens for background task updates and shows persistent notifications to the user.
 */
export const TaskNotificationHandler: React.FC = () => {
  const { RW_user } = useAuthStore();

  useEffect(() => {
    if (!RW_user) return;

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', RW_user.uid),
      where('status', 'in', ['running', 'completed', 'failed'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const task = change.doc.data();
        const taskId = change.doc.id;

        if (change.type === 'modified') {
          // Notify based on status change
          if (task.status === 'completed') {
            toast.success(`Task Complete: ${task.name || 'Agent Job'}`, {
              description: `Autonomous execution finished successfully.`,
              duration: 5000,
            });
          } else if (task.status === 'failed') {
            toast.error(`Task Failed: ${task.name || 'Agent Job'}`, {
              description: task.result?.error || 'An unexpected error occurred.',
              duration: 10000,
            });
          } else if (task.status === 'running' && !task.progress) {
             toast.info(`Task Started: ${task.name || 'Agent Job'}`, {
              description: `AI is now executing in the background...`,
            });
          }
        }
      });
    }, (error) => {
      console.error('Task notification listener error:', error);
    });

    return () => unsubscribe();
  }, [RW_user]);

  return null; // This is a logic-only component
};
