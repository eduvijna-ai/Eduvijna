/**
 * User Store (Zustand)
 * Manages user authentication state globally
 * ONLY stores backend data - NO UI state
 */

import { create } from 'zustand';
import type { UserProfile, AuthTokens } from '../types';

interface UserState {
  // State
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: UserProfile | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
};

/**
 * User store
 */
export const useUserStore = create<UserState>((set) => ({
  ...initialState,
  
  setUser: (user) => set({ user }),
  
  setTokens: (tokens) => set({ tokens }),
  
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  logout: () => set({
    user: null,
    tokens: null,
    isAuthenticated: false,
  }),
  
  reset: () => set(initialState),
}));

/**
 * Selectors for accessing user state
 */
export const selectUser = (state: UserState) => state.user;
export const selectTokens = (state: UserState) => state.tokens;
export const selectIsAuthenticated = (state: UserState) => state.isAuthenticated;
export const selectIsLoading = (state: UserState) => state.isLoading;
export const selectUserRole = (state: UserState) => state.user?.role;
export const selectUserId = (state: UserState) => state.user?.id;
