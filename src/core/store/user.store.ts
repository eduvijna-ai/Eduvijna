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
  /** True only during the first app-launch auth check (splash gate). */
  isInitializing: boolean;
  isLoading: boolean;
  /** Resolved school ID – centrally managed for all ERP/API calls */
  schoolId: number | null;
  
  // Actions
  setUser: (user: UserProfile | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setInitializing: (isInitializing: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setSchoolId: (schoolId: number | null) => void;
  logout: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: false,
  schoolId: null as number | null,
};

/**
 * User store
 */
export const useUserStore = create<UserState>((set) => ({
  ...initialState,
  
  setUser: (user) => set({ user }),
  
  setTokens: (tokens) => set({ tokens }),
  
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  setInitializing: (isInitializing) => set({ isInitializing }),

  setLoading: (isLoading) => set({ isLoading }),
  
  setSchoolId: (schoolId) => set({ schoolId }),

  logout: () => set({
    user: null,
    tokens: null,
    isAuthenticated: false,
    schoolId: null,
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
export const selectSchoolId = (state: UserState) => state.schoolId;
