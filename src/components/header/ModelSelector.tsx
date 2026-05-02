import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { RW_MODELS } from '../../constants/app';

interface ModelSelectorProps {
  model: string;
  setModel: (model: string) => void;
  onShowMcpModal: () => void;
  showMcpModal: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  model,
  setModel,
  onShowMcpModal,
  showMcpModal
}) => {
  return (
    <div className="hidden md:flex items-center gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-[#3c3c3c]">
      {RW_MODELS.map((m) => (
        <button
          key={m.id}
          onClick={() => setModel(m.id)}
          id={`model-select-${m.id.replace(/[^a-z0-9]/gi, '-')}`}
          className={`px-2 py-1 rounded text-[10px] font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-intel focus-visible:outline-none ${model === m.id ? 'bg-accent-intel text-white' : 'text-text-subtle hover:text-text-primary hover:bg-surface-accent'}`}
          aria-label={`Select model ${m.name}`}
          aria-pressed={model === m.id}
        >
          {m.name.split(' ').pop()?.toUpperCase()}
        </button>
      ))}
      
      <div className="w-px h-3 bg-[#3c3c3c] mx-1" />
      
      <button
        onClick={onShowMcpModal}
        id="header-mcp-btn"
        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-intel focus-visible:outline-none ${showMcpModal ? 'bg-accent-intel text-white' : 'text-text-subtle hover:text-text-primary hover:bg-surface-accent'}`}
        aria-label="Model Context Protocol Settings"
      >
        <SettingsIcon className="w-3 h-3" />
        <span className="hidden md:inline">MCP</span>
      </button>
    </div>
  );
};
