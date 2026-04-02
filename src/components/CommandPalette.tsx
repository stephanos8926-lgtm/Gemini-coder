import React, { useState, useEffect, useRef } from 'react';
import { Search, File, FolderOpen, Settings, Sparkles, X, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  action: () => void;
  category: 'Files' | 'Workspaces' | 'Actions' | 'Settings';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  files: string[];
  workspaces: string[];
  onSelectFile: (path: string) => void;
  onSelectWorkspace: (name: string) => void;
  onOpenSettings: () => void;
  onAiAction: (type: 'explain' | 'refactor' | 'fix', code?: string) => void;
  onGenerateReadme: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  files,
  workspaces,
  onSelectFile,
  onSelectWorkspace,
  onOpenSettings,
  onAiAction,
  onGenerateReadme
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    ...files.map((f, i) => ({
      id: `file-${f}-${i}`,
      icon: <File className="w-4 h-4 text-[#007acc]" />,
      label: f,
      category: 'Files' as const,
      action: () => onSelectFile(f)
    })),
    ...workspaces.map((w, i) => ({
      id: `ws-${w}-${i}`,
      icon: <FolderOpen className="w-4 h-4 text-amber-500" />,
      label: w.split('/').pop() || w,
      category: 'Workspaces' as const,
      action: () => onSelectWorkspace(w)
    })),
    {
      id: 'ai-explain',
      icon: <Sparkles className="w-4 h-4 text-blue-400" />,
      label: 'AI: Explain Current File',
      category: 'Actions' as const,
      action: () => onAiAction('explain')
    },
    {
      id: 'ai-refactor',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      label: 'AI: Refactor Current File',
      category: 'Actions' as const,
      action: () => onAiAction('refactor')
    },
    {
      id: 'generate-readme',
      icon: <Sparkles className="w-4 h-4 text-yellow-400" />,
      label: 'Generate README.md',
      category: 'Actions' as const,
      action: onGenerateReadme
    },
    {
      id: 'settings',
      icon: <Settings className="w-4 h-4 text-[#858585]" />,
      label: 'Open Settings',
      category: 'Settings' as const,
      action: onOpenSettings
    }
  ];

  const filteredItems = items.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10); // Limit results for performance

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    const selectedEl = scrollRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[5vh] sm:pt-[15vh] px-2 sm:px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="relative w-full max-w-2xl bg-[#252526] border border-[#454545] rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center px-4 py-3 border-b border-[#3c3c3c]">
          <Search className="w-5 h-5 text-[#858585] mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search for files..."
            className="flex-1 bg-transparent text-[#d4d4d4] text-base focus:outline-none"
          />
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[10px] text-[#858585] font-mono">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-[#858585] text-sm italic">
              No matching commands found
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => { item.action(); onClose(); }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  index === selectedIndex ? 'bg-[#007acc] text-white' : 'hover:bg-[#2d2d2d] text-[#cccccc]'
                }`}
              >
                <div className={`${index === selectedIndex ? 'text-white' : ''}`}>
                  {item.icon}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium truncate">{item.label}</div>
                  <div className={`text-[10px] uppercase tracking-wider ${index === selectedIndex ? 'text-blue-100' : 'text-[#858585]'}`}>
                    {item.category}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 bg-[#1e1e1e] border-t border-[#3c3c3c] flex items-center justify-between text-[10px] text-[#858585]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><span className="px-1 bg-[#2d2d2d] rounded">↑↓</span> to navigate</span>
            <span className="flex items-center gap-1"><span className="px-1 bg-[#2d2d2d] rounded">Enter</span> to select</span>
            <span className="flex items-center gap-1"><span className="px-1 bg-[#2d2d2d] rounded">Esc</span> to close</span>
          </div>
          <div className="font-mono">GIDE v1.0</div>
        </div>
      </motion.div>
    </div>
  );
}
