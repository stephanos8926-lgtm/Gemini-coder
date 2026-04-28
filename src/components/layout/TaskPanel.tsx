import React, { useEffect, useState } from 'react';
import { useTaskStore, ClientBackgroundTask } from '../../store/useTaskStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { Play, Square, RefreshCw, Activity } from 'lucide-react';

export const TaskPanel: React.FC = () => {
  const { tasks, isLoading, fetchTasks, createTask, cancelTask } = useTaskStore();
  const { RW_currentProjectId } = useWorkspaceStore();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    if (RW_currentProjectId) {
      fetchTasks(RW_currentProjectId);
      
      const interval = setInterval(() => {
        fetchTasks(RW_currentProjectId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [RW_currentProjectId, fetchTasks]);

  const handleCreate = () => {
    if (RW_currentProjectId) {
      createTask(RW_currentProjectId, `Agent Task ${tasks.length + 1}`);
    }
  };

  const getStatusColor = (status: ClientBackgroundTask['status']) => {
    switch (status) {
      case 'running': return 'text-blue-400';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      case 'cancelled': return 'text-gray-500';
      default: return 'text-yellow-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#3c3c3c]">
      <div className="p-3 border-b border-[#3c3c3c] flex justify-between items-center bg-[#252526]">
        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <Activity size={16} /> Background Tasks
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={handleCreate}
            className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white transition-colors"
            title="Start Mock Agent Task"
          >
            <Play size={14} />
          </button>
          <button 
            onClick={() => RW_currentProjectId && fetchTasks(RW_currentProjectId)}
            className={`p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white transition-colors ${isLoading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center text-xs text-gray-500 mt-4">
            No active background tasks.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="bg-[#252526] rounded-md border border-[#3c3c3c] overflow-hidden">
                <div 
                  className="p-2 cursor-pointer hover:bg-[#2d2d2d] flex flex-col gap-1"
                  onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-300">{task.name}</span>
                    <span className={`text-[10px] uppercase font-bold ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-[#1e1e1e] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${task.status === 'failed' ? 'bg-red-500' : task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  
                  {task.status === 'running' && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-gray-500">{task.progress.toFixed(0)}%</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (RW_currentProjectId) cancelTask(RW_currentProjectId, task.id);
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors flex items-center justify-center p-0.5"
                        title="Cancel Task"
                      >
                        <Square size={12} fill="currentColor" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Expandable Logs */}
                {expandedTask === task.id && (
                  <div className="bg-[#1e1e1e] p-2 border-t border-[#3c3c3c] max-h-32 overflow-y-auto">
                    <div className="text-[10px] font-mono text-gray-400 flex flex-col gap-1">
                      {task.logs.length > 0 ? (
                        task.logs.map((log, i) => (
                          <div key={i} className="leading-snug break-all border-l-2 border-gray-700 pl-1">
                            {log}
                          </div>
                        ))
                      ) : (
                        <span className="italic">No logs yet...</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
