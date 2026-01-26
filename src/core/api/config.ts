/**
 * API Configuration
 * Axios instance with interceptors for authentication and error handling
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../types';
import * as TokenStorage from '../services/tokenStorage';
import { useUserStore } from '../store/user.store';
import { initializeCache, closeCache } from '../services/cacheService';

// Initialize cache service
initializeCache().catch(error => {
  console.error('❌ Failed to initialize cache service:', error);
});

// Base API URL - configure via environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.eduvijna.com';

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

/**
 * Request interceptor to attach authentication token
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip auth token for login/register endpoints
    const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');
    
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

    // Check if it's an authentication error by status code OR by error message
    const isAuthError = 
      status === 401 || 
      status === 403 ||
      (responseData?.detail && (
        responseData.detail.toLowerCase().includes('authentication failed') ||
        responseData.detail.toLowerCase().includes('invalid or missing jwt token') ||
        responseData.detail.toLowerCase().includes('user id not available')
      ));

    // Handle authentication errors
    if (isAuthError && !isLoggingOut) {
      console.error(`🔒 Authentication failed (${status || 'detected in response'}) on ${url}`);
      console.error('Response:', responseData);
      isLoggingOut = true;
      try {
        // Clear auth data (silent logout)
        await handleAuthenticationFailure();
      } catch (e) {
        console.error('Error during authentication failure handler:', e);
      } finally {
        setTimeout(() => { isLoggingOut = false; }, 1000);
      }
      return Promise.reject(new Error('Session expired'));
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
    
    // Try different possible error message structures
    const errorMessage = 
      apiError?.error?.message || 
      apiError?.message || 
      apiError?.detail || 
      apiError?.error ||
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
