import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Cpu,
  Clock,
  CircleDashed
} from 'lucide-react';
import { TaskData, watchActiveTasks } from '../lib/taskManager';

interface TaskMonitorPanelProps {
  projectId?: string;
}

export function TaskMonitorPanel({ projectId = 'default' }: TaskMonitorPanelProps) {
  const [activeTasks, setActiveTasks] = useState<TaskData[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    return watchActiveTasks(projectId, (tasks) => {
      // Filter for single-agent background tasks
      setActiveTasks(tasks.filter(t => t.type === 'background'));
    });
  }, [projectId]);

  if (activeTasks.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-96 w-80 z-50">
      <div className="bg-[#1e1e1e]/95 backdrop-blur-md rounded-xl border border-[#333] shadow-2xl overflow-hidden">
        <div 
          className="px-4 py-2 bg-[#252526] border-b border-[#333] flex items-center justify-between cursor-pointer hover:bg-[#2d2d2d] transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-forge-ops" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#e5e5e5]">
              Active Tasks ({activeTasks.length})
            </span>
          </div>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#858585]" /> : <ChevronUp className="w-3.5 h-3.5 text-[#858585]" />}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                {activeTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: TaskData }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'queued':
        return { icon: <Clock className="w-3 h-3" />, color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case 'running':
        return { icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'text-forge-ops', bg: 'bg-forge-ops/10' };
      case 'completed':
        return { icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'failed':
        return { icon: <AlertCircle className="w-3 h-3" />, color: 'text-rose-500', bg: 'bg-rose-500/10' };
      default:
        return { icon: <CircleDashed className="w-3 h-3" />, color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  const config = getStatusConfig(task.status);

  return (
    <div className="bg-[#252526] rounded-lg border border-[#333] p-3 shadow-sm hover:border-[#444] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-medium text-[#cccccc] truncate">
            {task.prompt.slice(0, 40)}...
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${config.bg} ${config.color} shrink-0`}>
          {config.icon}
          <span className="text-[9px] font-bold uppercase tracking-wider">
            {task.status}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[9px] font-mono text-[#858585]">
          <span className="truncate pr-4">{task.currentStep}</span>
          <span>{Math.round(task.progress * 100)}%</span>
        </div>
        <div className="w-full bg-[#1e1e1e] h-1 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${task.progress * 100}%` }}
            className={`h-full ${task.status === 'failed' ? 'bg-rose-500' : 'bg-forge-ops'}`}
          />
        </div>
      </div>
    </div>
  );
}
