import React, { useState, useEffect } from 'react';
import { AlertCircle, Terminal, Cpu, Database, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export function ForgeGuardTelemetryPanel() {
  const [signals, setSignals] = useState<any[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const res = await fetch('/api/debug/forgeguard/signals');
        const data = await res.json();
        setSignals(data.signals || []);
      } catch (e) {
        console.error('Failed to fetch signals', e);
      }
    };
    fetchSignals();
    const interval = setInterval(fetchSignals, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredSignals = signals.filter(s => 
    (severityFilter === 'all' || s.signal.type === severityFilter) &&
    (sourceFilter === 'all' || s.signal.source === sourceFilter)
  );

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[#333] bg-[#252526]">
        <Filter className="w-4 h-4 text-[#858585]" />
        <select 
          className="bg-[#2d2d2d] text-[10px] p-1 rounded" 
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="all">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <span className="text-[10px] font-bold text-[#858585]">({filteredSignals.length} signals)</span>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {filteredSignals.map((s, i) => (
          <div key={i} className="bg-[#2d2d2d] p-3 rounded-lg border border-[#333] text-xs font-mono">
            <div className="flex justify-between mb-1">
              <span className={`px-1 rounded ${s.signal.type === 'error' ? 'bg-red-500/20 text-red-400' : 'text-blue-400'}`}>
                {s.signal.type.toUpperCase()}
              </span>
              <span className="text-[#858585]">{new Date(s.timestamp).toLocaleTimeString()}</span>
            </div>
            <div>{typeof s.signal.payload === 'string' ? s.signal.payload : JSON.stringify(s.signal.payload)}</div>
            {s.signal.context && <div className="text-gray-500 mt-1">{JSON.stringify(s.signal.context)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
