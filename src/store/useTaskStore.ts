import { create } from 'zustand';
import { BackgroundTask, TaskStatus } from '../lib/backgroundTaskManager';

// Define frontend types matching backend
export interface ClientBackgroundTask {
  id: string;
  name: string;
  status: TaskStatus;
  progress: number;
  logs: string[];
  createdAt: number;
  updatedAt: number;
}

interface TaskState {
  tasks: ClientBackgroundTask[];
  isLoading: boolean;
  activeWorkspace: string | null;
  fetchTasks: (workspace: string) => Promise<void>;
  createTask: (workspace: string, name: string) => Promise<void>;
  cancelTask: (workspace: string, taskId: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  activeWorkspace: null,

  fetchTasks: async (workspace: string) => {
    set({ isLoading: true, activeWorkspace: workspace });
    try {
      const { auth } = await import('../firebase');
      const token = await auth.currentUser?.getIdToken();
      
      const res = await fetch(`/api/tasks?workspace=${encodeURIComponent(workspace)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const { tasks } = await res.json();
        set({ tasks, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  createTask: async (workspace: string, name: string) => {
    try {
      const { auth } = await import('../firebase');
      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workspace, name })
      });
      get().fetchTasks(workspace);
    } catch (e) {
      console.error(e);
    }
  },

  cancelTask: async (workspace: string, taskId: string) => {
    try {
      const { auth } = await import('../firebase');
      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workspace })
      });
      get().fetchTasks(workspace);
    } catch (e) {
      console.error(e);
    }
  }
}));
