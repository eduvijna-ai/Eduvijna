/**
 * Single-flight token refresh with session epoch guards (prevents cross-account token bleed).
 */

import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { AuthTokens } from '../types';
import * as TokenStorage from '../services/tokenStorage';
import { useUserStore } from '../store/user.store';

type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _authSessionEpoch?: number;
};

let refreshInFlight: Promise<string | null> | null = null;
let refreshSessionEpoch = 0;

export function bumpAuthSessionEpoch(): number {
  refreshInFlight = null;
  refreshSessionEpoch += 1;
  return refreshSessionEpoch;
}

export function getAuthSessionEpoch(): number {
  return refreshSessionEpoch;
}

export async function refreshAccessToken(
  refreshClient: AxiosInstance,
  sessionEpoch: number,
): Promise<string | null> {
  if (sessionEpoch !== refreshSessionEpoch) {
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const refreshToken = await TokenStorage.getRefreshToken();
        if (!refreshToken) {
          return null;
        }
        const refreshResponse = await refreshClient.post<{ access_token: string; refresh_token: string }>(
          '/api/v1/auth/refresh',
          { refresh_token: refreshToken },
        );
        if (sessionEpoch !== refreshSessionEpoch) {
          return null;
        }
        const tokens: AuthTokens = {
          accessToken: refreshResponse.data.access_token,
          refreshToken: refreshResponse.data.refresh_token,
          expiresIn: 3600,
        };
        await TokenStorage.storeAuthTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
        useUserStore.getState().setTokens(tokens);
        return tokens.accessToken;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

export function attachSessionEpoch(config: RetryableConfig): RetryableConfig {
  if (config._authSessionEpoch == null) {
    config._authSessionEpoch = refreshSessionEpoch;
  }
  return config;
}

export function isStaleSession(config: RetryableConfig): boolean {
  return config._authSessionEpoch != null && config._authSessionEpoch !== refreshSessionEpoch;
}
