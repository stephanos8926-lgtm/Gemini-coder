import React from 'react';
import { Terminal, ShieldCheck, Cpu } from 'lucide-react';
import { APP_VERSION } from '../constants/version';

interface StatusBarProps {
  isTerminalVisible: boolean;
  onToggleTerminal: () => void;
  workspace: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isTerminalVisible, onToggleTerminal, workspace }) => {
  return (
    <div className="h-6 w-full bg-[#007acc] text-white flex items-center justify-between px-3 text-[10px] sm:text-[11px] font-medium select-none z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity cursor-default">
          <ShieldCheck className="w-3 h-3" />
          <span>v{APP_VERSION}</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity cursor-default">
          <div className="relative">
            <Cpu className="w-3 h-3" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse border border-[#007acc]" />
          </div>
          <span>System Healthy</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleTerminal}
          className={`flex items-center gap-1.5 transition-colors ${isTerminalVisible ? 'text-white' : 'text-white/70 hover:text-white'}`}
        >
          <Terminal className="w-3 h-3" />
          <span>Terminal: {isTerminalVisible ? 'Active' : 'Hidden'}</span>
        </button>
        <div className="opacity-90 uppercase tracking-wider">
          Workspace: {workspace || 'None'}
        </div>
      </div>
    </div>
  );
};
