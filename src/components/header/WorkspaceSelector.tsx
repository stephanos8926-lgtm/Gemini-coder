import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';

interface WorkspaceSelectorProps {
  workspaceName: string;
  onShowWorkspaceModal: () => void;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  workspaceName,
  onShowWorkspaceModal
}) => {
  return (
    <div className="hidden sm:flex items-center gap-2">
      <button
        onClick={onShowWorkspaceModal}
        id="header-workspace-select-btn"
        aria-label="Select workspace"
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-base hover:bg-surface-accent border border-border-subtle rounded-md transition-all group focus-visible:ring-1 focus-visible:ring-accent-intel outline-none"
      >
        <FolderOpen className="w-3.5 h-3.5 text-accent-intel group-hover:scale-110 transition-transform" />
        <span className="text-xs font-medium text-text-primary group-hover:text-white">
          {workspaceName ? workspaceName.split('/').pop() : 'Select Workspace'}
        </span>
      </button>
      
      <button
        onClick={onShowWorkspaceModal}
        id="header-new-workspace-btn"
        aria-label="New workspace"
        className="p-1.5 text-text-subtle hover:text-text-primary hover:bg-surface-accent rounded-md transition-all focus-visible:ring-1 focus-visible:ring-accent-intel outline-none"
        title="New Workspace"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
