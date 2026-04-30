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
  RW_quickActions: string[];
  RW_contextSnippets: { path: string; content: string; symbol?: string }[];
  
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setStreaming: (isStreaming: boolean) => void;
  setActiveModel: (model: string) => void;
  setSystemModifier: (modifier: string) => void;
  setQuickActions: (actions: string[]) => void;
  addContextSnippet: (snippet: { path: string; content: string; symbol?: string }) => void;
  removeContextSnippet: (path: string) => void;
  clearHistory: () => void;
}

/**
 * @store useChatStore
 * @description Centralized communication state for AI interactions and conversation context with persistence.
 */
import { createNexusStorage } from '../lib/persistence/NexusPersistence';
import { createJSONStorage } from 'zustand/middleware';

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      RW_messages: [],
      RW_isStreaming: false,
      RW_activeModel: 'gemini-2.0-flash-exp',
      RW_systemModifier: '',
      RW_quickActions: [],
      RW_contextSnippets: [],

      setMessages: (messages) => set({ RW_messages: messages }),
      addMessage: (message) => set((state) => ({ RW_messages: [...state.RW_messages, message] })),
      setStreaming: (isStreaming) => set({ RW_isStreaming: isStreaming }),
      setActiveModel: (model) => set({ RW_activeModel: model }),
      setSystemModifier: (modifier) => set({ RW_systemModifier: modifier }),
      setQuickActions: (actions) => set({ RW_quickActions: actions }),
      addContextSnippet: (snippet) => set((state) => ({ 
        RW_contextSnippets: [...state.RW_contextSnippets.filter(s => s.path !== snippet.path), snippet] 
      })),
      removeContextSnippet: (path) => set((state) => ({ 
        RW_contextSnippets: state.RW_contextSnippets.filter(s => s.path !== path) 
      })),
      clearHistory: () => set({ RW_messages: [], RW_contextSnippets: [] }),
    }),
    {
      name: 'forge-chat-storage',
      storage: createJSONStorage(() => createNexusStorage()),
      partialize: (state): any => ({ 
        RW_messages: state.RW_messages, 
        RW_activeModel: state.RW_activeModel,
        RW_systemModifier: state.RW_systemModifier,
        RW_contextSnippets: state.RW_contextSnippets
      }),
    }
  )
);
