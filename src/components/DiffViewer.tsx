import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { X, Check, ArrowLeft, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface DiffViewerProps {
  filename: string;
  originalContent: string;
  modifiedContent: string;
  onAccept: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function DiffViewer({
  filename,
  originalContent,
  modifiedContent,
  onAccept,
  onDiscard,
  onClose
}: DiffViewerProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 z-[110] flex flex-col bg-[#1e1e1e] border border-[#3c3c3c] shadow-2xl rounded-xl overflow-hidden m-2 sm:m-10"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[#252526] border-b border-[#3c3c3c] gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#007acc]/10 rounded-lg shrink-0">
            <FileText className="w-5 h-5 text-[#007acc]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white leading-none mb-1 truncate">Review Changes</h2>
            <p className="text-[10px] text-[#858585] font-mono truncate">{filename}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onDiscard}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs font-medium text-[#cccccc] hover:bg-[#3c3c3c] rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
            <span className="hidden xs:inline">Discard</span>
          </button>
          <button
            onClick={onAccept}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs font-medium bg-[#007acc] text-white hover:bg-[#0062a3] rounded-lg shadow-lg shadow-[#007acc]/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span className="hidden xs:inline">Apply</span>
          </button>
          <div className="hidden sm:block w-[1px] h-6 bg-[#3c3c3c] mx-2" />
          <button
            onClick={onClose}
            className="p-2 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <DiffEditor
          height="100%"
          original={originalContent}
          modified={modifiedContent}
          language={getLanguage(filename)}
          theme="vs-dark"
          options={{
            renderSideBySide: true,
            readOnly: true,
            originalEditable: false,
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            useInlineViewWhenSpaceIsLimited: true,
          }}
        />
      </div>

      <div className="px-6 py-3 bg-[#252526] border-t border-[#3c3c3c] flex items-center justify-between text-[10px] text-[#858585]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500/20 border border-red-500/30 rounded" />
            <span>Original</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500/20 border border-green-500/30 rounded" />
            <span>Modified</span>
          </div>
        </div>
        <div className="italic">Review the AI's suggestions before merging them into your workspace.</div>
      </div>
    </motion.div>
  );
}

function getLanguage(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    default:
      return 'plaintext';
  }
}
