import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useChatStore } from '../../store/useChatStore';
import { type Settings } from '../../lib/settingsStore';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { TaskPanel } from './TaskPanel';

const ChatPanel = lazy(() => import('../ChatPanel').then(m => ({ default: m.ChatPanel })));

const PanelLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#1e1e1e] text-[#858585] gap-3">
    <div className="p-2 bg-[#007acc]/10 rounded-xl border border-[#007acc]/20 animate-pulse">
      <div className="w-6 h-6 rounded-full border-2 border-[#007acc] border-t-transparent animate-spin" />
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Hydrating Panel</span>
  </div>
);

interface RightSidebarProps {
  settings: Settings;
  onSendMessage: (msg: string) => Promise<void>;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  settings,
  onSendMessage
}) => {
  const { RW_messages, RW_isStreaming, setMessages } = useChatStore();

  return (
    <ErrorBoundary name="AI Chat">
      <PanelGroup orientation="vertical" id="forge-right-sidebar">
        <Panel defaultSize={70} minSize={30}>
          <div className="h-full bg-[#252526]">
            <Suspense fallback={<PanelLoader />}>
              <ChatPanel
                messages={RW_messages}
                onSendMessage={onSendMessage}
                onNewChat={() => setMessages([])}
                isStreaming={RW_isStreaming}
                settings={settings}
              />
            </Suspense>
          </div>
        </Panel>
        
        <PanelResizeHandle className="h-[1px] bg-[#3c3c3c] hover:bg-[#007acc] transition-colors z-20" />
        
        <Panel defaultSize={30} minSize={15}>
          <div className="h-full bg-[#252526]">
            <TaskPanel />
          </div>
        </Panel>
      </PanelGroup>
    </ErrorBoundary>
  );
};
