/**
 * API Configuration
 * Axios instance with interceptors for authentication and error handling
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../types';
import * as TokenStorage from '../services/tokenStorage';
import { useUserStore } from '../store/user.store';
import { resetStudentAssignmentDashboardStore } from '../store/studentAssignmentDashboard.store';
import { useDashboardStore } from '../store/dashboard.store';
import { initializeCache, closeCache } from '../services/cacheService';
import Constants from 'expo-constants';
import { ApiEnvironmentConfigError, normalizeApiOrigin } from '../config/apiEnvironment';
import { handleApiAuthResponseError } from './apiClientAuthInterceptor';
import {
  clearAuthForSession,
  getAuthSessionEpoch,
  isStaleSession,
  stampRequestSession,
} from './apiRefreshCoordinator';

// Initialize cache service
initializeCache().catch(error => {
  console.error('❌ Failed to initialize cache service:', error);
});

function readApiBaseUrlFromExpoExtra(): string {
  const raw = Constants.expoConfig?.extra?.API_BASE_URL;
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ApiEnvironmentConfigError(
      'Missing expo.extra.API_BASE_URL. Rebuild or restart Metro so app.config.ts can inject the API origin.',
    );
  }
  return normalizeApiOrigin(raw);
}

/** Origin only (no /api/v1). From app.config.ts → expo.extra.API_BASE_URL. */
export const API_BASE_URL = readApiBaseUrlFromExpoExtra();
/**
 * Create axios instance with default configuration
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout to match existing app
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to attach authentication token
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const retryable = config as InternalAxiosRequestConfig & { _authSessionEpoch?: number };
    stampRequestSession(retryable);
    // Skip auth token for login/register endpoints
    const isAuthEndpoint =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register') ||
      config.url?.includes('/auth/refresh');
    
    if (!isAuthEndpoint) {
      if (isStaleSession(retryable)) {
        return Promise.reject(new Error('Request superseded by account switch'));
      }
      // Get token from secure storage
      const token = await TokenStorage.getAccessToken();
      if (isStaleSession(retryable)) {
        return Promise.reject(new Error('Request superseded by account switch'));
      }
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

let isLoggingOut = false;

/**
 * Response interceptor for error handling and token refresh
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    try {
      return await handleApiAuthResponseError(error, {
        refreshClient,
        apiClient,
        isLoggingOut: () => isLoggingOut,
        setLoggingOut: (value) => {
          isLoggingOut = value;
        },
        handleAuthenticationFailure,
        handleApiError,
      });
    } catch (handled) {
      return Promise.reject(handled);
    }
  }
);

/**
 * Handle authentication failure
 * Clears auth data and triggers logout in the store
 * This will cause App.tsx to show the login screen
 */
async function handleAuthenticationFailure(expectedSessionEpoch: number): Promise<void> {
  if (expectedSessionEpoch !== getAuthSessionEpoch()) {
    return;
  }
  console.error('🔒 Authentication failed - clearing tokens and logging out');

  const cleared = await clearAuthForSession(expectedSessionEpoch);
  if (!cleared || expectedSessionEpoch !== getAuthSessionEpoch()) {
    return;
  }

  const { logout } = useUserStore.getState();
  logout();
  resetStudentAssignmentDashboardStore(null);
  useDashboardStore.getState().clearData();
}

/**
 * Standardize API error handling
 */
function handleApiError(error: AxiosError<ApiError>): Error {
  if (error.response?.data) {
    // Backend returned an error response
    const apiError = error.response.data as any;

    // Safely extract detail — FastAPI 422 returns detail as an array of objects,
    // while other routes return it as a plain string.  Never pass a non-string
    // value to `new Error()` because it will be coerced to "[object Object]".
    let detailMessage: string | undefined;
    if (typeof apiError?.detail === 'string') {
      detailMessage = apiError.detail;
    } else if (Array.isArray(apiError?.detail)) {
      detailMessage = apiError.detail
        .map((d: any) => (typeof d?.msg === 'string' ? d.msg : JSON.stringify(d)))
        .join('; ');
    }

    // Try different possible error message structures
    const errorMessage =
      apiError?.error?.message ||
      apiError?.message ||
      detailMessage ||
      (typeof apiError?.error === 'string' ? apiError.error : undefined) ||
      `Request failed with status ${error.response.status}`;

    const richError = new Error(errorMessage);
    // Preserve the original Axios response so callers can inspect status/data.
    (richError as any).response = error.response;
    return richError;
  }
  
  if (error.request) {
    // Request was made but no response received
    return new Error('Network error - please check your connection');
  }
  
  // Something else happened
  return new Error(error.message || 'An unexpected error occurred');
}

/**
 * Generic GET request wrapper
 */
export async function get<T>(url: string, params?: Record<string, unknown> | unknown): Promise<T> {
  const response = await apiClient.get<T>(url, { params });
  return response.data;
}

/**
 * Generic POST request wrapper
 */
export async function post<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.post<T>(url, data);
  return response.data;
}

/**
 * Generic PUT request wrapper
 */
export async function put<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.put<T>(url, data);
  return response.data;
}

/**
 * Generic DELETE request wrapper
 */
export async function del<T>(url: string): Promise<T> {
  const response = await apiClient.delete<T>(url);
  return response.data;
}

/**
 * Generic PATCH request wrapper
 */
export async function patch<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.patch<T>(url, data);
  return response.data;
}
