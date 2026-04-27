import { db, auth } from '../firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

export interface TaskData {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  type: 'foreground' | 'background';
  userId: string;
  projectId: string;
  prompt: string;
  progress: number;
  currentStep: string;
  result?: any;
  error?: string;
}

export interface SwarmData {
  id: string;
  status: 'planning' | 'executing' | 'merging' | 'completed' | 'failed';
  userId: string;
  projectId: string;
  originalPrompt: string;
  plan?: {
    subtasks: Array<{
      id: string;
      type: string;
      description: string;
      assignedAgent: string;
    }>;
  };
  createdAt: any;
}

/**
 * Submits a prompt for either foreground or background processing.
 */
export async function submitTask(prompt: string, files: Record<string, string> = {}, forceBackground = false) {
  const response = await fetch('/api/tasks/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, files, forceBackground })
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Task submission failed');
  }
  
  return await response.json();
}

/**
 * Submits a prompt to coordinate an agent swarm.
 */
export async function submitSwarm(prompt: string, projectId: string = 'default') {
  const response = await fetch('/api/swarms/coordinate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, projectId })
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Swarm coordination failed');
  }
  
  return await response.json();
}

/**
 * Watches a specific task document for updates.
 */
export function watchTask(taskId: string, callbacks: {
  onProgress?: (progress: number, step: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}) {
  const taskRef = doc(db, 'tasks', taskId);
  
  return onSnapshot(taskRef, (snapshot) => {
    if (!snapshot.exists()) return;
    
    const task = snapshot.data() as TaskData;
    
    if (task.status === 'running' && callbacks.onProgress) {
      callbacks.onProgress(task.progress || 0, task.currentStep || '');
    }
    
    if (task.status === 'completed' && callbacks.onComplete) {
      callbacks.onComplete(task.result);
    }
    
    if (task.status === 'failed' && callbacks.onError) {
      callbacks.onError(task.result?.error || 'Task failed');
    }
  });
}

/**
 * Watches all active tasks for a project.
 */
export function watchActiveTasks(projectId: string, onUpdate: (tasks: TaskData[]) => void) {
  if (!auth.currentUser) return () => {};
  
  const q = query(
    collection(db, 'tasks'),
    where('projectId', '==', projectId),
    where('userId', '==', auth.currentUser.uid),
    where('status', 'in', ['queued', 'running'])
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TaskData));
    onUpdate(tasks);
  });
}

/**
 * Watches all active swarms for a project.
 */
export function watchActiveSwarms(projectId: string, onUpdate: (swarms: SwarmData[]) => void) {
  if (!auth.currentUser) return () => {};

  const q = query(
    collection(db, 'swarms'),
    where('projectId', '==', projectId),
    where('userId', '==', auth.currentUser.uid),
    where('status', 'in', ['planning', 'executing', 'merging'])
  );

  return onSnapshot(q, (snapshot) => {
    const swarms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SwarmData));
    onUpdate(swarms);
  });
}
