/**
 * Startup / login / logout auth policy helpers (testable, session-scoped).
 */

import type { AxiosError } from 'axios';
import type { UserProfile } from '../types';

export type StartupAuthFailureKind = 'none' | 'transient' | 'timeout' | 'credential_rejected';

export function classifyStartupAuthError(err: unknown): StartupAuthFailureKind {
  const message = err instanceof Error ? err.message : String(err ?? '');
  if (/timeout/i.test(message) || message === 'Refresh timeout' || message === 'User fetch timeout') {
    return 'timeout';
  }
  const ax = err as AxiosError | undefined;
  if (!ax?.response) {
    if (message === 'Network Error' || /network/i.test(message)) {
      return 'transient';
    }
    return 'transient';
  }
  const status = ax.response.status;
  if (status === 401 || status === 403) {
    return 'credential_rejected';
  }
  if (status === 429 || status >= 500) {
    return 'transient';
  }
  return 'credential_rejected';
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
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(timeoutLabel)), timeoutMs);
    });
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
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
