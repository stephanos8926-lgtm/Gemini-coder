import React from 'react';
import Editor from '@monaco-editor/react';
import { FolderTree } from 'lucide-react';

interface CodeEditorProps {
  content: string;
  filename: string;
  onOpenFiles?: () => void;
  onChange?: (value: string | undefined) => void;
}

export function CodeEditor({ content, filename, onOpenFiles, onChange }: CodeEditorProps) {
  if (!filename) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#858585] text-sm italic h-full">
        Select a file to view its contents
      </div>
    );
  }

  const getLanguage = (filename: string) => {
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
  };

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
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={getLanguage(filename)}
          theme="vs-dark"
          value={content}
          onChange={onChange}
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            folding: true,
            lineNumbers: 'on',
            renderWhitespace: 'none',
            wordWrap: 'on',
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
