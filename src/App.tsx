import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { Terminal, Key, Plus, Menu, X, Loader2, FolderOpen, Download, Search, Settings as SettingsIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Message, streamGemini } from './lib/gemini';
import { FileStore, extractFiles } from './lib/fileStore';
import { Project, getProjects, saveProjects, getCurrentProjectId, setCurrentProjectId, generateId } from './lib/projectStore';
import { filesystemService } from './lib/filesystemService';
import { settingsStore, Settings } from './lib/settingsStore';

import { profileStore, Profile } from './lib/profileStore';

// Lazy load heavy components
const ApiKeyModal = lazy(() => import('./components/ApiKeyModal').then(m => ({ default: m.ApiKeyModal })));
const ChatPanel = lazy(() => import('./components/ChatPanel').then(m => ({ default: m.ChatPanel })));
const CodeEditor = lazy(() => import('./components/CodeEditor').then(m => ({ default: m.CodeEditor })));
const FileTree = lazy(() => import('./components/FileTree').then(m => ({ default: m.FileTree })));
const BottomPanel = lazy(() => import('./components/BottomPanel').then(m => ({ default: m.BottomPanel })));
const ProjectModal = lazy(() => import('./components/ProjectModal').then(m => ({ default: m.ProjectModal })));
const WorkspaceModal = lazy(() => import('./components/WorkspaceModal').then(m => ({ default: m.WorkspaceModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const SearchPanel = lazy(() => import('./components/SearchPanel').then(m => ({ default: m.SearchPanel })));
const CommandPalette = lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const DiffViewer = lazy(() => import('./components/DiffViewer').then(m => ({ default: m.DiffViewer })));
const MobileSidebar = lazy(() => import('./components/MobileSidebar').then(m => ({ default: m.MobileSidebar })));
const ProfileSelector = lazy(() => import('./components/ProfileSelector').then(m => ({ default: m.ProfileSelector })));
const ToolsPanel = lazy(() => import('./components/ToolsPanel').then(m => ({ default: m.ToolsPanel })));

const PanelLoader = () => (
  <div className="flex-1 flex items-center justify-center h-full bg-[#1e1e1e] text-[#858585]">
    <Loader2 className="w-6 h-6 animate-spin text-[#007acc]" />
  </div>
);

const SYSTEM_INSTRUCTION = `You are GIDE (Gemini Interactive Development Environment), a browser-based AI software engineering agent. You help users build real multi-file software projects.

WORKSPACE MODE: You are currently running in Workspace Mode. You have direct access to a isolated 'workspaces' folder on the server. All your file operations are restricted to this folder for security. You cannot access the IDE's own source code.

TONE: Terse and technical by default. Switch to verbose/explanatory mode only when the user asks.

PERSONAS: You can act as one of: architect, coder, debugger, reviewer, tester, docs, security. Announce switches as [→ PERSONA NAME].

PLANNING: Before writing any code, always output a PLAN block:
PLAN ───────────────────────────────
Goal    : <one line>
Persona : <active>
Files   :
  - path/file.ext  [CREATE|EDIT] — purpose
Steps   : 1. ... 2. ...
────────────────────────────────────
Proceed? [y/n/edit]

Wait for the user to confirm before coding. Do NOT ask "Proceed?" after outputting code or ZIP manifests.

TOOLS: You have access to project tools via the Tools Panel. You can ask the user to run commands like:
- \`npm run lint\`: Check for code quality issues.
- \`npm test\`: Run project tests.
- \`npx tsc --noEmit\`: Type check TypeScript files.
- \`ls -R\`: List all files recursively.
- \`grep -r "pattern" .\`: Search for text in files.
You can also suggest custom commands using allowed tools: npm, npx, node, ls, pwd, grep, cat, find.

CODE OUTPUT: You MUST wrap all code in Markdown fenced code blocks. The very first word after the triple backticks MUST be the exact file path. Do NOT use language names like 'bash' or 'javascript'.
- First time creating a file:
\`\`\`path/to/file.ext
<full file content>
\`\`\`
- Subsequent edits (unified diff):
\`\`\`diff path/to/file.ext
--- path/to/file.ext
+++ path/to/file.ext
@@ -1,3 +1,3 @@
...
\`\`\`
- Deleting a file:
\`\`\`delete
path/to/file.ext
\`\`\`
- Renaming a file:
\`\`\`rename
old/path.ext
new/path.ext
\`\`\`
Never re-output a full file unless the user runs /full <filename>.

ZIP: When ready, output a ZIP MANIFEST listing all files. The app will handle the download. If the user says 'y' after a ZIP MANIFEST, just say "The ZIP file has been generated. Let me know if you need anything else."

SLASH COMMANDS: Respond to /plan /persona /full /zip /files /reset /verbose /terse /help /preview.`;

export default function App() {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(profileStore.getActiveProfile());
  const [apiKey, setApiKey] = useState<string | null>(activeProfile?.apiKey || null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [model, setModel] = useState('gemini-2.5-flash-lite');
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileStore, setFileStore] = useState<FileStore>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<'preview' | 'tree' | 'tools'>('preview');
  const [isStreaming, setIsStreaming] = useState(false);
  const [systemModifier, setSystemModifier] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'chat' | 'editor' | 'preview'>('chat');
  const [sidebarTab, setSidebarTab] = useState<'files' | 'search'>('files');
  const [targetLine, setTargetLine] = useState<number | undefined>(undefined);

  // Project Management State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectIdState, setCurrentProjectIdState] = useState<string | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<{ filename: string; original: string; modified: string } | null>(null);
  const [settings, setSettings] = useState<Settings>(activeProfile?.settings || settingsStore.get());
  const [isProjectsLoaded, setIsProjectsLoaded] = useState(false);
  const [isFilesystemMode, setIsFilesystemMode] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [showWorkspaceInput, setShowWorkspaceInput] = useState(false);

  // Check for filesystem mode and load files
  useEffect(() => {
    const initFilesystem = async () => {
      try {
        filesystemService.setWorkspace(workspaceName);
        const store = await filesystemService.loadRootFiles();
        setFileStore(store);
        setIsFilesystemMode(true);
        setIsProjectsLoaded(true);
      } catch (e) {
        console.log('Filesystem API not available, falling back to local storage mode.');
        setIsFilesystemMode(false);
        
        // Fallback to local storage projects
        const loadedProjects = getProjects();
        setProjects(loadedProjects);
        const savedProjectId = getCurrentProjectId();
        
        if (savedProjectId) {
          const project = loadedProjects.find(p => p.id === savedProjectId);
          if (project) {
            setCurrentProjectIdState(savedProjectId);
            setFileStore(project.files);
          } else {
            setCurrentProjectId(null);
          }
        }
        setIsProjectsLoaded(true);
      }
    };
    
    const timeout = setTimeout(initFilesystem, workspaceName ? 500 : 0);
    return () => clearTimeout(timeout);
  }, [workspaceName]);

  const handleFolderExpand = async (path: string) => {
    if (!isFilesystemMode) return;
    
    // Check if we already have children for this folder
    const hasChildren = Object.keys(fileStore).some(p => p.startsWith(path) && p !== path);
    if (hasChildren) return;

    try {
      const subFiles = await filesystemService.listFiles(path, false);
      setFileStore(prev => {
        const newStore = { ...prev };
        subFiles.forEach(file => {
          const cleanPath = file.isDir ? file.path.slice(0, -1) : file.path;
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

  // Save projects to localStorage whenever they change (only in non-filesystem mode)
  useEffect(() => {
    if (isProjectsLoaded && !isFilesystemMode) {
      saveProjects(projects);
    }
  }, [projects, isProjectsLoaded, isFilesystemMode]);

  // Auto-save current project files (only in non-filesystem mode)
  useEffect(() => {
    if (isProjectsLoaded && currentProjectIdState && !isFilesystemMode) {
      setProjects(prev => prev.map(p => 
        p.id === currentProjectIdState 
          ? { ...p, files: fileStore, updatedAt: Date.now() } 
          : p
      ));
    }
  }, [fileStore, currentProjectIdState, isProjectsLoaded, isFilesystemMode]);

  useEffect(() => {
    if (isFilesystemMode && selectedFile && fileStore[selectedFile] && !fileStore[selectedFile].isDir && !fileStore[selectedFile].content && !fileStore[selectedFile].isNew) {
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
  }, [selectedFile, isFilesystemMode, fileStore]);

  // Sync fileStore to backend after streaming finishes
  useEffect(() => {
    if (!isStreaming && isFilesystemMode) {
      const syncFiles = async () => {
        try {
          // We need to know what was there before to detect deletions
          // But for now, let's just sync what's currently in the store
          // and assume the AI only adds/modifies.
          // To handle deletions, we'd need to compare with the actual filesystem.
          
          const modifiedFiles = (Object.entries(fileStore) as [string, any][]).filter(([_, f]) => f.isModified || f.isNew);
          for (const [path, file] of modifiedFiles) {
            if (!file.isDir) {
              await filesystemService.saveFile(path, file.content);
            } else {
              await filesystemService.createFile(path, true);
            }
          }
          
          // Clear flags after sync
          setFileStore(prev => {
            const newStore = { ...prev };
            Object.keys(newStore).forEach(p => {
              if (newStore[p].isModified || newStore[p].isNew) {
                newStore[p] = { ...newStore[p], isModified: false, isNew: false };
              }
            });
            return newStore;
          });
        } catch (e) {
          console.error('Failed to sync files after stream', e);
        }
      };
      syncFiles();
    }
  }, [isStreaming, isFilesystemMode]);

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
      try {
        const data = await filesystemService.listWorkspaces();
        setWorkspaces(data);
      } catch (e) {
        console.error('Failed to fetch workspaces', e);
      }
    };
    fetchWorkspaces();
  }, []);

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

  const handleCreateProject = (name: string) => {
    const newProject: Project = {
      id: generateId(),
      name,
      files: {},
      updatedAt: Date.now()
    };
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectIdState(newProject.id);
    setCurrentProjectId(newProject.id);
    setFileStore({});
    setSelectedFile(null);
    setMessages([]);
  };

  const handleSaveAll = async () => {
    if (isFilesystemMode) {
      try {
        const modifiedFiles = (Object.entries(fileStore) as [string, any][]).filter(([_, f]) => f.isModified || f.isNew);
        for (const [path, file] of modifiedFiles) {
          if (!file.isDir) {
            await filesystemService.saveFile(path, file.content);
          }
        }
      } catch (e) {
        alert('Failed to save some files to filesystem');
      }
    }

    setFileStore(prev => {
      const newStore = { ...prev };
      Object.keys(newStore).forEach(path => {
        newStore[path] = { ...newStore[path], isModified: false, isNew: false };
      });
      return newStore;
    });
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
      setCurrentProjectIdState(id);
      setCurrentProjectId(id);
      setFileStore(project.files);
      setSelectedFile(null);
      setMessages([]);
      setShowProjectModal(false);
    }
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProjectIdState === id) {
        setCurrentProjectIdState(null);
        setCurrentProjectId(null);
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
      setCurrentProjectIdState(newProject.id);
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
      if (isFilesystemMode) {
        try {
          await filesystemService.deleteFile(fileToDelete);
        } catch (e) {
          alert('Failed to delete file from filesystem');
          return;
        }
      }

      setFileStore(prev => {
        const newStore = { ...prev };
        delete newStore[fileToDelete];
        return newStore;
      });
      if (selectedFile === fileToDelete) {
        setSelectedFile(null);
      }
      setFileToDelete(null);
    }
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    if (!newPath || newPath === oldPath) return;

    if (isFilesystemMode) {
      try {
        await filesystemService.renameFile(oldPath, newPath);
      } catch (e) {
        alert('Failed to rename file on filesystem');
        return;
      }
    }

    setFileStore(prev => {
      const newStore = { ...prev };
      if (newStore[oldPath]) {
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

        newStore[newPath] = { ...newStore[oldPath] };
        delete newStore[oldPath];
      }
      return newStore;
    });
    if (selectedFile === oldPath) {
      setSelectedFile(newPath);
    }
  };

  const handleCreateFile = async (path: string) => {
    if (!path) return;

    if (isFilesystemMode) {
      try {
        await filesystemService.createFile(path);
      } catch (e) {
        alert('Failed to create file on filesystem');
        return;
      }
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
      setMessages(prev => [...prev, { role: 'user', content: msg }, { role: 'model', content: '**Available Commands:**\n- `/help` : Show this message\n- `/reset` : Clear chat and files\n- `/files` : Print file tree\n- `/zip` : Download project as ZIP\n- `/preview` : Switch to Preview tab\n- `/persona <name>` : Switch persona\n- `/verbose` : Toggle verbose mode\n- `/terse` : Toggle terse mode' }]);
      return true;
    }
    if (msg.startsWith('/reset')) {
      if (window.confirm('Are you sure you want to clear all chat history and files?')) {
        setMessages([]);
        if (isFilesystemMode) {
          filesystemService.loadAllFiles().then(setFileStore);
        } else {
          setFileStore({});
        }
        setSelectedFile(null);
      }
      return true;
    }
    if (msg.startsWith('/files')) {
      const tree = Object.keys(fileStore).map(p => `- ${p}`).join('\n');
      setMessages(prev => [...prev, { role: 'user', content: msg }, { role: 'model', content: `**Current Files:**\n${tree || 'No files yet.'}` }]);
      return true;
    }
    if (msg.startsWith('/zip')) {
      handleDownloadZip();
      setMessages(prev => [...prev, { role: 'user', content: msg }, { role: 'model', content: 'Triggered ZIP download.' }]);
      return true;
    }
    if (msg.startsWith('/preview')) {
      setBottomTab('preview');
      setMobileView('preview');
      setMessages(prev => [...prev, { role: 'user', content: msg }, { role: 'model', content: 'Switched to Preview tab.' }]);
      return true;
    }
    if (msg.startsWith('/persona ')) {
      const persona = msg.split(' ')[1];
      setSystemModifier(`\n\n[CURRENT PERSONA: ${persona.toUpperCase()}]`);
      setMessages(prev => [...prev, { role: 'user', content: msg }, { role: 'model', content: `[→ ${persona.toUpperCase()}] Persona activated.` }]);
      return true;
    }
    if (msg.startsWith('/verbose')) {
      setSystemModifier('\n\n[MODE: VERBOSE AND EXPLANATORY]');
      setMessages(prev => [...prev, { role: 'user', content: msg }, { role: 'model', content: 'Verbose mode enabled.' }]);
      return true;
    }
    if (msg.startsWith('/terse')) {
      setSystemModifier('\n\n[MODE: TERSE AND TECHNICAL]');
      setMessages(prev => [...prev, { role: 'user', content: msg }, { role: 'model', content: 'Terse mode enabled.' }]);
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

    const newMessages: Message[] = [...messages, { role: 'user', content }];
    setMessages([...newMessages, { role: 'model', content: '' }]);
    setIsStreaming(true);

    // Capture the initial file store state before streaming begins
    // so that we can idempotently apply diffs as the response streams in.
    const initialFileStore = { ...fileStore };

    try {
      let fullResponse = '';
      await streamGemini(
        newMessages,
        model,
        apiKey,
        SYSTEM_INSTRUCTION + (settings.systemInstruction ? `\n\n[USER CUSTOM INSTRUCTION: ${settings.systemInstruction}]` : '') + systemModifier,
        (chunk) => {
          fullResponse += chunk;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].content = fullResponse;
            return updated;
          });
          setFileStore(extractFiles(fullResponse, initialFileStore));
        },
        settings.temperature
      );
    } catch (error: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content += `\n\n**Error:** ${error.message}`;
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      if (isFilesystemMode) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            await filesystemService.saveFile(selectedFile, newContent);
            setFileStore(prev => ({
              ...prev,
              [selectedFile]: { ...prev[selectedFile], isModified: false }
            }));
          } catch (e) {
            console.error('Failed to auto-save to filesystem', e);
          }
        }, settings.autoSaveInterval);
      }
    }
  };

  const totalTokens = messages.reduce((acc, m) => acc + m.content.length, 0) / 4;

  return (
    <div className={`flex flex-col h-screen bg-[#1e1e1e] text-[#d4d4d4] font-sans overflow-hidden ${
      settings.appTheme === 'light' ? 'bg-white text-gray-900' : 
      settings.appTheme === 'high-contrast' ? 'bg-black text-yellow-400' : ''
    } ${settings.compactMode ? 'text-xs' : ''}`}>
      <AnimatePresence>
        {showProjectModal && (
          <Suspense fallback={null}>
            <ProjectModal
              projects={projects}
              currentProjectId={currentProjectIdState}
              onClose={() => setShowProjectModal(false)}
              onSwitchProject={handleSwitchProject}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onImportProject={handleImportProject}
            />
          </Suspense>
        )}

        {showKeyModal && (
          <Suspense fallback={null}>
            <ApiKeyModal
              onSave={handleSaveKey}
              onClose={() => setShowKeyModal(false)}
              initialKey={apiKey || ''}
              canClose={!!apiKey}
            />
          </Suspense>
        )}

        {showWorkspaceModal && (
          <Suspense fallback={null}>
            <WorkspaceModal
              onClose={() => setShowWorkspaceModal(false)}
              onSelect={(name) => {
                setWorkspaceName(name);
                setShowWorkspaceModal(false);
              }}
              currentWorkspace={workspaceName}
            />
          </Suspense>
        )}

        {showSettingsModal && (
          <Suspense fallback={null}>
            <SettingsModal
              onClose={() => setShowSettingsModal(false)}
              onSave={(newSettings) => setSettings(newSettings)}
              initialSettings={settings}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#252526] border-b border-[#3c3c3c] shrink-0 shadow-sm z-10 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 sm:gap-3 min-w-fit">
          <div className="p-1 bg-[#1e1e1e] rounded border border-[#3c3c3c] shadow-inner">
            <Terminal className="w-4 h-4 text-[#007acc]" />
          </div>
          <h1 className="font-semibold tracking-wide hidden md:block text-[#e5e5e5] text-sm">GIDE</h1>
          {isFilesystemMode && (
            <button 
              onClick={() => setShowWorkspaceInput(!showWorkspaceInput)}
              className={`flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-bold uppercase tracking-tighter transition-colors ${showWorkspaceInput ? 'bg-blue-500 text-white border-blue-400' : 'bg-blue-900/30 border-blue-500/30 text-blue-400'}`}
              title="Toggle Workspace Path"
            >
              <FolderOpen className="w-2.5 h-2.5" />
              <span className="hidden xs:inline">WS</span>
            </button>
          )}
          
          {(showWorkspaceInput || !isFilesystemMode) && (
            <div className="flex items-center bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-0.5 ml-1">
              <FolderOpen className="w-3 h-3 text-[#858585] mr-1.5" />
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Workspace path..."
                className="bg-transparent text-[10px] focus:outline-none w-24 sm:w-32 text-[#d4d4d4]"
              />
              <button
                onClick={() => setShowWorkspaceModal(true)}
                className="p-1 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white transition-colors ml-1"
                title="Browse Workspaces"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
          {!isFilesystemMode && (
            <button
              onClick={() => setShowProjectModal(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#3c3c3c] rounded transition-colors whitespace-nowrap"
              title="Projects"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#007acc]" />
              <span className="hidden lg:inline">Projects</span>
            </button>
          )}
          
          <div className="flex items-center bg-[#3c3c3c] rounded px-2 py-0.5 border border-[#454545]">
            <select
              value={model}
              onChange={handleModelChange}
              className="bg-transparent text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="gemini-2.5-flash-lite">Lite</option>
              <option value="gemini-2.5-flash">Flash</option>
              <option value="gemini-2.5-pro">Pro</option>
            </select>
          </div>
          
          <button
            onClick={handleSaveAll}
            className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#3c3c3c] rounded transition-colors whitespace-nowrap"
            title="Save All"
          >
            <Download className="w-3.5 h-3.5 text-green-500 rotate-180" />
            <span className="hidden lg:inline">Save</span>
          </button>

          <button
            onClick={() => { setMessages([]); setFileStore({}); setSelectedFile(null); }}
            className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#3c3c3c] rounded transition-colors whitespace-nowrap"
            title="New Session"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">New</span>
          </button>

          <button
            onClick={() => setShowKeyModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#3c3c3c] rounded transition-colors whitespace-nowrap"
            title="API Key"
          >
            <Key className="w-3.5 h-3.5 text-[#007acc]" />
            <span className="hidden lg:inline">Key</span>
          </button>

          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#3c3c3c] rounded transition-colors whitespace-nowrap"
            title="Command Palette (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-[#007acc]" />
            <span className="hidden lg:inline">Search</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#3c3c3c] rounded transition-colors whitespace-nowrap"
            title="Settings"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-[#858585]" />
            <span className="hidden lg:inline">Settings</span>
          </button>

          <button
            className="sm:hidden p-1.5 hover:bg-[#3c3c3c] rounded transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

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
        
        {/* Profile Selector */}
        <AnimatePresence>
          {!activeProfile && (
            <Suspense fallback={null}>
              <ProfileSelector onSelect={handleProfileSelect} />
            </Suspense>
          )}
        </AnimatePresence>
        
        {/* Chat Panel */}
        <div className={`w-full sm:w-[40%] flex flex-col h-full ${mobileView !== 'chat' ? 'hidden sm:flex' : 'flex'}`}>
          <Suspense fallback={<PanelLoader />}>
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              onReviewChange={(filename, content) => {
                const original = fileStore[filename]?.content || '';
                setPendingDiff({ filename, original, modified: content });
              }}
              isStreaming={isStreaming}
              settings={settings}
            />
          </Suspense>
        </div>

        {/* Editor Panel */}
        <div className={`w-full sm:w-[40%] flex flex-col h-full border-r border-[#3c3c3c] ${mobileView !== 'editor' ? 'hidden sm:flex' : 'flex'}`}>
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
        </div>

        {/* File Tree Panel (Desktop only) */}
        <div className={`hidden sm:flex sm:w-[20%] flex-col h-full border-l border-[#3c3c3c] ${isMobileMenuOpen ? 'block absolute inset-0 z-40 bg-[#1e1e1e]' : ''}`}>
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
          </div>
          
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={<PanelLoader />}>
              {sidebarTab === 'files' ? (
                <FileTree
                  files={fileStore}
                  selectedFile={selectedFile}
                  onSelect={(path) => { setSelectedFile(path); setIsMobileMenuOpen(false); setMobileView('editor'); }}
                  onDownload={handleDownloadFile}
                  onDownloadZip={handleDownloadZip}
                  onDelete={handleDeleteFile}
                  onRename={(oldPath) => { setFileToRename(oldPath); setNewFileName(oldPath); }}
                  onCreateFile={() => { setIsCreatingFile(true); setNewFilePath('new_file.txt'); }}
                  onFolderExpand={handleFolderExpand}
                  showDetails={true}
                />
              ) : (
                <SearchPanel 
                  onSelectFile={(path, line) => {
                    setSelectedFile(path);
                    setTargetLine(line);
                    setIsMobileMenuOpen(false);
                    setMobileView('editor');
                  }} 
                />
              )}
            </Suspense>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
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
                model={model}
                onModelChange={handleModelChange}
                isFilesystemMode={isFilesystemMode}
                workspaceName={workspaceName}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Panel (Desktop) / Preview (Mobile) */}
      <div className={`h-[30%] sm:h-[30%] shrink-0 ${mobileView !== 'preview' ? 'hidden sm:flex' : 'flex'} flex-col shadow-[0_-4px_10px_rgba(0,0,0,0.2)] z-10`}>
        <Suspense fallback={<PanelLoader />}>
          <BottomPanel
            files={fileStore}
            activeTab={bottomTab}
            onTabChange={setBottomTab}
            onSelectFile={setSelectedFile}
            onDownloadFile={handleDownloadFile}
            onDownloadZip={handleDownloadZip}
            onDeleteFile={handleDeleteFile}
            hasPreviewableFiles={hasPreviewableFiles}
          />
        </Suspense>
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
            />
          </Suspense>
        )}

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
  );
}

