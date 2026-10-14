/**
 * Single-flight token refresh with session epoch guards (prevents cross-account token bleed).
 */

import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { AuthTokens } from '../types';
import * as TokenStorage from '../services/tokenStorage';
import { getCredentialEpoch, setCredentialEpoch } from '../services/authCredentialEpoch';
import { useUserStore } from '../store/user.store';

export type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _authSessionEpoch?: number;
};

export type RefreshOutcome =
  | { kind: 'success'; accessToken: string; sessionEpoch: number }
  | { kind: 'rejected'; sessionEpoch: number }
  | { kind: 'transient'; sessionEpoch: number; reason: 'network' | 'timeout' | 'server' | 'rate_limit' }
  | { kind: 'superseded'; sessionEpoch: number };

let refreshSessionEpoch = 0;
let refreshFlightGeneration = 0;
let refreshInFlight: {
  generation: number;
  sessionEpoch: number;
  promise: Promise<RefreshOutcome>;
} | null = null;

let credentialMutationTail: Promise<void> = Promise.resolve();

function enqueueCredentialMutation(
  sessionEpoch: number,
  mutate: () => Promise<void>,
): Promise<boolean> {
  const run = async (): Promise<boolean> => {
    if (sessionEpoch !== refreshSessionEpoch) {
      return false;
    }
    await mutate();
    return sessionEpoch === refreshSessionEpoch;
  };

  const result = credentialMutationTail.then(run, run);
  credentialMutationTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function enqueueCredentialClear(_credentialEpoch: number, mutate: () => Promise<void>): Promise<void> {
  const task = credentialMutationTail.then(mutate, mutate);
  credentialMutationTail = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

/** Align in-memory coordinator epoch with persisted credential namespace. */
export function restoreAuthSessionEpoch(epoch: number): void {
  refreshSessionEpoch = epoch;
  setCredentialEpoch(epoch);
}

export async function initializeAuthSessionIdentity(): Promise<number> {
  const epoch = await TokenStorage.hydrateCredentialEpochFromStorage();
  restoreAuthSessionEpoch(epoch);
  return epoch;
}

export async function bumpAuthSessionEpoch(): Promise<number> {
  refreshSessionEpoch += 1;
  refreshFlightGeneration += 1;
  refreshInFlight = null;
  setCredentialEpoch(refreshSessionEpoch);
  await TokenStorage.persistCredentialEpoch(refreshSessionEpoch);
  return refreshSessionEpoch;
}

export function getAuthSessionEpoch(): number {
  return refreshSessionEpoch;
}

export function getOutgoingCredentialEpoch(): number {
  return getCredentialEpoch();
}

export function stampRequestSession(config: RetryableConfig): RetryableConfig {
  if (config._authSessionEpoch == null) {
    config._authSessionEpoch = refreshSessionEpoch;
  }
  return config;
}

export function isStaleSession(config: RetryableConfig): boolean {
  return config._authSessionEpoch != null && config._authSessionEpoch !== refreshSessionEpoch;
}

function classifyRefreshFailure(error: unknown): 'rejected' | 'transient' {
  const ax = error as AxiosError | undefined;
  if (!ax?.response) {
    const msg = String(ax?.message ?? error ?? '');
    if (msg.includes('timeout') || ax?.code === 'ECONNABORTED') {
      return 'transient';
    }
    return 'transient';
  }
  const status = ax.response.status;
  if (status === 401) {
    return 'rejected';
  }
  if (status === 403) {
    return 'transient';
  }
  if (status === 429 || status >= 500) {
    return 'transient';
  }
  return 'transient';
}

export async function storeTokensForSession(
  sessionEpoch: number,
  tokens: AuthTokens,
): Promise<boolean> {
  return enqueueCredentialMutation(sessionEpoch, async () => {
    if (sessionEpoch !== refreshSessionEpoch) {
      return;
    }
    await TokenStorage.storeAuthTokensForEpoch(
      sessionEpoch,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn,
    );
    if (sessionEpoch !== refreshSessionEpoch) {
      return;
    }
    useUserStore.getState().setTokens(tokens);
  });
}

export async function storeUserDataForSession(
  sessionEpoch: number,
  userDataJson: string,
): Promise<boolean> {
  return enqueueCredentialMutation(sessionEpoch, async () => {
    if (sessionEpoch !== refreshSessionEpoch) {
      return;
    }
    await TokenStorage.storeUserDataForEpoch(sessionEpoch, userDataJson);
  });
}

/** Clears a specific credential namespace (e.g. outgoing logout), regardless of current session epoch. */
export async function clearCredentialsAtEpoch(credentialEpoch: number): Promise<void> {
  await enqueueCredentialClear(credentialEpoch, async () => {
    await TokenStorage.clearAuthDataForEpoch(credentialEpoch);
  });
}

/** Clears credentials for the active session only. */
export async function clearAuthForSession(sessionEpoch: number): Promise<boolean> {
  if (sessionEpoch !== refreshSessionEpoch) {
    return false;
  }
  await clearCredentialsAtEpoch(sessionEpoch);
  return sessionEpoch === refreshSessionEpoch;
}

export async function refreshAccessToken(
  refreshClient: AxiosInstance,
  sessionEpoch: number,
): Promise<RefreshOutcome> {
  if (sessionEpoch !== refreshSessionEpoch) {
    return { kind: 'superseded', sessionEpoch };
  }

  if (
    refreshInFlight &&
    refreshInFlight.sessionEpoch === sessionEpoch &&
    refreshInFlight.generation === refreshFlightGeneration
  ) {
    return refreshInFlight.promise;
  }

  const generation = refreshFlightGeneration;
  const promise = (async (): Promise<RefreshOutcome> => {
    if (sessionEpoch !== refreshSessionEpoch) {
      return { kind: 'superseded', sessionEpoch };
    }
    try {
      const refreshToken = await TokenStorage.getRefreshTokenForEpoch(sessionEpoch);
      if (sessionEpoch !== refreshSessionEpoch) {
        return { kind: 'superseded', sessionEpoch };
      }
      if (!refreshToken) {
        return { kind: 'rejected', sessionEpoch };
      }

      const refreshResponse = await refreshClient.post<{ access_token: string; refresh_token: string }>(
        '/api/v1/auth/refresh',
        { refresh_token: refreshToken },
      );

      if (sessionEpoch !== refreshSessionEpoch) {
        return { kind: 'superseded', sessionEpoch };
      }

      const tokens: AuthTokens = {
        accessToken: refreshResponse.data.access_token,
        refreshToken: refreshResponse.data.refresh_token,
        expiresIn: 3600,
      };

      const stored = await storeTokensForSession(sessionEpoch, tokens);
      if (!stored) {
        return { kind: 'superseded', sessionEpoch };
      }

      return { kind: 'success', accessToken: tokens.accessToken, sessionEpoch };
    } catch (error) {
      if (sessionEpoch !== refreshSessionEpoch) {
        return { kind: 'superseded', sessionEpoch };
      }
      const bucket = classifyRefreshFailure(error);
      if (bucket === 'rejected') {
        return { kind: 'rejected', sessionEpoch };
      }
      const ax = error as AxiosError;
      const reason =
        ax?.response?.status === 429
          ? 'rate_limit'
          : ax?.code === 'ECONNABORTED' || String(ax?.message ?? '').includes('timeout')
            ? 'timeout'
            : ax?.response && ax.response.status >= 500
              ? 'server'
              : 'network';
      return { kind: 'transient', sessionEpoch, reason };
    } finally {
      if (refreshInFlight?.generation === generation) {
        refreshInFlight = null;
      }
    }
  })();

  refreshInFlight = { generation, sessionEpoch, promise };
  return promise;
}

/** @deprecated use stampRequestSession on dispatch */
export function attachSessionEpoch(config: RetryableConfig): RetryableConfig {
  return stampRequestSession(config);
}
