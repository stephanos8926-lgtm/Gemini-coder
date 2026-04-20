import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { Terminal, Key, Plus, Menu, X, Loader2, FolderOpen, Download, Search, Settings as SettingsIcon, LogIn, LogOut, GitBranch, Terminal as TerminalIcon, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Toaster, toast } from 'sonner';
import { useAppStore } from './store/useAppStore';
import { Message, streamGemini } from './lib/gemini';
import { extractFiles, type FileStore } from './lib/fileStore';
import { applyDiff } from './lib/diff';
import { getProjects, saveProjects, getCurrentProjectId, setCurrentProjectId, generateId, type Project } from './lib/projectStore';
import { filesystemService } from './lib/filesystemService';
import { settingsStore, type Settings } from './lib/settingsStore';
import { auth, googleProvider, githubProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useFirebase } from './contexts/FirebaseContext';
import { useWorkspaces, useFiles, useFileSystemMutations } from './hooks/useFileSystem';
import { useProjects } from './hooks/useProjects';
import { useWorkspacePersistence } from './hooks/useWorkspacePersistence';
import { useSocket } from './hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { getSystemInstruction } from './constants/systemInstruction';
import { generateAstSkeleton } from './utils/astChunker';
import { TabBar } from './components/TabBar';
import { DiffStagingPanel } from './components/DiffStagingPanel';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { AuthGuard } from './components/AuthGuard';
import { LandingPage } from './components/LandingPage';
import { profileStore, type Profile } from './lib/profileStore';
import { useAppAuth } from './hooks/useAppAuth';
import { useAppProject } from './hooks/useAppProject';
import { useAppFileOperations } from './hooks/useAppFileOperations';
import { useAppChat } from './hooks/useAppChat';

// Lazy load heavy components
const ApiKeyModal = lazy(() => import('./components/ApiKeyModal').then(m => ({ default: m.ApiKeyModal })));
const ChatPanel = lazy(() => import('./components/ChatPanel').then(m => ({ default: m.ChatPanel })));
const CodeEditor = lazy(() => import('./components/CodeEditor').then(m => ({ default: m.CodeEditor })));
const FileTree = lazy(() => import('./components/FileTree').then(m => ({ default: m.FileTree })));
const BottomPanel = lazy(() => import('./components/BottomPanel').then(m => ({ default: m.BottomPanel })));
import { ErrorBoundary } from './components/ErrorBoundary';

const ProjectModal = lazy(() => import('./components/ProjectModal').then(m => ({ default: m.ProjectModal })));
import { ModalsContainer } from './components/modals/ModalsContainer';
const SearchPanel = lazy(() => import('./components/SearchPanel').then(m => ({ default: m.SearchPanel })));
const CommandPalette = lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const GitPanel = lazy(() => import('./components/GitPanel').then(m => ({ default: m.GitPanel })));
const TerminalPanel = lazy(() => import('./components/TerminalPanel').then(m => ({ default: m.TerminalPanel })));
const DiffViewer = lazy(() => import('./components/DiffViewer').then(m => ({ default: m.DiffViewer })));
const MobileSidebar = lazy(() => import('./components/MobileSidebar').then(m => ({ default: m.MobileSidebar })));
const ProfileSelector = lazy(() => import('./components/ProfileSelector').then(m => ({ default: m.ProfileSelector })));
const ToolsPanel = lazy(() => import('./components/ToolsPanel').then(m => ({ default: m.ToolsPanel })));
const BuildPanel = lazy(() => import('./components/BuildPanel').then(m => ({ default: m.BuildPanel })));
const McpPanel = lazy(() => import('./components/McpPanel').then(m => ({ default: m.McpPanel })));

const PanelLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#1e1e1e] text-[#858585] gap-3">
    <div className="p-2 bg-[#007acc]/10 rounded-xl border border-[#007acc]/20 animate-pulse">
      <Sparkles className="w-6 h-6 text-[#007acc]" />
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Initializing Panel</span>
  </div>
);

export default function App() {
  const { user, isAuthLoading, idToken } = useFirebase();
  const queryClient = useQueryClient();
  const { workspaceName, setWorkspaceName, workspaces, setWorkspaces } = useAppStore();
  const { model, setModel, activeFile, setActiveFile } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileStore, setFileStore] = useState<FileStore>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [systemModifier, setSystemModifier] = useState('');
  const [mobileView, setMobileView] = useState<'chat' | 'editor' | 'preview'>('chat');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [settings, setSettings] = useState<Settings>(settingsStore.get());
  const [enabledTools, setEnabledTools] = useState<any[]>([]);

  const { projects, setProjects, currentProjectId, setCurrentProjectId, createProject, deleteProject, isLoading: isProjectsLoading } = useProjects();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(profileStore.getActiveProfile());
  const { data: workspacesData, isLoading: isWorkspacesLoading, isError: isWorkspacesError } = useWorkspaces();

  // Real-time filesystem sync
  useSocket((data: { event: string, path: string }) => {
    console.log(`[App] Real-time filesystem update: ${data.event} ${data.path}`);
    filesystemService.loadAllFiles().then(setFileStore);
  });

  const authHook = useAppAuth({
    user,
    setActiveProfile: (p) => {}, 
    setApiKey,
    setSettings,
    setShowKeyModal
  });

  const projectHook = useAppProject({
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    fileStore,
    setFileStore,
    setMessages,
    setActiveFile,
    createProject,
    deleteProject,
    isProjectsLoading
  });

  const fileOperationsHook = useAppFileOperations({
    workspaceName,
    fileStore,
    setFileStore,
    mobileView,
    setMobileView
  });

  const chatHook = useAppChat({
    apiKey,
    model,
    workspaceName,
    selectedFile: activeFile,
    settings,
    enabledTools,
    fileStore,
    setFileStore,
    setShowKeyModal,
    systemModifier
  });

  const handleSendMessage = chatHook.handleSendMessage;

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#cccccc]">
      <Header 
        user={user}
        workspaceName={workspaceName}
        isWorkspacesLoading={isWorkspacesLoading}
        workspaces={workspaces}
        model={model}
        setModel={setModel}
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
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {user ? (
            <div className="flex-1 flex h-full">
              {/* Desktop: Group, Mobile: conditional visibility */}
              <div className={`hidden sm:flex flex-1 h-full`}>
                <PanelGroup orientation="horizontal">
                    <Panel defaultSize={30} minSize={20}>
                        <ErrorBoundary name="Chat Panel">
                        <Suspense fallback={<PanelLoader />}>
                            <ChatPanel
                            messages={chatHook.messages}
                            onSendMessage={handleSendMessage}
                            onNewChat={() => setMessages([])}
                            isStreaming={chatHook.isStreaming}
                            settings={settings}
                            />
                        </Suspense>
                        </ErrorBoundary>
                    </Panel>
                    <PanelResizeHandle className="w-[1px] bg-[#3c3c3c] hover:bg-[#007acc] transition-colors z-20" />
                    <Panel defaultSize={50} minSize={30}>
                        <div className="flex flex-col h-full">
                            <TabBar />
                            <div className="flex-1 overflow-hidden">
                                <ErrorBoundary name="Code Editor">
                                    <Suspense fallback={<PanelLoader />}>
                                        <CodeEditor
                                        content={activeFile ? fileStore[activeFile]?.content || '' : ''}
                                        filename={activeFile || ''}
                                        settings={settings}
                                        />
                                    </Suspense>
                                </ErrorBoundary>
                            </div>
                            {showTerminal && (
                                <div className="h-48 border-t border-[#3c3c3c]">
                                    <Suspense fallback={<PanelLoader />}>
                                        <TerminalPanel />
                                    </Suspense>
                                </div>
                            )}
                        </div>
                    </Panel>
                </PanelGroup>
              </div>

              {/* Mobile View */}
              <div className="sm:hidden flex-1 h-full relative">
                {(!showTerminal || mobileView === 'editor') && (
                    <ErrorBoundary name="Code Editor">
                        <Suspense fallback={<PanelLoader />}>
                            <CodeEditor
                            content={activeFile ? fileStore[activeFile]?.content || '' : ''}
                            filename={activeFile || ''}
                            settings={settings}
                            />
                        </Suspense>
                    </ErrorBoundary>
                )}
                {showTerminal && (
                    <div className="absolute inset-0 z-50 bg-[#1e1e1e]">
                         <Suspense fallback={<PanelLoader />}>
                            <TerminalPanel />
                        </Suspense>
                    </div>
                )}
              </div>
            </div>
          ) : (
            <LandingPage onSignInGoogle={authHook.handleSignInGoogle} onSignInGithub={authHook.handleSignInGithub} />
          )}
        </div>
        <StatusBar 
            isTerminalVisible={showTerminal} 
            onToggleTerminal={() => setShowTerminal(!showTerminal)}
            workspace={workspaceName}
        />
        <DiffStagingPanel />
        <ModalsContainer 
          showProjectModal={false} // Placeholder, needs proper state
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
          currentProjectId={currentProjectId}
          handleSwitchProject={projectHook.handleSwitchProject}
          handleCreateProject={projectHook.handleCreateProject}
          handleDeleteProject={projectHook.handleDeleteProject}
          handleImportProject={projectHook.handleImportProject}
          handleSaveKey={setApiKey}
          apiKey={apiKey}
          user={user}
          setWorkspaceName={setWorkspaceName}
          workspaceName={workspaceName}
          settings={settings}
          setSettings={setSettings}
        />
      </div>
    </div>
  );
}
