import { create } from 'zustand';

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
}

export const useAppStore = create<AppState>((set) => ({
  workspaceName: '',
  setWorkspaceName: (workspaceName) => set({ workspaceName }),
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces }),
  openedFiles: [],
  activeFile: null,
  openFile: (path) => set((state) => ({ 
    openedFiles: state.openedFiles.includes(path) ? state.openedFiles : [...state.openedFiles, path],
    activeFile: path
  })),
  closeFile: (path) => set((state) => ({ 
    openedFiles: state.openedFiles.filter((p) => p !== path),
    activeFile: state.activeFile === path ? (state.openedFiles[0] || null) : state.activeFile
  })),
  setActiveFile: (path) => set({ activeFile: path }),
  model: 'gemini-2.5-flash-lite',
  setModel: (model) => set({ model }),
}));
