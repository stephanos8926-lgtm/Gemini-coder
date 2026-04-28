import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Database, Zap } from 'lucide-react';
import { ForgeGuardTelemetryPanel } from './ForgeGuardTelemetryPanel';

export function DebugDashboard() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [graphSummary, setGraphSummary] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profiler' | 'graph' | 'logs' | 'telemetry'>('profiler');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profRes, graphRes] = await Promise.all([
          fetch('/api/debug/profiler/snapshots'),
          fetch('/api/context/graph')
        ]);
        
        const profData = await profRes.json();
        const graphData = await graphRes.json();
        
        setSnapshots(profData.snapshots || []);
        setGraphSummary(graphData.summary || '');
      } catch (e) {
        console.error('Failed to fetch debug data', e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const latest = snapshots[snapshots.length - 1];

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-bold uppercase tracking-wider">ForgeGuard Debugger</span>
        </div>
        <div className="flex gap-1 ml-auto">
          {(['profiler', 'graph', 'logs', 'telemetry'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${
                activeTab === tab ? 'bg-[#007acc] text-white' : 'hover:bg-[#2d2d2d] text-[#858585]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'profiler' && (
            <div className="space-y-6">
                 {/* ... Profiler UI ... */}
                 <div className="text-white">Profiler content</div>
            </div>
        )}
        {activeTab === 'telemetry' && <ForgeGuardTelemetryPanel />}
      </div>
    </div>
  );
}
