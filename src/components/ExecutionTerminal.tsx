import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal as TerminalIcon, 
  Play, 
  Loader2, 
  XCircle, 
  Trash2,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface ExecutionTerminalProps {
  code: string;
  language: string;
  onClose?: () => void;
}

export function ExecutionTerminal({ code, language, onClose }: ExecutionTerminalProps) {
  const [output, setOutput] = useState<{ stdout?: string; stderr?: string; error?: string; exitCode?: number } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runCode = async () => {
    setIsRunning(true);
    setOutput(null);
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      });
      const result = await res.json();
      setOutput(result);
    } catch (err: any) {
      setOutput({ error: err.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] text-forge-ops font-mono select-text">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-[#858585]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#858585]">
            Execution Sandbox: {language}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1 bg-forge-ops/10 hover:bg-forge-ops/20 text-forge-ops rounded text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            {isRunning ? 'Executing...' : 'Run'}
          </button>
          <button 
            onClick={() => setOutput(null)}
            className="p-1 hover:bg-[#333] rounded text-[#858585] transition-all"
            title="Clear Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-rose-500/20 text-[#858585] hover:text-rose-500 rounded transition-all">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {!output && !isRunning && (
          <div className="flex items-center gap-2 text-[#555] italic text-xs animate-pulse">
            <ChevronRight className="w-3.5 h-3.5" />
            Ready for execution...
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {output && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {output.stdout && (
                <div className="whitespace-pre-wrap text-emerald-400/90 text-xs leading-relaxed animate-in fade-in slide-in-from-bottom-1">
                  {output.stdout}
                </div>
              )}
              
              {output.stderr && (
                <div className="whitespace-pre-wrap text-amber-400/90 text-xs flex gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {output.stderr}
                </div>
              )}

              {output.error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs flex gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {output.error}
                </div>
              )}

              {output.exitCode !== undefined && (
                <div className="pt-2 border-t border-[#333] text-[10px] text-[#555] uppercase tracking-tighter">
                  Process finished with exit code {output.exitCode}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {isRunning && (
          <div className="flex items-center gap-3 text-forge-ops text-xs italic">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Spawning process...
          </div>
        )}
      </div>
    </div>
  );
}
