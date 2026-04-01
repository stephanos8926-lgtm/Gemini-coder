import React, { useState, useEffect } from 'react';
import { Folder, Plus, X, Search, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { filesystemService } from '../lib/filesystemService';

interface WorkspaceModalProps {
  onClose: () => void;
  onSelect: (name: string) => void;
  currentWorkspace: string;
}

export function WorkspaceModal({ onClose, onSelect, currentWorkspace }: WorkspaceModalProps) {
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newWorkspace, setNewWorkspace] = useState('');

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const list = await filesystemService.listWorkspaces();
      setWorkspaces(list);
    } catch (e) {
      console.error('Failed to load workspaces', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newWorkspace.trim()) return;
    onSelect(newWorkspace.trim());
    onClose();
  };

  const filtered = workspaces.filter(w => w.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#252526] border border-[#454545] sm:rounded-xl shadow-2xl w-full h-full sm:h-auto max-w-md overflow-hidden flex flex-col max-h-full sm:max-h-[80vh]"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#3c3c3c] bg-[#2d2d2d]">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-[#007acc]" />
            <h2 className="text-base sm:text-lg font-semibold text-white">Workspaces</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#3c3c3c] rounded-md text-[#858585] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* Create Workspace */}
          <div className="space-y-2">
            <label className="text-[10px] sm:text-xs font-semibold text-[#858585] uppercase tracking-wider">Create New Workspace</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newWorkspace}
                onChange={(e) => setNewWorkspace(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Workspace name..."
                className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded-md px-3 py-2 text-sm text-[#d4d4d4] focus:outline-none focus:border-[#007acc] transition-all"
              />
              <button
                onClick={handleCreate}
                disabled={!newWorkspace.trim()}
                className="px-4 py-2 bg-[#007acc] hover:bg-[#005f9e] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create
              </button>
            </div>
          </div>

          {/* Search & List */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[10px] sm:text-xs font-semibold text-[#858585] uppercase tracking-wider">Existing Workspaces</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#858585]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full sm:w-auto bg-[#1e1e1e] border border-[#3c3c3c] rounded-md pl-8 pr-3 py-1.5 sm:py-1 text-xs text-[#d4d4d4] focus:outline-none focus:border-[#007acc]"
                />
              </div>
            </div>

            <div className="space-y-1 min-h-[200px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#858585] gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#007acc]" />
                  <span className="text-sm">Loading workspaces...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#858585] border-2 border-dashed border-[#3c3c3c] rounded-lg">
                  <Folder className="w-8 h-8 mb-2 opacity-20" />
                  <span className="text-sm italic">No workspaces found</span>
                </div>
              ) : (
                filtered.map(name => (
                  <button
                    key={name}
                    onClick={() => onSelect(name)}
                    className={`w-full flex items-center justify-between group px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all ${
                      currentWorkspace === name 
                        ? 'bg-[#094771] text-white border border-[#007acc]' 
                        : 'bg-[#2d2d2d] hover:bg-[#37373d] text-[#cccccc] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Folder className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${currentWorkspace === name ? 'text-blue-300' : 'text-[#007acc]'}`} />
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    {currentWorkspace === name && (
                      <span className="text-[9px] sm:text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Active</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-[#2d2d2d] border-t border-[#3c3c3c] flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-[#cccccc] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
