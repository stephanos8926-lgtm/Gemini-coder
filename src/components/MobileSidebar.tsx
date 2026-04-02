import React, { useState } from 'react';
import { X, Download, Upload, FilePlus, Settings, Key, Search, FolderOpen, Plus, ChevronDown, ChevronRight, GitBranch, Terminal, Zap, CheckCircle2 } from 'lucide-react';
import { FileTree } from './FileTree';
import { FileStore } from '../lib/fileStore';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  fileStore: FileStore;
  selectedFile: string | null;
  onSelectFile: (path: string, line?: number) => void;
  onDownloadFile: (path: string) => void;
  onDownloadZip: () => void;
  onImportZip: () => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string) => void;
  onCreateFile: () => void;
  onFolderExpand: (path: string) => void;
  onSaveAll: () => void;
  onNewSession: () => void;
  onShowKeyModal: () => void;
  onShowSettingsModal: () => void;
  onShowWorkspaceModal: () => void;
  onShowCommandPalette: () => void;
  model: string;
  onModelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  workspaceName: string;
}

export function MobileSidebar({
  onClose,
  fileStore,
  selectedFile,
  onSelectFile,
  onDownloadFile,
  onDownloadZip,
  onImportZip,
  onDeleteFile,
  onRenameFile,
  onCreateFile,
  onFolderExpand,
  onSaveAll,
  onNewSession,
  onShowKeyModal,
  onShowSettingsModal,
  onShowWorkspaceModal,
  onShowCommandPalette,
  model,
  onModelChange,
  workspaceName
}: MobileSidebarProps) {
  const [isProjectFilesOpen, setIsProjectFilesOpen] = useState(true);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#252526] border-b border-[#3c3c3c] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-[#007acc]">&gt;_</span>
          <span className="font-bold text-lg text-[#e5e5e5]">GIDE</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-[#3c3c3c] rounded">
          <X className="w-5 h-5 text-[#858585]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Current Workspace */}
        <div className="p-4 border-b border-[#3c3c3c]">
          <div className="text-[10px] font-bold text-[#858585] uppercase tracking-widest mb-2">CURRENT WORKSPACE</div>
          <div className="flex items-center justify-between bg-[#252526] p-3 rounded-lg border border-[#3c3c3c]">
            <div className="flex items-center gap-2 text-[#007acc]">
              <FolderOpen className="w-4 h-4" />
              <span className="text-sm truncate">{workspaceName ? workspaceName.split('/').pop() : 'Default'}</span>
            </div>
            <button onClick={onShowWorkspaceModal} className="text-xs text-[#007acc] hover:underline">Switch</button>
          </div>
        </div>

        {/* Project Files */}
        <div className="border-b border-[#3c3c3c]">
          <button 
            onClick={() => setIsProjectFilesOpen(!isProjectFilesOpen)}
            className="flex items-center justify-between w-full p-4 hover:bg-[#252526]"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-[#e5e5e5]">
              <FilePlus className="w-4 h-4" /> Project Files
            </div>
            {isProjectFilesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {isProjectFilesOpen && (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#858585] uppercase tracking-widest">EXPLORER</span>
                <div className="flex gap-2">
                  <button onClick={onCreateFile} className="p-1 hover:bg-[#3c3c3c] rounded"><FilePlus className="w-4 h-4 text-[#858585]" /></button>
                  <button onClick={onDownloadZip} className="p-1 hover:bg-[#3c3c3c] rounded"><Download className="w-4 h-4 text-[#858585]" /></button>
                </div>
              </div>
              <input type="text" placeholder="Search files..." className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-sm mb-2" />
              <FileTree
                files={fileStore}
                selectedFile={selectedFile}
                workspaceName={workspaceName}
                onSelect={onSelectFile}
                onDownload={onDownloadFile}
                onDownloadZip={onDownloadZip}
                onImportZip={onImportZip}
                onDelete={onDeleteFile}
                onRename={onRenameFile}
                onCreateFile={onCreateFile}
                onFolderExpand={onFolderExpand}
                showDetails={true}
              />
            </div>
          )}
        </div>

        {/* Other Sections */}
        <button onClick={onShowCommandPalette} className="flex items-center gap-3 w-full p-4 hover:bg-[#252526] border-b border-[#3c3c3c]">
          <Search className="w-4 h-4 text-[#858585]" /> <span className="text-sm">Global Search</span>
        </button>
        <button onClick={onShowCommandPalette} className="flex items-center gap-3 w-full p-4 hover:bg-[#252526] border-b border-[#3c3c3c]">
          <Zap className="w-4 h-4 text-[#858585]" /> <span className="text-sm">Quick Actions</span>
        </button>
        <button onClick={onShowSettingsModal} className="flex items-center gap-3 w-full p-4 hover:bg-[#252526] border-b border-[#3c3c3c]">
          <Settings className="w-4 h-4 text-[#858585]" /> <span className="text-sm">Settings & AI</span>
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#3c3c3c] bg-[#252526] flex items-center justify-between text-[10px] text-[#858585]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" /> CONNECTED
        </div>
        <div>v1.2.0</div>
      </div>
    </div>
  );
}
