/**
 * Native FCM token acquisition for direct Firebase Admin delivery.
 * Expo Push Tokens must never be registered on this path.
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
  brand: 'TestBrand',
  modelName: 'TestModel',
  osVersion: '10',
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PushNotificationService } from '../core/services/PushNotificationService';

const NATIVE_FCM = 'native-fcm-token:APA91bTESTTOKENVALUE';
const EXPO_TOKEN = 'ExponentPushToken[abc123]';

describe('PushNotificationService native FCM token path', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockMemoryStore.clear();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });
    mockPost.mockResolvedValue({ data: { id: 42, user_id: 7 } });
    (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValue({
      type: 'android',
      data: NATIVE_FCM,
    });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
  });

  it('acquires and caches a native FCM token without calling Expo Push Token APIs', async () => {
    const token = await PushNotificationService.getToken({ forceRefresh: true });

    expect(token).toBe(NATIVE_FCM);
    expect(Notifications.getDevicePushTokenAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('fcmDeviceToken')).toBe(NATIVE_FCM);

    const cached = await PushNotificationService.getToken();
    expect(cached).toBe(NATIVE_FCM);
    expect(Notifications.getDevicePushTokenAsync).toHaveBeenCalledTimes(1);
  });

  it('returns null when native FCM acquisition fails (no Expo fallback)', async () => {
    (Notifications.getDevicePushTokenAsync as jest.Mock).mockRejectedValueOnce(
      new Error('FCM unavailable'),
    );

    const token = await PushNotificationService.getToken({ forceRefresh: true });

    expect(token).toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('fcmDeviceToken')).toBeNull();
  });

  it('rejects Expo tokens at the registration boundary', async () => {
    await expect(PushNotificationService.registerDevice(EXPO_TOKEN)).rejects.toThrow(
      /Expo push tokens are not supported/i,
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('registers a refreshed native token with the backend', async () => {
    await AsyncStorage.setItem('pushNotificationsEnabled', 'true');
    await AsyncStorage.setItem('lastTokenRegistered', 'old-token:APA91bOLD');

    await PushNotificationService.handleTokenRefresh(NATIVE_FCM);

    expect(mockPost).toHaveBeenCalledWith(
      '/api/notifications/devices',
      expect.objectContaining({
        token: NATIVE_FCM,
        platform: 'android',
      }),
    );
    expect(await AsyncStorage.getItem('lastTokenRegistered')).toBe(NATIVE_FCM);
  });

  it('ignores Expo tokens during refresh', async () => {
    await AsyncStorage.setItem('pushNotificationsEnabled', 'true');

    await PushNotificationService.handleTokenRefresh(EXPO_TOKEN);

    expect(mockPost).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('enablePushNotifications fails closed when native token cannot be obtained', async () => {
    (Notifications.getDevicePushTokenAsync as jest.Mock).mockRejectedValueOnce(
      new Error('no token'),
    );

    const result = await PushNotificationService.enablePushNotifications();

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/native FCM/i);
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('subscribeToTokenRefresh wires addPushTokenListener', () => {
    const sub = PushNotificationService.subscribeToTokenRefresh();
    expect(Notifications.addPushTokenListener).toHaveBeenCalled();
    expect(typeof sub.remove).toBe('function');
    sub.remove();
  });
});
