/**
 * Authentication Hook
 * Provides authentication functionality with JWT token management
 * Bridges UI and core authentication logic
 */

import { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '../store/user.store';
import { useTeacherDashboardStore } from '../store/teacherDashboard.store';
import * as AuthAPI from '../api/auth.api';
import { get } from '../api/config';
import * as TokenStorage from '../services/tokenStorage';
import type { LoginCredentials, UserProfile } from '../types';
import { clearQuizNavCache } from './useQuizNavItems';
import { bumpAuthSessionEpoch, getAuthSessionEpoch, storeUserDataForSession } from '../api/apiRefreshCoordinator';
import { resetStudentAssignmentDashboardStore } from '../store/studentAssignmentDashboard.store';
import { useDashboardStore } from '../store/dashboard.store';

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

function formatAuthError(err: unknown): string {
  const anyErr = err as { response?: { data?: { detail?: string; message?: string } }; message?: string };
  const detail = anyErr?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => (typeof d === 'string' ? d : d?.msg ?? JSON.stringify(d))).join(', ');
  }
  if (typeof anyErr?.response?.data?.message === 'string') return anyErr.response.data.message;
  if (typeof anyErr?.message === 'string' && anyErr.message.trim()) return anyErr.message;
  return 'Login failed. Please check your credentials and try again.';
}

function isSuperAdminUser(user: UserProfile | null): boolean {
  if (!user) return false;
  const anyUser = user as any;
  return (
    anyUser?.role_id === 1 ||
    anyUser?.role_name === 'super_admin' ||
    anyUser?.role === 'super_admin' ||
    (anyUser?.role === 'admin' && !extractSchoolId(user))
  );
}

async function enrichUserWithSchoolName(user: UserProfile): Promise<UserProfile> {
  if (isSuperAdminUser(user)) return user;
  try {
    const resp = await get<any>('/api/v1/school-management/my-school');
    const apiSchoolName =
      (typeof resp?.school_name === 'string' && resp.school_name) ||
      (typeof resp?.name === 'string' && resp.name) ||
      (typeof resp?.data?.school_name === 'string' && resp.data.school_name) ||
      (typeof resp?.data?.name === 'string' && resp.data.name) ||
      '';

    // Also extract school_id from the /my-school response (SchoolResponse has school_id field)
    const apiSchoolId: number | undefined =
      typeof resp?.school_id === 'number' ? resp.school_id :
      typeof resp?.data?.school_id === 'number' ? resp.data.school_id :
      undefined;

    const nextUser = {
      ...(user as any),
      ...(apiSchoolName ? { school: apiSchoolName, school_name: apiSchoolName } : {}),
      ...(apiSchoolId ? { school_id: apiSchoolId } : {}),
    } as UserProfile;

    return nextUser;
  } catch {
    return user;
  }
}

interface UseAuthReturn {
  // State
  user: UserProfile | null;
  isAuthenticated: boolean;
  /** Splash gate — first auth check on app launch only */
  isInitializing: boolean;
  /** @deprecated Use isLoggingIn for login button; kept for compatibility */
  isLoading: boolean;
  isLoggingIn: boolean;
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
    isInitializing,
    isLoading,
    setUser,
    setAuthenticated,
    setInitializing,
    setLoading,
    setSchoolId,
    logout: logoutStore,
  } = useUserStore();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
      setInitializing(true);
      setLoading(true);
      setError(null);

      await TokenStorage.hydrateCredentialEpochFromStorage();

      // Check if we have a valid token
      const accessToken = await TokenStorage.getAccessToken();
      
      // No token = not authenticated, show login immediately
      if (!accessToken) {
        console.log('No access token found - showing login');
        setAuthenticated(false);
        setUser(null);
        setInitializing(false);
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
          setInitializing(false);
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
        const enrichedUser = await enrichUserWithSchoolName(currentUser);
        setUser(enrichedUser);
        setAuthenticated(true);
        // Centrally store school_id for all API calls
        const sid = extractSchoolId(enrichedUser);
        setSchoolId(sid);
        console.log('User authenticated:', enrichedUser.email, '| school_id:', sid);
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
      setInitializing(false);
      setLoading(false);
      isCheckingAuth = false;
      console.log('Auth check complete');
    }
  }, [setUser, setAuthenticated, setInitializing, setLoading, setSchoolId]);

  /**
   * Login with credentials
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoggingIn(true);
      setError(null);

      // Validate credentials
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      // Call login API (tokens are stored automatically in auth.api.ts)
      bumpAuthSessionEpoch();
      const response = await AuthAPI.login(credentials);

      // Web AuthContext: after login, loadProfile() from /auth/profile (has full_name)
      let profileUser = response.user;
      try {
        profileUser = await AuthAPI.fetchAuthProfile();
      } catch {
        // Keep login payload if profile fetch fails
      }

      const enrichedUser = await enrichUserWithSchoolName(profileUser);
      setUser(enrichedUser);
      setAuthenticated(true);
      setSchoolId(extractSchoolId(enrichedUser));
      await storeUserDataForSession(getAuthSessionEpoch(), JSON.stringify(enrichedUser));
    } catch (err) {
      console.error('Login failed:', err);
      const message = formatAuthError(err);
      setError(message);
      setAuthenticated(false);
      setUser(null);
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  }, [setUser, setAuthenticated, setSchoolId]);

  const resetNotificationGuardBestEffort = async (accountKey: string | null) => {
    try {
      const { resetNotificationFetchGuardForAccount } = await import('../api/notificationFetchGuard');
      resetNotificationFetchGuardForAccount(accountKey);
    } catch {
      // Notification guard is phase6-only; logout must still complete if cleanup is unavailable.
    }
  };

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = useUserStore.getState().user;
      const accountKey = currentUser?.id != null ? String(currentUser.id) : null;
      await resetNotificationGuardBestEffort(accountKey);
      bumpAuthSessionEpoch();

      // Call logout API (clears tokens automatically)
      await AuthAPI.logout();

      // Reset dashboard store
      useTeacherDashboardStore.getState().reset();
      resetStudentAssignmentDashboardStore(null);
      useDashboardStore.getState().clearData();
      // Clear quiz nav cache so next login fetches fresh permissions
      clearQuizNavCache();
      // Clear store (clears user and tokens)
      logoutStore();
      await resetNotificationGuardBestEffort(null);
    } catch (err) {
      console.error('Logout API failed:', err);
      await resetNotificationGuardBestEffort(null);
      // Still clear stores even if API call fails
      useTeacherDashboardStore.getState().reset();
      resetStudentAssignmentDashboardStore(null);
      useDashboardStore.getState().clearData();
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
    isInitializing,
    isLoading,
    isLoggingIn,
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
