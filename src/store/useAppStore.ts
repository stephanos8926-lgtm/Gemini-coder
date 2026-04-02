import { create } from 'zustand';

interface AppState {
  workspaceName: string;
  setWorkspaceName: (name: string) => void;
  workspaces: string[];
  setWorkspaces: (workspaces: string[]) => void;
  selectedFile: string | null;
  setSelectedFile: (path: string | null) => void;
  model: string;
  setModel: (model: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaceName: '',
  setWorkspaceName: (workspaceName) => set({ workspaceName }),
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces }),
  selectedFile: null,
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  model: 'gemini-2.5-flash-lite',
  setModel: (model) => set({ model }),
}));
