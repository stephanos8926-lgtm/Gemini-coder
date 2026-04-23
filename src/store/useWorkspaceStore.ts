import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @interface WorkspaceState
 * @description Defines the shape of the modular Workspace store.
 */
interface WorkspaceState {
  RW_workspaceName: string;
  RW_workspaces: string[];
  RW_currentProjectId: string | null;
  RW_isWorkspacesLoading: boolean;
  
  setWorkspaceName: (name: string) => void;
  setWorkspaces: (workspaces: string[]) => void;
  setCurrentProjectId: (pid: string | null) => void;
  setWorkspacesLoading: (loading: boolean) => void;
}

/**
 * @store useWorkspaceStore
 * @description Manages global workspace and project identity state with persistence.
 */
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      RW_workspaceName: 'default-workspace',
      RW_workspaces: [],
      RW_currentProjectId: null,
      RW_isWorkspacesLoading: false,

      setWorkspaceName: (name) => set({ RW_workspaceName: name }),
      setWorkspaces: (workspaces) => set({ RW_workspaces: workspaces }),
      setCurrentProjectId: (pid) => set({ RW_currentProjectId: pid }),
      setWorkspacesLoading: (loading) => set({ RW_isWorkspacesLoading: loading }),
    }),
    {
      name: 'rapidforge-workspace-storage',
    }
  )
);
