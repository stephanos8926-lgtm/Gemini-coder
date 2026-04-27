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
    <div className="flex sm:hidden items-center gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-[#3c3c3c] mr-1">
      <button
        onClick={() => setMobileView('chat')}
        id="mobile-view-chat-btn"
        className={`p-1.5 rounded transition-all ${mobileView === 'chat' ? 'bg-[#007acc] text-white' : 'text-[#858585]'}`}
        title="Chat View"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setMobileView('editor')}
        id="mobile-view-editor-btn"
        className={`p-1.5 rounded transition-all ${mobileView === 'editor' ? 'bg-[#007acc] text-white' : 'text-[#858585]'}`}
        title="Editor View"
      >
        <Code2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setMobileView('preview')}
        id="mobile-view-preview-btn"
        className={`p-1.5 rounded transition-all ${mobileView === 'preview' ? 'bg-[#007acc] text-white' : 'text-[#858585]'}`}
        title="Preview View"
      >
        <Play className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
