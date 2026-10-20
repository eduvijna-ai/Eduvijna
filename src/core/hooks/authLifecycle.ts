/**
 * Startup / login / logout auth policy helpers (testable, session-scoped).
 */

import type { AxiosError } from 'axios';
import type { UserProfile } from '../types';
import type { ApiError } from '../types';
import { classifyApiAuthError } from '../api/apiAuthPolicy';

export type StartupAuthFailureKind = 'none' | 'transient' | 'timeout' | 'credential_rejected';

export type StartupAuthErrorContext = {
  /** Request path fragment, e.g. /api/v1/auth/profile */
  url?: string;
  operation?: 'startup_refresh' | 'startup_profile' | 'login';
};

function requestUrl(err: unknown): string | undefined {
  const ax = err as AxiosError | undefined;
  const url = ax?.config?.url;
  return typeof url === 'string' ? url : undefined;
}

function isAuthSessionEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/profile') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/me') ||
    url.includes('/auth/login')
  );
}

export function classifyStartupAuthError(
  err: unknown,
  context: StartupAuthErrorContext = {},
): StartupAuthFailureKind {
  const message = err instanceof Error ? err.message : String(err ?? '');
  if (/timeout/i.test(message) || message === 'Refresh timeout' || message === 'User fetch timeout') {
    return 'timeout';
  }

  const ax = err as AxiosError<ApiError> | undefined;
  if (!ax?.response) {
    if (message === 'Network Error' || /network/i.test(message)) {
      return 'transient';
    }
    if (message === 'No refresh token available') {
      return 'credential_rejected';
    }
    return 'transient';
  }

  const status = ax.response.status;
  if (status === 429 || status >= 500) {
    return 'transient';
  }

  const classified = classifyApiAuthError(ax);
  if (classified.isPermissionDenied) {
    return 'transient';
  }

  const url = context.url ?? requestUrl(err);
  const operation = context.operation;

  if (classified.authFailureKind === 'refresh_token_rejected') {
    return 'credential_rejected';
  }

  if (status === 401) {
    if (operation === 'login' || url?.includes('/auth/login')) {
      return 'credential_rejected';
    }
    if (operation === 'startup_refresh' || url?.includes('/auth/refresh')) {
      return 'credential_rejected';
    }
    if (operation === 'startup_profile' || url?.includes('/auth/profile')) {
      return 'credential_rejected';
    }
    if (isAuthSessionEndpoint(url)) {
      return 'credential_rejected';
    }
    return 'transient';
  }

  if (status === 403) {
    return 'transient';
  }

  if (status === 404 || status === 400 || status === 422) {
    return 'transient';
  }

  return 'transient';
}

export function recoverableStartupMessage(kind: StartupAuthFailureKind): string | null {
  if (kind === 'timeout') {
    return 'Connection timed out. Your session is still saved—check your network and try again.';
  }
  if (kind === 'transient') {
    return 'Could not reach the server. Your session is still saved—try again when online.';
  }
  return null;
}

export type SessionScopedCommit<T> = {
  sessionEpoch: number;
  isCurrent: (epoch: number) => boolean;
  run: (fn: () => T) => T | undefined;
  runAsync: (fn: () => Promise<T>) => Promise<T | undefined>;
};

export function createSessionScopedCommit(
  sessionEpoch: number,
  getCurrentEpoch: () => number,
): SessionScopedCommit<unknown> {
  const isCurrent = (epoch: number) => epoch === getCurrentEpoch();
  return {
    sessionEpoch,
    isCurrent,
    run(fn) {
      if (!isCurrent(sessionEpoch)) return undefined;
      return fn();
    },
    runAsync: async (fn) => {
      if (!isCurrent(sessionEpoch)) return undefined;
      const result = await fn();
      if (!isCurrent(sessionEpoch)) return undefined;
      return result;
    },
  };
}

export async function raceWithBoundedWait<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutLabel: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;
  const work = operation.finally(() => {
    settled = true;
  });
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(timeoutLabel)), timeoutMs);
    });
    return await Promise.race([work, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
    void work.catch(() => undefined);
    if (!settled) {
      // Caller timed out; underlying operation may still complete but must not change UI without session guards.
    }
  }
}

export function parseCachedUserProfile(raw: string | null): UserProfile | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}
