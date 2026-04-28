import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message } from '../lib/gemini';

/**
 * @interface ChatState
 * @description Defines the shape of the modular Chat store.
 */
interface ChatState {
  RW_messages: Message[];
  RW_isStreaming: boolean;
  RW_activeModel: string;
  RW_systemModifier: string;
  
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setStreaming: (isStreaming: boolean) => void;
  setActiveModel: (model: string) => void;
  setSystemModifier: (modifier: string) => void;
  clearHistory: () => void;
}

/**
 * @store useChatStore
 * @description Centralized communication state for AI interactions and conversation context with persistence.
 */
import { createNexusStorage } from '../lib/persistence/NexusPersistence';
import { createJSONStorage } from 'zustand/middleware';

// ... existing imports ...

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      RW_messages: [],
      RW_isStreaming: false,
      RW_activeModel: 'gemini-2.0-flash-exp',
      RW_systemModifier: '',

      setMessages: (messages) => set({ RW_messages: messages }),
      addMessage: (message) => set((state) => ({ RW_messages: [...state.RW_messages, message] })),
      setStreaming: (isStreaming) => set({ RW_isStreaming: isStreaming }),
      setActiveModel: (model) => set({ RW_activeModel: model }),
      setSystemModifier: (modifier) => set({ RW_systemModifier: modifier }),
      clearHistory: () => set({ RW_messages: [] }),
    }),
    {
      name: 'forge-chat-storage',
      storage: createJSONStorage(() => createNexusStorage()),
      partialize: (state): any => ({ 
        RW_messages: state.RW_messages, 
        RW_activeModel: state.RW_activeModel,
        RW_systemModifier: state.RW_systemModifier
      }),
    }
  )
);
