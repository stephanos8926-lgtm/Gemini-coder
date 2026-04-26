import React, { useState, useEffect } from 'react';
import { Database, FileCode, Tag, Network, Search, Cpu, BrainCircuit, ChevronRight, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface SymbolEntry {
  name: string;
  kind: string;
  file: string;
  type?: string;
  line: number;
}

export function ContextDashboard() {
  const [symbols, setSymbols] = useState<SymbolEntry[]>([]);
  const [indexStats, setIndexStats] = useState({ files: 0, symbols: 0, embeddings: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const fetchContextData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/context/stats');
      const data = await res.json();
      setSymbols(data.recentSymbols || []);
      setIndexStats(data.stats || { files: 0, symbols: 0, embeddings: 0 });
    } catch (e) {
      console.error('Failed to fetch context data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContextData();
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-forge-intel" />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Semantic Knowledge Base</span>
          {isLoading && <Activity className="w-3 h-3 animate-spin text-forge-intel ml-2" />}
        </div>
        <button 
          onClick={fetchContextData}
          className="p-1 px-2 hover:bg-[#3c3c3c] rounded-md transition-all text-[#858585] hover:text-white border border-transparent hover:border-[#3c3c3c]"
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-forge-intel">Refresh Index</span>
        </button>
      </div>

      {/* Persistence / Swarm Health Indicators */}
      <div className="px-4 py-3 bg-forge-intel/5 border-b border-[#3c3c3c] flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm" />
          <span className="text-[10px] font-bold text-[#858585] uppercase tracking-tighter">Vector Cache: <span className="text-white">Active (SQLite)</span></span>
        </div>
        <div className="flex items-center gap-2 opacity-50">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-sm" />
          <span className="text-[10px] font-bold text-[#858585] uppercase tracking-tighter">Swarm Sync: <span className="text-white">Standby</span></span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Stats & Status */}
        <div className="w-64 border-r border-[#3c3c3c] flex flex-col p-4 gap-4 overflow-y-auto">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#858585] uppercase mb-1">
              <span>Coverage</span>
              <span className="text-white font-mono">{indexStats.files} Files</span>
            </div>
            <div className="w-full bg-[#3c3c3c] h-1 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '85%' }}
                className="h-full bg-forge-intel" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="bg-[#252526] p-3 rounded-lg border border-[#3c3c3c]">
               <div className="flex items-center gap-2 text-[#858585] mb-1">
                <Tag className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase">Symbols Indexed</span>
              </div>
              <div className="text-lg font-mono text-white">{indexStats.symbols}</div>
            </div>
            <div className="bg-[#252526] p-3 rounded-lg border border-[#3c3c3c]">
               <div className="flex items-center gap-2 text-[#858585] mb-1">
                <Network className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase">Graph Nodes</span>
              </div>
              <div className="text-lg font-mono text-white">{indexStats.symbols * 1.5 | 0}</div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="bg-forge-intel/10 border border-forge-intel/30 rounded-lg p-3 text-[10px] leading-relaxed text-forge-intel">
              <div className="flex items-center gap-1 font-bold uppercase mb-1">
                <Cpu className="w-3 h-3 text-forge-intel" />
                Optimization Tip
              </div>
              Semantic search is currently biased towards active tabs. Add files to workspace context for cross-file intel.
            </div>
          </div>
        </div>

        {/* Right: Symbols Explorer */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between">
            <div className="flex items-center gap-2">
               <FileCode className="w-3.5 h-3.5 text-[#858585]" />
               <span className="text-[10px] font-bold uppercase text-[#858585]">Global Symbol Table</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#858585]" />
              <input 
                type="text" 
                placeholder="Search symbols..."
                className="bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[10px] pl-6 pr-2 py-1 focus:outline-none focus:border-forge-intel w-40"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#333]">
            {symbols.length > 0 ? (
              symbols.map((sym, idx) => (
                <div key={idx} className="px-4 py-2 hover:bg-[#252526] transition-colors flex items-center justify-between group cursor-pointer">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-forge-intel">{sym.name}</span>
                      <span className="text-[8px] px-1 bg-[#3c3c3c] text-[#858585] font-bold uppercase rounded tracking-widest">{sym.type || sym.kind}</span>
                    </div>
                    <div className="text-[9px] text-[#858585] truncate font-mono mt-0.5">
                      {sym.file.split('/').pop()}:{sym.line}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#858585] opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#858585]">
                <Database className="w-8 h-8 opacity-20 mb-3" />
                <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Index is Empty</div>
                <div className="text-[10px] max-w-[180px]">Scan workspace to populate the semantic index for AI context.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
