import React from 'react';
import { X } from 'lucide-react';
import { useFileStore } from '../store/useFileStore';

export const TabBar: React.FC = () => {
  const { RW_openFiles, RW_activeFile, setActiveFile, closeFile } = useFileStore();

  if (RW_openFiles.length === 0) return null;

  return (
    <div className="flex bg-surface-card h-10 border-b border-border-subtle overflow-x-auto no-scrollbar scroll-smooth">
      {RW_openFiles.map((path) => {
        const fileName = path.split('/').pop() || path;
        const isActive = RW_activeFile === path;
        
        return (
          <div
            key={path}
            className={`group flex items-center min-w-[140px] max-w-[240px] border-r border-border-subtle px-4 cursor-pointer text-[13px] relative transition-all duration-200 focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-accent-intel outline-none
              ${isActive ? 'bg-surface-base text-text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-accent-intel' : 'bg-surface-card text-text-subtle hover:bg-surface-accent'}`}
            onClick={() => setActiveFile(path)}
            onKeyDown={(e) => e.key === 'Enter' && setActiveFile(path)}
            tabIndex={0}
            role="tab"
            aria-selected={isActive}
          >
            <span className="truncate flex-grow py-2.5 font-medium">{fileName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFile(path);
              }}
              aria-label={`Close ${fileName}`}
              className="ml-2 opacity-0 group-hover:opacity-100 hover:bg-surface-accent rounded-md p-1 transition-opacity focus-visible:ring-1 focus-visible:ring-accent-intel outline-none"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
