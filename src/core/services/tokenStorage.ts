/**
 * Token Storage Service
 * Handles secure storage of JWT tokens across platforms, scoped by API environment.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { resolveActiveApiEnvironment } from '../config/activeApiEnvironment';
import type { ApiEnvironment } from '../config/apiEnvironment';

const LEGACY_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  TOKEN_EXPIRY: 'auth_token_expiry',
  USER_DATA: 'auth_user_data',
} as const;

const KEY_SUFFIX = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry',
  USER_DATA: 'user_data',
} as const;

function scopedStorageKey(suffix: string, environment: ApiEnvironment): string {
  return `eduvijna:auth:${environment}:${suffix}`;
}

function legacyKeysPresent(): boolean {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return (
      window.localStorage.getItem(LEGACY_KEYS.ACCESS_TOKEN) != null ||
      window.localStorage.getItem(LEGACY_KEYS.REFRESH_TOKEN) != null ||
      window.localStorage.getItem(LEGACY_KEYS.USER_DATA) != null
    );
  }
  return false;
}

async function legacyKeysPresentAsync(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return legacyKeysPresent();
  }
  const [access, userData] = await Promise.all([
    AsyncStorage.getItem(LEGACY_KEYS.ACCESS_TOKEN),
    AsyncStorage.getItem(LEGACY_KEYS.USER_DATA),
  ]);
  let refresh: string | null = null;
  try {
    refresh = await SecureStore.getItemAsync(LEGACY_KEYS.REFRESH_TOKEN);
  } catch {
    refresh = null;
  }
  return Boolean(access || refresh || userData);
}

const isWeb = Platform.OS === 'web';

async function readScopedString(key: string): Promise<string | null> {
  if (isWeb) {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
  return AsyncStorage.getItem(key);
}

async function writeScopedString(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function removeScopedString(key: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return;
  }
  await AsyncStorage.removeItem(key);
}

/**
 * Legacy unscoped tokens are never migrated into a selected environment — login required.
 */
export async function hasLegacyUnscopedAuthCredentials(): Promise<boolean> {
  const environment = resolveActiveApiEnvironment();
  const scopedAccess = await readScopedString(
    scopedStorageKey(KEY_SUFFIX.ACCESS_TOKEN, environment),
  );
  if (scopedAccess) {
    return false;
  }
  return legacyKeysPresentAsync();
}

/**
 * Store access token for the active API environment.
 */
export async function storeAccessToken(token: string): Promise<void> {
  try {
    const environment = resolveActiveApiEnvironment();
    await writeScopedString(scopedStorageKey(KEY_SUFFIX.ACCESS_TOKEN, environment), token);
  } catch (error) {
    console.error('Failed to store access token:', error);
    throw new Error('Failed to store access token');
  }
}

/**
 * Access token for the active API environment only (never legacy / other env).
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const environment = resolveActiveApiEnvironment();
    const scoped = await readScopedString(
      scopedStorageKey(KEY_SUFFIX.ACCESS_TOKEN, environment),
    );
    if (scoped) {
      return scoped;
    }
    if (await legacyKeysPresentAsync()) {
      return null;
    }
    return null;
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

export async function storeRefreshToken(token: string): Promise<void> {
  try {
    const environment = resolveActiveApiEnvironment();
    const key = scopedStorageKey(KEY_SUFFIX.REFRESH_TOKEN, environment);
    if (isWeb) {
      await writeScopedString(key, token);
    } else {
      await SecureStore.setItemAsync(key, token);
    }
  } catch (error) {
    console.error('Failed to store refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    const environment = resolveActiveApiEnvironment();
    const key = scopedStorageKey(KEY_SUFFIX.REFRESH_TOKEN, environment);
    let scoped: string | null = null;
    if (isWeb) {
      scoped = await readScopedString(key);
    } else {
      scoped = await SecureStore.getItemAsync(key);
    }
    if (scoped) {
      return scoped;
    }
    if (await legacyKeysPresentAsync()) {
      return null;
    }
    return null;
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
}

export async function storeTokenExpiry(expiresIn: number): Promise<void> {
  try {
    const environment = resolveActiveApiEnvironment();
    const expiryTime = Date.now() + expiresIn * 1000;
    await writeScopedString(
      scopedStorageKey(KEY_SUFFIX.TOKEN_EXPIRY, environment),
      expiryTime.toString(),
    );
  } catch (error) {
    console.error('Failed to store token expiry:', error);
  }
}

export async function getTokenExpiry(): Promise<number | null> {
  try {
    const environment = resolveActiveApiEnvironment();
    const expiryString = await readScopedString(
      scopedStorageKey(KEY_SUFFIX.TOKEN_EXPIRY, environment),
    );
    return expiryString ? parseInt(expiryString, 10) : null;
  } catch (error) {
    console.error('Failed to get token expiry:', error);
    return null;
  }
}

export async function isTokenExpired(): Promise<boolean> {
  try {
    const expiry = await getTokenExpiry();
    if (!expiry) return true;

    const now = Date.now();
    const bufferTime = 60 * 1000;
    return now >= expiry - bufferTime;
  } catch (error) {
    console.error('Failed to check token expiry:', error);
    return true;
  }
}

export async function storeUserData(userData: string): Promise<void> {
  try {
    const environment = resolveActiveApiEnvironment();
    await writeScopedString(scopedStorageKey(KEY_SUFFIX.USER_DATA, environment), userData);
  } catch (error) {
    console.error('Failed to store user data:', error);
  }
}

export async function getUserData(): Promise<string | null> {
  try {
    const environment = resolveActiveApiEnvironment();
    const scoped = await readScopedString(scopedStorageKey(KEY_SUFFIX.USER_DATA, environment));
    if (scoped) {
      return scoped;
    }
    if (await legacyKeysPresentAsync()) {
      return null;
    }
    return null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
}

async function clearLegacyAuthData(): Promise<void> {
  if (isWeb) {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LEGACY_KEYS.ACCESS_TOKEN);
      window.localStorage.removeItem(LEGACY_KEYS.REFRESH_TOKEN);
      window.localStorage.removeItem(LEGACY_KEYS.TOKEN_EXPIRY);
      window.localStorage.removeItem(LEGACY_KEYS.USER_DATA);
    }
    return;
  }
  await AsyncStorage.multiRemove([
    LEGACY_KEYS.ACCESS_TOKEN,
    LEGACY_KEYS.TOKEN_EXPIRY,
    LEGACY_KEYS.USER_DATA,
  ]);
  try {
    await SecureStore.deleteItemAsync(LEGACY_KEYS.REFRESH_TOKEN);
  } catch {
    // ignore
  }
}

async function clearScopedEnvironment(environment: ApiEnvironment): Promise<void> {
  const accessKey = scopedStorageKey(KEY_SUFFIX.ACCESS_TOKEN, environment);
  const expiryKey = scopedStorageKey(KEY_SUFFIX.TOKEN_EXPIRY, environment);
  const userKey = scopedStorageKey(KEY_SUFFIX.USER_DATA, environment);
  const refreshKey = scopedStorageKey(KEY_SUFFIX.REFRESH_TOKEN, environment);

  await removeScopedString(accessKey);
  await removeScopedString(expiryKey);
  await removeScopedString(userKey);

  if (isWeb) {
    await removeScopedString(refreshKey);
  } else {
    try {
      await SecureStore.deleteItemAsync(refreshKey);
    } catch {
      // ignore
    }
  }
}

export async function clearAuthData(): Promise<void> {
  try {
    const environment = resolveActiveApiEnvironment();
    await clearScopedEnvironment(environment);
    await clearLegacyAuthData();
  } catch (error) {
    console.error('Failed to clear auth data:', error);
    throw new Error('Failed to clear authentication data');
  }
}

export async function storeAuthTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): Promise<void> {
  await Promise.all([
    storeAccessToken(accessToken),
    storeRefreshToken(refreshToken),
    storeTokenExpiry(expiresIn),
  ]);
}

/** @internal test helper */
export function __testScopedKey(suffix: string, environment: ApiEnvironment): string {
  return scopedStorageKey(suffix, environment);
}
