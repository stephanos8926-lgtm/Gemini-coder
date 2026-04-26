import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type FileStore } from '../lib/fileStore';

/**
 * @interface FileState
 * @description Defines the shape of the modular File store.
 */
interface FileState {
  RW_fileStore: FileStore;
  RW_activeFile: string | null;
  RW_stagedDiffs: string[];
  RW_isMobileTerminalOpen: boolean;
  RW_isMobileExplorerOpen: boolean;
  RW_mobileView: 'chat' | 'editor' | 'preview';
  
  setFileStore: (store: FileStore) => void;
  setActiveFile: (path: string | null) => void;
  setStagedDiffs: (diffs: string[]) => void;
  updateFileContent: (path: string, content: string) => void;
  setMobileTerminalOpen: (open: boolean) => void;
  setMobileExplorerOpen: (open: boolean) => void;
  setMobileView: (view: 'chat' | 'editor' | 'preview') => void;
}

/**
 * @store useFileStore
 * @description Manages industrial-scale virtual filesystem synchronization and active editor state with persistence.
 */
export const useFileStore = create<FileState>()(
  persist(
    (set) => ({
      RW_fileStore: {},
      RW_activeFile: null,
      RW_stagedDiffs: [],
      RW_isMobileTerminalOpen: false,
      RW_isMobileExplorerOpen: false,
      RW_mobileView: 'chat',

      setFileStore: (store) => set({ RW_fileStore: store }),
      setActiveFile: (path) => set({ RW_activeFile: path }),
      setStagedDiffs: (diffs) => set({ RW_stagedDiffs: diffs }),
      updateFileContent: (path, content) => set((state) => ({
        RW_fileStore: {
          ...state.RW_fileStore,
          [path]: {
            ...state.RW_fileStore[path],
            content,
            isModified: true
          }
        }
      })),
      setMobileTerminalOpen: (open) => set({ RW_isMobileTerminalOpen: open }),
      setMobileExplorerOpen: (open) => set({ RW_isMobileExplorerOpen: open }),
      setMobileView: (view) => set({ RW_mobileView: view }),
    }),
    {
      name: 'forge-file-storage',
      // Explicitly exclude RW_fileStore content from localStorage to avoid 5MB limit
      partialize: (state) => ({
        RW_activeFile: state.RW_activeFile,
        RW_stagedDiffs: state.RW_stagedDiffs,
        RW_isMobileTerminalOpen: state.RW_isMobileTerminalOpen,
        RW_isMobileExplorerOpen: state.RW_isMobileExplorerOpen,
        RW_mobileView: state.RW_mobileView,
      }),
    }
  )
);
