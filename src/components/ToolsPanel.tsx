import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Play, Trash2, AlertCircle, CheckCircle2, Loader2, ChevronRight, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { filesystemService } from '../lib/filesystemService';

interface ToolResult {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  success: boolean;
  timestamp: number;
}

export function ToolsPanel() {
  const [command, setCommand] = useState('');
  const [results, setResults] = useState<ToolResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results, isRunning]);

  const runCommand = async (cmd: string) => {
    if (!cmd.trim() || isRunning) return;
    
    setIsRunning(true);
    const newResult: ToolResult = {
      id: Math.random().toString(36).substring(2, 11),
      command: cmd,
      stdout: '',
      stderr: '',
      success: false,
      timestamp: Date.now()
    };

    try {
      const response = await filesystemService.runTool(cmd);
      setResults(prev => [...prev, { ...newResult, ...response }]);
    } catch (error: any) {
      setResults(prev => [...prev, { ...newResult, stderr: String(error), success: false }]);
    } finally {
      setIsRunning(false);
      setCommand('');
    }
  };

  const clearHistory = () => setResults([]);

  const commonTools = [
    { name: 'Lint', cmd: 'npm run lint' },
    { name: 'Test', cmd: 'npm test' },
    { name: 'List', cmd: 'ls -R' },
    { name: 'Check', cmd: 'npx tsc --noEmit' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-[#3c3c3c]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#007acc]" />
          <span className="text-xs font-bold text-[#cccccc] uppercase tracking-wider">Tools & Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          {commonTools.map(tool => (
            <button
              key={tool.name}
              onClick={() => runCommand(tool.cmd)}
              disabled={isRunning}
              className="px-2 py-1 text-[10px] font-bold bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4d4d4d] hover:text-white rounded transition-colors disabled:opacity-50"
            >
              {tool.name}
            </button>
          ))}
          <div className="w-px h-4 bg-[#3c3c3c] mx-1" />
          <button
            onClick={clearHistory}
            className="p-1 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
            title="Clear Output"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm custom-scrollbar bg-[#000000]/20"
      >
        {results.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full text-[#858585] opacity-50 space-y-2">
            <Command className="w-8 h-8" />
            <p className="text-xs">Run a tool or command to see output</p>
          </div>
        )}
        
        <div className="space-y-6">
          {results.map((res) => (
            <div key={res.id} className="space-y-2 group">
              <div className="flex items-center gap-2 text-xs">
                <ChevronRight className="w-3 h-3 text-[#007acc]" />
                <span className="text-[#007acc] font-bold">$ {res.command}</span>
                <span className="text-[#858585] text-[10px] ml-auto">
                  {new Date(res.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              {res.stdout && (
                <pre className="text-[#cccccc] whitespace-pre-wrap pl-5 border-l-2 border-[#3c3c3c] py-1">
                  {res.stdout}
                </pre>
              )}
              
              {res.stderr && (
                <pre className="text-red-400 whitespace-pre-wrap pl-5 border-l-2 border-red-900/50 py-1 bg-red-900/10">
                  {res.stderr}
                </pre>
              )}

              <div className="flex items-center gap-2 pl-5">
                {res.success ? (
                  <div className="flex items-center gap-1 text-[10px] text-green-500 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    COMPLETED SUCCESSFULLY
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                    <AlertCircle className="w-3 h-3" />
                    FAILED
                  </div>
                )}
              </div>
            </div>
          ))}

          {isRunning && (
            <div className="flex items-center gap-2 text-xs text-[#007acc] animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Running command...</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-[#252526] border-t border-[#3c3c3c]">
        <div className="relative flex items-center">
          <span className="absolute left-3 text-[#007acc] font-bold">$</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runCommand(command)}
            placeholder="Type a command (e.g. ls, npm test, grep...)"
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg pl-8 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#007acc] transition-all font-mono"
          />
        </div>
      </div>
    </div>
  );
}
