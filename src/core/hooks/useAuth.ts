/**
 * Authentication Hook
 * Provides authentication functionality with JWT token management
 * Bridges UI and core authentication logic
 */

import { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '../store/user.store';
import { useTeacherDashboardStore } from '../store/teacherDashboard.store';
import * as AuthAPI from '../api/auth.api';
import * as TokenStorage from '../services/tokenStorage';
import type { LoginCredentials, UserProfile } from '../types';
import { clearQuizNavCache } from './useQuizNavItems';

/** Extract school_id from any user profile shape with multi-field fallbacks */
function extractSchoolId(user: UserProfile | null): number | null {
  if (!user) return null;
  const toNum = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return (
    toNum((user as any).school_id) ??
    toNum((user as any).schoolId) ??
    toNum((user as any).school?.id) ??
    toNum((user as any).school?.school_id) ??
    toNum((user as any).profile?.school?.id) ??
    toNum((user as any).profile?.school_id) ??
    toNum((user as any).profile?.schoolId) ??
    toNum((user as any).organization_id) ??
    toNum((user as any).org_id) ??
    null
  );
}

interface UseAuthReturn {
  // State
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

// Global flag to prevent multiple auth checks
let isCheckingAuth = false;
let hasCheckedAuth = false;

/**
 * Authentication hook
 * Manages user authentication state and JWT tokens
 */
export function useAuth(): UseAuthReturn {
  const {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    setAuthenticated,
    setLoading,
    setSchoolId,
    logout: logoutStore,
  } = useUserStore();
  
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if user is authenticated on mount
   */
  const checkAuth = useCallback(async () => {
    // Prevent concurrent checks
    if (isCheckingAuth || hasCheckedAuth) {
      return;
    }
    
    isCheckingAuth = true;
    hasCheckedAuth = true;
    
    try {
      setLoading(true);
      setError(null);

      // Check if we have a valid token
      const accessToken = await TokenStorage.getAccessToken();
      
      // No token = not authenticated, show login immediately
      if (!accessToken) {
        console.log('No access token found - showing login');
        setAuthenticated(false);
        setUser(null);
        setLoading(false);
        isCheckingAuth = false;
        return;
      }

      console.log('Access token found, checking expiry...');

      // Check if token is expired
      const isExpired = await TokenStorage.isTokenExpired();
      
      if (isExpired) {
        console.log('Token expired, attempting refresh...');
        // Try to refresh the token with timeout
        try {
          const refreshPromise = AuthAPI.refreshToken();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Refresh timeout')), 5000)
          );
          
          await Promise.race([refreshPromise, timeoutPromise]);
          console.log('Token refreshed successfully');
        } catch (refreshError) {
          // Refresh failed, clear auth
          console.warn('Token refresh failed:', refreshError);
          await TokenStorage.clearAuthData();
          setAuthenticated(false);
          setUser(null);
          setLoading(false);
          isCheckingAuth = false;
          return;
        }
      }

      // Get current user with timeout
      try {
        console.log('Fetching user profile...');
        const userPromise = AuthAPI.getCurrentUser();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('User fetch timeout')), 5000)
        );
        
        const currentUser = await Promise.race([userPromise, timeoutPromise]);
        setUser(currentUser);
        setAuthenticated(true);
        // Centrally store school_id for all API calls
        const sid = extractSchoolId(currentUser);
        setSchoolId(sid);
        console.log('User authenticated:', currentUser.email, '| school_id:', sid);
        // NO automatic data loading - data loads only when screens are opened
      } catch (apiError) {
        // API call failed (backend not available), clear auth and show login
        console.warn('Failed to fetch user profile - showing login:', apiError);
        await TokenStorage.clearAuthData();
        setAuthenticated(false);
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setAuthenticated(false);
      setUser(null);
      // Don't clear tokens here - might be network issue
    } finally {
      setLoading(false);
      isCheckingAuth = false;
      console.log('Auth check complete');
    }
  }, [setUser, setAuthenticated, setLoading]);

  /**
   * Login with credentials
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);

      // Validate credentials
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      // Call login API (tokens are stored automatically in auth.api.ts)
      const response = await AuthAPI.login(credentials);

      // Update store
      setUser(response.user);
      setAuthenticated(true);
      // Centrally store school_id for all API calls
      setSchoolId(extractSchoolId(response.user));
      // NO automatic data loading - dashboard will load its own data when mounted
    } catch (err) {
      console.error('Login failed:', err);
      setAuthenticated(false);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setUser, setAuthenticated, setLoading, setSchoolId]);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Call logout API (clears tokens automatically)
      await AuthAPI.logout();

      // Reset dashboard store
      useTeacherDashboardStore.getState().reset();
      // Clear quiz nav cache so next login fetches fresh permissions
      clearQuizNavCache();
      // Clear store (clears user and tokens)
      logoutStore();
    } catch (err) {
      console.error('Logout API failed:', err);
      // Still clear stores even if API call fails
      useTeacherDashboardStore.getState().reset();
      clearQuizNavCache();
      logoutStore();
    } finally {
      setLoading(false);
    }
  }, [logoutStore, setLoading]);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check authentication status on mount - ONLY ONCE GLOBALLY
   */
  useEffect(() => {
    if (!hasCheckedAuth) {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    checkAuth,
    clearError,
  };
}

/**
 * Get current user hook
 * Convenience hook for components that only need user data
 */
export function useCurrentUser(): UserProfile | null {
  const { user } = useUserStore();
  return user;
}

/**
 * Check if user is authenticated hook
 * Convenience hook for components that only need auth status
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useUserStore();
  return isAuthenticated;
}
