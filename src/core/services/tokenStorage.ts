/**
 * Token Storage Service
 * Handles secure storage of JWT tokens across platforms
 * - Web: localStorage
 * - Mobile: AsyncStorage (with SecureStore for sensitive tokens)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  TOKEN_EXPIRY: 'auth_token_expiry',
  USER_DATA: 'auth_user_data',
} as const;

/**
 * Check if we're running on web
 */
const isWeb = Platform.OS === 'web';

/**
 * Store access token
 */
export async function storeAccessToken(token: string): Promise<void> {
  try {
    if (isWeb) {
      // Web: Use localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(KEYS.ACCESS_TOKEN, token);
      }
    } else {
      // Mobile: Use AsyncStorage (non-sensitive, faster)
      await AsyncStorage.setItem(KEYS.ACCESS_TOKEN, token);
    }
  } catch (error) {
    console.error('Failed to store access token:', error);
    throw new Error('Failed to store access token');
  }
}

/**
 * Get access token
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(KEYS.ACCESS_TOKEN);
      }
      return null;
    } else {
      return await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
    }
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

/**
 * Store refresh token (more secure)
 */
export async function storeRefreshToken(token: string): Promise<void> {
  try {
    if (isWeb) {
      // Web: Use localStorage (in production, consider httpOnly cookies)
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(KEYS.REFRESH_TOKEN, token);
      }
    } else {
      // Mobile: Use SecureStore for sensitive data
      await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
    }
  } catch (error) {
    console.error('Failed to store refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
}

/**
 * Get refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(KEYS.REFRESH_TOKEN);
      }
      return null;
    } else {
      return await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
    }
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
}

/**
 * Store token expiry time
 */
export async function storeTokenExpiry(expiresIn: number): Promise<void> {
  try {
    const expiryTime = Date.now() + expiresIn * 1000; // Convert seconds to milliseconds
    const expiryString = expiryTime.toString();

    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(KEYS.TOKEN_EXPIRY, expiryString);
      }
    } else {
      await AsyncStorage.setItem(KEYS.TOKEN_EXPIRY, expiryString);
    }
  } catch (error) {
    console.error('Failed to store token expiry:', error);
  }
}

/**
 * Get token expiry time
 */
export async function getTokenExpiry(): Promise<number | null> {
  try {
    let expiryString: string | null = null;

    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        expiryString = window.localStorage.getItem(KEYS.TOKEN_EXPIRY);
      }
    } else {
      expiryString = await AsyncStorage.getItem(KEYS.TOKEN_EXPIRY);
    }

    return expiryString ? parseInt(expiryString, 10) : null;
  } catch (error) {
    console.error('Failed to get token expiry:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export async function isTokenExpired(): Promise<boolean> {
  try {
    const expiry = await getTokenExpiry();
    if (!expiry) return true;

    const now = Date.now();
    // Consider token expired 1 minute before actual expiry for safety
    const bufferTime = 60 * 1000;
    return now >= expiry - bufferTime;
  } catch (error) {
    console.error('Failed to check token expiry:', error);
    return true;
  }
}

/**
 * Store user data (for quick access without API call)
 */
export async function storeUserData(userData: string): Promise<void> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(KEYS.USER_DATA, userData);
      }
    } else {
      await AsyncStorage.setItem(KEYS.USER_DATA, userData);
    }
  } catch (error) {
    console.error('Failed to store user data:', error);
  }
}

/**
 * Get stored user data
 */
export async function getUserData(): Promise<string | null> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(KEYS.USER_DATA);
      }
      return null;
    } else {
      return await AsyncStorage.getItem(KEYS.USER_DATA);
    }
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
}

/**
 * Clear all stored authentication data
 */
export async function clearAuthData(): Promise<void> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(KEYS.ACCESS_TOKEN);
        window.localStorage.removeItem(KEYS.REFRESH_TOKEN);
        window.localStorage.removeItem(KEYS.TOKEN_EXPIRY);
        window.localStorage.removeItem(KEYS.USER_DATA);
      }
    } else {
      // Clear AsyncStorage
      await AsyncStorage.multiRemove([
        KEYS.ACCESS_TOKEN,
        KEYS.TOKEN_EXPIRY,
        KEYS.USER_DATA,
      ]);

      // Clear SecureStore
      await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
    }
  } catch (error) {
    console.error('Failed to clear auth data:', error);
    throw new Error('Failed to clear authentication data');
  }
}

/**
 * Store complete auth tokens
 */
export async function storeAuthTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  await Promise.all([
    storeAccessToken(accessToken),
    storeRefreshToken(refreshToken),
    storeTokenExpiry(expiresIn),
  ]);
}
