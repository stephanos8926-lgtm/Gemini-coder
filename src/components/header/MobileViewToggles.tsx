import React from 'react';
import { Sparkles, Code2, Play } from 'lucide-react';

interface MobileViewTogglesProps {
  mobileView: 'chat' | 'editor' | 'preview';
  setMobileView: (view: 'chat' | 'editor' | 'preview') => void;
}

export const MobileViewToggles: React.FC<MobileViewTogglesProps> = ({
  mobileView,
  setMobileView
}) => {
  return (
    <div className="flex sm:hidden items-center gap-1 bg-surface-base p-1 rounded-lg border border-border-subtle mr-1">
      <button
        onClick={() => setMobileView('chat')}
        id="mobile-view-chat-btn"
        aria-label="Chat view"
        className={`p-1.5 rounded transition-all focus-visible:ring-1 focus-visible:ring-accent-intel outline-none ${mobileView === 'chat' ? 'bg-accent-intel text-white' : 'text-text-subtle'}`}
        title="Chat View"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setMobileView('editor')}
        id="mobile-view-editor-btn"
        aria-label="Editor view"
        className={`p-1.5 rounded transition-all focus-visible:ring-1 focus-visible:ring-accent-intel outline-none ${mobileView === 'editor' ? 'bg-accent-intel text-white' : 'text-text-subtle'}`}
        title="Editor View"
      >
        <Code2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setMobileView('preview')}
        id="mobile-view-preview-btn"
        aria-label="Preview view"
        className={`p-1.5 rounded transition-all focus-visible:ring-1 focus-visible:ring-accent-intel outline-none ${mobileView === 'preview' ? 'bg-accent-intel text-white' : 'text-text-subtle'}`}
        title="Preview View"
      >
        <Play className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
