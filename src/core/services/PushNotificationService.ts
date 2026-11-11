/**
 * Push Notification Service - Backend-Driven Model
 * Frontend only generates and registers native FCM device tokens
 * All push message delivery handled by backend APIs
 *
 * IMPORTANT: Uses native FCM tokens (NOT Expo Push Tokens)
 * Backend expects raw FCM tokens for direct Firebase messaging
 *
 * Token acquisition:
 * - Android: expo-notifications getDevicePushTokenAsync (verified production path)
 * - iOS: @react-native-firebase/messaging FCM registration token (not raw APNs)
 *
 * Notification receipt / tap ownership:
 * - Both platforms: expo-notifications is the authoritative presentation + tap listener
 * - iOS RNFB Messaging is used for FCM token acquisition/refresh only (no competing tap handlers)
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@core/api/config';
import {
  needsAccountTokenReconcile,
  promptDismissedStorageKey,
  PUSH_ACCOUNT_STORAGE,
  wasPromptDismissedRecently,
} from './pushNotificationAccountScope';
import {
  getNativeFcmRegistrationToken,
  getNativePushPlatform,
  isAcceptableFcmRegistrationToken,
  subscribeNativeFcmTokenRefresh,
} from './nativePushToken';

// Storage keys (device-level token/preference; registration id + prompt are account-aware)
const STORAGE_KEYS = {
  FCM_TOKEN: PUSH_ACCOUNT_STORAGE.FCM_TOKEN,
  PUSH_ENABLED: PUSH_ACCOUNT_STORAGE.PUSH_ENABLED,
  LAST_TOKEN_REGISTERED: PUSH_ACCOUNT_STORAGE.LAST_TOKEN_REGISTERED,
  TOKEN_ID: PUSH_ACCOUNT_STORAGE.TOKEN_ID,
  REGISTERED_USER_ID: PUSH_ACCOUNT_STORAGE.REGISTERED_USER_ID,
  /** Legacy device-wide key; migrated into per-account keys on read. */
  PUSH_PROMPT_DISMISSED_LEGACY: 'pushPromptDismissedAt',
};

/**
 * Log only non-sensitive push diagnostics. Axios errors can contain JWT headers
 * and request bodies (including FCM tokens), so never log entire errors.
 */
function safePushError(error: unknown): {
  name: string;
  httpStatus?: number;
  code?: string;
} {
  const detail = (error && typeof error === 'object' ? error : {}) as {
    name?: unknown;
    code?: unknown;
    response?: { status?: unknown };
  };
  const name = typeof detail.name === 'string' && /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(detail.name)
    ? detail.name
    : 'UnknownError';
  const code = typeof detail.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(detail.code)
    ? detail.code
    : undefined;
  return {
    name,
    httpStatus: typeof detail.response?.status === 'number' ? detail.response.status : undefined,
    code,
  };
}

// Configure notification handler (for local notifications display)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android 13+ requires the notification channel to exist before permission
// and native FCM token operations. Wait for creation instead of racing it.
let androidChannelReady: Promise<void> | null = null;

function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return Promise.resolve();
  }

  if (!androidChannelReady) {
    androidChannelReady = Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    }).then(
      () => undefined,
      (error: unknown) => {
        // Retry on the next operation if Android channel creation failed.
        androidChannelReady = null;
        throw error;
      },
    );
  }

  return androidChannelReady;
}

/**
 * Check if push notifications are supported on this platform
 */
function isPushSupported(): boolean {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;
  // Remote push notifications were removed from Expo Go in SDK 53
  // Only available in development builds and production binaries
  if (Constants.appOwnership === 'expo') return false;
  return true;
}

/**
 * Request push notification permission
 * @returns Permission status: 'granted' | 'denied' | 'undetermined'
 */
async function requestPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    if (!isPushSupported()) {
      console.log('❌ Push notifications only supported on Android/iOS standalone builds');
      return 'denied';
    }

    await ensureAndroidNotificationChannel();

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return 'granted';
    }

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    
    return status === 'granted' ? 'granted' : 'denied';
  } catch (error) {
    console.error('❌ Error requesting push permission:', safePushError(error));
    return 'denied';
  }
}

/**
 * Get native FCM device token (not Expo Push Token / not raw APNs).
 * Direct-FCM backend path rejects Expo tokens — never fall back to getExpoPushTokenAsync.
 * @returns FCM token string or null if failed
 */
async function getToken(options?: { forceRefresh?: boolean }): Promise<string | null> {
  try {
    if (!isPushSupported()) {
      return null;
    }

    await ensureAndroidNotificationChannel();
    const forceRefresh = options?.forceRefresh === true;

    // Drop any legacy Expo / APNs tokens cached from older builds
    const cachedToken = await AsyncStorage.getItem(STORAGE_KEYS.FCM_TOKEN);
    if (cachedToken && !isAcceptableFcmRegistrationToken(cachedToken)) {
      await AsyncStorage.removeItem(STORAGE_KEYS.FCM_TOKEN);
    } else if (!forceRefresh && cachedToken) {
      return cachedToken;
    }

    const token = await getNativeFcmRegistrationToken();

    if (!token || !isAcceptableFcmRegistrationToken(token)) {
      console.error('❌ Native FCM token unavailable; Expo/APNs tokens are not accepted for direct FCM');
      return null;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);
    return token;
  } catch (error) {
    console.error('❌ Error getting push token:', safePushError(error));
    return null;
  }
}

/**
 * Get device metadata for registration
 */
function getDeviceMetadata() {
  const platform = getNativePushPlatform();
  return {
    platform: (platform ?? 'android') as 'android' | 'ios',
    device_name: `${Device.brand || 'Unknown'} ${Device.modelName || 'Device'}`,
    device_model: Device.modelName || undefined,
    os_version: Device.osVersion || undefined,
    app_version: '1.0.0',
  };
}

/**
 * Register device for push notifications with native FCM token
 * Sends raw FCM token (not Expo Push Token) to backend
 * Calls API: POST /api/notifications/devices
 */
async function registerDevice(token: string): Promise<boolean> {
  try {
    if (!isAcceptableFcmRegistrationToken(token)) {
      throw new Error(
        'Expo push tokens are not supported. Raw APNs tokens are not supported. Native FCM registration token is required.',
      );
    }

    const metadata = getDeviceMetadata();
    const requestBody = {
      token, // Native FCM registration token only
      ...metadata,
    };

    console.log('📤 Registering device with backend...');
    console.log('📦 Token type: FCM (NATIVE)');
    console.log('Registering device (token redacted)');

    // API endpoint: POST /api/notifications/devices
    const response = await apiClient.post('/api/notifications/devices', requestBody);

    console.log('📥 Registration acknowledgement:', { id: response.data?.id ?? null });

    if (response.data?.id) {
      // Store the device token ID for future reference
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_ID, response.data.id.toString());
    }

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_TOKEN_REGISTERED, token);
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, 'true');
    if (response.data?.user_id != null) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.REGISTERED_USER_ID,
        String(response.data.user_id),
      );
    }

    console.log('✅ Device registered successfully with Firebase FCM token');
    return true;
  } catch (error: any) {
    // Preserve intentional client-side validation (e.g. Expo/APNs token rejection)
    if (
      typeof error?.message === 'string' &&
      (error.message.includes('Expo push tokens are not supported') ||
        error.message.includes('Raw APNs tokens are not supported') ||
        error.message.includes('Native FCM registration token is required'))
    ) {
      throw error;
    }

    console.error('❌ Failed to register device:', safePushError(error));

    // Network error
    if (!error?.response) {
      throw new Error('Network error. Please ensure the backend API is accessible.');
    }
    
    // Authentication error
    if (error?.response?.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Extract error message
    let errorMessage = 'Failed to register device for push notifications';
    if (error?.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Detach this device token from the current authenticated account on the backend.
 * Keeps OS permission + cached FCM token (device state) so the next account can re-register.
 */
async function detachAccountAssociation(): Promise<void> {
  try {
    const tokenId = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_ID);
    if (tokenId) {
      try {
        await apiClient.delete(`/api/notifications/devices/${tokenId}`);
      } catch (error: any) {
        // 401/404 are expected after session expiry — still clear local association
        const status = error?.response?.status;
        if (status !== 401 && status !== 404) {
          console.warn('⚠️ detachAccountAssociation delete failed:', safePushError(error));
        }
      }
    }
  } finally {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN_ID,
      STORAGE_KEYS.LAST_TOKEN_REGISTERED,
      STORAGE_KEYS.REGISTERED_USER_ID,
    ]);
  }
}

/**
 * Unregister/disable device from push notifications (user opted out).
 * Calls API: DELETE /api/notifications/devices/{token_id}
 */
async function unregisterDevice(): Promise<boolean> {
  try {
    const tokenId = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_ID);

    if (tokenId) {
      await apiClient.delete(`/api/notifications/devices/${tokenId}`);
    }

    // Opt-out: clear association + device preference. Keep FCM token cache optional —
    // clearing forces a fresh token fetch if they re-enable later.
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN_ID,
      STORAGE_KEYS.LAST_TOKEN_REGISTERED,
      STORAGE_KEYS.REGISTERED_USER_ID,
      STORAGE_KEYS.PUSH_ENABLED,
      STORAGE_KEYS.FCM_TOKEN,
    ]);
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, 'false');

    console.log('✅ Device unregistered from push notifications');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to unregister device:', safePushError(error));

    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, 'false');
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN_ID,
      STORAGE_KEYS.LAST_TOKEN_REGISTERED,
      STORAGE_KEYS.REGISTERED_USER_ID,
    ]);

    throw new Error(error?.response?.data?.message || 'Failed to disable push notifications');
  }
}

/**
 * Get current push notification status
 */
async function getPushStatus(): Promise<{
  isEnabled: boolean;
  hasPermission: boolean;
  hasToken: boolean;
  isSupported: boolean;
}> {
  try {
    const isSupported = isPushSupported();
    
    if (!isSupported) {
      return {
        isEnabled: false,
        hasPermission: false,
        hasToken: false,
        isSupported: false,
      };
    }

    const isEnabled = (await AsyncStorage.getItem(STORAGE_KEYS.PUSH_ENABLED)) === 'true';
    const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.FCM_TOKEN);
    const { status } = await Notifications.getPermissionsAsync();

    return {
      isEnabled,
      hasPermission: status === 'granted',
      hasToken: isAcceptableFcmRegistrationToken(storedToken),
      isSupported,
    };
  } catch (error) {
    console.error('❌ Error getting push status:', safePushError(error));
    return {
      isEnabled: false,
      hasPermission: false,
      hasToken: false,
      isSupported: false,
    };
  }
}

/**
 * Enable push notifications (full flow) - FIREBASE FCM ONLY
 * 1. Check permission
 * 2. Request if needed
 * 3. Get FCM token from Firebase
 * 4. Register with backend using FCM token
 */
async function enablePushNotifications(): Promise<{
  success: boolean;
  message: string;
  token?: string;
}> {
  try {
    // Check if supported
    if (!isPushSupported()) {
      return {
        success: false,
        message: 'Push notifications only supported on Android/iOS standalone builds',
      };
    }

    console.log('🔔 Starting push notification enablement...');

    // Request permission
    const permissionStatus = await requestPermission();
    
    if (permissionStatus === 'denied') {
      return {
        success: false,
        message: 'Permission denied. Please enable notifications in device settings.',
      };
    }

    console.log('✅ Permission granted');

    const token = await getToken({ forceRefresh: true });

    if (!token) {
      return {
        success: false,
        message:
          Platform.OS === 'ios'
            ? 'Failed to get a native FCM registration token on iOS. Ensure GoogleService-Info.plist is present, APNs is configured in Firebase, and rebuild the iOS binary.'
            : 'Failed to get a native FCM device token. Ensure Google Play services are available and rebuild the development client if needed.',
      };
    }

    console.log('Native FCM token received (redacted)');

    await registerDevice(token);

    console.log('✅ Push notifications enabled successfully');

    return {
      success: true,
      message: 'Push notifications enabled successfully',
      // Returned for authorized debug screens only — never log the full value.
      token,
    };
  } catch (error: any) {
    console.error('❌ Error enabling push notifications:', safePushError(error));
    return {
      success: false,
      message: error?.message || 'Failed to enable push notifications',
    };
  }
}

/**
 * Disable push notifications (full flow)
 */
async function disablePushNotifications(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await unregisterDevice();

    return {
      success: true,
      message: 'Push notifications disabled successfully',
    };
  } catch (error: any) {
    console.error('❌ Error disabling push notifications:', safePushError(error));
    return {
      success: false,
      message: error?.message || 'Failed to disable push notifications',
    };
  }
}

/**
 * Handle token refresh when FCM rotates the device token.
 * Prefer passing the listener token so we do not re-call native token APIs
 * inside the refresh subscription (that can loop).
 */
async function handleTokenRefresh(incomingToken?: string | null): Promise<void> {
  try {
    const status = await getPushStatus();

    if (!status.isEnabled || !status.isSupported) {
      return;
    }

    let newToken = incomingToken?.trim() || null;
    if (newToken && !isAcceptableFcmRegistrationToken(newToken)) {
      console.error('❌ Ignoring non-FCM token during refresh (Expo/APNs rejected)');
      return;
    }

    if (!newToken) {
      newToken = await getToken({ forceRefresh: true });
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, newToken);
    }

    if (!newToken) {
      console.error('❌ Failed to get new token during refresh');
      return;
    }

    const lastRegistered = await AsyncStorage.getItem(STORAGE_KEYS.LAST_TOKEN_REGISTERED);
    if (lastRegistered === newToken) {
      return;
    }

    await registerDevice(newToken);
  } catch (error) {
    console.error('❌ Error handling token refresh:', safePushError(error));
  }
}

/**
 * Subscribe to native FCM registration token rotations while push is enabled.
 * Caller must remove the subscription on cleanup.
 */
function subscribeToTokenRefresh(): { remove: () => void } {
  try {
    return subscribeNativeFcmTokenRefresh((token) => {
      void handleTokenRefresh(token);
    });
  } catch (error) {
    // Boot must not fail when optional token-refresh wiring throws.
    console.error('❌ Failed to subscribe to FCM token refresh:', safePushError(error));
    return { remove: () => undefined };
  }
}

/**
 * Sync push status after login / account switch.
 * Reconciles an existing device token onto the authenticated account —
 * presence of a local token alone is not proof it is registered for this user.
 */
async function syncStatusAfterLogin(userId?: string | number | null): Promise<void> {
  try {
    const status = await getPushStatus();
    if (!status.isSupported) {
      return;
    }

    const registeredUserId = await AsyncStorage.getItem(STORAGE_KEYS.REGISTERED_USER_ID);
    const lastRegistered = await AsyncStorage.getItem(STORAGE_KEYS.LAST_TOKEN_REGISTERED);
    const currentToken = await AsyncStorage.getItem(STORAGE_KEYS.FCM_TOKEN);

    const shouldReconcile = needsAccountTokenReconcile({
      isSupported: status.isSupported,
      hasPermission: status.hasPermission,
      pushEnabledLocally: status.isEnabled,
      hasToken: status.hasToken,
      registeredUserId,
      currentUserId: userId ?? null,
      lastRegisteredToken: lastRegistered,
      currentToken,
    });

    if (!shouldReconcile) {
      return;
    }

    if (!status.hasPermission) {
      // Do not re-prompt the OS dialog from login sync; Profile / in-app prompt handle enablement.
      console.log('🔔 Push reconcile skipped — OS permission not granted');
      return;
    }

    console.log('🔄 Reconciling push token for authenticated account...');
    const result = await enablePushNotifications();
    if (!result.success) {
      console.log('⚠️ Failed to reconcile push registration');
      return;
    }
    if (userId != null) {
      await AsyncStorage.setItem(STORAGE_KEYS.REGISTERED_USER_ID, String(userId));
    }
  } catch (error) {
    console.error('❌ Error syncing push status:', safePushError(error));
  }
}

/**
 * Check the current native FCM token on each launch when the user opted into push.
 * FCM may rotate while the app is terminated, when listeners cannot run.
 * Do not show a permission prompt here; leave that to the user-facing settings UI.
 */
async function initializeOnAppLaunch(): Promise<void> {
  try {
    const status = await getPushStatus();
    if (!status.isSupported || !status.isEnabled || !status.hasPermission) {
      return;
    }

    // Always re-read the native FCM token; cached data alone is not rotation proof.
    // getToken also clears legacy cached Expo/APNs tokens.
    const nativeToken = await getToken({ forceRefresh: true });
    if (!nativeToken) {
      console.warn('⚠️ Native FCM token unavailable during launch reconciliation');
      return;
    }

    const lastRegistered = await AsyncStorage.getItem(STORAGE_KEYS.LAST_TOKEN_REGISTERED);
    if (lastRegistered !== nativeToken) {
      // If the user is not authenticated yet, login reconciliation will retry.
      await registerDevice(nativeToken);
    }
  } catch (error) {
    console.error('❌ Error initializing push on app launch:', safePushError(error));
  }
}

/**
 * Check if push prompt was recently dismissed for this account.
 */
async function wasPromptRecentlyDismissed(userId?: string | number | null): Promise<boolean> {
  try {
    if (userId == null) {
      return false;
    }
    const key = promptDismissedStorageKey(userId);
    let dismissedAt = await AsyncStorage.getItem(key);
    if (!dismissedAt) {
      // One-time migration from legacy device-wide dismissal — do not suppress other accounts.
      dismissedAt = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_PROMPT_DISMISSED_LEGACY);
      if (dismissedAt) {
        await AsyncStorage.setItem(key, dismissedAt);
        await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_PROMPT_DISMISSED_LEGACY);
      }
    }
    return wasPromptDismissedRecently(dismissedAt, Date.now());
  } catch {
    return false;
  }
}

/**
 * Mark push prompt as dismissed for this account only.
 */
async function dismissPrompt(userId?: string | number | null): Promise<void> {
  if (userId == null) {
    return;
  }
  await AsyncStorage.setItem(promptDismissedStorageKey(userId), new Date().toISOString());
}

/**
 * Clear all notifications and reset badge
 */
async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Setup notification listeners (for when app is open).
 * Authoritative receipt/tap path for both Android and iOS — do not also
 * register RNFB onMessage / onNotificationOpenedApp for tap navigation.
 */
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  const receivedListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    receivedListener.remove();
    responseListener.remove();
  };
}

// Export service
export const PushNotificationService = {
  // Core functionality
  isPushSupported,
  requestPermission,
  getToken,
  registerDevice,
  unregisterDevice,
  detachAccountAssociation,
  
  // High-level flows
  enablePushNotifications,
  disablePushNotifications,
  initializeOnAppLaunch,
  syncStatusAfterLogin,
  handleTokenRefresh,
  subscribeToTokenRefresh,
  getPushStatus,
  
  // Prompt management
  wasPromptRecentlyDismissed,
  dismissPrompt,
  
  // Utilities
  clearAllNotifications,
};

export default PushNotificationService;
