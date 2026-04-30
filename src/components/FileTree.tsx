// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { File, Folder, FolderOpen, Download, Upload, Trash2, Edit2, FilePlus, Search, X, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { FileStore } from '../lib/fileStore';
import { FileIcon } from './FileIcon';

interface FileTreeProps {
  files: FileStore;
  selectedFile: string | null;
  workspaceName?: string;
  onSelect: (path: string) => void;
  onDownload: (path: string) => void;
  onDownloadZip: () => void;
  onImportZip: () => void;
  onDelete?: (path: string) => void;
  onRename?: (path: string) => void;
  onCreateFile?: () => void;
  onFolderExpand?: (path: string) => void;
  showDetails?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  path: string;
  isFile: boolean;
}

export function FileTree({ files, selectedFile, workspaceName, onSelect, onDownload, onDownloadZip, onImportZip, onDelete, onRename, onCreateFile, onFolderExpand, showDetails = false }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Persistence for expanded folders
  useEffect(() => {
    if (workspaceName) {
      const saved = localStorage.getItem(`expanded_folders_${workspaceName}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setExpandedFolders(new Set(parsed));
          }
        } catch (e) {
          console.error('Failed to load expanded folders', e);
        }
      } else {
        setExpandedFolders(new Set(['/']));
      }
    }
  }, [workspaceName]);

  useEffect(() => {
    if (workspaceName && expandedFolders.size > 0) {
      localStorage.setItem(`expanded_folders_${workspaceName}`, JSON.stringify(Array.from(expandedFolders)));
    }
  }, [expandedFolders, workspaceName]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFolder = (folder: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
      if (onFolderExpand) onFolderExpand(folder);
    }
    setExpandedFolders(newExpanded);
  };

  const handleContextMenu = (e: React.MouseEvent, path: string, isFile: boolean) => {
    e.preventDefault();
    // Ensure menu stays within viewport
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setContextMenu({
      x,
      y,
      path,
      isFile
    });
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast.success(`Path copied: ${path}`);
    setContextMenu(null);
  };

  // Build tree
  const tree: any = {};
  Object.keys(files).forEach(path => {
    if (!path || path === '/') return;
    const parts = path.split('/').filter(Boolean);
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        if (files[path].isDir) {
          if (!current[part]) current[part] = { _isDir: true };
        } else {
          current[part] = { _isFile: true, path };
        }
      } else {
        if (!current[part]) current[part] = { _isDir: true };
        current = current[part];
      }
    }
  });

  const matchesSearch = (name: string, path: string, isFile: boolean, node: any): boolean => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    
    // Check if the current node matches
    if (name.toLowerCase().includes(lowerQuery)) return true;
    
    // If it's a folder, check if any of its children match
    if (!isFile) {
      return Object.keys(node).some(key => {
        if (key.startsWith('_') || key === 'path') return false;
        const childIsFile = node[key]._isFile;
        const childPath = childIsFile ? node[key].path : `${path}${key}/`;
        return matchesSearch(key, childPath, childIsFile, node[key]);
      });
    }
    
    return false;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderTree = (node: any, pathPrefix: string = '', depth: number = 0) => {
    const sortedKeys = Object.keys(node).sort((a, b) => {
      if (a.startsWith('_') || a === 'path') return 1;
      if (b.startsWith('_') || b === 'path') return -1;
      
      const aIsFile = node[a]._isFile;
      const bIsFile = node[b]._isFile;
      if (aIsFile && !bIsFile) return 1;
      if (!aIsFile && bIsFile) return -1;
      return a.localeCompare(b);
    }).filter(key => {
      if (key.startsWith('_') || key === 'path') return false;
      const isFile = node[key]._isFile;
      const fullPath = isFile ? node[key].path : `${pathPrefix}${key}/`;
      return matchesSearch(key, fullPath, isFile, node[key]);
    });

    return (
      <AnimatePresence initial={false}>
        {sortedKeys.map(key => {
          const isFile = node[key]._isFile;
          const fullPath = isFile ? node[key].path : `${pathPrefix}${key}/`;
          const isExpanded = expandedFolders.has(fullPath) || depth === 0 || searchQuery !== ''; // auto expand if searching
          
          if (isFile) {
            const fileData = files[fullPath];
            return (
              <motion.div
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  backgroundColor: fileData.isNew 
                    ? ['rgba(74, 222, 128, 0.2)', 'rgba(0,0,0,0)'] 
                    : fileData.isModified 
                      ? ['rgba(96, 165, 250, 0.2)', 'rgba(0,0,0,0)'] 
                      : 'rgba(0,0,0,0)',
                  transitionEnd: { backgroundColor: '' }
                }}
                exit={{ opacity: 0, scale: 0.95, backgroundColor: 'rgba(248, 113, 113, 0.2)' }}
                transition={{ duration: 0.5 }}
                key={`file-${fullPath}`}
                className={`flex items-center justify-between group cursor-pointer hover:bg-[#2a2d2e] py-1 px-2 ${selectedFile === fullPath ? 'bg-[#37373d] text-white' : 'text-[#cccccc]'}`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => onSelect(fullPath)}
                onContextMenu={(e) => handleContextMenu(e, fullPath, true)}
              >
                <div className="flex items-center gap-2 truncate flex-1">
                  <FileIcon filename={key} className="w-4 h-4" />
                  <span className="truncate text-sm">{key}</span>
                  {showDetails && fileData.isNew && <span className="text-[10px] px-1 bg-green-900/50 text-green-400 rounded shrink-0">NEW</span>}
                  {showDetails && fileData.isModified && <span className="text-[10px] px-1 bg-blue-900/50 text-blue-400 rounded shrink-0">MODIFIED</span>}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {showDetails && <span className="text-[10px] text-[#858585] w-16 text-right tabular-nums">{formatSize(fileData.size || 0)}</span>}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDownload(fullPath); }}
                      className="p-1 hover:bg-[#4d4d4d] rounded text-[#cccccc] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007acc]"
                      title="Download file"
                      aria-label={`Download ${key}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {onRename && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRename(fullPath); }}
                        className="p-1 hover:bg-[#4d4d4d] rounded text-[#cccccc] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007acc]"
                        title="Rename file"
                        aria-label={`Rename ${key}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(fullPath); }}
                        className="p-1 hover:bg-red-900/50 rounded text-red-400 hover:text-red-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                        title="Delete file"
                        aria-label={`Delete ${key}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          } else {
            return (
              <motion.div layout key={`folder-${fullPath}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2d2e] py-1 px-2 text-[#cccccc]"
                  style={{ paddingLeft: `${depth * 12 + 8}px` }}
                  onClick={() => toggleFolder(fullPath)}
                  onContextMenu={(e) => handleContextMenu(e, fullPath, false)}
                >
                  {isExpanded ? <FolderOpen className="w-4 h-4 text-blue-300" /> : <Folder className="w-4 h-4 text-blue-300" />}
                  <span className="text-sm">{key}</span>
                </div>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {renderTree(node[key], fullPath, depth + 1)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }
        })}
      </AnimatePresence>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#252526] border-l border-[#3c3c3c] relative">
      <div className="flex flex-col border-b border-[#3c3c3c]">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-semibold text-[#cccccc] uppercase tracking-wider">Explorer</span>
          <div className="flex items-center gap-1">
            <button
              onClick={onImportZip}
              className="p-1 text-[#cccccc] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
              title="Import ZIP"
            >
              <Upload className="w-4 h-4" />
            </button>
            {onCreateFile && (
              <button
                onClick={onCreateFile}
                className="p-1 text-[#cccccc] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
                title="New File"
              >
                <FilePlus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onDownloadZip}
              className="p-1 text-[#007acc] hover:text-[#005f9e] hover:bg-[#3c3c3c] rounded transition-colors"
              title="Download ZIP"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="px-3 pb-2">
          <div className="relative group">
            <label htmlFor="file-search" className="sr-only">Search files</label>
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#858585] group-focus-within:text-[#007acc] transition-colors" aria-hidden="true" />
            <input
              id="file-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-md pl-8 pr-8 py-1 text-xs text-[#d4d4d4] focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007acc]"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center px-4 py-1 text-[10px] text-[#858585] border-b border-[#3c3c3c]">
          <span className="flex-1">Name</span>
          <span className="w-16 text-right">Size</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {Object.keys(files).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center space-y-3 opacity-50">
            <Folder className="w-8 h-8 text-[#858585]" />
            <div className="text-xs text-[#858585] italic">
              No files in this workspace.<br/>
              Create a file to get started.
            </div>
          </div>
        ) : (
          renderTree(tree)
        )}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            ref={menuRef}
            className="fixed z-[100] bg-[#252526] border border-[#454545] rounded-md shadow-xl py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => { onSelect(contextMenu.path); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#094771] hover:text-white transition-colors"
            >
              <FileIcon filename={contextMenu.path} className="w-4 h-4" />
              Open
            </button>
            <button
              onClick={() => copyPath(contextMenu.path)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#094771] hover:text-white transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Path
            </button>
            <div className="h-px bg-[#454545] my-1" />
            {onRename && (
              <button
                onClick={() => { onRename(contextMenu.path); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#094771] hover:text-white transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Rename
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => { onDelete(contextMenu.path); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <div className="h-px bg-[#454545] my-1" />
            <button
              onClick={() => { onDownload(contextMenu.path); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#094771] hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
