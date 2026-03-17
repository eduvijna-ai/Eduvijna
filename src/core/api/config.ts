/**
 * API Configuration
 * Axios instance with interceptors for authentication and error handling
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiError, AuthTokens } from '../types';
import * as TokenStorage from '../services/tokenStorage';
import { useUserStore } from '../store/user.store';
import { initializeCache, closeCache } from '../services/cacheService';
import Constants from "expo-constants";


// Initialize cache service
initializeCache().catch(error => {
  console.error('❌ Failed to initialize cache service:', error);
});

// Base API URL - configure via environment variables
//const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.eduvijna.com';
export const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'https://eduapi.eduvijna.com';
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
    // Skip auth token for login/register endpoints
    const isAuthEndpoint =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register') ||
      config.url?.includes('/auth/refresh');
    
    if (!isAuthEndpoint) {
      // Get token from secure storage
      const token = await TokenStorage.getAccessToken();
      
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

// Track if we've already logged out to prevent duplicate messages
let isLoggingOut = false;
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function enqueueRefreshSubscriber(callback: (token: string | null) => void) {
  refreshQueue.push(callback);
}

function notifyRefreshSubscribers(token: string | null) {
  refreshQueue.forEach((callback) => callback(token));
  refreshQueue = [];
}

/**
 * Response interceptor for error handling and token refresh
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const url = error.config?.url || 'unknown';
    const responseData = error.response?.data as any;

    // Check if it's an authentication error by status code OR by error message.
    // `detail` can be a string (FastAPI error) or an array (422 validation errors) —
    // guard with typeof to prevent a crash when it is not a string.
    const detailStr = typeof responseData?.detail === 'string' ? responseData.detail : '';
    const isAuthError = 
      status === 401 || 
      status === 403 ||
      (detailStr && (
        detailStr.toLowerCase().includes('authentication failed') ||
        detailStr.toLowerCase().includes('invalid or missing jwt token') ||
        detailStr.toLowerCase().includes('user id not available')
      ));

    // Handle authentication errors with refresh token flow
    if (isAuthError && !isLoggingOut) {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      const isAuthRequest =
        originalRequest?.url?.includes('/auth/login') ||
        originalRequest?.url?.includes('/auth/register') ||
        originalRequest?.url?.includes('/auth/refresh');

      if (!originalRequest) {
        return Promise.reject(handleApiError(error));
      }

      if (isAuthRequest) {
        return Promise.reject(handleApiError(error));
      }

      if (originalRequest._retry) {
        console.error('🔒 Authentication retry failed - logging out');
        isLoggingOut = true;
        try {
          await handleAuthenticationFailure();
        } catch (e) {
          console.error('Error during authentication failure handler:', e);
        } finally {
          setTimeout(() => { isLoggingOut = false; }, 1000);
        }
        return Promise.reject(new Error('Session expired'));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          enqueueRefreshSubscriber((token) => {
            if (!token) {
              reject(new Error('Session expired'));
              return;
            }
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await TokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshResponse = await refreshClient.post<{ access_token: string; refresh_token: string }>(
          '/api/v1/auth/refresh',
          { refresh_token: refreshToken }
        );

        const tokens: AuthTokens = {
          accessToken: refreshResponse.data.access_token,
          refreshToken: refreshResponse.data.refresh_token,
          expiresIn: 3600,
        };

        await TokenStorage.storeAuthTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
        useUserStore.getState().setTokens(tokens);

        notifyRefreshSubscribers(tokens.accessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('❌ Refresh token failed:', refreshError);
        notifyRefreshSubscribers(null);
        isLoggingOut = true;
        try {
          await handleAuthenticationFailure();
        } catch (e) {
          console.error('Error during authentication failure handler:', e);
        } finally {
          setTimeout(() => { isLoggingOut = false; }, 1000);
        }
        return Promise.reject(new Error('Session expired'));
      } finally {
        isRefreshing = false;
      }
    }
    
    // Handle network errors
    if (error.message === 'Network Error' || !error.response) {
      return Promise.reject(new Error('Network connection failed'));
    }
    
    // Handle 500 errors
    if (status && status >= 500) {
      return Promise.reject(new Error('Server error. Please try again later.'));
    }

    // Handle other errors
    return Promise.reject(handleApiError(error));
  }
);

/**
 * Handle authentication failure
 * Clears auth data and triggers logout in the store
 * This will cause App.tsx to show the login screen
 */
async function handleAuthenticationFailure(): Promise<void> {
  console.error('🔒 Authentication failed - clearing tokens and logging out');
  
  // Clear all stored auth data
  await TokenStorage.clearAuthData();
  
  // Trigger logout in the store
  // This will cause App.tsx to switch to login screen automatically
  const { logout } = useUserStore.getState();
  logout();
  
  console.log('Logged out - login screen will be displayed');
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

    return new Error(errorMessage);
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
