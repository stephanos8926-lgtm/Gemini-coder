import React, { useState } from 'react';
import { File, Folder, FolderOpen, Download, FileJson, FileCode2, FileImage, FileText, Trash2, Edit2, FilePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileStore } from '../lib/fileStore';

interface FileTreeProps {
  files: FileStore;
  selectedFile: string | null;
  onSelect: (path: string) => void;
  onDownload: (path: string) => void;
  onDownloadZip: () => void;
  onDelete?: (path: string) => void;
  onRename?: (path: string) => void;
  onCreateFile?: () => void;
  showDetails?: boolean;
}

export function FileTree({ files, selectedFile, onSelect, onDownload, onDownloadZip, onDelete, onRename, onCreateFile, showDetails = false }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));

  const toggleFolder = (folder: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setExpandedFolders(newExpanded);
  };

  const getIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'json': return <FileJson className="w-4 h-4 text-yellow-400" />;
      case 'js': case 'ts': case 'jsx': case 'tsx': return <FileCode2 className="w-4 h-4 text-blue-400" />;
      case 'html': case 'css': return <FileCode2 className="w-4 h-4 text-orange-400" />;
      case 'png': case 'jpg': case 'jpeg': case 'svg': return <FileImage className="w-4 h-4 text-purple-400" />;
      case 'md': case 'txt': return <FileText className="w-4 h-4 text-gray-400" />;
      default: return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  // Build tree
  const tree: any = {};
  Object.keys(files).forEach(path => {
    const parts = path.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = { _isFile: true, path };
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
  });

  const renderTree = (node: any, pathPrefix: string = '', depth: number = 0) => {
    return (
      <AnimatePresence initial={false}>
        {Object.keys(node).sort((a, b) => {
          if (a === '_isFile' || a === 'path') return 1;
          if (b === '_isFile' || b === 'path') return -1;
          
          const aIsFile = node[a]._isFile;
          const bIsFile = node[b]._isFile;
          if (aIsFile && !bIsFile) return 1;
          if (!aIsFile && bIsFile) return -1;
          return a.localeCompare(b);
        }).map(key => {
          if (key === '_isFile' || key === 'path') return null;
          
          const isFile = node[key]._isFile;
          const fullPath = isFile ? node[key].path : `${pathPrefix}${key}/`;
          const isExpanded = expandedFolders.has(fullPath) || depth === 0; // auto expand root
          
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
                key={fullPath}
                className={`flex items-center justify-between group cursor-pointer hover:bg-[#2a2d2e] py-1 px-2 ${selectedFile === fullPath ? 'bg-[#37373d] text-white' : 'text-[#cccccc]'}`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => onSelect(fullPath)}
              >
                <div className="flex items-center gap-2 truncate">
                  {getIcon(key)}
                  <span className="truncate text-sm">{key}</span>
                  {showDetails && fileData.isNew && <span className="text-[10px] px-1 bg-green-900/50 text-green-400 rounded">NEW</span>}
                  {showDetails && fileData.isModified && <span className="text-[10px] px-1 bg-blue-900/50 text-blue-400 rounded">MODIFIED</span>}
                </div>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {showDetails && <span className="text-xs text-[#858585] mr-2">{fileData.size}B</span>}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDownload(fullPath); }}
                    className="p-1 hover:bg-[#4d4d4d] rounded text-[#cccccc] hover:text-white"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {onRename && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRename(fullPath); }}
                      className="p-1 hover:bg-[#4d4d4d] rounded text-[#cccccc] hover:text-white"
                      title="Rename file"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(fullPath); }}
                      className="p-1 hover:bg-red-900/50 rounded text-red-400 hover:text-red-300"
                      title="Delete file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          } else {
            return (
              <motion.div layout key={fullPath} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2d2e] py-1 px-2 text-[#cccccc]"
                  style={{ paddingLeft: `${depth * 12 + 8}px` }}
                  onClick={() => toggleFolder(fullPath)}
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
    <div className="flex flex-col h-full bg-[#252526] border-l border-[#3c3c3c]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#3c3c3c]">
        <span className="text-xs font-semibold text-[#cccccc] uppercase tracking-wider">Explorer</span>
        <div className="flex items-center gap-1">
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
      <div className="flex-1 overflow-y-auto py-2">
        {Object.keys(files).length === 0 ? (
          <div className="px-4 text-sm text-[#858585] italic">No files yet</div>
        ) : (
          renderTree(tree)
        )}
      </div>
    </div>
  );
}
