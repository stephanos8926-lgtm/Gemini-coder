import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, AlertTriangle, Info, Clock, Terminal } from 'lucide-react';
import { format } from 'date-fns';

interface Signal {
  id: number;
  timestamp: number;
  signal: {
    type: string;
    source: string;
    payload: any;
    priority?: string;
    context?: any;
  };
}

export const ForgeGuardSignals: React.FC = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignals = async () => {
    try {
      const res = await fetch('/api/telemetry/stats');
      const data = await res.json();
      setSignals(data.signals || []);
    } catch (err) {
      console.error('Failed to fetch signals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL': return 'text-red-500 border-red-500/20 bg-red-500/5';
      case 'HIGH': return 'text-orange-500 border-orange-500/20 bg-orange-500/5';
      case 'LOW': return 'text-blue-400 border-blue-400/20 bg-blue-400/5';
      default: return 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5';
    }
  };

  const getIcon = (type: string) => {
    if (type.toLowerCase().includes('error')) return <AlertTriangle size={14} />;
    if (type.toLowerCase().includes('action')) return <Terminal size={14} />;
    return <Activity size={14} />;
  };

  return (
    <div className="bg-[#2d2d2d] rounded-lg border border-[#3c3c3c] overflow-hidden flex flex-col h-[500px]">
      <div className="px-4 py-3 border-b border-[#3c3c3c] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-[#007acc]" />
          <h2 className="text-sm font-bold tracking-tight text-[#cccccc] uppercase">
            Live ForgeGuard Signals
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#858585]">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Real-time Telemetry
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs">
        {loading && signals.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#858585]">
            <Clock className="animate-spin mr-2" size={14} />
            Initializing telemetry stream...
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {signals.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded border ${getPriorityColor(s.signal.priority)}`}
              >
                <div className="flex items-center justify-between mb-1.5 border-b border-current/10 pb-1">
                  <div className="flex items-center gap-2">
                    {getIcon(s.signal.type)}
                    <span className="font-bold uppercase">{s.signal.type}</span>
                  </div>
                  <span className="opacity-50 text-[10px]">
                    {format(s.timestamp, 'HH:mm:ss.SSS')}
                  </span>
                </div>
                
                <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-0.5 mt-1 border-l-2 border-current/20 pl-2">
                  <span className="opacity-50 uppercase text-[9px]">Source:</span>
                  <span className="truncate">{s.signal.source}</span>
                  
                  <span className="opacity-50 uppercase text-[9px]">Payload:</span>
                  <div className="max-h-24 overflow-y-auto whitespace-pre-wrap break-all pr-2">
                    {typeof s.signal.payload === 'string' 
                      ? s.signal.payload 
                      : JSON.stringify(s.signal.payload, null, 1)}
                  </div>

                  {s.signal.context && (
                    <>
                      <span className="opacity-50 uppercase text-[9px]">Context:</span>
                      <span className="truncate opacity-80 italic">
                        {JSON.stringify(s.signal.context)}
                      </span>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      
      <div className="px-4 py-2 border-t border-[#3c3c3c] bg-[#252526] flex justify-between items-center text-[10px] text-[#858585]">
        <span>Persistence: SQLite (wal-mode)</span>
        <span>{signals.length} Active Signals</span>
      </div>
    </div>
  );
};
