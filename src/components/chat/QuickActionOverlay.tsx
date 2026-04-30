import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ChevronRight, Wand2 } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useFileStore } from '../../store/useFileStore';
import { suggestionService } from '../../lib/suggestionService';

interface QuickActionOverlayProps {
  onAction: (suggestion: string) => void;
  isVisible: boolean;
}

export const QuickActionOverlay: React.FC<QuickActionOverlayProps> = ({ onAction, isVisible }) => {
  const { RW_messages, RW_quickActions, setQuickActions } = useChatStore();
  const { RW_activeFile } = useFileStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && RW_quickActions.length === 0) {
      refreshSuggestions();
    }
  }, [isVisible]);

  const refreshSuggestions = async () => {
    setLoading(true);
    try {
      const suggestions = await suggestionService.generateSuggestions(RW_messages, RW_activeFile);
      setQuickActions(suggestions);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="mx-4 bg-surface-card border border-border-subtle rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2 bg-surface-accent/30 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent-intel" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">Quick Actions</span>
            </div>
            <button 
              onClick={refreshSuggestions}
              disabled={loading}
              className="p-1 hover:bg-surface-accent rounded-md transition-colors disabled:opacity-50"
            >
              <Wand2 className={`w-3 h-3 text-text-subtle ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {RW_quickActions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onAction(suggestion)}
                className="flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-accent rounded-lg group transition-all duration-200"
              >
                <ChevronRight className="w-3 h-3 text-border-subtle group-hover:text-accent-intel transition-colors" />
                <span className="text-xs text-text-primary group-hover:translate-x-0.5 transition-transform truncate">
                  {suggestion}
                </span>
              </button>
            ))}
            {RW_quickActions.length === 0 && !loading && (
              <div className="col-span-2 py-4 text-center text-xs text-text-subtle italic">
                No suggestions available. Click the wand to generate.
              </div>
            )}
            {loading && RW_quickActions.length === 0 && (
              <div className="col-span-2 py-4 flex flex-col items-center gap-2">
                <div className="w-4 h-4 border-2 border-accent-intel border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-subtle animate-pulse">Analyzing System...</span>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
