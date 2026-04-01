import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Terminal, Key, Plus, Menu, X, Loader2, FolderOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Message, streamGemini } from './lib/gemini';
import { FileStore, extractFiles } from './lib/fileStore';
import { Project, getProjects, saveProjects, getCurrentProjectId, setCurrentProjectId, generateId } from './lib/projectStore';

// Lazy load heavy components
const ApiKeyModal = lazy(() => import('./components/ApiKeyModal').then(m => ({ default: m.ApiKeyModal })));
const ChatPanel = lazy(() => import('./components/ChatPanel').then(m => ({ default: m.ChatPanel })));
const CodeEditor = lazy(() => import('./components/CodeEditor').then(m => ({ default: m.CodeEditor })));
const FileTree = lazy(() => import('./components/FileTree').then(m => ({ default: m.FileTree })));
const BottomPanel = lazy(() => import('./components/BottomPanel').then(m => ({ default: m.BottomPanel })));
const ProjectModal = lazy(() => import('./components/ProjectModal').then(m => ({ default: m.ProjectModal })));

const PanelLoader = () => (
  <div className="flex-1 flex items-center justify-center h-full bg-[#1e1e1e] text-[#858585]">
    <Loader2 className="w-6 h-6 animate-spin text-[#007acc]" />
  </div>
);

const SYSTEM_INSTRUCTION = `You are GIDE (Gemini Interactive Development Environment), a browser-based AI software engineering agent. You help users build real multi-file software projects.

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
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [model, setModel] = useState('gemini-2.5-flash');
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileStore, setFileStore] = useState<FileStore>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<'preview' | 'tree'>('preview');
  const [isStreaming, setIsStreaming] = useState(false);
  const [systemModifier, setSystemModifier] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'chat' | 'editor' | 'preview'>('chat');

  // Project Management State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectIdState, setCurrentProjectIdState] = useState<string | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isProjectsLoaded, setIsProjectsLoaded] = useState(false);

  useEffect(() => {
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
  }, []);

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (isProjectsLoaded) {
      saveProjects(projects);
    }
  }, [projects, isProjectsLoaded]);

  // Auto-save current project files
  useEffect(() => {
    if (isProjectsLoaded && currentProjectIdState) {
      setProjects(prev => prev.map(p => 
        p.id === currentProjectIdState 
          ? { ...p, files: fileStore, updatedAt: Date.now() } 
          : p
      ));
    }
  }, [fileStore, currentProjectIdState, isProjectsLoaded]);

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

  const handleSaveKey = (key: string) => {
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

  const handleSwitchProject = (id: string) => {
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

  const confirmDelete = () => {
    if (fileToDelete) {
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

  const handleRenameFile = (oldPath: string, newPath: string) => {
    if (!newPath || newPath === oldPath) return;
    setFileStore(prev => {
      const newStore = { ...prev };
      if (newStore[oldPath]) {
        newStore[newPath] = { ...newStore[oldPath] };
        delete newStore[oldPath];
      }
      return newStore;
    });
    if (selectedFile === oldPath) {
      setSelectedFile(newPath);
    }
  };

  const handleCreateFile = (path: string) => {
    if (!path) return;
    setFileStore(prev => {
      if (prev[path]) return prev; // Don't overwrite
      return {
        ...prev,
        [path]: { content: '', isNew: true, isModified: false, size: 0 }
      };
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
        setFileStore({});
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
        SYSTEM_INSTRUCTION + systemModifier,
        (chunk) => {
          fullResponse += chunk;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].content = fullResponse;
            return updated;
          });
          setFileStore(extractFiles(fullResponse, initialFileStore));
        }
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

  const totalTokens = messages.reduce((acc, m) => acc + m.content.length, 0) / 4;

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#d4d4d4] font-sans overflow-hidden">
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
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-[#3c3c3c] shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#1e1e1e] rounded-md border border-[#3c3c3c] shadow-inner">
            <Terminal className="w-5 h-5 text-[#007acc]" />
          </div>
          <h1 className="font-semibold tracking-wide hidden sm:block text-[#e5e5e5]">GIDE</h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setShowProjectModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-[#3c3c3c] rounded-md transition-colors"
            title="Projects"
          >
            <FolderOpen className="w-4 h-4 text-[#007acc]" />
            <span className="hidden sm:inline">Projects</span>
          </button>
          
          <select
            value={model}
            onChange={handleModelChange}
            className="bg-[#3c3c3c] border border-[#3c3c3c] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#007acc] transition-colors cursor-pointer"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
          </select>
          
          <button
            onClick={() => { setMessages([]); setFileStore({}); setSelectedFile(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-[#3c3c3c] rounded-md transition-colors"
            title="New Session"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </button>

          <button
            onClick={() => setShowKeyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-[#3c3c3c] rounded-md transition-colors"
            title="API Key"
          >
            <Key className="w-4 h-4 text-[#007acc]" />
            <span className="hidden sm:inline">Key</span>
          </button>

          <button
            className="sm:hidden p-2 hover:bg-[#3c3c3c] rounded-md transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative bg-[#1e1e1e]">
        
        {/* Chat Panel */}
        <div className={`w-full sm:w-[40%] flex flex-col h-full ${mobileView !== 'chat' ? 'hidden sm:flex' : 'flex'}`}>
          <Suspense fallback={<PanelLoader />}>
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isStreaming={isStreaming}
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
            />
          </Suspense>
        </div>

        {/* File Tree Panel (Desktop only) */}
        <div className={`hidden sm:flex sm:w-[20%] flex-col h-full ${isMobileMenuOpen ? 'block absolute inset-0 z-40 bg-[#1e1e1e]' : ''}`}>
          <Suspense fallback={<PanelLoader />}>
            <FileTree
              files={fileStore}
              selectedFile={selectedFile}
              onSelect={(path) => { setSelectedFile(path); setIsMobileMenuOpen(false); setMobileView('editor'); }}
              onDownload={handleDownloadFile}
              onDownloadZip={handleDownloadZip}
              onDelete={handleDeleteFile}
              onRename={(oldPath) => { setFileToRename(oldPath); setNewFileName(oldPath); }}
              onCreateFile={() => { setIsCreatingFile(true); setNewFilePath('new_file.txt'); }}
            />
          </Suspense>
        </div>

        {/* Mobile File Tree Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, x: '-100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-[80%] max-w-sm z-50 bg-[#1e1e1e] sm:hidden flex flex-col shadow-2xl border-r border-[#3c3c3c]"
              >
                <div className="p-4 border-b border-[#3c3c3c] flex justify-between items-center bg-[#252526]">
                  <span className="font-semibold text-[#e5e5e5] text-lg">Project Files</span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-[#3c3c3c] rounded-md transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-auto">
                  <Suspense fallback={<PanelLoader />}>
                    <FileTree
                      files={fileStore}
                      selectedFile={selectedFile}
                      onSelect={(path) => { setSelectedFile(path); setIsMobileMenuOpen(false); setMobileView('editor'); }}
                      onDownload={handleDownloadFile}
                      onDownloadZip={handleDownloadZip}
                      onDelete={handleDeleteFile}
                      onRename={(oldPath) => { setFileToRename(oldPath); setNewFileName(oldPath); setIsMobileMenuOpen(false); }}
                      onCreateFile={() => { setIsCreatingFile(true); setNewFilePath('new_file.txt'); setIsMobileMenuOpen(false); }}
                    />
                  </Suspense>
                </div>
              </motion.div>
            </>
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

declare global {
  interface Window {
    JSZip: any;
  }
}

