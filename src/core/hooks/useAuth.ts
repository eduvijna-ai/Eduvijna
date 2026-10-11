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
import {
  bumpAuthSessionEpoch,
  clearCredentialsAtEpoch,
  getAuthSessionEpoch,
  getOutgoingCredentialEpoch,
  initializeAuthSessionIdentity,
  storeUserDataForSession,
} from '../api/apiRefreshCoordinator';
import { resetStudentAssignmentDashboardStore } from '../store/studentAssignmentDashboard.store';
import { useDashboardStore } from '../store/dashboard.store';
import {
  classifyStartupAuthError,
  createSessionScopedCommit,
  parseCachedUserProfile,
  raceWithBoundedWait,
  recoverableStartupMessage,
} from './authLifecycle';

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

    const apiSchoolId: number | undefined =
      typeof resp?.school_id === 'number'
        ? resp.school_id
        : typeof resp?.data?.school_id === 'number'
          ? resp.data.school_id
          : undefined;

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

function applyAuthenticatedUser(
  sessionEpoch: number,
  enrichedUser: UserProfile,
  deps: {
    setUser: (u: UserProfile | null) => void;
    setAuthenticated: (v: boolean) => void;
    setSchoolId: (id: number | null) => void;
  },
) {
  const commit = createSessionScopedCommit(sessionEpoch, getAuthSessionEpoch);
  commit.run(() => {
    deps.setUser(enrichedUser);
    deps.setAuthenticated(true);
    deps.setSchoolId(extractSchoolId(enrichedUser));
  });
}

async function restoreSessionFromCache(
  sessionEpoch: number,
  deps: {
    setUser: (u: UserProfile | null) => void;
    setAuthenticated: (v: boolean) => void;
    setSchoolId: (id: number | null) => void;
    setError: (e: string | null) => void;
  },
  failureKind: ReturnType<typeof classifyStartupAuthError>,
): Promise<boolean> {
  const cached = parseCachedUserProfile(await TokenStorage.getUserData());
  const commit = createSessionScopedCommit(sessionEpoch, getAuthSessionEpoch);
  const recoverable = recoverableStartupMessage(failureKind);
  if (cached) {
    commit.run(() => {
      deps.setUser(cached);
      deps.setAuthenticated(true);
      deps.setSchoolId(extractSchoolId(cached));
      deps.setError(recoverable);
    });
    return true;
  }
  commit.run(() => {
    deps.setAuthenticated(false);
    deps.setUser(null);
    deps.setError(recoverable);
  });
  return false;
}

interface UseAuthReturn {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

let isCheckingAuth = false;
let hasCheckedAuth = false;

/** @internal */
export function __testResetUseAuthGlobals(): void {
  isCheckingAuth = false;
  hasCheckedAuth = false;
}

const STARTUP_REFRESH_TIMEOUT_MS = 15000;
const STARTUP_PROFILE_TIMEOUT_MS = 15000;

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

  const checkAuth = useCallback(async () => {
    if (isCheckingAuth || hasCheckedAuth) {
      return;
    }

    isCheckingAuth = true;
    hasCheckedAuth = true;

    let startupEpoch = 0;

    try {
      setInitializing(true);
      setLoading(true);
      setError(null);

      await initializeAuthSessionIdentity();
      startupEpoch = getAuthSessionEpoch();
      const commit = createSessionScopedCommit(startupEpoch, getAuthSessionEpoch);

      const accessToken = await TokenStorage.getAccessToken();
      if (!accessToken) {
        commit.run(() => {
          setAuthenticated(false);
          setUser(null);
        });
        return;
      }

      const isExpired = await TokenStorage.isTokenExpired();
      if (isExpired) {
        try {
          const refreshEpoch = getAuthSessionEpoch();
          await raceWithBoundedWait(
            AuthAPI.refreshToken(undefined, refreshEpoch),
            STARTUP_REFRESH_TIMEOUT_MS,
            'Refresh timeout',
          );
        } catch (refreshError) {
          const kind = classifyStartupAuthError(refreshError);
          if (kind === 'credential_rejected') {
            const credEpoch = getOutgoingCredentialEpoch();
            await clearCredentialsAtEpoch(credEpoch);
            commit.run(() => {
              setAuthenticated(false);
              setUser(null);
              setError('Session expired. Please sign in again.');
            });
            return;
          }
          await restoreSessionFromCache(
            startupEpoch,
            { setUser, setAuthenticated, setSchoolId, setError },
            kind,
          );
          return;
        }
      }

      try {
        const profileEpoch = getAuthSessionEpoch();
        const currentUser = await raceWithBoundedWait(
          AuthAPI.getCurrentUser(),
          STARTUP_PROFILE_TIMEOUT_MS,
          'User fetch timeout',
        );
        const enrichedUser = await enrichUserWithSchoolName(currentUser);
        applyAuthenticatedUser(profileEpoch, enrichedUser, {
          setUser,
          setAuthenticated,
          setSchoolId,
        });
        commit.run(() => setError(null));
        await storeUserDataForSession(profileEpoch, JSON.stringify(enrichedUser));
      } catch (apiError) {
        const kind = classifyStartupAuthError(apiError);
        if (kind === 'credential_rejected') {
          const credEpoch = getOutgoingCredentialEpoch();
          await clearCredentialsAtEpoch(credEpoch);
          commit.run(() => {
            setAuthenticated(false);
            setUser(null);
            setError('Session expired. Please sign in again.');
          });
          return;
        }
        await restoreSessionFromCache(
          startupEpoch,
          { setUser, setAuthenticated, setSchoolId, setError },
          kind,
        );
      }
    } catch (err) {
      const kind = classifyStartupAuthError(err);
      const commit = createSessionScopedCommit(startupEpoch, getAuthSessionEpoch);
      if (kind === 'credential_rejected') {
        commit.run(() => {
          setAuthenticated(false);
          setUser(null);
        });
      } else {
        await restoreSessionFromCache(
          startupEpoch,
          { setUser, setAuthenticated, setSchoolId, setError },
          kind,
        );
      }
    } finally {
      const commit = createSessionScopedCommit(startupEpoch, getAuthSessionEpoch);
      commit.run(() => {
        setInitializing(false);
        setLoading(false);
      });
      isCheckingAuth = false;
    }
  }, [setUser, setAuthenticated, setInitializing, setLoading, setSchoolId]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const sessionEpoch = await bumpAuthSessionEpoch();
      const commit = createSessionScopedCommit(sessionEpoch, getAuthSessionEpoch);

      try {
        setIsLoggingIn(true);
        commit.run(() => setError(null));

        if (!credentials.email || !credentials.password) {
          throw new Error('Email and password are required');
        }

        const response = await AuthAPI.login(credentials, sessionEpoch);

        let profileUser = response.user;
        try {
          profileUser = await AuthAPI.fetchAuthProfile(sessionEpoch);
        } catch {
          // Keep login payload on profile transient failure
        }

        const enrichedUser = await enrichUserWithSchoolName(profileUser);
        applyAuthenticatedUser(sessionEpoch, enrichedUser, {
          setUser,
          setAuthenticated,
          setSchoolId,
        });
        await storeUserDataForSession(sessionEpoch, JSON.stringify(enrichedUser));
      } catch (err) {
        commit.run(() => {
          const message = formatAuthError(err);
          setError(message);
          if (classifyStartupAuthError(err) === 'credential_rejected') {
            setAuthenticated(false);
            setUser(null);
          }
        });
        throw err;
      } finally {
        if (getAuthSessionEpoch() === sessionEpoch) {
          setIsLoggingIn(false);
        }
      }
    },
    [setUser, setAuthenticated, setSchoolId],
  );

  const resetNotificationGuardBestEffort = async (accountKey: string | null) => {
    try {
      const { resetNotificationFetchGuardForAccount } = await import('../api/notificationFetchGuard');
      resetNotificationFetchGuardForAccount(accountKey);
    } catch {
      // optional
    }
  };

  const logout = useCallback(async () => {
    const outgoingCredentialEpoch = getOutgoingCredentialEpoch();
    const logoutSessionEpoch = await bumpAuthSessionEpoch();
    const commit = createSessionScopedCommit(logoutSessionEpoch, getAuthSessionEpoch);

    try {
      commit.run(() => {
        setLoading(true);
        setError(null);
      });

      const currentUser = useUserStore.getState().user;
      const accountKey = currentUser?.id != null ? String(currentUser.id) : null;
      await resetNotificationGuardBestEffort(accountKey);

      await AuthAPI.logout({ credentialEpoch: outgoingCredentialEpoch });

      commit.run(() => {
        useTeacherDashboardStore.getState().reset();
        resetStudentAssignmentDashboardStore(null);
        useDashboardStore.getState().clearData();
        clearQuizNavCache();
        logoutStore();
      });
      await resetNotificationGuardBestEffort(null);
    } catch (err) {
      console.error('Logout API failed:', err);
      commit.run(() => {
        useTeacherDashboardStore.getState().reset();
        resetStudentAssignmentDashboardStore(null);
        useDashboardStore.getState().clearData();
        clearQuizNavCache();
        logoutStore();
      });
      await resetNotificationGuardBestEffort(null);
    } finally {
      commit.run(() => setLoading(false));
    }
  }, [logoutStore, setLoading]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (!hasCheckedAuth) {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

export function useCurrentUser(): UserProfile | null {
  const { user } = useUserStore();
  return user;
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useUserStore();
  return isAuthenticated;
}
