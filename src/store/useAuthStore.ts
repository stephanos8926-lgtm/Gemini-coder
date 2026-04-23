import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @interface AuthState
 * @description Defines the shape of the modular Auth store.
 */
interface AuthState {
  RW_apiKey: string | null;
  RW_idToken: string | null;
  RW_user: any | null;
  RW_isAuthLoading: boolean;
  
  setApiKey: (key: string | null) => void;
  setIdToken: (token: string | null) => void;
  setUser: (user: any | null) => void;
  setAuthLoading: (loading: boolean) => void;
}

/**
 * @store useAuthStore
 * @description Manages secure authentication tokens, user identity, and third-party API keys.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      RW_apiKey: null,
      RW_idToken: null,
      RW_user: null,
      RW_isAuthLoading: false,

      setApiKey: (key) => set({ RW_apiKey: key }),
      setIdToken: (token) => set({ RW_idToken: token }),
      setUser: (user) => set({ RW_user: user }),
      setAuthLoading: (loading) => set({ RW_isAuthLoading: loading }),
    }),
    {
      name: 'rapidforge-auth-storage',
      partialize: (state) => ({ RW_apiKey: state.RW_apiKey }), // Only persist API key for local security
    }
  )
);
