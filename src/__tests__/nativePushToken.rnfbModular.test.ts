/**
 * Regression: RNFB v27 modular Messaging API (no default messaging() export).
 * TestFlight 1.0.11 crashed on iOS boot with Hermes "undefined is not a function"
 * when namespaced onTokenRefresh was bound to the modular 2-arg helper.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const IOS_FCM = 'ios-fcm-token:APA91bIOSFCMTESTTOKENVALUE_MODULAR';

type MessagingInstance = {
  getToken: jest.Mock;
  registerDeviceForRemoteMessages: jest.Mock;
  isDeviceRegisteredForRemoteMessages: boolean;
  onTokenRefresh: jest.Mock | undefined;
  __listener?: (token: string) => void;
};

function buildModularMessagingModule(overrides?: {
  omitOnTokenRefresh?: boolean;
  omitGetMessaging?: boolean;
  brokenOnTokenRefresh?: boolean;
  instanceOnTokenRefreshUndefined?: boolean;
}) {
  const instance: MessagingInstance = {
    getToken: jest.fn().mockResolvedValue(IOS_FCM),
    registerDeviceForRemoteMessages: jest.fn().mockResolvedValue(undefined),
    isDeviceRegisteredForRemoteMessages: true,
    onTokenRefresh: jest.fn((listener: (token: string) => void) => {
      instance.__listener = listener;
      return jest.fn();
    }),
  };

  if (overrides?.instanceOnTokenRefreshUndefined) {
    instance.onTokenRefresh = undefined;
  }

  /**
   * Exact RNFB 27 modular helper. Wrong arity (listener only) makes the first
   * parameter a Function; `fn.onTokenRefresh` is undefined → Hermes:
   * "undefined is not a function".
   */
  const modularOnTokenRefresh = jest.fn(
    (messaging: MessagingInstance, listener: (token: string) => void) => {
      const method = messaging?.onTokenRefresh;
      if (typeof method !== 'function') {
        throw new TypeError('undefined is not a function');
      }
      return method.call(messaging, listener);
    },
  );

  const mod: Record<string, unknown> = {
    __esModule: true,
    getMessaging: jest.fn(() => instance),
    getToken: jest.fn((messaging: MessagingInstance) => messaging.getToken()),
    registerDeviceForRemoteMessages: jest.fn((messaging: MessagingInstance) =>
      messaging.registerDeviceForRemoteMessages(),
    ),
    isDeviceRegisteredForRemoteMessages: jest.fn(
      (messaging: MessagingInstance) => messaging.isDeviceRegisteredForRemoteMessages,
    ),
    onTokenRefresh: modularOnTokenRefresh,
  };

  if (overrides?.omitGetMessaging) {
    delete mod.getMessaging;
  }
  if (overrides?.omitOnTokenRefresh) {
    delete mod.onTokenRefresh;
  }
  if (overrides?.brokenOnTokenRefresh) {
    mod.onTokenRefresh = jest.fn(() => {
      throw new TypeError('undefined is not a function');
    });
  }

  return { mod, instance, modularOnTokenRefresh };
}

/** Reproduce the pre-fix namespaced loader against a modular-only module. */
function legacyNamespacedLoad(messagingModule: Record<string, unknown>) {
  const messaging = (messagingModule.default ?? messagingModule) as unknown;
  return typeof messaging === 'function' ? (messaging as () => unknown)() : messaging;
}

function loadNativePushWithModularMock(
  mod: Record<string, unknown>,
  os: 'ios' | 'android',
) {
  jest.resetModules();
  jest.doMock('@react-native-firebase/messaging', () => mod);
  // Re-bind setup's expo-notifications mock so resetModules does not load the real package.
  jest.doMock('expo-notifications', () => Notifications);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native') as typeof import('react-native');
  // Platform must be set on the post-resetModules instance that nativePushToken imports.
  Object.defineProperty(RN.Platform, 'OS', { configurable: true, get: () => os });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nativePush = require('../core/services/nativePushToken') as typeof import('../core/services/nativePushToken');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const notifications = require('expo-notifications') as typeof Notifications;
  return { nativePush, notifications };
}

describe('RNFB v27 modular messaging contract', () => {
  const originalOsDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');

  afterEach(() => {
    if (originalOsDescriptor) {
      Object.defineProperty(Platform, 'OS', originalOsDescriptor);
    }
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('legacy namespaced onTokenRefresh call throws undefined is not a function', () => {
    const { mod, modularOnTokenRefresh } = buildModularMessagingModule();
    expect(mod.default).toBeUndefined();

    const loaded = legacyNamespacedLoad(mod) as {
      onTokenRefresh: (l: (t: string) => void) => void;
    };
    expect(typeof loaded.onTokenRefresh).toBe('function');

    expect(() => {
      loaded.onTokenRefresh(() => undefined);
    }).toThrow(/undefined is not a function/);

    expect(modularOnTokenRefresh).toHaveBeenCalledTimes(1);
    expect(modularOnTokenRefresh.mock.calls[0]).toHaveLength(1);
  });

  it('fixed loader registers modular onTokenRefresh(instance, listener) on iOS', () => {
    const { mod, instance, modularOnTokenRefresh } = buildModularMessagingModule();
    const {
      nativePush: { subscribeNativeFcmTokenRefresh },
    } = loadNativePushWithModularMock(mod, 'ios');

    const received: string[] = [];
    const sub = subscribeNativeFcmTokenRefresh((token: string) => {
      received.push(token);
    });

    expect(mod.getMessaging).toHaveBeenCalled();
    expect(modularOnTokenRefresh).toHaveBeenCalledTimes(1);
    expect(modularOnTokenRefresh.mock.calls[0][0]).toBe(instance);
    expect(typeof modularOnTokenRefresh.mock.calls[0][1]).toBe('function');
    expect(instance.onTokenRefresh).toHaveBeenCalled();

    instance.__listener?.(IOS_FCM);
    expect(received).toEqual([IOS_FCM]);
    expect(() => sub.remove()).not.toThrow();
  });

  it('iOS getToken uses modular getMessaging + getToken', async () => {
    const { mod, instance } = buildModularMessagingModule();
    const {
      nativePush: { getNativeFcmRegistrationToken },
    } = loadNativePushWithModularMock(mod, 'ios');

    const token = await getNativeFcmRegistrationToken();
    expect(token).toBe(IOS_FCM);
    expect(mod.getMessaging).toHaveBeenCalled();
    expect(mod.getToken).toHaveBeenCalledWith(instance);
    expect(instance.getToken).toHaveBeenCalled();
  });

  it('missing getMessaging returns noop subscription without throwing', () => {
    const { mod } = buildModularMessagingModule({ omitGetMessaging: true });
    const {
      nativePush: { subscribeNativeFcmTokenRefresh },
    } = loadNativePushWithModularMock(mod, 'ios');

    expect(() => {
      const sub = subscribeNativeFcmTokenRefresh(() => undefined);
      sub.remove();
    }).not.toThrow();
  });

  it('non-callable onTokenRefresh is handled without boot crash', () => {
    const { mod } = buildModularMessagingModule({
      omitOnTokenRefresh: true,
      instanceOnTokenRefreshUndefined: true,
    });
    const {
      nativePush: { subscribeNativeFcmTokenRefresh },
    } = loadNativePushWithModularMock(mod, 'ios');

    expect(() => {
      const sub = subscribeNativeFcmTokenRefresh(() => undefined);
      expect(typeof sub.remove).toBe('function');
      sub.remove();
    }).not.toThrow();
  });

  it('onTokenRefresh registration errors do not propagate', () => {
    const { mod } = buildModularMessagingModule({ brokenOnTokenRefresh: true });
    const {
      nativePush: { subscribeNativeFcmTokenRefresh },
    } = loadNativePushWithModularMock(mod, 'ios');

    expect(() => {
      const sub = subscribeNativeFcmTokenRefresh(() => undefined);
      sub.remove();
    }).not.toThrow();
  });

  it('Android still uses expo push-token listener (regression)', () => {
    const { mod } = buildModularMessagingModule();
    const {
      nativePush: { subscribeNativeFcmTokenRefresh },
      notifications,
    } = loadNativePushWithModularMock(mod, 'android');

    (notifications.addPushTokenListener as jest.Mock).mockClear();
    const sub = subscribeNativeFcmTokenRefresh(() => undefined);
    expect(notifications.addPushTokenListener).toHaveBeenCalled();
    expect(mod.getMessaging).not.toHaveBeenCalled();
    sub.remove();
  });
});
