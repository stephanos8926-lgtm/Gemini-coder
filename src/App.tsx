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

import { Header } from './components/Header';
import { AuthGuard } from './components/AuthGuard';
import { LandingPage } from './components/LandingPage';
import { profileStore, type Profile } from './lib/profileStore';

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
  const { saveFileMutation, createFileMutation, deleteFileMutation, renameFileMutation } = useFileSystemMutations();
  const { workspaceName, setWorkspaceName, workspaces, setWorkspaces } = useAppStore();

  const workspaceNameRef = useRef(workspaceName);
  useEffect(() => {
    workspaceNameRef.current = workspaceName;
  }, [workspaceName]);

  // Socket for real-time updates
  useSocket((data) => {
    const currentWorkspace = workspaceNameRef.current;
    if (currentWorkspace && data.path.includes(currentWorkspace)) {
      // Invalidate file queries for this workspace
      queryClient.invalidateQueries({ queryKey: ['files', currentWorkspace] });
      
      // If the selected file was changed, invalidate its content query
      if (selectedFile && data.path.endsWith(selectedFile)) {
        queryClient.invalidateQueries({ queryKey: ['fileContent', currentWorkspace, selectedFile] });
      }
    }
  });
  
  const [activeProfile, setActiveProfile] = useState<Profile | null>(profileStore.getActiveProfile());
  const [apiKey, setApiKey] = useState<string | null>(activeProfile?.apiKey || null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const { model, setModel } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileStore, setFileStore] = useState<FileStore>({});
  const fileStoreRef = useRef<FileStore>(fileStore);
  useEffect(() => {
    fileStoreRef.current = fileStore;
  }, [fileStore]);
  const { selectedFile, setSelectedFile } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bottomTab, setBottomTab] = useState<'preview' | 'tree' | 'tools'>('preview');
  const [isStreaming, setIsStreaming] = useState(false);
  const [systemModifier, setSystemModifier] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'chat' | 'editor' | 'preview'>('chat');
  const [sidebarTab, setSidebarTab] = useState<'files' | 'search' | 'mcp'>('files');
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [settings, setSettings] = useState<Settings>(activeProfile?.settings || settingsStore.get());
  const lastPersonaRef = useRef(settings?.aiPersona);

  useEffect(() => {
    if (lastPersonaRef.current && settings?.aiPersona && lastPersonaRef.current !== settings.aiPersona) {
      const personaName = settings.aiPersona === 'custom' ? 'Custom Persona' : settings.aiPersona;
      setMessages(prev => [
        ...prev,
        { 
          id: generateId(), 
          role: 'model', 
          content: `[SYSTEM] AI Persona changed to: **${personaName.toUpperCase()}**. I will now adhere to this new persona for the remainder of our conversation.` 
        }
      ]);
    }
    lastPersonaRef.current = settings?.aiPersona;
  }, [settings?.aiPersona]);

  const [targetLine, setTargetLine] = useState<number | undefined>(undefined);
  const [enabledTools, setEnabledTools] = useState<any[]>([]);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await fetch('/api/admin/mcp/tools');
        const data = await response.json();
        setEnabledTools(data);
      } catch (e) {
        console.error('Failed to fetch MCP tools', e);
      }
    };
    fetchTools();
  }, []);

  // Project Management State
  const { projects, setProjects, currentProjectId, setCurrentProjectId, createProject, deleteProject, isLoading: isProjectsLoading } = useProjects();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<{ filename: string; original: string; modified: string } | null>(null);
  const [isProjectsLoaded, setIsProjectsLoaded] = useState(false);
  const { data: workspacesData, isLoading: isWorkspacesLoading, isError: isWorkspacesError } = useWorkspaces();
  
  // Restore workspaceName from localStorage
  useEffect(() => {
    const savedWorkspace = localStorage.getItem('gide_workspace_name');
    if (savedWorkspace && !workspaceName) {
      setWorkspaceName(savedWorkspace);
    }
  }, []);

  // Save workspaceName to localStorage
  useEffect(() => {
    if (workspaceName) {
      localStorage.setItem('gide_workspace_name', workspaceName);
    }
  }, [workspaceName]);

  console.log('App rendering', { workspaceName, workspaces, isWorkspacesLoading, workspacesData });

  useEffect(() => {
    if (workspacesData && Array.isArray(workspacesData)) {
      setWorkspaces(workspacesData);
    }
  }, [workspacesData]);

  const [showWorkspaceInput, setShowWorkspaceInput] = useState(false);
  
  useEffect(() => {
    if (idToken) {
      filesystemService.setToken(idToken);
    }
  }, [idToken]);

  useWorkspacePersistence(workspaceName, messages, setMessages);

  // Sync profile name to user email
  useEffect(() => {
    if (user && user.email) {
      const activeProfile = profileStore.getActiveProfile();
      if (activeProfile && activeProfile.name === 'User') {
        profileStore.updateProfile(activeProfile.id, { name: user.email });
        setActiveProfile({ ...activeProfile, name: user.email });
      }
    }
  }, [user]);

  const { data: rootFiles } = useFiles(workspaceName, '', false);
  
  useEffect(() => {
    if (rootFiles) {
      setFileStore(prevStore => {
        const store = { ...prevStore };
        rootFiles.forEach(file => {
          const cleanPath = (file.isDir && file.path.endsWith('/')) ? file.path.slice(0, -1) : file.path;
          // Only update if not already tracking this file
          if (!store[cleanPath]) {
            store[cleanPath] = {
              content: '',
              isNew: false,
              isModified: false,
              size: file.size,
              isDir: file.isDir
            };
          }
        });
        return store;
      });
      setIsProjectsLoaded(true);
    }
  }, [rootFiles]);

  const handleFolderExpand = async (path: string) => {
    // Check if we already have children for this folder
    const hasChildren = Object.keys(fileStore).some(p => p.startsWith(path) && p !== path);
    if (hasChildren) return;

    try {
      const subFiles = await filesystemService.listFiles(path, false);
      setFileStore(prev => {
        const newStore = { ...prev };
        subFiles.forEach(file => {
          const cleanPath = (file.isDir && file.path.endsWith('/')) ? file.path.slice(0, -1) : file.path;
          if (!newStore[cleanPath]) {
            newStore[cleanPath] = {
              content: '',
              isNew: false,
              isModified: false,
              size: file.size,
              isDir: file.isDir
            };
          }
        });
        return newStore;
      });
    } catch (e) {
      console.error('Failed to load folder contents', e);
    }
  };

  // Save projects to IndexedDB whenever they change (only in non-filesystem mode)
  useEffect(() => {
    if (isProjectsLoaded && !isProjectsLoading) {
      saveProjects(projects);
    }
  }, [projects, isProjectsLoaded, isProjectsLoading]);

  // Auto-save current project files (only in non-filesystem mode)
  useEffect(() => {
    if (isProjectsLoaded && !isProjectsLoading && currentProjectId) {
      setProjects(prev => prev.map((p: Project) => 
        p.id === currentProjectId 
          ? { ...p, files: fileStore, updatedAt: Date.now() } 
          : p
      ));
    }
  }, [fileStore, currentProjectId, isProjectsLoaded, isProjectsLoading]);

  useEffect(() => {
    if (selectedFile && fileStore[selectedFile] && !fileStore[selectedFile].isDir && !fileStore[selectedFile].content && !fileStore[selectedFile].isNew) {
      const loadContent = async () => {
        try {
          const content = await filesystemService.getFileContent(selectedFile);
          setFileStore(prev => ({
            ...prev,
            [selectedFile]: { ...prev[selectedFile], content, size: content.length }
          }));
        } catch (e) {
          console.error('Failed to load file content', e);
        }
      };
      loadContent();
    }
  }, [selectedFile, fileStore]);

  // Sync fileStore to backend after streaming finishes
  useEffect(() => {
    if (!isStreaming && Object.keys(fileStoreRef.current).length > 0) {
      const syncFiles = async (retries = 3) => {
        try {
          const currentStore = fileStoreRef.current;
          const modifiedFiles = (Object.entries(currentStore) as [string, any][]).filter(([_, f]) => f.isModified || f.isNew || f.isDeleted);
          for (const [path, file] of modifiedFiles) {
            if (file.isDeleted) {
              await filesystemService.deleteFile(path);
            } else if (!file.isDir) {
              await filesystemService.saveFile(path, file.content);
            } else {
              await filesystemService.createFile(path, true);
            }
          }
          
          // Clear flags after sync and remove deleted files from state
          setFileStore(prev => {
            const newStore = { ...prev };
            modifiedFiles.forEach(([p, file]) => {
              if (newStore[p]) {
                if (file.isDeleted) {
                  delete newStore[p];
                } else {
                  // Only clear flags if the content hasn't changed since we started saving
                  if (newStore[p].content === file.content) {
                    newStore[p] = { ...newStore[p], isModified: false, isNew: false };
                  }
                }
              }
            });
            return newStore;
          });
        } catch (e) {
          console.error('Failed to sync files after stream', e);
          if (retries > 0) {
            console.log(`Retrying file sync... (${retries} retries left)`);
            setTimeout(() => syncFiles(retries - 1), 1000);
          } else {
            // Final failure - alert user
            console.error('File sync failed after multiple retries');
            // TODO: Add user-facing error notification
            // Using a simple alert for now as a placeholder for a proper toast notification
            // In a real app, use a toast library like sonner or react-hot-toast
            // alert('Failed to save files. Some changes may be lost.');
            // Assuming sonner is available based on previous context
            import('sonner').then(({ toast }) => {
              toast.error('Failed to save files. Some changes may be lost.');
            });
            console.error('File sync failed after multiple retries', e);
          }
        }
      };
      syncFiles();
    }
  }, [isStreaming]);

  const hasPreviewableFiles = Object.keys(fileStore).some(path => 
    path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.jsx') || 
    path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.css') || 
    path.endsWith('.vue') || path.endsWith('.svelte')
  );

  useEffect(() => {
    if (!hasPreviewableFiles && mobileView === 'preview') {
      setMobileView('chat');
    }
    if (!hasPreviewableFiles && bottomTab === 'preview') {
      setBottomTab('tree');
    }
  }, [hasPreviewableFiles, mobileView, bottomTab]);

  useEffect(() => {
    const storedKey = localStorage.getItem('gide_api_key');
    if (storedKey) setApiKey(storedKey);
    else setShowKeyModal(true);

    const storedModel = localStorage.getItem('gide_model');
    if (storedModel) setModel(storedModel);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user) return;
      try {
        const data = await filesystemService.listWorkspaces();
        setWorkspaces(data);
      } catch (e: any) {
        // Suppress console error on initial load if it's just a timing issue
        if (e.message !== 'Unauthorized: No token provided') {
          console.error('Failed to fetch workspaces', e.message);
        }
      }
    };
    fetchWorkspaces();
  }, [user]);

  const handleProfileSelect = (profile: Profile) => {
    profileStore.setActiveProfileId(profile.id);
    setActiveProfile(profile);
    setApiKey(profile.apiKey);
    setSettings(profile.settings);
    setShowKeyModal(false);
  };

  const handleSaveKey = (key: string) => {
    if (activeProfile) {
      profileStore.updateProfile(activeProfile.id, { apiKey: key });
      setActiveProfile({ ...activeProfile, apiKey: key });
    }
    localStorage.setItem('gide_api_key', key);
    setApiKey(key);
    setShowKeyModal(false);
  };

  const handleCreateProject = async (name: string) => {
    const newProject = await createProject(name);
    setFileStore({});
    setSelectedFile(null);
    setMessages([]);
    // Ensure the new project is saved to IndexedDB immediately
    await saveProjects([newProject, ...projects]);
    setShowProjectModal(false);
  };

  const handleSaveAll = async () => {
    try {
        const modifiedFiles = (Object.entries(fileStore) as [string, any][]).filter(([_, f]) => f.isModified || f.isNew);
        for (const [path, file] of modifiedFiles) {
          if (!file.isDir) {
            await saveFileMutation.mutateAsync({ workspace: workspaceName, path, content: file.content });
          }
        }
        
        setFileStore(prev => {
          const newStore = { ...prev };
          modifiedFiles.forEach(([path, file]) => {
            if (newStore[path] && newStore[path].content === file.content) {
              newStore[path] = { ...newStore[path], isModified: false, isNew: false };
            }
          });
          return newStore;
        });
      } catch (e) {
        alert('Failed to save some files to filesystem');
      }
  };

  const handleSwitchProject = (id: string) => {
    const hasModifiedFiles = Object.values(fileStore).some((f: any) => f.isModified || f.isNew);
    
    if (hasModifiedFiles) {
      if (!window.confirm('You have unsaved changes in the current project. Are you sure you want to switch? Changes are auto-saved to local storage, but modified flags will be lost.')) {
        return;
      }
    }

    const project = projects.find(p => p.id === id);
    if (project) {
      setCurrentProjectId(id);
      setFileStore(project.files);
      setSelectedFile(null);
      setMessages([]);
      setShowProjectModal(false);
    }
  };

  const handleGenerateReadme = async () => {
    const secretKey = prompt('Enter admin secret key:');
    if (!secretKey) return;

    if (!apiKey) {
      alert('API key required');
      return;
    }
    
    const fileSummary = Object.keys(fileStore).map(path => `${path}: ${fileStore[path].content.substring(0, 500)}...`).join('\n');
    const promptText = `Summarize the application and generate a README.md file with usage instructions based on these files:\n${fileSummary}`;
    
    // Call AI
    const messages = [{ role: 'user', content: promptText }];
    let readmeContent = '';
    
    try {
      await streamGemini(
        messages as Message[],
        'gemini-3-flash-preview',
        apiKey,
        'You are a helpful assistant that generates README.md files.',
        (chunk) => {
          readmeContent += chunk;
        }
      );
      
      // Save to /api/admin/readme
      const response = await filesystemService.client.post('/api/admin/readme', {
        json: { secretKey, content: readmeContent },
      });
      
      if (response.ok) {
        alert('README.md generated successfully');
      } else {
        alert('Failed to save README.md');
      }
    } catch (e) {
      alert('Failed to generate README.md');
    }
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteProject(id);
      if (currentProjectId === id) {
        setFileStore({});
        setSelectedFile(null);
        setMessages([]);
      }
    }
  };

  const handleImportProject = async (file: File) => {
    if (!window.JSZip) return;
    try {
      const zip = new window.JSZip();
      const contents = await zip.loadAsync(file);
      const newFiles: FileStore = {};
      
      for (const [path, zipEntry] of Object.entries(contents.files)) {
        const entry = zipEntry as any;
        if (!entry.dir) {
          const content = await entry.async('string');
          newFiles[path] = {
            content,
            isNew: false,
            isModified: false,
            size: content.length
          };
        }
      }
      
      const newProject: Project = {
        id: generateId(),
        name: file.name.replace('.zip', ''),
        files: newFiles,
        updatedAt: Date.now()
      };
      
      setProjects(prev => [newProject, ...prev]);
      setCurrentProjectId(newProject.id);
      setFileStore(newFiles);
      setSelectedFile(null);
      setMessages([]);
      setShowProjectModal(false);
    } catch (e) {
      console.error('Failed to import project', e);
      alert('Failed to import project. Make sure it is a valid ZIP file.');
    }
  };

  const handleSignInGithub = async () => {
    try {
      await signInWithPopup(auth, githubProvider);
    } catch (error) {
      console.error('Failed to sign in with GitHub', error);
    }
  };

  const handleSignInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Failed to sign in with Google', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setModel(newModel);
    localStorage.setItem('gide_model', newModel);
  };

  const handleDownloadZip = async () => {
    if (!window.JSZip) return;
    const zip = new window.JSZip();
    Object.keys(fileStore).forEach((path) => {
      zip.file(path, fileStore[path].content);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gide-project.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportZip = () => {
    fileInputRef.current?.click();
  };

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('zip', file);
    formData.append('workspace', workspaceName);
    formData.append('idToken', await auth.currentUser!.getIdToken());

    try {
      const response = await fetch('/api/import-zip', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('ZIP imported successfully');
        window.location.reload();
      } else {
        alert('Failed to import ZIP');
      }
    } catch (e) {
      alert('Failed to import ZIP');
    }
  };

  const handleDownloadFile = (path: string) => {
    const file = fileStore[path];
    if (!file) return;
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [fileToRename, setFileToRename] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');

  const handleDeleteFile = (path: string) => {
    setFileToDelete(path);
  };

  const confirmDelete = async () => {
    if (fileToDelete) {
      try {
        await deleteFileMutation.mutateAsync({ workspace: workspaceName, path: fileToDelete });
      } catch (e) {
        alert('Failed to delete file from filesystem');
        return;
      }

      setFileStore(prev => {
        const newStore = { ...prev };
        Object.keys(newStore).forEach(path => {
          if (path === fileToDelete || path.startsWith(fileToDelete + '/')) {
            delete newStore[path];
          }
        });
        return newStore;
      });
      if (selectedFile === fileToDelete || (selectedFile && selectedFile.startsWith(fileToDelete + '/'))) {
        setSelectedFile(null);
      }
      setFileToDelete(null);
    }
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    if (!newPath || newPath === oldPath) return;

    try {
      await renameFileMutation.mutateAsync({ workspace: workspaceName, oldPath, newPath });
    } catch (e) {
      alert('Failed to rename file on filesystem');
      return;
    }

    setFileStore(prev => {
      const newStore = { ...prev };
      
      // Ensure new parent directories exist
      const parts = newPath.split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + parts[i];
        if (!newStore[currentPath]) {
          newStore[currentPath] = { 
            content: '', 
            isNew: true, 
            isModified: false, 
            size: 0, 
            isDir: true 
          };
        }
      }

      // Rename the item and all its children if it's a directory
      Object.keys(newStore).forEach(path => {
        if (path === oldPath || path.startsWith(oldPath + '/')) {
          const updatedPath = path.replace(oldPath, newPath);
          newStore[updatedPath] = { ...newStore[path] };
          delete newStore[path];
        }
      });

      return newStore;
    });
    if (selectedFile === oldPath || (selectedFile && selectedFile.startsWith(oldPath + '/'))) {
      setSelectedFile(selectedFile.replace(oldPath, newPath));
    }
  };

  const handleCreateFile = async (path: string) => {
    if (!path) return;

    try {
      await createFileMutation.mutateAsync({ workspace: workspaceName, path });
    } catch (e) {
      alert('Failed to create file on filesystem');
      return;
    }

    setFileStore(prev => {
      if (prev[path]) return prev; // Don't overwrite
      
      const newStore = { ...prev };
      const parts = path.split('/');
      let currentPath = '';
      
      // Create parent directories
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + parts[i];
        if (!newStore[currentPath]) {
          newStore[currentPath] = { 
            content: '', 
            isNew: true, 
            isModified: false, 
            size: 0, 
            isDir: true 
          };
        }
      }
      
      newStore[path] = { content: '', isNew: true, isModified: false, size: 0 };
      return newStore;
    });
    setSelectedFile(path);
    if (mobileView !== 'editor') {
      setMobileView('editor');
    }
  };

  const processSlashCommand = (msg: string): boolean => {
    if (msg.startsWith('/help')) {
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }, { id: generateId(), role: 'model', content: '**Available Commands:**\n- `/help` : Show this message\n- `/reset` : Clear chat and files\n- `/files` : Print file tree\n- `/zip` : Download project as ZIP\n- `/preview` : Switch to Preview tab\n- `/persona <name>` : Switch persona\n- `/verbose` : Toggle verbose mode\n- `/terse` : Toggle terse mode' }]);
      return true;
    }
    if (msg.startsWith('/reset')) {
      if (window.confirm('Are you sure you want to clear all chat history and files?')) {
        setMessages([]);
        filesystemService.loadAllFiles().then(setFileStore);
        setSelectedFile(null);
      }
      return true;
    }
    if (msg.startsWith('/files')) {
      const tree = Object.keys(fileStore).map(p => `- ${p}`).join('\n');
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }, { id: generateId(), role: 'model', content: `**Current Files:**\n${tree || 'No files yet.'}` }]);
      return true;
    }
    if (msg.startsWith('/zip')) {
      handleDownloadZip();
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }, { id: generateId(), role: 'model', content: 'Triggered ZIP download.' }]);
      return true;
    }
    if (msg.startsWith('/preview')) {
      setBottomTab('preview');
      setMobileView('preview');
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }, { id: generateId(), role: 'model', content: 'Switched to Preview tab.' }]);
      return true;
    }
    if (msg.startsWith('/persona ')) {
      const persona = msg.split(' ')[1];
      setSystemModifier(`\n\n[CURRENT PERSONA: ${persona.toUpperCase()}]`);
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }, { id: generateId(), role: 'model', content: `[→ ${persona.toUpperCase()}] Persona activated.` }]);
      return true;
    }
    if (msg.startsWith('/verbose')) {
      setSystemModifier('\n\n[MODE: VERBOSE AND EXPLANATORY]');
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }, { id: generateId(), role: 'model', content: 'Verbose mode enabled.' }]);
      return true;
    }
    if (msg.startsWith('/terse')) {
      setSystemModifier('\n\n[MODE: TERSE AND TECHNICAL]');
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }, { id: generateId(), role: 'model', content: 'Terse mode enabled.' }]);
      return true;
    }
    return false;
  };

  const handleAiAction = (type: 'explain' | 'refactor' | 'fix', code?: string) => {
    const finalCode = code || (selectedFile ? fileStore[selectedFile]?.content : '');
    if (!finalCode) return;

    let prompt = '';
    const fileLabel = selectedFile ? ` in ${selectedFile}` : '';
    
    switch (type) {
      case 'explain':
        prompt = `Explain this code${fileLabel}:\n\n\`\`\`\n${finalCode}\n\`\`\``;
        break;
      case 'refactor':
        prompt = `Refactor this code${fileLabel} to be more efficient, clean, and modern. Provide the full refactored version:\n\n\`\`\`\n${finalCode}\n\`\`\``;
        break;
      case 'fix':
        prompt = `Find and fix any bugs, potential issues, or performance bottlenecks in this code${fileLabel}:\n\n\`\`\`\n${finalCode}\n\`\`\``;
        break;
    }
    
    if (mobileView !== 'chat') setMobileView('chat');
    handleSendMessage(prompt);
  };

  const handleSendMessage = async (content: string) => {
    if (processSlashCommand(content)) return;
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }

    const userMsgId = generateId();
    const userMessage: Message = { id: userMsgId, role: 'user', content };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    
    const processAIResponse = async (currentMessages: Message[], currentFileStore: typeof fileStore, depth: number = 0) => {
      if (depth > 5) {
        console.warn('AI tool call depth limit reached (5). Breaking loop to prevent memory exhaustion.');
        setIsStreaming(false);
        return;
      }
      const modelMsgId = generateId();
      setMessages([...currentMessages, { id: modelMsgId, role: 'model', content: '' }]);
      setIsStreaming(true);

      try {
        let fullResponse = '';
        let finalFunctionCalls: { name: string; args: any }[] | undefined;
        
        const fileTree = Object.entries(currentFileStore).map(([path, file]) => {
          const skeleton = generateAstSkeleton(file.content, path);
          if (skeleton) {
            return `- ${path}\n  AST Summary:\n  ${skeleton.split('\n').join('\n  ')}`;
          }
          return `- ${path}`;
        }).join('\n');
        const personaInstruction = settings.aiPersona === 'custom' 
          ? settings.customPersona 
          : `Act as a ${settings.aiPersona}.`;

        const systemPrompt = getSystemInstruction(enabledTools) + 
          `\n\n[CURRENT WORKSPACE CONTEXT]\n` +
          `Workspace Name: ${workspaceName}\n` +
          `Active File: ${selectedFile || 'None'}\n` +
          `\n[CURRENT WORKSPACE FILES & STRUCTURE]\n` +
          `The following is a list of files in the current workspace. For supported files (JS, TS, Python), ` +
          `a structural AST summary is provided to help you understand the codebase without reading every file. ` +
          `Use these summaries to identify relevant functions, classes, and types.\n\n` +
          `${fileTree || 'No files yet.'}\n` +
          `\n\n[AI PERSONA: ${settings.aiPersona.toUpperCase()}]\n${personaInstruction}\n` +
          (settings.aiChainOfThought ? "\n[CHAIN OF THOUGHT]\nYou MUST wrap your internal reasoning process in <thinking> tags before providing your final response. This reasoning should include your plan, file manifest, and any complexity estimates.\n" : "") +
          systemModifier;

        // Truncate context window to last 20 messages to prevent token limits
        const MAX_MESSAGES = 20;
        const messagesToProcess = currentMessages.length > MAX_MESSAGES 
          ? currentMessages.slice(-MAX_MESSAGES) 
          : currentMessages;

        await streamGemini(
          messagesToProcess,
          model,
          apiKey,
          systemPrompt,
          (chunk, functionCalls) => {
            fullResponse += chunk;
            finalFunctionCalls = functionCalls;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1].content = fullResponse;
              if (functionCalls) {
                updated[updated.length - 1].functionCalls = functionCalls;
              }
              return updated;
            });
            setFileStore(prevStore => {
              const extractedStore = extractFiles(fullResponse, currentFileStore);
              const mergedStore = { ...extractedStore };
              
              // Preserve user edits made during streaming
              for (const path in prevStore) {
                if (!currentFileStore[path] || prevStore[path].content !== currentFileStore[path].content) {
                  mergedStore[path] = prevStore[path];
                }
              }
              
              // Respect user deletions made during streaming
              for (const path in currentFileStore) {
                if (!prevStore[path]) {
                  delete mergedStore[path];
                }
              }
              
              return mergedStore;
            });
          },
          settings.temperature
        );

        if (finalFunctionCalls && finalFunctionCalls.length > 0) {
          const functionResponses: { name: string; response: any }[] = [];
          for (const call of finalFunctionCalls) {
            try {
              switch (call.name) {
                case 'runCommand': {
                  const res = await filesystemService.runTool(call.args.command);
                  functionResponses.push({ name: call.name, response: res });
                  break;
                }
                case 'read_file': {
                  const content = await filesystemService.getFileContent(call.args.path);
                  functionResponses.push({ name: call.name, response: { content } });
                  break;
                }
                case 'write_file': {
                  await filesystemService.saveFile(call.args.path, call.args.content);
                  setFileStore(prev => ({
                    ...prev,
                    [call.args.path]: { content: call.args.content, isNew: !prev[call.args.path], isModified: true, size: call.args.content.length }
                  }));
                  functionResponses.push({ name: call.name, response: { success: true } });
                  break;
                }
                case 'apply_diff': {
                  const original = await filesystemService.getFileContent(call.args.path).catch(() => '');
                  const patched = applyDiff(original, call.args.diff);
                  await filesystemService.saveFile(call.args.path, patched);
                  setFileStore(prev => ({
                    ...prev,
                    [call.args.path]: { content: patched, isNew: !prev[call.args.path], isModified: true, size: patched.length }
                  }));
                  functionResponses.push({ name: call.name, response: { success: true } });
                  break;
                }
                case 'search_code': {
                  const res = await filesystemService.search(call.args.pattern);
                  functionResponses.push({ name: call.name, response: { results: res } });
                  break;
                }
                case 'find_symbol': {
                  const idToken = await auth.currentUser?.getIdToken();
                  const res = await fetch('/api/tools/find_symbol', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                    body: JSON.stringify({ symbol: call.args.symbol, file_pattern: call.args.file_pattern, workspace: workspaceName })
                  });
                  const data = await res.json();
                  functionResponses.push({ name: call.name, response: data });
                  break;
                }
                case 'get_diagnostics': {
                  const idToken = await auth.currentUser?.getIdToken();
                  const res = await fetch('/api/tools/diagnostics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                    body: JSON.stringify({ file_path: call.args.file_path, workspace: workspaceName })
                  });
                  const data = await res.json();
                  functionResponses.push({ name: call.name, response: data });
                  break;
                }
                case 'mcp_dispatch': {
                  const idToken = await auth.currentUser?.getIdToken();
                  const argsObj = typeof call.args.args === 'string' ? JSON.parse(call.args.args) : (call.args.args || {});
                  const res = await fetch('/api/mcp/call', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                    body: JSON.stringify({ serverName: call.args.server_name, toolName: call.args.tool_name, args: argsObj })
                  });
                  const data = await res.json();
                  functionResponses.push({ name: call.name, response: data });
                  break;
                }
                default: {
                  // Fallback for legacy dynamic MCP tools
                  const idToken = await auth.currentUser?.getIdToken();
                  const argsObj = typeof call.args.args === 'string' ? JSON.parse(call.args.args) : (call.args.args || {});
                  const res = await fetch('/api/mcp/call', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                    body: JSON.stringify({ serverName: call.name, toolName: call.args.toolName, args: argsObj })
                  });
                  const data = await res.json();
                  functionResponses.push({ name: call.name, response: data });
                  break;
                }
              }
            } catch (err) {
              functionResponses.push({ name: call.name, response: { error: String(err) } });
            }
          }

          const nextMessages: Message[] = [
            ...currentMessages,
            { id: generateId(), role: 'model', content: fullResponse, functionCalls: finalFunctionCalls },
            { id: generateId(), role: 'function', content: '', functionResponses }
          ];
          
          // Use the latest fileStore from the ref to ensure user edits are preserved
          await processAIResponse(nextMessages, fileStoreRef.current, depth + 1);
        } else {
          toast.success('Response received');
          setIsStreaming(false);
        }
      } catch (error: any) {
        console.error('Error streaming Gemini:', error);
        toast.error('Failed to send message: ' + error.message);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content += `\n\n**Error:** ${error.message}`;
          return updated;
        });
        setIsStreaming(false);
      }
    };

    await processAIResponse(newMessages, { ...fileStore });
  };

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  const handleFileChange = async (newContent: string | undefined) => {
    if (selectedFile && newContent !== undefined) {
      setFileStore(prev => ({
        ...prev,
        [selectedFile]: {
          ...prev[selectedFile],
          content: newContent,
          isModified: true,
          size: newContent.length
        }
      }));

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            await saveFileMutation.mutateAsync({ workspace: workspaceName, path: selectedFile, content: newContent });
            setFileStore(prev => {
              if (prev[selectedFile] && prev[selectedFile].content === newContent) {
                return {
                  ...prev,
                  [selectedFile]: { ...prev[selectedFile], isModified: false }
                };
              }
              return prev;
            });
          } catch (e) {
            console.error('Failed to auto-save to filesystem', e);
          }
        }, settings.autoSaveInterval);
    }
  };

  const totalTokens = messages.reduce((acc, m) => acc + m.content.length, 0) / 4;

  return (
    <div className={`flex flex-col h-[100dvh] bg-[#1e1e1e] text-[#d4d4d4] font-sans overflow-hidden ${
      settings.theme === 'light' ? 'bg-white text-gray-900' : 
      settings.theme === 'high-contrast' ? 'bg-black text-yellow-400' : ''
    } ${settings.compactMode ? 'text-xs' : ''}`}>
      <Toaster position="top-right" richColors closeButton />
      <ModalsContainer
          showProjectModal={showProjectModal}
          setShowProjectModal={setShowProjectModal}
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
          handleSwitchProject={handleSwitchProject}
          handleCreateProject={handleCreateProject}
          handleDeleteProject={handleDeleteProject}
          handleImportProject={handleImportProject}
          handleSaveKey={handleSaveKey}
          apiKey={apiKey}
          user={user}
          setWorkspaceName={setWorkspaceName}
          workspaceName={workspaceName}
          settings={settings}
          setSettings={setSettings}
        />

        {showGitPanel && (
          <Suspense fallback={null}>
            <GitPanel onClose={() => setShowGitPanel(false)} workspace={workspaceName} />
          </Suspense>
        )}

        {showTerminal && (
          <Suspense fallback={null}>
            <TerminalPanel onClose={() => setShowTerminal(false)} workspace={workspaceName} />
          </Suspense>
        )}

      <Header
        user={user}
        workspaceName={workspaceName}
        isWorkspacesLoading={isWorkspacesLoading}
        workspaces={workspaces}
        model={model}
        setModel={setModel}
        onSignInGoogle={handleSignInGoogle}
        onSignInGithub={handleSignInGithub}
        onSignOut={handleSignOut}
        onShowWorkspaceModal={() => setShowWorkspaceModal(true)}
        onShowSettingsModal={() => setShowSettingsModal(true)}
        onShowGitPanel={() => setShowGitPanel(true)}
        onShowTerminal={() => setShowTerminal(!showTerminal)}
        onShowCommandPalette={() => setShowCommandPalette(true)}
        onShowMcpModal={() => setShowMcpModal(!showMcpModal)}
        showMcpModal={showMcpModal}
        onSaveAll={handleSaveAll}
        activeProfile={activeProfile}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Mobile Navigation Tabs */}
      <div className="sm:hidden flex border-b border-[#3c3c3c] bg-[#252526] shrink-0">
        <button
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors relative ${mobileView === 'chat' ? 'text-white' : 'text-[#858585]'}`}
          onClick={() => setMobileView('chat')}
        >
          Chat
          {mobileView === 'chat' && <motion.div layoutId="mobileTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007acc]" />}
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors relative ${mobileView === 'editor' ? 'text-white' : 'text-[#858585]'}`}
          onClick={() => setMobileView('editor')}
        >
          Editor
          {mobileView === 'editor' && <motion.div layoutId="mobileTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007acc]" />}
        </button>
        {hasPreviewableFiles && (
          <button
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors relative ${mobileView === 'preview' ? 'text-white' : 'text-[#858585]'}`}
            onClick={() => setMobileView('preview')}
          >
            Preview
            {mobileView === 'preview' && <motion.div layoutId="mobileTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007acc]" />}
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col sm:flex-row overflow-hidden relative bg-[#1e1e1e] ${
        settings.sidebarPosition === 'right' ? 'sm:flex-row-reverse' : ''
      }`}>
        
        <AuthGuard
          user={user}
          isAuthLoading={isAuthLoading}
          isWorkspacesLoading={isWorkspacesLoading}
          isWorkspacesError={isWorkspacesError}
          workspaces={workspaces}
          workspaceName={workspaceName}
          showWorkspaceModal={showWorkspaceModal}
          onSignInGoogle={handleSignInGoogle}
          onSignInGithub={handleSignInGithub}
          onShowWorkspaceModal={() => setShowWorkspaceModal(true)}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['workspaces'] })}
          idToken={idToken}
        />

        {/* Profile Selector */}
        <AnimatePresence>
          {!activeProfile && (
            <Suspense fallback={null}>
              <ProfileSelector onSelect={handleProfileSelect} />
            </Suspense>
          )}
        </AnimatePresence>
        
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
{user ? (
          <>
            {/* Desktop Resizable Layout */}
            <div className="hidden sm:flex flex-1 h-full">
                <PanelGroup orientation="horizontal">
              {/* Chat Panel */}
              <Panel defaultSize={30} minSize={20}>
                <ErrorBoundary name="Chat Panel">
                  <Suspense fallback={<PanelLoader />}>
                    <ChatPanel
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      onNewChat={() => setMessages([])}
                      onReviewChange={(filename, content) => {
                        const original = fileStore[filename]?.content || '';
                        setPendingDiff({ filename, original, modified: content });
                      }}
                      isStreaming={isStreaming}
                      settings={settings}
                    />
                  </Suspense>
                </ErrorBoundary>
              </Panel>

              <PanelResizeHandle className="w-[1px] bg-[#3c3c3c] hover:bg-[#007acc] transition-colors z-20" />

              {/* Editor Panel */}
              <Panel defaultSize={50} minSize={30}>
                <ErrorBoundary name="Code Editor">
                  <Suspense fallback={<PanelLoader />}>
                    <CodeEditor
                      content={selectedFile ? fileStore[selectedFile]?.content || '' : ''}
                      filename={selectedFile || ''}
                      onOpenFiles={() => setIsMobileMenuOpen(true)}
                      onChange={handleFileChange}
                      onAiAction={handleAiAction}
                      targetLine={targetLine}
                      onLineRevealed={() => setTargetLine(undefined)}
                      settings={settings}
                    />
                  </Suspense>
                </ErrorBoundary>
              </Panel>

              <PanelResizeHandle className="w-[1px] bg-[#3c3c3c] hover:bg-[#007acc] transition-colors z-20" />

              {/* File Tree Panel */}
              <Panel defaultSize={20} minSize={15}>
                <div className="flex flex-col h-full">
                  <div className="flex items-center bg-[#252526] border-b border-[#3c3c3c] px-2">
                    <button
                      onClick={() => setSidebarTab('files')}
                      className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                        sidebarTab === 'files' ? 'text-[#007acc] border-[#007acc]' : 'text-[#858585] border-transparent hover:text-[#cccccc]'
                      }`}
                    >
                      Files
                    </button>
                    <button
                      onClick={() => setSidebarTab('search')}
                      className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                        sidebarTab === 'search' ? 'text-[#007acc] border-[#007acc]' : 'text-[#858585] border-transparent hover:text-[#cccccc]'
                      }`}
                    >
                      Search
                    </button>
                    <button
                      onClick={() => setSidebarTab('mcp')}
                      className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                        sidebarTab === 'mcp' ? 'text-[#007acc] border-[#007acc]' : 'text-[#858585] border-transparent hover:text-[#cccccc]'
                      }`}
                    >
                      MCP
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <ErrorBoundary name="Sidebar Panel">
                      <Suspense fallback={<PanelLoader />}>
                        {sidebarTab === 'files' ? (
                          <FileTree
                            files={fileStore}
                            selectedFile={selectedFile}
                            workspaceName={workspaceName}
                            onSelect={(path) => { setSelectedFile(path); setIsMobileMenuOpen(false); setMobileView('editor'); }}
                            onDownload={handleDownloadFile}
                            onDownloadZip={handleDownloadZip}
                            onImportZip={handleImportZip}
                            onDelete={handleDeleteFile}
                            onRename={(oldPath) => { setFileToRename(oldPath); setNewFileName(oldPath); }}
                            onCreateFile={() => { setIsCreatingFile(true); setNewFilePath('new_file.txt'); }}
                            onFolderExpand={handleFolderExpand}
                            showDetails={true}
                          />
                        ) : sidebarTab === 'search' ? (
                          <SearchPanel 
                            onSelectFile={(path, line) => {
                              setSelectedFile(path);
                              setTargetLine(line);
                              setIsMobileMenuOpen(false);
                              setMobileView('editor');
                            }} 
                          />
                        ) : (
                          <McpPanel />
                        )}
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </div>

          {/* Mobile View (Non-resizable) */}
          <div className="sm:hidden flex flex-1 h-full">
            {mobileView === 'chat' && (
              <div className="w-full h-full">
                <ErrorBoundary name="Chat Panel">
                  <Suspense fallback={<PanelLoader />}>
                    <ChatPanel
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      onNewChat={() => setMessages([])}
                      onReviewChange={(filename, content) => {
                        const original = fileStore[filename]?.content || '';
                        setPendingDiff({ filename, original, modified: content });
                      }}
                      isStreaming={isStreaming}
                      settings={settings}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
            {mobileView === 'editor' && (
              <div className="w-full h-full">
                <ErrorBoundary name="Code Editor">
                  <Suspense fallback={<PanelLoader />}>
                    <CodeEditor
                      content={selectedFile ? fileStore[selectedFile]?.content || '' : ''}
                      filename={selectedFile || ''}
                      onOpenFiles={() => setIsMobileMenuOpen(true)}
                      onChange={handleFileChange}
                      onAiAction={handleAiAction}
                      targetLine={targetLine}
                      onLineRevealed={() => setTargetLine(undefined)}
                      settings={settings}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
          </div>

        {/* Mobile Sidebar Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="sm:hidden absolute inset-y-0 left-0 z-40 w-[80%] bg-[#1e1e1e] border-r border-[#3c3c3c] shadow-2xl flex flex-col"
            >
              <Suspense fallback={null}>
                <MobileSidebar
                  isOpen={isMobileMenuOpen}
                  onClose={() => setIsMobileMenuOpen(false)}
                  fileStore={fileStore}
                  selectedFile={selectedFile}
                  onSelectFile={(path, line) => {
                    setSelectedFile(path);
                    if (line) setTargetLine(line);
                    setIsMobileMenuOpen(false);
                    setMobileView('editor');
                  }}
                  onDownloadFile={handleDownloadFile}
                  onDownloadZip={handleDownloadZip}
                  onImportZip={handleImportZip}
                  onDeleteFile={handleDeleteFile}
                  onRenameFile={(oldPath) => { setFileToRename(oldPath); setNewFileName(oldPath); }}
                  onCreateFile={() => { setIsCreatingFile(true); setNewFilePath('new_file.txt'); }}
                  onFolderExpand={handleFolderExpand}
                  onSaveAll={handleSaveAll}
                  onNewSession={() => { setMessages([]); setFileStore({}); setSelectedFile(null); setIsMobileMenuOpen(false); }}
                  onShowKeyModal={() => { setShowKeyModal(true); setIsMobileMenuOpen(false); }}
                  onShowSettingsModal={() => { setShowSettingsModal(true); setIsMobileMenuOpen(false); }}
                  onShowWorkspaceModal={() => { setShowWorkspaceModal(true); setIsMobileMenuOpen(false); }}
                  onShowCommandPalette={() => { setShowCommandPalette(true); setIsMobileMenuOpen(false); }}
                  onShowSearchPanel={() => { setSidebarTab('search'); setIsMobileMenuOpen(false); }}
                  model={model}
                  onModelChange={handleModelChange}
                  workspaceName={workspaceName}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    ) : (
      <LandingPage onSignInGoogle={handleSignInGoogle} onSignInGithub={handleSignInGithub} />
    )}
    </div>

      {/* Bottom Panel (Desktop) / Preview (Mobile) */}
      <div className={`h-[30%] sm:h-[30%] shrink-0 ${mobileView !== 'preview' ? 'hidden sm:flex' : 'flex'} flex-col shadow-[0_-4px_10px_rgba(0,0,0,0.2)] z-10`}>
        <ErrorBoundary name="Bottom Panel">
          <Suspense fallback={<PanelLoader />}>
            <BottomPanel
              files={fileStore}
              activeTab={bottomTab}
              onTabChange={setBottomTab}
              onSelectFile={setSelectedFile}
              onDownloadFile={handleDownloadFile}
              onDownloadZip={handleDownloadZip}
              onImportZip={handleImportZip}
              onDeleteFile={handleDeleteFile}
              hasPreviewableFiles={hasPreviewableFiles}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Modals for File Operations */}
      <AnimatePresence>
        {fileToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#252526] border border-[#3c3c3c] rounded-xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Delete File</h3>
              <p className="text-[#cccccc] text-sm mb-6">Are you sure you want to delete <span className="font-mono text-red-400">{fileToDelete}</span>? This cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setFileToDelete(null)} className="px-4 py-2 text-sm text-[#cccccc] hover:bg-[#3c3c3c] rounded-md transition-colors">Cancel</button>
                <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Delete</button>
              </div>
            </motion.div>
          </div>
        )}

        {fileToRename && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#252526] border border-[#3c3c3c] rounded-xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Rename File</h3>
              <input 
                type="text" 
                value={newFileName} 
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc] mb-6 font-mono"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameFile(fileToRename, newFileName);
                    setFileToRename(null);
                  }
                }}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setFileToRename(null)} className="px-4 py-2 text-sm text-[#cccccc] hover:bg-[#3c3c3c] rounded-md transition-colors">Cancel</button>
                <button onClick={() => { handleRenameFile(fileToRename, newFileName); setFileToRename(null); }} className="px-4 py-2 text-sm bg-[#007acc] text-white rounded-md hover:bg-[#005f9e] transition-colors">Rename</button>
              </div>
            </motion.div>
          </div>
        )}

        {isCreatingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#252526] border border-[#3c3c3c] rounded-xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-white mb-4">New File</h3>
              <input 
                type="text" 
                value={newFilePath} 
                onChange={(e) => setNewFilePath(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc] mb-2 font-mono"
                placeholder="path/to/file.ext"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFile(newFilePath);
                    setIsCreatingFile(false);
                  }
                }}
              />
              <p className="text-xs text-[#858585] mb-6">Use slashes (/) to create subdirectories automatically.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsCreatingFile(false)} className="px-4 py-2 text-sm text-[#cccccc] hover:bg-[#3c3c3c] rounded-md transition-colors">Cancel</button>
                <button onClick={() => { handleCreateFile(newFilePath); setIsCreatingFile(false); }} className="px-4 py-2 text-sm bg-[#007acc] text-white rounded-md hover:bg-[#005f9e] transition-colors">Create</button>
              </div>
            </motion.div>
          </div>
        )}

        {showCommandPalette && (
          <Suspense fallback={null}>
            <CommandPalette
              isOpen={showCommandPalette}
              onClose={() => setShowCommandPalette(false)}
              files={Object.keys(fileStore)}
              workspaces={workspaces}
              onSelectFile={(path) => { setSelectedFile(path); setMobileView('editor'); }}
              onSelectWorkspace={(name) => setWorkspaceName(name)}
              onOpenSettings={() => setShowSettingsModal(true)}
              onAiAction={handleAiAction}
              onGenerateReadme={handleGenerateReadme}
            />
          </Suspense>
        )}
        <input type="file" ref={fileInputRef} onChange={handleZipFileChange} className="hidden" accept=".zip" />

        {pendingDiff && (
          <Suspense fallback={null}>
            <DiffViewer
              filename={pendingDiff.filename}
              originalContent={pendingDiff.original}
              modifiedContent={pendingDiff.modified}
              onAccept={() => {
                handleFileChange(pendingDiff.modified);
                setPendingDiff(null);
              }}
              onDiscard={() => setPendingDiff(null)}
              onClose={() => setPendingDiff(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Footer */}
      <input type="file" ref={fileInputRef} onChange={handleZipFileChange} className="hidden" accept=".zip" />
      <footer className="flex items-center justify-between px-4 py-1 bg-[#007acc] text-white text-xs shrink-0">
        <div className="flex items-center gap-4">
          <span>GIDE v1.0</span>
          <span>{Object.keys(fileStore).length} files</span>
        </div>
        <div>
          ~{Math.round(totalTokens)} tokens
        </div>
      </footer>
      </div>
    </div>
  );
}

