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
        className="relative w-full max-w-2xl bg-surface-card border border-border-subtle rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center px-4 py-3 border-b border-border-subtle">
          <Search className="w-5 h-5 text-text-subtle mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search for files..."
            className="flex-1 bg-transparent text-text-primary text-base focus:outline-none"
          />
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-surface-base border border-border-subtle rounded text-[10px] text-text-subtle font-mono">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-text-subtle text-sm italic">
              No matching commands found
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => { item.action(); onClose(); }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  index === selectedIndex ? 'bg-accent-intel text-white' : 'hover:bg-surface-accent text-text-subtle'
                }`}
              >
                <div className={`${index === selectedIndex ? 'text-white' : 'text-text-subtle'}`}>
                  {item.icon}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium truncate">{item.label}</div>
                  <div className={`text-[10px] uppercase tracking-wider ${index === selectedIndex ? 'text-blue-100' : 'text-text-subtle'}`}>
                    {item.category}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 bg-surface-base border-t border-border-subtle flex items-center justify-between text-[10px] text-text-subtle">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><span className="px-1 bg-surface-accent rounded">↑↓</span> to navigate</span>
            <span className="flex items-center gap-1"><span className="px-1 bg-surface-accent rounded">Enter</span> to select</span>
            <span className="flex items-center gap-1"><span className="px-1 bg-surface-accent rounded">Esc</span> to close</span>
          </div>
          <div className="font-mono">RapidForge v1.0</div>
        </div>
      </motion.div>
    </div>
  );
}
