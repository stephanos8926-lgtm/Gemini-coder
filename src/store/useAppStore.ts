import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RW_DEFAULT_MODEL } from '../constants/app';

interface AppState {
  workspaceName: string;
  setWorkspaceName: (name: string) => void;
  workspaces: string[];
  setWorkspaces: (workspaces: string[]) => void;
  model: string;
  setModel: (model: string) => void;
  
  // Sidebar visibility
  isLeftSidebarOpen: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  isRightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
  
  // Bottom Panel State
  activeBottomTab: 'preview' | 'tree' | 'tools' | 'debug' | 'forge' | 'terminal';
  setActiveBottomTab: (tab: 'preview' | 'tree' | 'tools' | 'debug' | 'forge' | 'terminal') => void;
  
  // Terminal visibility
  showTerminal: boolean;
  setShowTerminal: (show: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      workspaceName: '',
      setWorkspaceName: (workspaceName) => set({ workspaceName }),
      workspaces: [],
      setWorkspaces: (workspaces) => set({ workspaces }),
      isLeftSidebarOpen: true,
      isRightSidebarOpen: true,
      activeBottomTab: 'tools',
      model: RW_DEFAULT_MODEL,
      setModel: (model) => set({ model }),
      setLeftSidebarOpen: (isLeftSidebarOpen) => set({ isLeftSidebarOpen }),
      setRightSidebarOpen: (isRightSidebarOpen) => set({ isRightSidebarOpen }),
      setActiveBottomTab: (activeBottomTab) => set({ activeBottomTab }),
      showTerminal: false,
      setShowTerminal: (showTerminal) => set({ showTerminal }),
    }),
    {
      name: 'forge-app-storage',
    }
  )
);
