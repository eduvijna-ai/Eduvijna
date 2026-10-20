/**
 * Authentication API
 * Handles all authentication-related API calls with JWT token management
 */

import axios from 'axios';
import { get, post } from './config';
import type { UserProfile, LoginCredentials, AuthTokens } from '../types';
import * as TokenStorage from '../services/tokenStorage';
import { API_BASE_URL } from './config';
import {
  clearCredentialsAtEpoch,
  getAuthSessionEpoch,
  storeTokensForSession,
  storeUserDataForSession,
} from './apiRefreshCoordinator';

export type LogoutOptions = {
  /** Credential namespace captured before session invalidation. */
  credentialEpoch: number;
};

/**
 * Login with email and password
 * Stores tokens securely after successful authentication
 *
 * POST /api/v1/auth/login
 */
export async function login(
  credentials: LoginCredentials,
  sessionEpoch: number,
): Promise<{
  user: UserProfile;
  tokens: AuthTokens;
}> {
  const payload = {
    username_or_email: credentials.email,
    password: credentials.password,
    remember_me: false,
    device_info: 'React Native Mobile App',
  };

  const response = await post<{
    access_token: string;
    refresh_token: string;
    user: UserProfile;
  }>('/api/v1/auth/login', payload);

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
 * Logout: backend invalidation uses outgoing credentials; local cleanup targets outgoing namespace only.
 */
export async function logout(options: LogoutOptions): Promise<void> {
  const { credentialEpoch } = options;
  const accessToken = await TokenStorage.getAccessTokenForEpoch(credentialEpoch);
  try {
    if (accessToken) {
      await axios.post(
        `${API_BASE_URL}/api/v1/auth/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 30000,
        },
      );
    }
  } catch (error) {
    console.warn('Backend logout failed:', error);
  } finally {
    await clearCredentialsAtEpoch(credentialEpoch);
  }
}

export async function fetchAuthProfile(sessionEpoch?: number): Promise<UserProfile> {
  const epoch = sessionEpoch ?? getAuthSessionEpoch();
  const user = await get<UserProfile>('/api/v1/auth/profile');
  await storeUserDataForSession(epoch, JSON.stringify(user));
  return user;
}

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

export async function refreshToken(
  providedRefreshToken?: string,
  sessionEpoch?: number,
): Promise<AuthTokens> {
  const epoch = sessionEpoch ?? getAuthSessionEpoch();
  const refreshTokenValue =
    providedRefreshToken || (await TokenStorage.getRefreshTokenForEpoch(epoch));

  if (!refreshTokenValue) {
    throw new Error('No refresh token available');
  }

  const response = await post<{
    access_token: string;
    refresh_token: string;
  }>('/api/v1/auth/refresh', { refresh_token: refreshTokenValue });

  const tokens: AuthTokens = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: 3600,
  };

  const stored = await storeTokensForSession(epoch, tokens);
  if (!stored) {
    throw new Error('Token refresh superseded by account switch');
  }

  return tokens;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await post<void>('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await post<void>('/auth/reset-password', { token, newPassword });
}

export async function verifyEmail(token: string): Promise<void> {
  await post<void>('/auth/verify-email', { token });
}
