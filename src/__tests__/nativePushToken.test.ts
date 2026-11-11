import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  getNativeFcmRegistrationToken,
  isAcceptableFcmRegistrationToken,
  isExpoPushToken,
  isLikelyRawApnsToken,
  subscribeNativeFcmTokenRefresh,
} from '../core/services/nativePushToken';

const IOS_FCM = 'ios-fcm-token:APA91bIOSFCMTESTTOKENVALUE';
const ANDROID_FCM = 'native-fcm-token:APA91bTESTTOKENVALUE';
const APNS_HEX = 'a'.repeat(64);
const EXPO_TOKEN = 'ExponentPushToken[abc123]';

describe('nativePushToken helpers', () => {
  it('rejects Expo and raw APNs tokens', () => {
    expect(isExpoPushToken(EXPO_TOKEN)).toBe(true);
    expect(isLikelyRawApnsToken(APNS_HEX)).toBe(true);
    expect(isAcceptableFcmRegistrationToken(EXPO_TOKEN)).toBe(false);
    expect(isAcceptableFcmRegistrationToken(APNS_HEX)).toBe(false);
    expect(isAcceptableFcmRegistrationToken(ANDROID_FCM)).toBe(true);
    expect(isAcceptableFcmRegistrationToken(IOS_FCM)).toBe(true);
  });
});

describe('nativePushToken acquisition', () => {
  const messaging = (global as any).__mockFirebaseMessaging;

  beforeEach(() => {
    jest.clearAllMocks();
    messaging.getToken.mockResolvedValue(IOS_FCM);
    messaging.isDeviceRegisteredForRemoteMessages = true;
    (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValue({
      type: 'android',
      data: ANDROID_FCM,
    });
  });

  it('Android uses getDevicePushTokenAsync and never Firebase Messaging getToken', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    const token = await getNativeFcmRegistrationToken();
    expect(token).toBe(ANDROID_FCM);
    expect(Notifications.getDevicePushTokenAsync).toHaveBeenCalledTimes(1);
    expect(messaging.getToken).not.toHaveBeenCalled();
  });

  it('iOS uses Firebase Messaging FCM token and never getDevicePushTokenAsync', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });
    const token = await getNativeFcmRegistrationToken();
    expect(token).toBe(IOS_FCM);
    expect(messaging.getToken).toHaveBeenCalledTimes(1);
    expect(Notifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
  });

  it('iOS rejects a raw APNs hex token returned from messaging', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });
    messaging.getToken.mockResolvedValueOnce(APNS_HEX);
    const token = await getNativeFcmRegistrationToken();
    expect(token).toBeNull();
  });

  it('iOS registers for remote messages when needed before getToken', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });
    messaging.isDeviceRegisteredForRemoteMessages = false;
    await getNativeFcmRegistrationToken();
    expect(messaging.registerDeviceForRemoteMessages).toHaveBeenCalledTimes(1);
    expect(messaging.getToken).toHaveBeenCalledTimes(1);
  });

  it('Android token refresh uses expo listener; iOS uses messaging onTokenRefresh', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    const androidSub = subscribeNativeFcmTokenRefresh(() => undefined);
    expect(Notifications.addPushTokenListener).toHaveBeenCalled();
    androidSub.remove();

    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });
    const iosSub = subscribeNativeFcmTokenRefresh(() => undefined);
    expect(messaging.onTokenRefresh).toHaveBeenCalled();
    iosSub.remove();
  });
});
