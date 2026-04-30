import React, { Suspense, lazy } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { TabBar } from '../TabBar';
import { BottomPanel } from '../BottomPanel';
import { ErrorBoundary } from '../ErrorBoundary';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { DiffStagingPanel } from './DiffStagingPanel';
import { useAppStore } from '../../store/useAppStore';
import { useFileStore } from '../../store/useFileStore';
import { type Settings } from '../../lib/settingsStore';

const CodeEditor = lazy(() => import('../CodeEditor').then(m => ({ default: m.CodeEditor })));

const PanelLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#1e1e1e] text-[#858585] gap-3">
    <div className="w-6 h-6 rounded-full border-2 border-[#007acc] border-t-transparent animate-spin" />
    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Hydrating Panel</span>
  </div>
);

interface MainLayoutProps {
  settings: Settings;
  showTerminal: boolean;
  onSendMessage: (msg: string) => Promise<void>;
  onDownloadFile: (path: string) => void;
  onDownloadZip: () => void;
  onDeleteFile: (path: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  settings,
  showTerminal,
  onSendMessage,
  onDownloadFile,
  onDownloadZip,
  onDeleteFile
}) => {
  const { isLeftSidebarOpen, isRightSidebarOpen, activeBottomTab, setActiveBottomTab } = useAppStore();
  const { RW_fileStore, RW_activeFile, setActiveFile, RW_openFiles } = useFileStore();

  return (
    <div className="hidden sm:flex flex-1 h-full overflow-hidden">
      {/* @ts-ignore */}
      <PanelGroup orientation="horizontal" id="forge-layout-horizontal">
        {/* Left Sidebar */}
        {isLeftSidebarOpen && (
          <>
            <Panel defaultSize={15} minSize={10} maxSize={30}>
              <LeftSidebar 
                onDownloadFile={onDownloadFile}
                onDownloadZip={onDownloadZip}
                onDeleteFile={onDeleteFile}
              />
            </Panel>
            <PanelResizeHandle className="w-[1px] bg-border-subtle hover:bg-accent-primary transition-colors z-20" />
          </>
        )}

        {/* Main Content */}
        <Panel defaultSize={55}>
          {/* @ts-ignore */}
          <PanelGroup orientation="vertical" id="forge-layout-vertical">
            <Panel defaultSize={70} minSize={30}>
              <div className="flex flex-col h-full bg-surface-base">
                <TabBar />
                <div className="flex-1 overflow-hidden">
                  <ErrorBoundary name="Code Editor">
                    <Suspense fallback={<PanelLoader />}>
                      <CodeEditor
                        content={RW_activeFile ? RW_fileStore[RW_activeFile]?.content || '' : ''}
                        filename={RW_activeFile || ''}
                        settings={settings}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              </div>
            </Panel>

            {showTerminal && (
              <>
                <PanelResizeHandle className="h-[1px] bg-[#3c3c3c] hover:bg-[#007acc] transition-colors z-20" />
                <Panel defaultSize={30} minSize={20}>
                  <ErrorBoundary name="Bottom Panel">
                    <BottomPanel
                      files={RW_fileStore}
                      activeTab={activeBottomTab}
                      onTabChange={setActiveBottomTab}
                      onSelectFile={setActiveFile}
                      onDownloadFile={onDownloadFile}
                      onDownloadZip={onDownloadZip}
                      onImportZip={() => {}}
                      onDeleteFile={onDeleteFile}
                    />
                  </ErrorBoundary>
                </Panel>
              </>
            )}
          </PanelGroup>
        </Panel>

        {/* Right Sidebar */}
        {isRightSidebarOpen && (
          <>
            <PanelResizeHandle className="w-[1px] bg-[#3c3c3c] hover:bg-[#007acc] transition-colors z-20" />
            <Panel defaultSize={30} minSize={20} maxSize={40}>
              <RightSidebar 
                settings={settings}
                onSendMessage={onSendMessage}
              />
            </Panel>
          </>
        )}
      </PanelGroup>
      <DiffStagingPanel />
    </div>
  );
};
