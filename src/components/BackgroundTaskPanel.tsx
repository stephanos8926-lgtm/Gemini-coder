import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Boxes,
  Cpu,
  Layers
} from 'lucide-react';
import { watchTask, TaskData, watchActiveTasks } from '../lib/taskManager';

interface BackgroundTaskPanelProps {
  projectId?: string;
}

export function BackgroundTaskPanel({ projectId = 'default' }: BackgroundTaskPanelProps) {
  const [activeTasks, setActiveTasks] = useState<TaskData[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    return watchActiveTasks(projectId, (tasks) => {
      setActiveTasks(tasks);
    });
  }, [projectId]);

  if (activeTasks.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 w-80 z-50">
      <div className="bg-[#252526] rounded-xl border border-[#3c3c3c] shadow-2xl overflow-hidden">
        <div 
          className="px-4 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center justify-between cursor-pointer hover:bg-[#333] transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-forge-ops" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#e5e5e5]">
              Forge Swarm ({activeTasks.length})
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
              <div className="p-3 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
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
  return (
    <div className="bg-[#1e1e1e] rounded-lg border border-[#333] p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 bg-forge-ops/10 rounded">
            <Cpu className="w-3 h-3 text-forge-ops" />
          </div>
          <span className="text-[10px] font-bold text-[#858585] truncate uppercase tracking-tighter">
            {task.prompt.slice(0, 30)}...
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {task.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-forge-ops" />}
          <span className="text-[9px] font-bold uppercase bg-[#2a2d2e] px-1.5 py-0.5 rounded text-[#858585] tracking-widest">
            {task.status}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[9px] font-mono text-[#858585]">
          <span>{task.currentStep}</span>
          <span>{Math.round(task.progress * 100)}%</span>
        </div>
        <div className="w-full bg-[#2a2d2e] h-1 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${task.progress * 100}%` }}
            className="h-full bg-forge-ops" 
          />
        </div>
      </div>
    </div>
  );
}
