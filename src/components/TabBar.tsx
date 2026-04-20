import React from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const TabBar: React.FC = () => {
  const { openedFiles, activeFile, setActiveFile, closeFile } = useAppStore();

  if (openedFiles.length === 0) return null;

  return (
    <div className="flex bg-[#252526] h-9 border-b border-[#3c3c3c] overflow-x-auto no-scrollbar">
      {openedFiles.map((path) => {
        const fileName = path.split('/').pop() || path;
        const isActive = activeFile === path;
        
        return (
          <div
            key={path}
            className={`group flex items-center min-w-[120px] max-w-[200px] border-r border-[#3c3c3c] px-3 cursor-pointer text-sm
              ${isActive ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]' : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2d2d2d]/80'}`}
            onClick={() => setActiveFile(path)}
          >
            <span className="truncate flex-grow">{fileName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFile(path);
              }}
              className="ml-2 opacity-0 group-hover:opacity-100 hover:bg-[#404040] rounded-sm p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
