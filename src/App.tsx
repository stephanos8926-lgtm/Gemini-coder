import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { Sparkles } from 'lucide-react';
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
import { CommandPalette } from './components/CommandPalette';

// Multi-tier Modular Stores
import { useAppStore } from './store/useAppStore';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { useAuthStore } from './store/useAuthStore';
import { useChatStore } from './store/useChatStore';
import { useFileStore } from './store/useFileStore';

// Branding & System Constants
import { APP_CONFIG } from './constants/appConfig';
import { Toaster } from 'sonner';
import { TaskNotificationHandler } from './components/TaskNotificationHandler';

import { useLayoutState } from './hooks/useLayoutState';
import { useModalState } from './hooks/useModalState';

import { generateId } from './lib/projectStore';
import { type Message } from './lib/gemini';
import { type FileStore } from './lib/fileStore';
import { nexusPersist } from './lib/persistence/NexusPersistence';

// Lazy load heavy components
const ChatPanel = lazy(() => import('./components/ChatPanel').then(m => ({ default: m.ChatPanel })));
const CodeEditor = lazy(() => import('./components/CodeEditor').then(m => ({ default: m.CodeEditor })));
const TerminalPanel = lazy(() => import('./components/TerminalPanel').then(m => ({ default: m.TerminalPanel })));

/**
 * @component PanelLoader
 * @description Sophisticated placeholder displayed during asynchronous component hydration.
 */
const PanelLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center h-full bg-surface-base text-text-subtle gap-3">
    <div className="p-2 bg-accent-intel/10 rounded-xl border border-accent-intel/20 animate-pulse">
      <Sparkles className="w-6 h-6 text-accent-intel" />
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Hydrating Panel</span>
  </div>
);

import { MainLayout } from './components/layout/MainLayout';

/**
 * @component App
 * @description Primary entry point for RapidForge IDE. Orchestrates modular state synchronization and layout distribution.
 */
import { useAppInitialization } from './hooks/useAppInitialization';
import { DesktopIDE } from './components/layout/DesktopIDE';

export default function App() {
  const { user } = useAppInitialization();

  // Modular State - Workspace
  const { 
    RW_workspaceName, 
    RW_workspaces, 
    RW_currentProjectId,
    setWorkspaceName,
    setCurrentProjectId
  } = useWorkspaceStore();

  const { RW_apiKey, setApiKey } = useAuthStore();
  const { isLeftSidebarOpen, setLeftSidebarOpen, isRightSidebarOpen, setRightSidebarOpen, showTerminal, setShowTerminal } = useAppStore();
  const { RW_activeModel, setActiveModel, RW_messages, RW_isStreaming } = useChatStore();
  const { RW_fileStore, RW_activeFile, setActiveFile, setMobileTerminalOpen, setMobileExplorerOpen, setMobileView, RW_isMobileExplorerOpen, RW_mobileView, RW_isMobileTerminalOpen } = useFileStore();

  const layout = useLayoutState();
  const modals = useModalState();
  const [settings, setSettings] = useState<Settings>(settingsStore.get());
  const [activeProfile, setActiveProfile] = useState<Profile | null>(profileStore.getActiveProfile());

  const { projects, setProjects, isLoading: isProjectsLoading, createProject, deleteProject } = useProjects();
  const { data: workspacesData, isLoading: isWorkspacesLoading } = useWorkspaces();

  // Compatibility Wrappers & Hooks (shortened for clarity in this edit)
  const setMessagesCompat = (val: any) => useChatStore.getState().setMessages(typeof val === 'function' ? val(RW_messages) : val);
  const setFileStoreCompat = (val: any) => useFileStore.getState().setFileStore(typeof val === 'function' ? val(RW_fileStore) : val);

  const authHook = useAppAuth({ user, setActiveProfile, setApiKey, setSettings, setShowKeyModal: modals.setShowKeyModal });
  const projectHook = useAppProject({ projects, setProjects, currentProjectId: RW_currentProjectId, setCurrentProjectId, fileStore: RW_fileStore, setFileStore: setFileStoreCompat, setMessages: setMessagesCompat, setActiveFile, createProject, deleteProject, isProjectsLoading });
  const fileOperationsHook = useAppFileOperations({ workspaceName: RW_workspaceName, fileStore: RW_fileStore, setFileStore: setFileStoreCompat, mobileView: layout.RW_mobileView, setMobileView: layout.setMobileView });
  const chatHook = useAppChat({ apiKey: RW_apiKey, model: RW_activeModel, workspaceName: RW_workspaceName, selectedFile: RW_activeFile, settings, enabledTools: [], fileStore: RW_fileStore, setFileStore: setFileStoreCompat, setShowKeyModal: modals.setShowKeyModal, systemModifier: useChatStore.getState().RW_systemModifier });

  if (!user) return <LandingPage onSignInGoogle={authHook.handleSignInGoogle} onSignInGithub={authHook.handleSignInGithub} />;

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#cccccc]">
      <Toaster position="top-right" richColors closeButton theme="dark" />
      <TaskNotificationHandler />
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
        onShowWorkspaceModal={() => modals.setShowWorkspaceModal(true)}
        onShowSettingsModal={() => modals.setShowSettingsModal(true)}
        onShowGitPanel={() => layout.setShowGitPanel(true)}
        onShowTerminal={() => setShowTerminal(!showTerminal)}
        onShowCommandPalette={() => modals.setShowCommandPalette(true)}
        onShowMcpModal={() => modals.setShowMcpModal(true)}
        showMcpModal={modals.showMcpModal}
        onSaveAll={fileOperationsHook.handleSaveAll}
        activeProfile={activeProfile}
        isMobileMenuOpen={layout.isMobileMenuOpen}
        setIsMobileMenuOpen={layout.setIsMobileMenuOpen}
        onShowExplorer={() => setMobileExplorerOpen(true)}
        mobileView={RW_mobileView}
        setMobileView={setMobileView}
        isLeftSidebarOpen={isLeftSidebarOpen}
        onToggleLeftSidebar={() => setLeftSidebarOpen(!isLeftSidebarOpen)}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={() => setRightSidebarOpen(!isRightSidebarOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Responsive Layout Distribution */}
        <DesktopIDE 
          settings={settings}
          showTerminal={showTerminal}
          onSendMessage={chatHook.handleSendMessage}
          onDownloadFile={fileOperationsHook.handleDownloadFile}
          onDownloadZip={fileOperationsHook.handleDownloadZip}
          onDeleteFile={fileOperationsHook.handleDeleteFile}
        />

        <div className="sm:hidden flex-1 h-full relative">
          <MobileIDE
            messages={RW_messages}
            onSendMessage={chatHook.handleSendMessage}
            isStreaming={RW_isStreaming}
            files={RW_fileStore}
            workspaceName={RW_workspaceName}
            settings={settings}
            showSidebar={RW_isMobileExplorerOpen}
            setShowSidebar={setMobileExplorerOpen}
            showPreview={RW_mobileView === 'preview'}
            setShowPreview={(v) => setMobileView(v ? 'preview' : 'chat')}
            showSettings={modals.showSettingsModal}
            setShowSettings={modals.setShowSettingsModal}
            mobileView={RW_mobileView}
            setMobileView={setMobileView}
            fileTreeComponent={
              <FileTree
                files={RW_fileStore}
                selectedFile={RW_activeFile}
                onSelect={(path) => { setActiveFile(path); setMobileExplorerOpen(false); setMobileView('editor'); }}
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

      <StatusBar 
          isTerminalVisible={showTerminal} 
          onToggleTerminal={() => window.innerWidth < 640 ? setMobileTerminalOpen(true) : setShowTerminal(!showTerminal)}
          workspace={RW_workspaceName}
      />
      <DiffStagingPanel />
      <TaskMonitorPanel projectId={RW_currentProjectId || 'default'} />
      <SwarmMonitorPanel projectId={RW_currentProjectId || 'default'} />

      <AdaptiveBottomSheet isOpen={RW_isMobileTerminalOpen} onClose={() => setMobileTerminalOpen(false)} title="Terminal Console">
        <div className="h-full bg-black">
          <Suspense fallback={<PanelLoader />}><TerminalPanel /></Suspense>
        </div>
      </AdaptiveBottomSheet>

      <CommandPalette 
        isOpen={modals.showCommandPalette}
        onClose={() => modals.setShowCommandPalette(false)}
        files={Object.keys(RW_fileStore)}
        workspaces={projects.map(p => p.name)}
        onSelectFile={setActiveFile}
        onSelectWorkspace={setWorkspaceName}
        onOpenSettings={() => modals.setShowSettingsModal(true)}
        onAiAction={(type) => { setRightSidebarOpen(true); setTimeout(() => chatHook.handleSendMessage(`Please ${type} the current file.`), 100); }}
        onGenerateReadme={() => { setRightSidebarOpen(true); chatHook.handleSendMessage("Generate a comprehensive README.md for this project."); }}
      />

      <ModalsContainer 
        showProjectModal={false} 
        setShowProjectModal={() => {}}
        showKeyModal={modals.showKeyModal}
        setShowKeyModal={modals.setShowKeyModal}
        showWorkspaceModal={modals.showWorkspaceModal}
        setShowWorkspaceModal={modals.setShowWorkspaceModal}
        showSettingsModal={modals.showSettingsModal}
        setShowSettingsModal={modals.setShowSettingsModal}
        showMcpModal={modals.showMcpModal}
        setShowMcpModal={modals.setShowMcpModal}
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
  );
}

