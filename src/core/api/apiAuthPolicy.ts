/**
 * Contract-based API auth error classification (mobile).
 * Permission denials must not clear the session; only HTTP 401 on protected routes may refresh.
 */

import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

export type ApiAuthFailureKind =
  | 'none'
  | 'access_token_invalid'
  | 'refresh_token_rejected'
  | 'permission_denied';

export type ClassifiedApiError = {
  status: number | undefined;
  serverCode: string | undefined;
  detail: string | undefined;
  authFailureKind: ApiAuthFailureKind;
  shouldAttemptRefresh: boolean;
  isPermissionDenied: boolean;
  isTransient: boolean;
};

function extractDetailString(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const api = data as ApiError & Record<string, unknown>;
  if (typeof api.detail === 'string') return api.detail;
  if (Array.isArray(api.detail)) {
    return api.detail
      .map((d: unknown) => {
        if (d && typeof d === 'object' && typeof (d as { msg?: string }).msg === 'string') {
          return (d as { msg: string }).msg;
        }
        return '';
      })
      .filter(Boolean)
      .join('; ');
  }
  if (typeof api.message === 'string') return api.message;
  if (typeof api.error === 'string') return api.error;
  return undefined;
}

function extractServerCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const api = data as Record<string, unknown>;
  for (const key of ['code', 'error_code', 'errorCode']) {
    const v = api[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

export function classifyApiAuthError(error: AxiosError<ApiError>): ClassifiedApiError {
  const status = error.response?.status;
  const data = error.response?.data;
  const detail = extractDetailString(data);
  const serverCode = extractServerCode(data);
  const detailLower = (detail ?? '').toLowerCase();

  const isNetwork = error.message === 'Network Error' || !error.response;
  const is5xx = typeof status === 'number' && status >= 500;
  if (isNetwork || is5xx) {
    return {
      status,
      serverCode,
      detail,
      authFailureKind: 'none',
      shouldAttemptRefresh: false,
      isPermissionDenied: false,
      isTransient: true,
    };
  }

  if (status === 403) {
    return {
      status,
      serverCode,
      detail,
      authFailureKind: 'permission_denied',
      shouldAttemptRefresh: false,
      isPermissionDenied: true,
      isTransient: false,
    };
  }

  if (status === 401) {
    const refreshRejected =
      serverCode?.toLowerCase().includes('refresh') ||
      detailLower.includes('invalid refresh') ||
      detailLower.includes('refresh token');
    if (refreshRejected) {
      return {
        status,
        serverCode,
        detail,
        authFailureKind: 'refresh_token_rejected',
        shouldAttemptRefresh: false,
        isPermissionDenied: false,
        isTransient: false,
      };
    }
    return {
      status,
      serverCode,
      detail,
      authFailureKind: 'access_token_invalid',
      shouldAttemptRefresh: true,
      isPermissionDenied: false,
      isTransient: false,
    };
  }

  return {
    status,
    serverCode,
    detail,
    authFailureKind: 'none',
    shouldAttemptRefresh: false,
    isPermissionDenied: false,
    isTransient: false,
  };
}

export function buildPermissionDeniedError(classified: ClassifiedApiError): Error {
  const err = new Error(classified.detail || 'You do not have permission to access this resource.');
  (err as Error & { code?: string }).code = 'PERMISSION_DENIED';
  return err;
}

export function buildTransientRefreshError(reason: string): Error {
  const err = new Error(
    reason === 'timeout'
      ? 'Session refresh timed out. Please try again.'
      : 'Could not refresh your session. Please try again.',
  );
  (err as Error & { code?: string }).code = 'AUTH_REFRESH_TRANSIENT';
  return err;
}

export function extractResponseData(error: AxiosError<ApiError>): Record<string, unknown> | undefined {
  const data = error.response?.data;
  if (data && typeof data === 'object') {
    return data as unknown as Record<string, unknown>;
  }
  return undefined;
}
