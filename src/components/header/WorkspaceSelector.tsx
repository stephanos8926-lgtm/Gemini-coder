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
        className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#3c3c3c] border border-[#3c3c3c] rounded-md transition-all group"
      >
        <FolderOpen className="w-3.5 h-3.5 text-[#007acc] group-hover:scale-110 transition-transform" />
        <span className="text-xs font-medium text-[#cccccc] group-hover:text-white">
          {workspaceName ? workspaceName.split('/').pop() : 'Select Workspace'}
        </span>
      </button>
      
      <button
        onClick={onShowWorkspaceModal}
        id="header-new-workspace-btn"
        className="p-1.5 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-all"
        title="New Workspace"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
