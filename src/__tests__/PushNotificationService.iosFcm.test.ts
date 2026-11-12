/**
 * iOS FCM registration path for direct Firebase Admin delivery.
 * Must never register Expo Push Tokens or raw APNs device tokens.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockMemoryStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockMemoryStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockMemoryStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockMemoryStore.delete(key);
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((key) => mockMemoryStore.delete(key));
    }),
    clear: jest.fn(async () => {
      mockMemoryStore.clear();
    }),
  },
}));

jest.mock('@core/api/config', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'standalone' },
  appOwnership: 'standalone',
}));

jest.mock('expo-device', () => ({
  brand: 'Apple',
  modelName: 'iPhone',
  osVersion: '18.0',
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PushNotificationService } from '../core/services/PushNotificationService';

const IOS_FCM = 'ios-fcm-token:APA91bIOSFCMTESTTOKENVALUE';
const APNS_HEX = 'b'.repeat(64);
const EXPO_TOKEN = 'ExponentPushToken[abc123]';

describe('PushNotificationService iOS FCM path', () => {
  const messaging = (global as any).__mockFirebaseMessaging;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockMemoryStore.clear();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });
    mockPost.mockResolvedValue({ data: { id: 99, user_id: 7 } });
    messaging.getToken.mockResolvedValue(IOS_FCM);
    messaging.isDeviceRegisteredForRemoteMessages = true;
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
  });

  it('reports push as supported on iOS standalone builds', async () => {
    const status = await PushNotificationService.getPushStatus();
    expect(status.isSupported).toBe(true);
  });

  it('acquires iOS FCM token via Firebase Messaging, not APNs/Expo APIs', async () => {
    const token = await PushNotificationService.getToken({ forceRefresh: true });
    expect(token).toBe(IOS_FCM);
    expect(messaging.getToken).toHaveBeenCalledTimes(1);
    expect(Notifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('registers iOS token with platform: ios', async () => {
    const result = await PushNotificationService.enablePushNotifications();
    expect(result.success).toBe(true);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/notifications/devices',
      expect.objectContaining({
        token: IOS_FCM,
        platform: 'ios',
      }),
    );
  });

  it('rejects Expo tokens at the registration boundary on iOS', async () => {
    await expect(PushNotificationService.registerDevice(EXPO_TOKEN)).rejects.toThrow(
      /Expo push tokens/i,
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects raw APNs hex tokens at the registration boundary', async () => {
    await expect(PushNotificationService.registerDevice(APNS_HEX)).rejects.toThrow(
      /APNs/i,
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('handles iOS FCM token refresh without using expo push-token listener', async () => {
    await AsyncStorage.setItem('pushNotificationsEnabled', 'true');
    await AsyncStorage.setItem('lastTokenRegistered', 'old-ios-fcm');
    await PushNotificationService.handleTokenRefresh(IOS_FCM);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/notifications/devices',
      expect.objectContaining({ token: IOS_FCM, platform: 'ios' }),
    );
  });

  it('subscribeToTokenRefresh uses Firebase Messaging on iOS', () => {
    const sub = PushNotificationService.subscribeToTokenRefresh();
    expect(messaging.onTokenRefresh).toHaveBeenCalled();
    expect(Notifications.addPushTokenListener).not.toHaveBeenCalled();
    expect(typeof sub.remove).toBe('function');
    expect(() => sub.remove()).not.toThrow();
  });

  it('subscribeToTokenRefresh remains safe when messaging onTokenRefresh throws', () => {
    messaging.onTokenRefresh.mockImplementationOnce(() => {
      throw new TypeError('undefined is not a function');
    });
    expect(() => {
      const sub = PushNotificationService.subscribeToTokenRefresh();
      expect(typeof sub.remove).toBe('function');
      sub.remove();
    }).not.toThrow();
  });

  it('does not re-prompt permission on launch when already denied', async () => {
    await AsyncStorage.setItem('pushNotificationsEnabled', 'true');
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    await PushNotificationService.initializeOnAppLaunch();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(messaging.getToken).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('reconciles rotated iOS FCM token on launch when push is enabled', async () => {
    await AsyncStorage.setItem('pushNotificationsEnabled', 'true');
    await AsyncStorage.setItem('fcmDeviceToken', 'old-ios-fcm');
    await AsyncStorage.setItem('lastTokenRegistered', 'old-ios-fcm');
    await PushNotificationService.initializeOnAppLaunch();
    expect(messaging.getToken).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith(
      '/api/notifications/devices',
      expect.objectContaining({ token: IOS_FCM, platform: 'ios' }),
    );
  });

  it('does not silently re-enable after explicit opt-out', async () => {
    await AsyncStorage.setItem('pushNotificationsEnabled', 'false');
    await PushNotificationService.initializeOnAppLaunch();
    expect(messaging.getToken).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
