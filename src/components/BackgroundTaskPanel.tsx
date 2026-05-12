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
  Layers,
  Terminal,
  BrainCircuit,
  Pause,
  Play,
  XCircle,
  Filter,
  ArrowUpDown,
  History,
  Info,
  Clock,
  Calendar,
  MoreVertical,
  ChevronRight,
  ShieldQuestion
} from 'lucide-react';
import { TaskData, watchActiveTasks, cancelTask, pauseTask, resumeTask, TaskLog } from '../lib/taskManager';

interface BackgroundTaskPanelProps {
  projectId?: string;
}

export function BackgroundTaskPanel({ projectId = 'default' }: BackgroundTaskPanelProps) {
  const [activeTasks, setActiveTasks] = useState<TaskData[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'status' | 'progress' | 'prompt' | 'createdAt'>('createdAt');

  useEffect(() => {
    return watchActiveTasks(projectId, (tasks) => {
      setActiveTasks(tasks);
    });
  }, [projectId]);

  const filteredTasks = activeTasks
    .filter(task => filter === 'all' || task.status === filter)
    .sort((a, b) => {
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      if (sortBy === 'progress') return (b.progress || 0) - (a.progress || 0);
      if (sortBy === 'prompt') return (a.prompt || '').localeCompare(b.prompt || '');
      if (sortBy === 'createdAt') return (b.createdAt || 0) - (a.createdAt || 0);
      return 0;
    });

  if (activeTasks.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 w-80 z-50">
      <div className="bg-[#252526] rounded-xl border border-[#3c3c3c] shadow-2xl overflow-hidden flex flex-col max-h-[600px]">
        <div 
          className="px-4 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center justify-between cursor-pointer hover:bg-[#333] transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-forge-ops" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#e5e5e5]">
              Forge Swarm ({filteredTasks.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
             {activeTasks.length > filteredTasks.length && (
               <span className="text-[8px] text-forge-ops font-bold bg-forge-ops/10 px-1 rounded">Filtered</span>
             )}
             {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#858585]" /> : <ChevronUp className="w-3.5 h-3.5 text-[#858585]" />}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="flex flex-col min-h-0"
            >
              {/* Controls */}
              <div className="px-3 py-2 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <Filter className="w-3 h-3 text-[#858585] shrink-0" />
                  {['all', 'running', 'queued', 'completed', 'failed'].map(f => (
                    <button
                      key={f}
                      onClick={(e) => { e.stopPropagation(); setFilter(f); }}
                      className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter transition-all ${
                        filter === f ? 'bg-forge-ops text-white' : 'bg-[#2a2d2e] text-[#858585] hover:text-[#e5e5e5]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-[#858585]" />
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-[8px] font-bold text-[#858585] outline-none cursor-pointer focus:text-forge-ops uppercase tracking-tighter"
                  >
                    <option value="createdAt">Date</option>
                    <option value="status">Status</option>
                    <option value="progress">Progress</option>
                    <option value="prompt">Name</option>
                  </select>
                </div>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                {filteredTasks.length === 0 ? (
                  <div className="py-8 text-center">
                    <Boxes className="w-8 h-8 text-[#333] mx-auto mb-2 opacity-20" />
                    <p className="text-[10px] text-[#666] font-medium">No tasks match filter</p>
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: TaskData }) {
  const [showLogs, setShowLogs] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const handleReview = async () => {
    setIsReviewing(true);
    try {
      const response = await fetch('/api/tasks/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id })
      });
      const data = await response.json();
      alert(`Agent Review for ${task.id}:\n\n${data.recommendation}`);
    } catch (e) {
      console.error('Review failed', e);
    } finally {
      setIsReviewing(false);
    }
  };

  const statusConfig: Record<string, { icon: any, color: string, bg: string, border: string, animate?: boolean }> = {
    running: { icon: Loader2, color: 'text-forge-ops', bg: 'bg-forge-ops/10', border: 'border-forge-ops/30', animate: true },
    completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    queued: { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    paused: { icon: Pause, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30' }
  };

  const config = statusConfig[task.status] || statusConfig.queued;
  const StatusIcon = config.icon;

  const formatDate = (ts?: any) => {
    if (!ts) return null;
    let d: Date;
    if (ts && typeof ts === 'object' && 'seconds' in ts) {
      d = new Date(ts.seconds * 1000);
    } else {
      d = new Date(ts);
    }
    
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className={`bg-[#1e1e1e] rounded-lg border ${config.border} p-3 shadow-md transition-all hover:bg-[#252526]`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className={`p-1.5 ${config.bg} rounded-md shrink-0`}>
            <StatusIcon className={`w-3.5 h-3.5 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0 pr-2">
            <div 
              className="flex items-center gap-1 cursor-pointer group"
              onClick={() => setShowFullPrompt(!showFullPrompt)}
            >
              <span className={`text-[10px] font-bold text-[#e5e5e5] truncate uppercase tracking-tighter ${showFullPrompt ? 'whitespace-normal line-clamp-none' : 'line-clamp-1'}`}>
                {task.prompt}
              </span>
              <Info className="w-2.5 h-2.5 text-[#666] group-hover:text-forge-ops shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[8px] font-medium text-[#666] flex items-center gap-1">
                <Calendar className="w-2 h-2" />
                {formatDate(task.createdAt)}
              </span>
              {task.completedAt && (
                 <span className="text-[8px] font-medium text-[#666] flex items-center gap-1">
                  <CheckCircle2 className="w-2 h-2 text-green-500/50" />
                  {formatDate(task.completedAt)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={`text-[8px] font-black uppercase ${config.bg} ${config.color} px-2 py-0.5 rounded-full tracking-widest border border-white/5`}>
          {task.status}
        </div>
      </div>

      <div className="space-y-1.5 mt-3">
        <div className="flex items-center justify-between text-[9px] font-mono text-[#858585]">
          <span className="truncate max-w-[70%]">{task.currentStep || 'Initializing...'}</span>
          <span className="font-bold text-forge-ops">{Math.round(task.progress * 100)}%</span>
        </div>
        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${task.progress * 100}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className={`h-full ${task.status === 'failed' ? 'bg-red-500' : 'bg-forge-ops'} shadow-[0_0_8px_rgba(25,118,210,0.5)]`}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[#2a2d2e]">
        <button 
          onClick={() => setShowLogs(!showLogs)}
          className={`flex items-center gap-1 text-[8px] font-bold transition-colors ${showLogs ? 'text-forge-ops' : 'text-[#858585] hover:text-[#e5e5e5]'}`}
        >
          <Terminal className="w-2.5 h-2.5" />
          {showLogs ? 'Hide Logs' : 'View Logs'}
        </button>
        <button 
          onClick={handleReview}
          disabled={isReviewing}
          className="flex items-center gap-1 text-[8px] font-bold text-forge-ops hover:brightness-125 transition-colors disabled:opacity-50"
        >
          <BrainCircuit className="w-2.5 h-2.5" />
          {isReviewing ? 'Analyzing...' : 'Agent Review'}
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {task.status === 'running' ? (
            <button onClick={() => pauseTask(task.id)} className="p-1 hover:bg-[#333] rounded transition-colors group">
              <Pause className="w-3 h-3 text-[#858585] group-hover:text-yellow-500" />
            </button>
          ) : (task.status === 'failed' || task.status === 'paused') ? (
             <button onClick={() => resumeTask(task.id)} className="p-1 hover:bg-[#333] rounded transition-colors group">
              <Play className="w-3 h-3 text-[#858585] group-hover:text-green-500" />
            </button>
          ) : null}
          <button onClick={() => cancelTask(task.id)} className="p-1 hover:bg-red-900/20 rounded transition-colors group">
            <XCircle className="w-3 h-3 text-[#858585] group-hover:text-red-500" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 text-[8px] font-mono bg-black/60 border border-white/5 rounded-md p-2 text-[#888] max-h-48 overflow-y-auto custom-scrollbar shadow-inner"
          >
            {task.logs && task.logs.length > 0 ? (
              task.logs.map((log, idx) => (
                <div key={idx} className="flex gap-2 mb-1 leading-relaxed border-l border-white/5 pl-2">
                  <span className="text-[#555] shrink-0">[{formatDate(log.timestamp)}]</span>
                  <span className={`uppercase font-bold shrink-0 ${
                    log.level === 'error' ? 'text-red-500' : 
                    log.level === 'warn' ? 'text-yellow-500' : 
                    log.level === 'debug' ? 'text-blue-500' : 'text-green-500/50'
                  }`}>
                    {log.level}
                  </span>
                  <span className="text-[#ccc] break-all">{log.message}</span>
                </div>
              ))
            ) : (
              <div className="italic text-[#444] text-center py-2">No execution logs available yet...</div>
            )}
            {task.status === 'running' && (
              <div className="flex gap-2 animate-pulse mt-1 pl-2 border-l border-forge-ops/30">
                 <span className="text-forge-ops/50">[{formatDate(Date.now())}]</span>
                 <span className="text-forge-ops font-bold">INFO</span>
                 <span className="text-forge-ops/80 italic">Streaming active telemetry payload...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
