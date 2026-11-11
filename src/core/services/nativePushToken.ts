/**
 * Platform-native FCM registration token acquisition.
 *
 * Android: expo-notifications getDevicePushTokenAsync (existing verified path).
 * iOS: @react-native-firebase/messaging getToken (FCM registration token, not APNs).
 *
 * Direct-FCM backend rejects Expo Push Tokens and raw APNs device tokens.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NativePushPlatform = 'android' | 'ios';

export function isExpoPushToken(token: string | null | undefined): boolean {
  return (
    !!token &&
    (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken'))
  );
}

/**
 * Raw APNs device tokens are hex strings (commonly 64 chars).
 * FCM registration tokens are longer opaque strings and must not be treated as APNs.
 */
export function isLikelyRawApnsToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const trimmed = token.trim();
  return /^[0-9a-fA-F]{64,200}$/.test(trimmed);
}

export function isAcceptableFcmRegistrationToken(
  token: string | null | undefined,
): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!trimmed) return false;
  if (isExpoPushToken(trimmed)) return false;
  if (isLikelyRawApnsToken(trimmed)) return false;
  // FCM tokens are opaque and typically much longer than short placeholders.
  return trimmed.length >= 32;
}

export function extractDevicePushTokenData(
  devicePushToken: Notifications.DevicePushToken | string | null | undefined,
): string | null {
  if (!devicePushToken) {
    return null;
  }
  if (typeof devicePushToken === 'string') {
    return devicePushToken;
  }
  if (typeof devicePushToken === 'object' && 'data' in devicePushToken) {
    const data = (devicePushToken as { data?: unknown }).data;
    return typeof data === 'string' ? data : null;
  }
  return null;
}

function loadFirebaseMessaging(): {
  getToken: () => Promise<string>;
  registerDeviceForRemoteMessages: () => Promise<void>;
  isDeviceRegisteredForRemoteMessages: boolean;
  onTokenRefresh: (listener: (token: string) => void) => () => void;
} | null {
  try {
    // Lazy require keeps Jest / web bundles from hard-failing when native module is absent.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messagingModule = require('@react-native-firebase/messaging');
    const messaging = messagingModule.default ?? messagingModule;
    return typeof messaging === 'function' ? messaging() : messaging;
  } catch {
    return null;
  }
}

async function getAndroidFcmToken(): Promise<string | null> {
  try {
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    const token = extractDevicePushTokenData(devicePushToken);
    if (!isAcceptableFcmRegistrationToken(token)) {
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

async function getIosFcmToken(): Promise<string | null> {
  const messaging = loadFirebaseMessaging();
  if (!messaging) {
    console.error('❌ Firebase Messaging native module unavailable on iOS');
    return null;
  }

  try {
    if (!messaging.isDeviceRegisteredForRemoteMessages) {
      await messaging.registerDeviceForRemoteMessages();
    }
    const token = await messaging.getToken();
    if (!isAcceptableFcmRegistrationToken(token)) {
      console.error(
        '❌ iOS returned a non-FCM token (Expo/APNs tokens are rejected for direct FCM)',
      );
      return null;
    }
    return token.trim();
  } catch {
    console.error('❌ Firebase Messaging getToken failed on iOS');
    return null;
  }
}

/**
 * Obtain the native FCM registration token for the current platform.
 * Never returns Expo Push Tokens or raw APNs device tokens.
 */
export async function getNativeFcmRegistrationToken(): Promise<string | null> {
  if (Platform.OS === 'android') {
    return getAndroidFcmToken();
  }
  if (Platform.OS === 'ios') {
    return getIosFcmToken();
  }
  return null;
}

export function getNativePushPlatform(): NativePushPlatform | null {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return Platform.OS;
  }
  return null;
}

/**
 * Subscribe to FCM registration token rotations for the current platform.
 * Android: expo-notifications push-token listener (existing verified path).
 * iOS: Firebase Messaging onTokenRefresh (FCM token, not APNs).
 */
export function subscribeNativeFcmTokenRefresh(
  onToken: (token: string) => void,
): { remove: () => void } {
  if (Platform.OS === 'android') {
    const subscription = Notifications.addPushTokenListener((devicePushToken) => {
      const token = extractDevicePushTokenData(devicePushToken);
      if (token && isAcceptableFcmRegistrationToken(token)) {
        onToken(token);
      }
    });
    return subscription;
  }

  if (Platform.OS === 'ios') {
    const messaging = loadFirebaseMessaging();
    if (!messaging) {
      return { remove: () => undefined };
    }
    const unsubscribe = messaging.onTokenRefresh((token: string) => {
      if (isAcceptableFcmRegistrationToken(token)) {
        onToken(token.trim());
      }
    });
    return { remove: () => unsubscribe() };
  }

  return { remove: () => undefined };
}
