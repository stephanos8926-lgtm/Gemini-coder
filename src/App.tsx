import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { streamGemini } from './lib/gemini';
import { filesystemService } from './lib/filesystemService';
import { settingsStore, type Settings } from './lib/settingsStore';
import { useFirebase } from './contexts/FirebaseContext';
import { useWorkspaces } from './hooks/useFileSystem';
import { useProjects } from './hooks/useProjects';
import { useSocket } from './hooks/useSocket';
import { TabBar } from './components/TabBar';
import { DiffStagingPanel } from './components/DiffStagingPanel';
import { TaskMonitorPanel } from './components/TaskMonitorPanel';
import { SwarmMonitorPanel } from './components/SwarmMonitorPanel';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { LandingPage } from './components/LandingPage';
import { BottomPanel } from './components/BottomPanel';
import { AdaptiveBottomSheet } from './components/AdaptiveBottomSheet';
import { MobileIDE } from './components/layout/MobileIDE';
import { FileTree } from './components/FileTree';
import { profileStore, type Profile } from './lib/profileStore';
import { useAppAuth } from './hooks/useAppAuth';
import { useAppProject } from './hooks/useAppProject';
import { useAppFileOperations } from './hooks/useAppFileOperations';
import { useAppChat } from './hooks/useAppChat';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ModalsContainer } from './components/modals/ModalsContainer';

// Multi-tier Modular Stores
import { useAppStore } from './store/useAppStore';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { useAuthStore } from './store/useAuthStore';
import { useChatStore } from './store/useChatStore';
import { useFileStore } from './store/useFileStore';

// Branding & System Constants
import { APP_CONFIG } from './constants/appConfig';

import { generateId } from './lib/projectStore';
import { type Message } from './lib/gemini';
import { type FileStore } from './lib/fileStore';

// Lazy load heavy components
const ChatPanel = lazy(() => import('./components/ChatPanel').then(m => ({ default: m.ChatPanel })));
const CodeEditor = lazy(() => import('./components/CodeEditor').then(m => ({ default: m.CodeEditor })));
const TerminalPanel = lazy(() => import('./components/TerminalPanel').then(m => ({ default: m.TerminalPanel })));

/**
 * @component PanelLoader
 * @description Sophisticated placeholder displayed during asynchronous component hydration.
 */
const PanelLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#1e1e1e] text-[#858585] gap-3">
    <div className="p-2 bg-[#007acc]/10 rounded-xl border border-[#007acc]/20 animate-pulse">
      <Sparkles className="w-6 h-6 text-[#007acc]" />
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Hydrating Panel</span>
  </div>
);

/**
 * @component App
 * @description Primary entry point for RapidForge IDE. Orchestrates modular state synchronization and layout distribution.
 */
export default function App() {
  // Sync from Firebase Context
  const { user, isAuthLoading: isFirebaseLoading } = useFirebase();

  // Modular State - Workspace
  const { 
    RW_workspaceName, 
    RW_workspaces, 
    RW_currentProjectId,
    setWorkspaceName,
    setWorkspaces,
    setCurrentProjectId
  } = useWorkspaceStore();

  // Modular State - Auth & API
  const { RW_apiKey, setApiKey } = useAuthStore();

  // Desktop Sidebar & Bottom State
  const { 
    isLeftSidebarOpen, 
    isRightSidebarOpen, 
    activeBottomTab,
    setLeftSidebarOpen, 
    setRightSidebarOpen,
    setActiveBottomTab
  } = useAppStore();
  
  // Modular State - Chat & Model
  const { 
    RW_messages, 
    RW_isStreaming, 
    RW_activeModel, 
    RW_systemModifier,
    setMessages,
    setActiveModel
  } = useChatStore();

  // Modular State - Filesystem
  const { 
    RW_fileStore, 
    RW_activeFile, 
    RW_isMobileTerminalOpen,
    RW_isMobileExplorerOpen,
    RW_mobileView,
    setFileStore,
    setActiveFile,
    setMobileTerminalOpen,
    setMobileExplorerOpen,
    setMobileView
  } = useFileStore();

  // Local UI State (transient views)
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [settings, setSettings] = useState<Settings>(settingsStore.get());
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(profileStore.getActiveProfile());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { projects, setProjects, isLoading: isProjectsLoading, createProject, deleteProject } = useProjects();
  const { data: workspacesData, isLoading: isWorkspacesLoading } = useWorkspaces();

  // Real-time filesystem sync via WebSockets
  const { socket } = useSocket((data: { event: string, path: string }) => {
    filesystemService.loadAllFiles().then(setFileStore);
  });

  // Proactive Security Alerts
  useEffect(() => {
    if (!socket) return;
    
    socket.on('security-alert', (data: { path: string, issues: any[] }) => {
      if (data.issues && data.issues.length > 0) {
          const issueMsg = `[SECURITY ALERT] Issues detected in ${data.path}:\n${data.issues.map(i => `- ${i.message}`).join('\n')}`;
          useChatStore.getState().setMessages([...useChatStore.getState().RW_messages, { id: generateId(), role: 'model', content: issueMsg }]);
      }
    });

    return () => {
      socket.off('security-alert');
    };
  }, [socket]);


  // Type Compatibility Wrappers for Legacy Hooks
  const setMessagesCompat: React.Dispatch<React.SetStateAction<Message[]>> = (val) => {
    if (typeof val === 'function') {
      setMessages(val(useChatStore.getState().RW_messages));
    } else {
      setMessages(val);
    }
  };

  const setFileStoreCompat: React.Dispatch<React.SetStateAction<FileStore>> = (val) => {
    if (typeof val === 'function') {
      setFileStore(val(useFileStore.getState().RW_fileStore));
    } else {
      setFileStore(val);
    }
  };

  // Orchestration Hooks (Proxying state to business logic)
  const authHook = useAppAuth({
    user,
    setActiveProfile: (p) => setActiveProfile(p), 
    setApiKey,
    setSettings,
    setShowKeyModal
  });

  const projectHook = useAppProject({
    projects,
    setProjects,
    currentProjectId: RW_currentProjectId,
    setCurrentProjectId,
    fileStore: RW_fileStore,
    setFileStore: setFileStoreCompat,
    setMessages: setMessagesCompat,
    setActiveFile,
    createProject,
    deleteProject,
    isProjectsLoading
  });

  const fileOperationsHook = useAppFileOperations({
    workspaceName: RW_workspaceName,
    fileStore: RW_fileStore,
    setFileStore: setFileStoreCompat,
    mobileView: RW_mobileView,
    setMobileView: setMobileView
  });

  const chatHook = useAppChat({
    apiKey: RW_apiKey,
    model: RW_activeModel,
    workspaceName: RW_workspaceName,
    selectedFile: RW_activeFile,
    settings,
    enabledTools: [],
    fileStore: RW_fileStore,
    setFileStore: setFileStoreCompat,
    setShowKeyModal,
    systemModifier: RW_systemModifier
  });

  const handleSendMessage = chatHook.handleSendMessage;

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#cccccc]">
      <Header 
        user={user}
        workspaceName={RW_workspaceName}
        isWorkspacesLoading={isWorkspacesLoading}
        workspaces={RW_workspaces}
        model={RW_activeModel}
        setModel={setActiveModel}
        onSignInGoogle={authHook.handleSignInGoogle}
        onSignInGithub={authHook.handleSignInGithub}
        onSignOut={authHook.handleSignOut}
        onShowWorkspaceModal={() => setShowWorkspaceModal(true)}
        onShowSettingsModal={() => setShowSettingsModal(true)}
        onShowGitPanel={() => setShowGitPanel(true)}
        onShowTerminal={() => setShowTerminal(!showTerminal)}
        onShowCommandPalette={() => setShowCommandPalette(true)}
        onShowMcpModal={() => setShowMcpModal(true)}
        showMcpModal={showMcpModal}
        onSaveAll={fileOperationsHook.handleSaveAll}
        activeProfile={activeProfile}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onShowExplorer={() => setMobileExplorerOpen(true)}
        mobileView={RW_mobileView}
        setMobileView={setMobileView}
        isLeftSidebarOpen={isLeftSidebarOpen}
        onToggleLeftSidebar={() => setLeftSidebarOpen(!isLeftSidebarOpen)}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={() => setRightSidebarOpen(!isRightSidebarOpen)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden relative">
          {user ? (
            <div className="flex-1 flex h-full">
              {/* Professional Desktop IDE Layout (3-Column) */}
              <div className="hidden sm:flex flex-1 h-full overflow-hidden">
                {/* @ts-ignore */}
                <PanelGroup direction="horizontal">
                  {/* Left Sidebar: File Explorer */}
                  {isLeftSidebarOpen && (
                    <>
                      <Panel defaultSize={15} minSize={10} maxSize={30}>
                        <div className="h-full bg-[#252526] flex flex-col">
                          <ErrorBoundary name="File Tree">
                            <FileTree
                              files={RW_fileStore}
                              selectedFile={RW_activeFile}
                              onSelect={setActiveFile}
                              onDownload={fileOperationsHook.handleDownloadFile}
                              onDownloadZip={fileOperationsHook.handleDownloadZip}
                              onImportZip={() => {}} 
                              workspaceName={RW_workspaceName}
                              onDelete={fileOperationsHook.handleDeleteFile}
                            />
                          </ErrorBoundary>
                        </div>
                      </Panel>
                      <PanelResizeHandle className="w-[1px] bg-[#3c3c3c] hover:bg-[#007acc] transition-colors z-20" />
                    </>
                  )}

                  {/* Main Creative Center */}
                  <Panel defaultSize={isLeftSidebarOpen ? 55 : isRightSidebarOpen ? 70 : 100}>
                    {/* @ts-ignore */}
                    <PanelGroup direction="vertical">
                      {/* Top: Tabs & Editor */}
                      <Panel defaultSize={showTerminal ? 70 : 100} minSize={30}>
                        <div className="flex flex-col h-full bg-[#1e1e1e]">
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

                      {/* Bottom: Utility Panel (Terminal/Preview/Debug) */}
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
                                onDownloadFile={fileOperationsHook.handleDownloadFile}
                                onDownloadZip={fileOperationsHook.handleDownloadZip}
                                onImportZip={() => {}}
                                onDeleteFile={fileOperationsHook.handleDeleteFile}
                              />
                            </ErrorBoundary>
                          </Panel>
                        </>
                      )}
                    </PanelGroup>
                  </Panel>

                  {/* Right Sidebar: AI Contextual Assistant */}
                  {isRightSidebarOpen && (
                    <>
                      <PanelResizeHandle className="w-[1px] bg-[#3c3c3c] hover:bg-[#007acc] transition-colors z-20" />
                      <Panel defaultSize={30} minSize={20} maxSize={40}>
                        <ErrorBoundary name="AI Chat">
                          <div className="h-full bg-[#252526]">
                            <Suspense fallback={<PanelLoader />}>
                              <ChatPanel
                                messages={RW_messages}
                                onSendMessage={handleSendMessage}
                                onNewChat={() => setMessages([])}
                                isStreaming={RW_isStreaming}
                                settings={settings}
                                />
                            </Suspense>
                          </div>
                        </ErrorBoundary>
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </div>

              {/* Mobile Adaptive Handset View */}
              <div className="sm:hidden flex-1 h-full relative">
                <MobileIDE
                  messages={RW_messages}
                  onSendMessage={handleSendMessage}
                  isStreaming={RW_isStreaming}
                  files={RW_fileStore}
                  workspaceName={RW_workspaceName}
                  settings={settings}
                  showSidebar={RW_isMobileExplorerOpen}
                  setShowSidebar={setMobileExplorerOpen}
                  showPreview={RW_mobileView === 'preview'}
                  setShowPreview={(v) => setMobileView(v ? 'preview' : 'chat')}
                  showSettings={showSettingsModal}
                  setShowSettings={setShowSettingsModal}
                  mobileView={RW_mobileView}
                  setMobileView={setMobileView}
                  fileTreeComponent={
                    <FileTree
                      files={RW_fileStore}
                      selectedFile={RW_activeFile}
                      onSelect={(path) => {
                        setActiveFile(path);
                        setMobileExplorerOpen(false);
                        setMobileView('editor');
                      }}
                      onDownload={fileOperationsHook.handleDownloadFile}
                      onDownloadZip={fileOperationsHook.handleDownloadZip}
                      onImportZip={() => {}}
                      workspaceName={RW_workspaceName}
                      onDelete={fileOperationsHook.handleDeleteFile}
                    />
                  }
                  editorComponent={
                    <Suspense fallback={<PanelLoader />}>
                      <CodeEditor
                        content={RW_activeFile ? RW_fileStore[RW_activeFile]?.content || '' : ''}
                        filename={RW_activeFile || ''}
                        settings={settings}
                      />
                    </Suspense>
                  }
                  previewComponent={
                    <BottomPanel
                      files={RW_fileStore}
                      activeTab="preview"
                      onTabChange={() => {}}
                      onSelectFile={setActiveFile}
                      onDownloadFile={fileOperationsHook.handleDownloadFile}
                      onDownloadZip={fileOperationsHook.handleDownloadZip}
                      onImportZip={() => {}}
                      onDeleteFile={fileOperationsHook.handleDeleteFile}
                      activeFile={RW_activeFile || undefined}
                    />
                  }
                />
              </div>
            </div>
          ) : (
            <LandingPage 
              onSignInGoogle={authHook.handleSignInGoogle} 
              onSignInGithub={authHook.handleSignInGithub} 
            />
          )}
        </div>
        <StatusBar 
            isTerminalVisible={showTerminal} 
            onToggleTerminal={() => {
              if (window.innerWidth < 640) {
                setMobileTerminalOpen(true);
              } else {
                setShowTerminal(!showTerminal);
              }
            }}
            workspace={RW_workspaceName}
        />
        <DiffStagingPanel />
        <TaskMonitorPanel projectId={RW_currentProjectId || 'default'} />
        <SwarmMonitorPanel projectId={RW_currentProjectId || 'default'} />

        {/* Mobile Ergonomics: Bottom Sheets */}
        <AdaptiveBottomSheet 
          isOpen={RW_isMobileTerminalOpen} 
          onClose={() => setMobileTerminalOpen(false)}
          title="Terminal Console"
        >
          <div className="h-full bg-black">
            <Suspense fallback={<PanelLoader />}>
              <TerminalPanel />
            </Suspense>
          </div>
        </AdaptiveBottomSheet>

        <ModalsContainer 
          showProjectModal={false} 
          setShowProjectModal={() => {}}
          showKeyModal={showKeyModal}
          setShowKeyModal={setShowKeyModal}
          showWorkspaceModal={showWorkspaceModal}
          setShowWorkspaceModal={setShowWorkspaceModal}
          showSettingsModal={showSettingsModal}
          setShowSettingsModal={setShowSettingsModal}
          showMcpModal={showMcpModal}
          setShowMcpModal={setShowMcpModal}
          projects={projects}
          currentProjectId={RW_currentProjectId}
          handleSwitchProject={projectHook.handleSwitchProject}
          handleCreateProject={projectHook.handleCreateProject}
          handleDeleteProject={projectHook.handleDeleteProject}
          handleImportProject={projectHook.handleImportProject}
          handleSaveKey={setApiKey}
          apiKey={RW_apiKey}
          user={user}
          setWorkspaceName={setWorkspaceName}
          workspaceName={RW_workspaceName}
          settings={settings}
          setSettings={setSettings}
        />
      </div>
    </div>
  );
}
