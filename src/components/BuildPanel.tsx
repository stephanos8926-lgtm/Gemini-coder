import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RefreshCw, Terminal, Loader2 } from 'lucide-react';
import { buildService } from '../lib/buildService';
import { io, Socket } from 'socket.io-client';

export function BuildPanel() {
  const [tasks, setTasks] = useState<{ id: string; command: string; status: 'running' | 'stopped' | 'error'; output: string[] }[]>([]);
  const [input, setInput] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io();
    
    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const runTask = async (command: string) => {
    const taskId = Math.random().toString(36).substring(7);
    setTasks(prev => [...prev, { id: taskId, command, status: 'running', output: [] }]);
    
    // Listen for this task's output
    socketRef.current?.on(`build:${taskId}:stdout`, (data: string) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, output: [...t.output, data] } : t));
    });
    socketRef.current?.on(`build:${taskId}:stderr`, (data: string) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, output: [...t.output, data] } : t));
    });
    socketRef.current?.on(`build:${taskId}:close`, (code: number) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: code === 0 ? 'stopped' : 'error' } : t));
    });

    await buildService.startProcess(command, taskId);
  };

  const stopTask = async (id: string) => {
    await buildService.stopProcess(id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'stopped' } : t));
  };

  return (
    <div className="flex flex-col h-full bg-surface-base border-l border-border-subtle">
      <div className="px-4 py-3 border-b border-border-subtle bg-surface-card flex items-center justify-between">
        <span className="text-xs font-bold text-text-subtle uppercase tracking-widest">Build & Tasks</span>
        <div className="flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="npm run build"
            className="bg-surface-base border border-border-subtle px-2 py-1 text-xs text-text-primary rounded focus:outline-none focus:border-accent-intel transition-all"
          />
          <button
            onClick={() => runTask(input)}
            aria-label="Run task"
            className="p-1.5 bg-accent-intel text-white rounded hover:opacity-90 focus-visible:ring-1 focus-visible:ring-accent-intel outline-none"
          >
            <Play className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-surface-card border border-border-subtle rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-accent-intel">{task.command}</span>
              {task.status === 'running' ? (
                <button onClick={() => stopTask(task.id)}>
                  <Square className="w-3 h-3 text-red-500" />
                </button>
              ) : <Square className="w-3 h-3 text-gray-500" />}
            </div>
            <pre className="text-[10px] font-mono text-[#cccccc] whitespace-pre-wrap">{task.output.join('\n')}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
