import React, { useEffect, useRef } from 'react';
import { FolderTree } from 'lucide-react';

interface CodeEditorProps {
  content: string;
  filename: string;
  onOpenFiles?: () => void;
}

export function CodeEditor({ content, filename, onOpenFiles }: CodeEditorProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current && window.hljs) {
      // Remove previous highlighting classes
      codeRef.current.className = '';
      
      // Try to determine language from extension
      const ext = filename.split('.').pop() || '';
      if (ext) {
        codeRef.current.classList.add(`language-${ext}`);
      }
      
      window.hljs.highlightElement(codeRef.current);
    }
  }, [content, filename]);

  if (!filename) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#858585] text-sm italic h-full">
        Select a file to view its contents
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
      <div className="flex items-center px-4 py-2 bg-[#252526] border-b border-[#3c3c3c] text-sm text-[#d4d4d4]">
        {onOpenFiles && (
          <button 
            onClick={onOpenFiles}
            className="sm:hidden mr-3 p-1.5 hover:bg-[#3c3c3c] rounded-md transition-colors text-[#858585] hover:text-[#d4d4d4] flex items-center gap-1.5"
          >
            <FolderTree className="w-4 h-4" />
            <span>Files</span>
          </button>
        )}
        <span className="font-mono">{filename}</span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="m-0">
          <code ref={codeRef} className="font-mono text-sm leading-relaxed">
            {content}
          </code>
        </pre>
      </div>
    </div>
  );
}

// Add type definition for global hljs
declare global {
  interface Window {
    hljs: any;
  }
}
