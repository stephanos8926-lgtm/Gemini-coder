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
    <div className="hidden md:flex items-center gap-1 bg-surface-base p-1 rounded-lg border border-border-subtle">
      {RW_MODELS.map((m) => (
        <button
          key={m.id}
          onClick={() => setModel(m.id)}
          id={`model-select-${m.id.replace(/[^a-z0-9]/gi, '-')}`}
          aria-label={`Use ${m.name}`}
          className={`px-2 py-1 rounded text-[10px] font-bold transition-all focus-visible:ring-1 focus-visible:ring-accent-intel outline-none ${model === m.id ? 'bg-accent-intel text-white' : 'text-text-subtle hover:text-text-primary'}`}
        >
          {m.name.split(' ').pop()?.toUpperCase()}
        </button>
      ))}
      
      <div className="w-px h-3 bg-border-subtle mx-1" />
      
      <button
        onClick={onShowMcpModal}
        id="header-mcp-btn"
        aria-label="Manage MCP servers"
        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all focus-visible:ring-1 focus-visible:ring-accent-intel outline-none ${showMcpModal ? 'bg-accent-intel text-white' : 'text-text-subtle hover:text-text-primary'}`}
      >
        <SettingsIcon className="w-3 h-3" />
        <span className="hidden md:inline">MCP</span>
      </button>
    </div>
  );
};
