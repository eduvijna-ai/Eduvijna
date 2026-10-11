/**
 * Contract-based API auth error classification (mobile).
 * Permission denials must not clear the session; only genuine auth failures may refresh/logout.
 */

import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

export type ApiAuthFailureKind =
  | 'none'
  | 'access_token_expired'
  | 'access_token_invalid'
  | 'refresh_token_rejected'
  | 'permission_denied'
  | 'auth_message_hint';

export type ClassifiedApiError = {
  status: number | undefined;
  serverCode: string | undefined;
  detail: string | undefined;
  authFailureKind: ApiAuthFailureKind;
  shouldAttemptRefresh: boolean;
  shouldLogoutAfterRefreshFailure: boolean;
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
  if (api.error && typeof api.error === 'object' && typeof (api.error as { message?: string }).message === 'string') {
    return (api.error as { message: string }).message;
  }
  return undefined;
}

function extractServerCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const api = data as Record<string, unknown>;
  const candidates = [api.code, api.error_code, api.errorCode];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return undefined;
}

const REFRESH_HINTS = [
  'invalid or missing jwt token',
  'token expired',
  'expired token',
  'signature has expired',
  'not authenticated',
  'authentication credentials were not provided',
];

const PERMISSION_HINTS = [
  'permission denied',
  'not allowed',
  'forbidden',
  'access denied',
  'insufficient privileges',
];

export function classifyApiAuthError(error: AxiosError<ApiError>): ClassifiedApiError {
  const status = error.response?.status;
  const data = error.response?.data;
  const detail = extractDetailString(data);
  const serverCode = extractServerCode(data);
  const detailLower = (detail ?? '').toLowerCase();

  const isNetwork = error.message === 'Network Error' || !error.response;
  const is5xx = typeof status === 'number' && status >= 500;
  const isTransient = isNetwork || is5xx;

  if (isTransient) {
    return {
      status,
      serverCode,
      detail,
      authFailureKind: 'none',
      shouldAttemptRefresh: false,
      shouldLogoutAfterRefreshFailure: false,
      isPermissionDenied: false,
      isTransient: true,
    };
  }

  if (status === 403) {
    const permissionByMessage = PERMISSION_HINTS.some((h) => detailLower.includes(h));
    return {
      status,
      serverCode,
      detail,
      authFailureKind: 'permission_denied',
      shouldAttemptRefresh: false,
      shouldLogoutAfterRefreshFailure: false,
      isPermissionDenied: true,
      isTransient: false,
    };
  }

  if (status === 401) {
    const refreshHint = REFRESH_HINTS.some((h) => detailLower.includes(h));
    const invalidRefresh =
      serverCode?.toLowerCase().includes('refresh') ||
      detailLower.includes('refresh token') ||
      detailLower.includes('invalid refresh');
    if (invalidRefresh) {
      return {
        status,
        serverCode,
        detail,
        authFailureKind: 'refresh_token_rejected',
        shouldAttemptRefresh: false,
        shouldLogoutAfterRefreshFailure: true,
        isPermissionDenied: false,
        isTransient: false,
      };
    }
    return {
      status,
      serverCode,
      detail,
      authFailureKind: refreshHint ? 'access_token_expired' : 'access_token_invalid',
      shouldAttemptRefresh: true,
      shouldLogoutAfterRefreshFailure: true,
      isPermissionDenied: false,
      isTransient: false,
    };
  }

  const messageAuthHint =
    detailLower.includes('authentication failed') ||
    detailLower.includes('invalid or missing jwt token') ||
    detailLower.includes('user id not available');

  if (messageAuthHint) {
    return {
      status,
      serverCode,
      detail,
      authFailureKind: 'auth_message_hint',
      shouldAttemptRefresh: true,
      shouldLogoutAfterRefreshFailure: true,
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
    shouldLogoutAfterRefreshFailure: false,
    isPermissionDenied: false,
    isTransient: false,
  };
}

export function buildPermissionDeniedError(classified: ClassifiedApiError): Error {
  const err = new Error(classified.detail || 'You do not have permission to access this resource.');
  (err as Error & { code?: string }).code = 'PERMISSION_DENIED';
  return err;
}
