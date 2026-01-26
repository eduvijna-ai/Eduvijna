/**
 * Authentication API
 * Handles all authentication-related API calls with JWT token management
 */

import { get, post } from './config';
import type { UserProfile, LoginCredentials, AuthTokens } from '../types';
import * as TokenStorage from '../services/tokenStorage';

/**
 * Login with email and password
 * Stores tokens securely after successful authentication
 * 
 * POST /api/v1/auth/login
 * @returns { access_token, refresh_token, user }
 */
export async function login(credentials: LoginCredentials): Promise<{
  user: UserProfile;
  tokens: AuthTokens;
}> {
  // Backend expects "username_or_email" field, not "email"
  const payload = {
    username_or_email: credentials.email,
    password: credentials.password,
    remember_me: false,
    device_info: 'React Native Mobile App'
  };
  
  const response = await post<{
    access_token: string;
    refresh_token: string;
    user: UserProfile;
  }>('/api/v1/auth/login', payload);
  
  // Store tokens securely
  await TokenStorage.storeAuthTokens(
    response.access_token,
    response.refresh_token,
    3600 // Default 1 hour expiry
  );
  
  // Store user data for quick access
  await TokenStorage.storeUserData(JSON.stringify(response.user));
  
  return {
    user: response.user,
    tokens: {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresIn: 3600
    }
  };
}

/**
 * Logout current user
 * Clears all stored authentication data
 */
export async function logout(): Promise<void> {
  try {
    // Call backend to invalidate token (if endpoint exists)
    await post<void>('/api/v1/auth/logout');
  } catch (error) {
    // Continue with local logout even if backend call fails
    console.warn('Backend logout failed:', error);
  } finally {
    // Always clear local auth data
    await TokenStorage.clearAuthData();
  }
}

/**
 * Get current authenticated user
 * Returns cached user data if available, otherwise fetches from API
 * 
 * GET /api/v1/auth/profile
 */
export async function getCurrentUser(): Promise<UserProfile> {
  // Try to get cached user data first
  const cachedUserData = await TokenStorage.getUserData();
  
  if (cachedUserData) {
    try {
      return JSON.parse(cachedUserData) as UserProfile;
    } catch {
      // Invalid cached data, fetch from API
    }
  }
  
  // Fetch from API and cache (Backend uses /api/v1/auth/profile)
  const user = await get<UserProfile>('/api/v1/auth/profile');
  await TokenStorage.storeUserData(JSON.stringify(user));
  
  return user;
}

/**
 * Refresh authentication token
 * Uses stored refresh token if not provided
 */
export async function refreshToken(providedRefreshToken?: string): Promise<AuthTokens> {
  const refreshTokenValue = providedRefreshToken || await TokenStorage.getRefreshToken();
  
  if (!refreshTokenValue) {
    throw new Error('No refresh token available');
  }
  
  const response = await post<{
    access_token: string;
    refresh_token: string;
  }>('/api/v1/auth/refresh', { refresh_token: refreshTokenValue });
  
  // Store new tokens
  const tokens: AuthTokens = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: 3600
  };
  
  await TokenStorage.storeAuthTokens(
    tokens.accessToken,
    tokens.refreshToken,
    tokens.expiresIn
  );
  
  return tokens;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await post<void>('/auth/forgot-password', { email });
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await post<void>('/auth/reset-password', { token, newPassword });
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<void> {
  await post<void>('/auth/verify-email', { token });
}
