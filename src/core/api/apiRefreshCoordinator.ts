/**
 * Single-flight token refresh with session epoch guards (prevents cross-account token bleed).
 */

import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { AuthTokens } from '../types';
import * as TokenStorage from '../services/tokenStorage';
import { useUserStore } from '../store/user.store';

export type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _authSessionEpoch?: number;
};

export type RefreshOutcome =
  | { kind: 'success'; accessToken: string; sessionEpoch: number }
  | { kind: 'rejected'; sessionEpoch: number }
  | { kind: 'transient'; sessionEpoch: number; reason: 'network' | 'timeout' | 'server' }
  | { kind: 'superseded'; sessionEpoch: number };

let refreshSessionEpoch = 0;
let refreshFlightGeneration = 0;
let refreshInFlight: {
  generation: number;
  sessionEpoch: number;
  promise: Promise<RefreshOutcome>;
} | null = null;

export function bumpAuthSessionEpoch(): number {
  refreshSessionEpoch += 1;
  refreshFlightGeneration += 1;
  refreshInFlight = null;
  return refreshSessionEpoch;
}

export function getAuthSessionEpoch(): number {
  return refreshSessionEpoch;
}

export function stampRequestSession(config: RetryableConfig): RetryableConfig {
  config._authSessionEpoch = refreshSessionEpoch;
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
  if (status === 401 || status === 403) {
    return 'rejected';
  }
  if (status >= 500) {
    return 'transient';
  }
  return 'rejected';
}

export async function storeTokensForSession(
  sessionEpoch: number,
  tokens: AuthTokens,
): Promise<boolean> {
  if (sessionEpoch !== refreshSessionEpoch) {
    return false;
  }
  await TokenStorage.storeAuthTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
  if (sessionEpoch !== refreshSessionEpoch) {
    return false;
  }
  useUserStore.getState().setTokens(tokens);
  return true;
}

export async function clearAuthForSession(sessionEpoch: number): Promise<boolean> {
  if (sessionEpoch !== refreshSessionEpoch) {
    return false;
  }
  await TokenStorage.clearAuthData();
  if (sessionEpoch !== refreshSessionEpoch) {
    return false;
  }
  return true;
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
      const refreshToken = await TokenStorage.getRefreshToken();
      if (!refreshToken || sessionEpoch !== refreshSessionEpoch) {
        return { kind: 'superseded', sessionEpoch };
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
        ax?.code === 'ECONNABORTED' || String(ax?.message ?? '').includes('timeout')
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
