import { EventEmitter } from 'events';
import crypto from 'crypto';

export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundTask {
  id: string;
  name: string;
  status: TaskStatus;
  progress: number;
  logs: string[];
  createdAt: number;
  updatedAt: number;
}

export class BackgroundTaskManager extends EventEmitter {
  private static instances: Map<string, BackgroundTaskManager> = new Map();
  private tasks: Map<string, BackgroundTask> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  private tenant: { userId: string; workspaceId: string };

  private constructor(tenant: { userId: string; workspaceId: string }) {
    super();
    this.tenant = tenant;
  }

  public static getInstance(tenant?: { userId: string; workspaceId: string }): BackgroundTaskManager {
    const effectiveTenant = tenant || { userId: 'default', workspaceId: 'default' };
    const key = `${effectiveTenant.userId}:${effectiveTenant.workspaceId}`;
    if (!BackgroundTaskManager.instances.has(key)) {
      BackgroundTaskManager.instances.set(key, new BackgroundTaskManager(effectiveTenant));
    }
    return BackgroundTaskManager.instances.get(key)!;
  }

  public createTask(name: string): BackgroundTask {
    const id = crypto.randomUUID();
    const task: BackgroundTask = {
      id,
      name,
      status: 'pending',
      progress: 0,
      logs: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.tasks.set(id, task);
    this.emit('update', task);
    return task;
  }

  public getTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getTask(id: string): BackgroundTask | undefined {
    return this.tasks.get(id);
  }

  public updateTaskProgress(id: string, progress: number, log?: string) {
    const task = this.tasks.get(id);
    if (!task) return;
    task.progress = progress;
    task.updatedAt = Date.now();
    if (log) {
      task.logs.push(`[${new Date().toISOString()}] ${log}`);
    }
    this.emit('update', task);
  }

  public updateTaskStatus(id: string, status: TaskStatus, log?: string) {
    const task = this.tasks.get(id);
    if (!task) return;
    task.status = status;
    task.updatedAt = Date.now();
    if (log) {
      task.logs.push(`[${new Date().toISOString()}] ${log}`);
    }
    this.emit('update', task);
  }

  public setAbortController(id: string, controller: AbortController) {
    this.abortControllers.set(id, controller);
  }

  public cancelTask(id: string) {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(id);
    }
    this.updateTaskStatus(id, 'cancelled', 'Task cancelled by user');
  }

  // A standalone runner for testing background behavior
  public async executeTask(id: string, taskFunction: (signal: AbortSignal, logCallback: (msg: string) => void, progressCallback: (p: number) => void) => Promise<void>) {
    const controller = new AbortController();
    this.setAbortController(id, controller);
    this.updateTaskStatus(id, 'running', 'Agent task started.');
    
    try {
      await taskFunction(
        controller.signal,
        (msg: string) => this.updateTaskProgress(id, this.tasks.get(id)?.progress || 0, msg),
        (prog: number) => this.updateTaskProgress(id, prog)
      );
      if (!controller.signal.aborted) {
        this.updateTaskStatus(id, 'completed', 'Agent task completed successfully.');
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        this.updateTaskStatus(id, 'failed', `Error: ${err.message}`);
      }
    } finally {
      this.abortControllers.delete(id);
    }
  }
}
