/**
 * Testable auth refresh handling extracted from the Axios response interceptor.
 */

import type { AxiosError, AxiosInstance } from 'axios';
import type { ApiError } from '../types';
import {
  buildPermissionDeniedError,
  buildTransientRefreshError,
  classifyApiAuthError,
  extractResponseData,
} from './apiAuthPolicy';
import {
  getAuthSessionEpoch,
  isStaleSession,
  refreshAccessToken,
  type RefreshOutcome,
  type RetryableConfig,
} from './apiRefreshCoordinator';

export type AuthInterceptorDeps = {
  refreshClient: AxiosInstance;
  apiClient: AxiosInstance;
  isLoggingOut: () => boolean;
  setLoggingOut: (value: boolean) => void;
  handleAuthenticationFailure: (sessionEpoch: number) => Promise<void>;
  handleApiError: (error: AxiosError<ApiError>) => Error;
};

export async function handleApiAuthResponseError(
  error: AxiosError<ApiError>,
  deps: AuthInterceptorDeps,
): Promise<unknown> {
  const status = error.response?.status;
  const responseData = extractResponseData(error);
  const classified = classifyApiAuthError(error);
  const originalRequest = error.config as RetryableConfig | undefined;

  if (classified.isPermissionDenied) {
    const permErr = buildPermissionDeniedError(classified);
    (permErr as any).response = error.response;
    throw permErr;
  }

  const isAuthRoute =
    originalRequest?.url?.includes('/auth/login') ||
    originalRequest?.url?.includes('/auth/register') ||
    originalRequest?.url?.includes('/auth/refresh');

  const shouldRefresh =
    classified.shouldAttemptRefresh &&
    !deps.isLoggingOut() &&
    originalRequest &&
    !isAuthRoute;

  if (shouldRefresh) {
    const sessionEpoch = originalRequest._authSessionEpoch ?? getAuthSessionEpoch();

    if (isStaleSession(originalRequest)) {
      throw new Error('Request superseded by account switch');
    }

    if (originalRequest._retry) {
      throw new Error('Request unauthorized after refresh retry');
    }

    originalRequest._retry = true;
    const outcome: RefreshOutcome = await refreshAccessToken(deps.refreshClient, sessionEpoch);

    if (outcome.kind === 'success') {
      if (outcome.sessionEpoch !== getAuthSessionEpoch()) {
        throw new Error('Request superseded by account switch');
      }
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${outcome.accessToken}`;
      }
      return deps.apiClient(originalRequest);
    }

    if (outcome.kind === 'superseded') {
      throw new Error('Request superseded by account switch');
    }

    if (outcome.kind === 'transient') {
      throw buildTransientRefreshError(outcome.reason);
    }

    if (outcome.kind === 'rejected') {
      if (!deps.isLoggingOut()) {
        deps.setLoggingOut(true);
        try {
          await deps.handleAuthenticationFailure(sessionEpoch);
        } finally {
          deps.setLoggingOut(false);
        }
      }
      throw new Error('Session expired');
    }
  }

  if (error.message === 'Network Error' || !error.response) {
    throw new Error('Network connection failed');
  }

  if (status && status >= 500) {
    const serverMsg =
      (typeof responseData?.detail === 'string' && responseData.detail) ||
      (typeof responseData?.message === 'string' && responseData.message) ||
      (typeof responseData?.error === 'string' && responseData.error) ||
      'Server error. Please try again later.';
    const serverError = new Error(serverMsg);
    (serverError as any).response = error.response;
    throw serverError;
  }

  throw deps.handleApiError(error);
}
