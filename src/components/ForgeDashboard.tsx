import React, { useState } from 'react';
import { Shield, BrainCircuit, Activity, BarChart3 } from 'lucide-react';
import { SecurityDashboard } from './SecurityDashboard';
import { ContextDashboard } from './ContextDashboard';

type Tab = 'security' | 'context' | 'operations';

export function ForgeDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('security');

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] font-sans">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1 px-4 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
        <button
          onClick={() => setActiveTab('security')}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === 'security' ? 'bg-[#007acc] text-white' : 'hover:bg-[#2d2d2d] text-[#858585]'
          }`}
        >
          <Shield className="w-3 h-3" />
          Security
        </button>
        <button
          onClick={() => setActiveTab('context')}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === 'context' ? 'bg-forge-intel text-white' : 'hover:bg-[#2d2d2d] text-[#858585]'
          }`}
        >
          <BrainCircuit className="w-3 h-3" />
          Intel
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === 'operations' ? 'bg-forge-ops text-white' : 'hover:bg-[#2d2d2d] text-[#858585]'
          }`}
        >
          <Activity className="w-3 h-3" />
          Ops
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'security' && <SecurityDashboard />}
        {activeTab === 'context' && <ContextDashboard />}
        {activeTab === 'operations' && (
          <div className="flex flex-col items-center justify-center h-full text-[#858585] p-8 text-center">
            <BarChart3 className="w-12 h-12 mb-4 opacity-10" />
            <h3 className="text-sm font-bold text-[#e5e5e5] mb-2 uppercase tracking-widest text-forge-ops">Operational Telemetry</h3>
            <p className="text-[11px] max-w-[250px] leading-relaxed">
              Tracking swarm node performance, token velocity, and cost attribution. 
              <span className="block mt-2 font-mono text-forge-ops/60 italic font-normal">Telemetric stream initializing...</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
