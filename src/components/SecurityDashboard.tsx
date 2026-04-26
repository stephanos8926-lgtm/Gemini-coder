import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Search, RefreshCw, Filter, Zap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SecurityIssue {
  file: string;
  path?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'info';
  priority?: 'high' | 'medium' | 'low';
  type: string;
  line?: number;
}

export function SecurityDashboard() {
  const [issues, setIssues] = useState<SecurityIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  const fetchIssues = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/security/audit');
      const data = await res.json();
      setIssues(data.issues || []);
      setLastScan(new Date());
    } catch (e) {
      console.error('Failed to fetch security issues', e);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    const interval = setInterval(fetchIssues, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-forge-security bg-forge-security/10 border-forge-security/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-forge-ops bg-forge-ops/10 border-forge-ops/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-forge-intel" />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Security Ops Center</span>
          {isScanning && <RefreshCw className="w-3 h-3 animate-spin text-forge-intel ml-2" />}
        </div>
        <div className="flex items-center gap-4">
           <div className="text-[9px] text-[#858585] font-medium uppercase tracking-widest">
            Last Scan: {lastScan ? lastScan.toLocaleTimeString() : 'Never'}
          </div>
          <button 
            onClick={fetchIssues}
            disabled={isScanning}
            className="p-1 px-2 hover:bg-[#3c3c3c] rounded-md transition-all text-[#858585] hover:text-white flex items-center gap-1 border border-transparent hover:border-[#3c3c3c]"
          >
            <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
            <span className="text-[9px] font-bold uppercase text-forge-intel">Audit Now</span>
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-4 gap-4 p-4 shrink-0">
        <div className="bg-[#252526] p-3 rounded-xl border border-[#3c3c3c] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-[#858585] uppercase tracking-wider">Total Threats</span>
            <AlertTriangle className="w-3 h-3 text-forge-security" />
          </div>
          <div className="text-xl font-mono font-bold text-forge-security/80">{issues.length}</div>
        </div>
        <div className="bg-[#252526] p-3 rounded-xl border border-[#3c3c3c] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-[#858585] uppercase tracking-wider">Safe Files</span>
            <CheckCircle className="w-3 h-3 text-forge-ops" />
          </div>
          <div className="text-xl font-mono font-bold text-forge-ops/80">98%</div>
        </div>
        <div className="bg-[#252526] p-3 rounded-xl border border-[#3c3c3c] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-[#858585] uppercase tracking-wider">Auto-Healed</span>
            <Zap className="w-3 h-3 text-forge-intel" />
          </div>
          <div className="text-xl font-mono font-bold text-forge-intel/80">12</div>
        </div>
        <div className="bg-[#252526] p-3 rounded-xl border border-[#3c3c3c] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-[#858585] uppercase tracking-wider">Reputation</span>
            <Activity className="w-3 h-3 text-forge-ops" />
          </div>
          <div className="text-xl font-mono font-bold text-forge-ops/80">A+</div>
        </div>
      </div>


      {/* Issues List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="bg-[#252526] rounded-xl border border-[#3c3c3c] overflow-hidden shadow-sm">
          <div className="px-3 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#858585]">Active Vulnerabilities</span>
            <Filter className="w-3 h-3 text-[#858585] cursor-pointer hover:text-white transition-colors" />
          </div>
          
          <div className="divide-y divide-[#333]">
            {issues.length > 0 ? (
              issues.map((issue, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={idx} 
                  className="p-3 flex items-start gap-3 hover:bg-[#2d2d2d] transition-colors group cursor-pointer"
                >
                  <div className={`mt-0.5 p-1 rounded border ${getPriorityColor(issue.severity || issue.priority || 'low')}`}>
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-[#e5e5e5] truncate tracking-tight">{issue.message}</span>
                      <span className="px-1.5 py-0.5 bg-[#3c3c3c] text-[#858585] text-[8px] font-bold uppercase rounded tracking-widest">{issue.type || 'Security'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#858585]">
                      <Search className="w-2.5 h-2.5" />
                      <span className="truncate group-hover:text-forge-intel transition-colors">{issue.file || issue.path}</span>
                      {issue.line && <span className="opacity-50">:{issue.line}</span>}
                    </div>
                  </div>
                  <button className="hidden group-hover:flex items-center gap-1 px-2 py-1 bg-forge-intel/10 border border-forge-intel/30 text-forge-intel rounded text-[9px] font-bold uppercase tracking-widest hover:bg-forge-intel/20 transition-all">
                    <Zap className="w-2.5 h-2.5" />
                    Fix
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-full mb-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-sm font-bold text-[#e5e5e5] mb-1">System Clean</h3>
                <p className="text-[11px] text-[#858585] max-w-[200px]">No active vulnerabilities detected in the current workspace.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
