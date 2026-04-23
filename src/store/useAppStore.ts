import { create } from 'zustand';
import { RW_DEFAULT_MODEL } from '../constants/app';

interface AppState {
  workspaceName: string;
  setWorkspaceName: (name: string) => void;
  workspaces: string[];
  setWorkspaces: (workspaces: string[]) => void;
  openedFiles: string[];
  activeFile: string | null;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  model: string;
  setModel: (model: string) => void;
  
  // Sidebar visibility
  isLeftSidebarOpen: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  isRightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
  
  // Bottom Panel State
  activeBottomTab: 'preview' | 'tree' | 'tools' | 'debug';
  setActiveBottomTab: (tab: 'preview' | 'tree' | 'tools' | 'debug') => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaceName: '',
  setWorkspaceName: (workspaceName) => set({ workspaceName }),
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces }),
  openedFiles: [],
  activeFile: null,
  isLeftSidebarOpen: true,
  isRightSidebarOpen: true,
  activeBottomTab: 'tools',
  openFile: (path) => set((state) => ({ 
    openedFiles: state.openedFiles.includes(path) ? state.openedFiles : [...state.openedFiles, path],
    activeFile: path
  })),
  closeFile: (path) => set((state) => ({ 
    openedFiles: state.openedFiles.filter((p) => p !== path),
    activeFile: state.activeFile === path ? (state.openedFiles[0] || null) : state.activeFile
  })),
  setActiveFile: (path) => set({ activeFile: path }),
  model: RW_DEFAULT_MODEL,
  setModel: (model) => set({ model }),
  setLeftSidebarOpen: (isLeftSidebarOpen) => set({ isLeftSidebarOpen }),
  setRightSidebarOpen: (isRightSidebarOpen) => set({ isRightSidebarOpen }),
  setActiveBottomTab: (activeBottomTab) => set({ activeBottomTab }),
}));
