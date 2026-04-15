import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Database, Layout, AlertTriangle, Terminal, Zap, Search } from 'lucide-react';
import { motion } from 'motion/react';

export function DebugDashboard() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [graphSummary, setGraphSummary] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profiler' | 'graph' | 'logs'>('profiler');

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
          {(['profiler', 'graph', 'logs'] as const).map(tab => (
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
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#252526] p-4 rounded-xl border border-[#333] shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-[#858585]">
                  <Database className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Memory Usage</span>
                </div>
                <div className="text-2xl font-mono text-[#007acc]">
                  {latest ? Math.round(latest.memory.rss / 1024 / 1024) : 0} MB
                </div>
              </div>
              <div className="bg-[#252526] p-4 rounded-xl border border-[#333] shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-[#858585]">
                  <Cpu className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Event Loop Delay</span>
                </div>
                <div className="text-2xl font-mono text-[#4ec9b0]">
                  {latest ? latest.eventLoopDelay : 0} ms
                </div>
              </div>
              <div className="bg-[#252526] p-4 rounded-xl border border-[#333] shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-[#858585]">
                  <Activity className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Active Handles</span>
                </div>
                <div className="text-2xl font-mono text-[#ce9178]">
                  {latest ? latest.activeHandles : 0}
                </div>
              </div>
            </div>

            <div className="bg-[#252526] rounded-xl border border-[#333] overflow-hidden">
              <div className="px-4 py-2 bg-[#2d2d2d] border-b border-[#333] flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#858585]">Real-time Telemetry</span>
                {latest?.eventLoopDelay > 50 && (
                  <div className="flex items-center gap-1 text-red-500 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase">Performance Warning</span>
                  </div>
                )}
              </div>
              <div className="p-4 h-48 flex items-end gap-1">
                {snapshots.slice(-40).map((s, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-[#007acc]/30 rounded-t-sm hover:bg-[#007acc] transition-colors cursor-help"
                    style={{ height: `${Math.min(100, (s.eventLoopDelay / 100) * 100)}%` }}
                    title={`Delay: ${s.eventLoopDelay}ms`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'graph' && (
          <div className="bg-[#252526] p-4 rounded-xl border border-[#333] font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
            {graphSummary || 'Generating symbol graph...'}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
             <div className="bg-[#252526] p-4 rounded-xl border border-[#333] flex items-center justify-center text-[#858585] italic text-xs">
               Log stream integrated with main terminal. Use "Fix with AI" for deep analysis.
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
