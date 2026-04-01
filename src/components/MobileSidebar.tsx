import React, { useState } from 'react';
import { 
  File, 
  Search, 
  Settings, 
  Key, 
  Plus, 
  Download, 
  ChevronDown, 
  ChevronRight, 
  X, 
  Terminal,
  FolderOpen,
  Sparkles,
  Zap,
  Layout,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileTree } from './FileTree';
import { SearchPanel } from './SearchPanel';
import { FileStore } from '../lib/fileStore';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  fileStore: FileStore;
  selectedFile: string | null;
  onSelectFile: (path: string, line?: number) => void;
  onDownloadFile: (path: string) => void;
  onDownloadZip: () => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (path: string) => void;
  onCreateFile: () => void;
  onFolderExpand?: (path: string) => void;
  onSaveAll: () => void;
  onNewSession: () => void;
  onShowKeyModal: () => void;
  onShowSettingsModal: () => void;
  onShowWorkspaceModal: () => void;
  onShowCommandPalette: () => void;
  model: string;
  onModelChange: (model: string) => void;
  isFilesystemMode: boolean;
  workspaceName: string;
}

export function MobileSidebar({
  isOpen,
  onClose,
  fileStore,
  selectedFile,
  onSelectFile,
  onDownloadFile,
  onDownloadZip,
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
  isFilesystemMode,
  workspaceName
}: MobileSidebarProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('files');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm sm:hidden"
        onClick={onClose}
      />
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 w-[85%] max-w-sm z-[110] bg-[#1e1e1e] sm:hidden flex flex-col shadow-2xl border-r border-[#3c3c3c]"
      >
        <div className="p-4 border-b border-[#3c3c3c] flex justify-between items-center bg-[#252526]">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#007acc]" />
            <span className="font-bold text-[#e5e5e5] text-lg tracking-tight">GIDE</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#3c3c3c] rounded-md transition-colors text-[#858585] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-1 custom-scrollbar">
          {/* Workspace Info (if applicable) */}
          {isFilesystemMode && (
            <div className="px-4 py-3 mb-2 mx-2 bg-[#252526] rounded-lg border border-[#3c3c3c]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider">Current Workspace</span>
                <button 
                  onClick={onShowWorkspaceModal}
                  className="text-[10px] text-[#007acc] hover:underline font-medium"
                >
                  Switch
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#cccccc] font-mono truncate">
                <FolderOpen className="w-4 h-4 text-[#007acc] shrink-0" />
                <span className="truncate">{workspaceName}</span>
              </div>
            </div>
          )}

          {/* Project Files Section */}
          <div className="border-b border-[#3c3c3c]/50">
            <button 
              onClick={() => toggleSection('files')}
              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[#2d2d2d] transition-colors ${expandedSection === 'files' ? 'bg-[#2d2d2d] text-white' : 'text-[#858585]'}`}
            >
              <div className="flex items-center gap-3">
                <File className="w-4 h-4" />
                <span className="text-sm font-medium">Project Files</span>
              </div>
              {expandedSection === 'files' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {expandedSection === 'files' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-[#1a1a1a]"
                >
                  <div className="max-h-[40vh] overflow-y-auto border-t border-[#3c3c3c]/30">
                    <FileTree
                      files={fileStore}
                      selectedFile={selectedFile}
                      onSelect={(path) => { onSelectFile(path); onClose(); }}
                      onDownload={onDownloadFile}
                      onDownloadZip={onDownloadZip}
                      onDelete={onDeleteFile}
                      onRename={onRenameFile}
                      onCreateFile={onCreateFile}
                      onFolderExpand={onFolderExpand}
                      showDetails={true}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search Section */}
          <div className="border-b border-[#3c3c3c]/50">
            <button 
              onClick={() => toggleSection('search')}
              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[#2d2d2d] transition-colors ${expandedSection === 'search' ? 'bg-[#2d2d2d] text-white' : 'text-[#858585]'}`}
            >
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4" />
                <span className="text-sm font-medium">Global Search</span>
              </div>
              {expandedSection === 'search' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {expandedSection === 'search' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-[#1a1a1a]"
                >
                  <div className="max-h-[40vh] overflow-y-auto border-t border-[#3c3c3c]/30">
                    <SearchPanel 
                      onSelectFile={(path, line) => {
                        onSelectFile(path);
                        // We need a way to pass the target line back to App.tsx
                        // For now, we'll assume the onSelectFile handles it or we'll need to update props
                        onClose();
                      }} 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Actions Section */}
          <div className="border-b border-[#3c3c3c]/50">
            <button 
              onClick={() => toggleSection('actions')}
              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[#2d2d2d] transition-colors ${expandedSection === 'actions' ? 'bg-[#2d2d2d] text-white' : 'text-[#858585]'}`}
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Quick Actions</span>
              </div>
              {expandedSection === 'actions' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {expandedSection === 'actions' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-[#1a1a1a] px-2 py-2 space-y-1"
                >
                  <button onClick={onShowCommandPalette} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#cccccc] hover:bg-[#3c3c3c] rounded-md transition-colors">
                    <Layout className="w-4 h-4 text-[#007acc]" />
                    Command Palette
                  </button>
                  <button onClick={onSaveAll} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#cccccc] hover:bg-[#3c3c3c] rounded-md transition-colors">
                    <Download className="w-4 h-4 text-green-500 rotate-180" />
                    Save All Files
                  </button>
                  <button onClick={onNewSession} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#cccccc] hover:bg-[#3c3c3c] rounded-md transition-colors">
                    <Plus className="w-4 h-4 text-blue-500" />
                    New Session
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Settings Section */}
          <div className="border-b border-[#3c3c3c]/50">
            <button 
              onClick={() => toggleSection('settings')}
              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[#2d2d2d] transition-colors ${expandedSection === 'settings' ? 'bg-[#2d2d2d] text-white' : 'text-[#858585]'}`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Settings & AI</span>
              </div>
              {expandedSection === 'settings' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {expandedSection === 'settings' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-[#1a1a1a] px-2 py-2 space-y-2"
                >
                  <div className="px-3 py-2 bg-[#252526] rounded-md border border-[#3c3c3c]">
                    <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider block mb-2">AI Model Selection</span>
                    <div className="grid grid-cols-3 gap-1">
                      {['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'].map(m => (
                        <button
                          key={m}
                          onClick={() => onModelChange(m)}
                          className={`px-1 py-1.5 text-[10px] rounded border transition-all ${model === m ? 'bg-[#007acc] border-[#007acc] text-white' : 'bg-[#1e1e1e] border-[#3c3c3c] text-[#858585]'}`}
                        >
                          {m.split('-').pop()?.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button onClick={onShowKeyModal} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#cccccc] hover:bg-[#3c3c3c] rounded-md transition-colors">
                    <Key className="w-4 h-4 text-[#007acc]" />
                    API Key Configuration
                  </button>
                  <button onClick={onShowSettingsModal} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#cccccc] hover:bg-[#3c3c3c] rounded-md transition-colors">
                    <Settings className="w-4 h-4 text-[#858585]" />
                    Editor Settings
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-4 border-t border-[#3c3c3c] bg-[#252526] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-[#858585] font-medium uppercase tracking-widest">Connected</span>
          </div>
          <span className="text-[10px] text-[#858585] font-mono">v1.2.0</span>
        </div>
      </motion.div>
    </>
  );
}
