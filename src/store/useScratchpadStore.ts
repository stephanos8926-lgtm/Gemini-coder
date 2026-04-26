import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PendingEdit {
  original: string;
  proposed: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface ScratchpadStore {
  pendingEdits: Record<string, PendingEdit>;
  addEdit: (filePath: string, original: string, proposed: string) => void;
  acceptEdit: (filePath: string) => void;
  rejectEdit: (filePath: string) => void;
}

export const useScratchpadStore = create<ScratchpadStore>()(
  persist(
    (set) => ({
      pendingEdits: {},
      addEdit: (filePath, original, proposed) => 
        set((state) => ({
          pendingEdits: {
            ...state.pendingEdits,
            [filePath]: { original, proposed, status: 'pending' }
          }
        })),
      acceptEdit: (filePath) => 
        set((state) => {
          const { [filePath]: _, ...rest } = state.pendingEdits;
          return { pendingEdits: rest };
        }),
      rejectEdit: (filePath) => 
        set((state) => {
          const { [filePath]: _, ...rest } = state.pendingEdits;
          return { pendingEdits: rest };
        }),
    }),
    {
      name: 'forge-scratchpad-storage',
    }
  )
);
