import { create } from 'zustand';
import { FileStore } from '../lib/fileStore';

interface AppState {
  workspaceName: string;
  setWorkspaceName: (name: string) => void;
  
  selectedFile: string | null;
  setSelectedFile: (path: string | null) => void;
  
  fileStore: FileStore;
  setFileStore: (store: FileStore) => void;
  updateFile: (path: string, content: string) => void;
  
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  
  mobileView: 'chat' | 'editor' | 'preview';
  setMobileView: (view: 'chat' | 'editor' | 'preview') => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaceName: '',
  setWorkspaceName: (name) => set({ workspaceName: name }),
  
  selectedFile: null,
  setSelectedFile: (path) => set({ selectedFile: path }),
  
  fileStore: {},
  setFileStore: (store) => set({ fileStore: store }),
  updateFile: (path, content) => set((state) => ({
    fileStore: {
      ...state.fileStore,
      [path]: { ...state.fileStore[path], content }
    }
  })),
  
  isStreaming: false,
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  
  mobileView: 'chat',
  setMobileView: (view) => set({ mobileView: view }),
}));
