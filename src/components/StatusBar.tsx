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
    <div className="h-6 w-full bg-surface-card text-text-primary border-t border-border-subtle flex items-center justify-between px-3 text-[10px] sm:text-[11px] font-medium select-none z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity cursor-default">
          <ShieldCheck className="w-3 h-3 text-accent-ops" />
          <span>v{APP_VERSION}</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity cursor-default">
          <Cpu className="w-3 h-3 text-accent-intel" />
          <span>System Healthy</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleTerminal}
          aria-label={isTerminalVisible ? "Hide terminal" : "Show terminal"}
          className={`flex items-center gap-1.5 transition-colors focus-visible:ring-1 focus-visible:ring-accent-intel outline-none px-1 rounded ${isTerminalVisible ? 'text-accent-intel' : 'text-text-subtle hover:text-text-primary'}`}
        >
          <Terminal className="w-3 h-3" />
          <span>Terminal: {isTerminalVisible ? 'Active' : 'Hidden'}</span>
        </button>
        <div className="opacity-80 uppercase tracking-wider text-[9px]">
          Workspace: <span className="text-accent-intel">{workspace || 'None'}</span>
        </div>
      </div>
    </div>
  );
};
