import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Layers,
  Activity,
  GitBranch,
  Terminal,
  Play
} from 'lucide-react';
import { SwarmData, watchActiveSwarms } from '../lib/taskManager';

interface SwarmMonitorPanelProps {
  projectId?: string;
}

export function SwarmMonitorPanel({ projectId = 'default' }: SwarmMonitorPanelProps) {
  const [activeSwarms, setActiveSwarms] = useState<SwarmData[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    return watchActiveSwarms(projectId, (swarms) => {
      setActiveSwarms(swarms);
    });
  }, [projectId]);

  if (activeSwarms.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 w-80 z-50">
      <div className="bg-[#1a1a1a]/95 backdrop-blur-md rounded-xl border border-forge-ops/30 shadow-2xl overflow-hidden shadow-forge-ops/5">
        <div 
          className="px-4 py-2 bg-forge-ops/10 border-b border-forge-ops/20 flex items-center justify-between cursor-pointer hover:bg-forge-ops/20 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-forge-ops" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#e5e5e5]">
              Agent Swarms ({activeSwarms.length})
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
                {activeSwarms.map((swarm) => (
                  <SwarmItem key={swarm.id} swarm={swarm} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SwarmItem({ swarm }: { swarm: SwarmData }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'planning':
        return { icon: <Activity className="w-3 h-3" />, color: 'text-forge-intel', bg: 'bg-forge-intel/10' };
      case 'executing':
        return { icon: <Play className="w-3 h-3" />, color: 'text-forge-ops', bg: 'bg-forge-ops/10' };
      case 'merging':
        return { icon: <GitBranch className="w-3 h-3" />, color: 'text-indigo-400', bg: 'bg-indigo-400/10' };
      case 'completed':
        return { icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'failed':
        return { icon: <AlertCircle className="w-3 h-3" />, color: 'text-rose-500', bg: 'bg-rose-500/10' };
      default:
        return { icon: <Activity className="w-3 h-3" />, color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  const config = getStatusConfig(swarm.status);

  return (
    <div className="bg-[#252526] rounded-lg border border-[#333] p-3 shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <Terminal className="w-3 h-3 text-[#858585] shrink-0" />
          <span className="text-[10px] font-bold text-[#e5e5e5] truncate uppercase tracking-tighter">
            {swarm.originalPrompt.slice(0, 30)}...
          </span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${config.bg} ${config.color}`}>
          {config.icon}
          {swarm.status}
        </div>
      </div>

      {swarm.plan && (
        <div className="space-y-2">
          {swarm.plan.subtasks.map((task, idx) => (
            <div key={task.id} className="flex items-center gap-3">
              <div className="relative flex flex-col items-center">
                <div className={`w-1.5 h-1.5 rounded-full ${swarm.status === 'completed' ? 'bg-emerald-500' : 'bg-[#444]'}`} />
                {idx < swarm.plan!.subtasks.length - 1 && (
                  <div className="w-[1px] h-3 bg-[#333]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[#858585] truncate font-medium">{task.description}</span>
                  <span className="text-[8px] text-[#555] font-mono shrink-0">@{task.assignedAgent}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
