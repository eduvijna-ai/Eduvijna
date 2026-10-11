/**
 * Authentication API
 * Handles all authentication-related API calls with JWT token management
 */

import { get, post } from './config';
import type { UserProfile, LoginCredentials, AuthTokens } from '../types';
import * as TokenStorage from '../services/tokenStorage';
import {
  clearAuthForSession,
  getAuthSessionEpoch,
  storeTokensForSession,
  storeUserDataForSession,
} from './apiRefreshCoordinator';

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
  
  const sessionEpoch = getAuthSessionEpoch();
  const tokens: AuthTokens = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: 3600,
  };
  const stored = await storeTokensForSession(sessionEpoch, tokens);
  if (!stored) {
    throw new Error('Login superseded by account switch');
  }
  await storeUserDataForSession(sessionEpoch, JSON.stringify(response.user));

  return {
    user: response.user,
    tokens,
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
    const sessionEpoch = getAuthSessionEpoch();
    await clearAuthForSession(sessionEpoch);
  }
}

/**
 * Fetch fresh user profile from API (web loadProfile parity).
 * GET /api/v1/auth/profile
 */
export async function fetchAuthProfile(): Promise<UserProfile> {
  const user = await get<UserProfile>('/api/v1/auth/profile');
  await storeUserDataForSession(getAuthSessionEpoch(), JSON.stringify(user));
  return user;
}

/**
 * Get current authenticated user.
 * Always refreshes from /auth/profile when online so full_name matches web.
 * Falls back to cached user only if the network request fails.
 *
 * GET /api/v1/auth/profile
 */
export async function getCurrentUser(): Promise<UserProfile> {
  try {
    return await fetchAuthProfile();
  } catch (err) {
    const cachedUserData = await TokenStorage.getUserData();
    if (cachedUserData) {
      try {
        return JSON.parse(cachedUserData) as UserProfile;
      } catch {
        // fall through
      }
    }
    throw err;
  }
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
  
  const stored = await storeTokensForSession(getAuthSessionEpoch(), tokens);
  if (!stored) {
    throw new Error('Token refresh superseded by account switch');
  }

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
