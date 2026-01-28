/**
 * Push Notification Service - Backend-Driven Model
 * Frontend only generates and registers native FCM device tokens
 * All push message delivery handled by backend APIs
 * 
 * IMPORTANT: Uses native FCM tokens (NOT Expo Push Tokens)
 * Backend expects raw FCM tokens for direct Firebase messaging
 * 
 * Requirements:
 * - Generate native FCM token only when push notifications are enabled
 * - Register token on app launch and after login (if enabled)
 * - Handle token refresh events
 * - Send token to backend push-registration API
 * - No direct push message sending from frontend
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@core/api/config';

// Storage keys
const STORAGE_KEYS = {
  FCM_TOKEN: 'fcmDeviceToken',
  PUSH_ENABLED: 'pushNotificationsEnabled',
  PUSH_PROMPT_DISMISSED: 'pushPromptDismissedAt',
  LAST_TOKEN_REGISTERED: 'lastTokenRegistered',
  TOKEN_ID: 'deviceTokenId', // ID returned from backend after registration
};

// Configure notification handler (for local notifications display)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Set up Android notification channel (required for Android 8.0+)
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
}

/**
 * Check if push notifications are supported on this platform
 */
function isPushSupported(): boolean {
  // Only Android is supported with Firebase FCM native module
  return Platform.OS === 'android';
}

/**
 * Request push notification permission
 * @returns Permission status: 'granted' | 'denied' | 'undetermined'
 */
async function requestPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    if (!isPushSupported()) {
      console.log('❌ Push notifications only supported on Android');
      return 'denied';
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return 'granted';
    }

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    
    return status === 'granted' ? 'granted' : 'denied';
  } catch (error) {
    console.error('❌ Error requesting push permission:', error);
    return 'denied';
  }
}

/**
 * Get native FCM device token (not Expo Push Token)
 * Only call when push notifications are enabled
 * @returns FCM token string or null if failed
 */
async function getToken(): Promise<string | null> {
  try {
    if (!isPushSupported()) {
      return null;
    }
    
    // Check if already have valid cached token
    const cachedToken = await AsyncStorage.getItem(STORAGE_KEYS.FCM_TOKEN);
    if (cachedToken && !cachedToken.startsWith('ExponentPushToken')) {
      return cachedToken;
    }
    
    // Get native device push token (FCM for Android)
    // This returns the raw FCM token, not wrapped in Expo format
    let token: string | null = null;
    
    try {
      const devicePushToken = await Notifications.getDevicePushTokenAsync();
      console.log('🔍 Device push token response:', devicePushToken);
      
      if (devicePushToken && typeof devicePushToken === 'object' && 'data' in devicePushToken) {
        token = devicePushToken.data;
      } else if (typeof devicePushToken === 'string') {
        token = devicePushToken;
      } else {
        console.error('❌ Unexpected device token format:', devicePushToken);
      }
    } catch (deviceTokenError) {
      console.error('❌ getDevicePushTokenAsync failed:', deviceTokenError);
      console.log('⚠️ Falling back to Expo Push Token - backend may need to handle this format');
      
      // Fallback to Expo Push Token if native token fails
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: '60acc689-aea1-4ce1-9770-4200c1c17c00',
      });
      
      if (expoPushToken?.data) {
        token = expoPushToken.data;
        console.log('⚠️ Using Expo Push Token as fallback:', token);
      }
    }

    if (!token) {
      console.error('❌ Failed to get any push token');
      return null;
    }

    // Store token locally for session cache
    await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);

    return token;
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    return null;
  }
}

/**
 * Get device metadata for registration
 */
function getDeviceMetadata() {
  return {
    platform: 'android' as const, // Only Android supported
    device_name: `${Device.brand || 'Unknown'} ${Device.modelName || 'Device'}`,
    device_model: Device.modelName || undefined,
    os_version: Device.osVersion || undefined,
    app_version: '1.0.0', // TODO: Get from app.json
  };
}

/**
 * Register device for push notifications with native FCM token
 * Sends raw FCM token (not Expo Push Token) to backend
 * Calls API: POST /api/notifications/devices
 */
async function registerDevice(token: string): Promise<boolean> {
  try {
    const metadata = getDeviceMetadata();
    
    // Build the request body with push token (FCM or Expo)
    const requestBody = {
      token, // Native FCM token preferred, Expo token as fallback
      ...metadata,
    };
    
    const tokenType = token.startsWith('ExponentPushToken') ? 'Expo (FALLBACK)' : 'FCM (NATIVE)';
    console.log('📤 Registering device with backend...');
    console.log('📦 Token type:', tokenType);
    console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
    
    // API endpoint: POST /api/notifications/devices
    const response = await apiClient.post('/api/notifications/devices', requestBody);

    console.log('📥 Registration response:', response.data);

    if (response.data?.id) {
      // Store the device token ID for future reference
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_ID, response.data.id.toString());
    }

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_TOKEN_REGISTERED, token);
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, 'true');

    console.log('✅ Device registered successfully with Firebase FCM token');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to register device:', {
      name: error?.name,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    
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
 * Unregister/disable device from push notifications
 * Calls API: DELETE /api/notifications/devices/{token_id}
 */
async function unregisterDevice(): Promise<boolean> {
  try {
    const tokenId = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_ID);
    
    if (!tokenId) {
      // No token ID, just mark as disabled locally
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, 'false');
      await AsyncStorage.removeItem(STORAGE_KEYS.FCM_TOKEN);
      return true;
    }

    await apiClient.delete(`/api/notifications/devices/${tokenId}`);
    
    // Clear local storage
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN_ID,
      STORAGE_KEYS.LAST_TOKEN_REGISTERED,
      STORAGE_KEYS.PUSH_ENABLED,
      STORAGE_KEYS.FCM_TOKEN,
    ]);

    console.log('✅ Device unregistered and FCM token deleted');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to unregister device:', error?.response?.data || error?.message);
    
    // Even if backend fails, disable locally
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, 'false');
    
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
      hasToken: !!storedToken,
      isSupported,
    };
  } catch (error) {
    console.error('❌ Error getting push status:', error);
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
        message: 'Push notifications only supported on Android',
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

    // Get native FCM device token (or Expo token as fallback)
    const token = await getToken();
    
    if (!token) {
      return {
        success: false,
        message: 'Failed to get push token. Please check notification permissions.',
      };
    }

    const isExpoToken = token.startsWith('ExponentPushToken');
    const tokenType = isExpoToken ? 'Expo Push Token (fallback)' : 'Native FCM Token';
    
    console.log(`✅ ${tokenType} received:`, token.substring(0, 30) + '...');

    // Register with backend using FCM token
    await registerDevice(token);

    console.log('✅ Push notifications enabled successfully');

    return {
      success: true,
      message: 'Push notifications enabled successfully',
      token,
    };
  } catch (error: any) {
    console.error('❌ Error enabling push notifications:', error);
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
    console.error('❌ Error disabling push notifications:', error);
    return {
      success: false,
      message: error?.message || 'Failed to disable push notifications',
    };
  }
}

/**
 * Handle token refresh when Firebase updates/invalidates the token
 * This should be called when Expo Notifications detects a token change
 */
async function handleTokenRefresh(): Promise<void> {
  try {
    const status = await getPushStatus();
    
    // Only refresh if push is enabled
    if (!status.isEnabled || !status.isSupported) {
      return;
    }
    
    // Get new token
    const newToken = await getToken();
    
    if (!newToken) {
      console.error('❌ Failed to get new token during refresh');
      return;
    }
    
    // Check if token actually changed
    const lastRegistered = await AsyncStorage.getItem(STORAGE_KEYS.LAST_TOKEN_REGISTERED);
    if (lastRegistered === newToken) {
      return; // Token unchanged, skip registration
    }
    
    // Register new token with backend
    await registerDevice(newToken);
  } catch (error) {
    console.error('❌ Error handling token refresh:', error);
  }
}

/**
 * Sync push status after login
 * Re-registers if token changed or user was previously enabled
 */
async function syncStatusAfterLogin(): Promise<void> {
  try {
    const status = await getPushStatus();
    
    // If previously enabled but token missing, try to re-register
    if (status.isEnabled && !status.hasToken && status.isSupported) {
      console.log('🔄 Re-registering push notifications after login...');
      const result = await enablePushNotifications();
      if (!result.success) {
        console.log('⚠️ Failed to re-register:', result.message);
      }
    }
  } catch (error) {
    console.error('❌ Error syncing push status:', error);
  }
}

/**
 * Initialize push notifications on app launch
 * Only generates/registers token if push is enabled
 * Call this in App.tsx useEffect on startup
 */
async function initializeOnAppLaunch(): Promise<void> {
  try {
    const status = await getPushStatus();
    
    // Skip if not supported or not enabled
    if (!status.isSupported || !status.isEnabled) {
      return;
    }
    
    // If enabled but no token, generate and register
    if (!status.hasToken) {
      const result = await enablePushNotifications();
      if (!result.success) {
        console.warn('⚠️ Failed to initialize push on launch:', result.message);
      }
      return;
    }
    
    // If has token, verify it's still registered with backend
    const lastRegistered = await AsyncStorage.getItem(STORAGE_KEYS.LAST_TOKEN_REGISTERED);
    const currentToken = await AsyncStorage.getItem(STORAGE_KEYS.FCM_TOKEN);
    
    // Re-register if tokens don't match (means token changed)
    if (lastRegistered !== currentToken && currentToken) {
      await registerDevice(currentToken);
    }
  } catch (error) {
    console.error('❌ Error initializing push on app launch:', error);
  }
}

/**
 * Check if push prompt was recently dismissed
 */
async function wasPromptRecentlyDismissed(): Promise<boolean> {
  try {
    const dismissedAt = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_PROMPT_DISMISSED);
    
    if (!dismissedAt) {
      return false;
    }

    const dismissedTime = new Date(dismissedAt).getTime();
    const now = new Date().getTime();
    const hoursSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60);

    return hoursSinceDismissed < 24;
  } catch (error) {
    return false;
  }
}

/**
 * Mark push prompt as dismissed
 */
async function dismissPrompt(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.PUSH_PROMPT_DISMISSED, new Date().toISOString());
}

/**
 * Clear all notifications and reset badge
 */
async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Setup notification listeners (for when app is open)
 */
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  const receivedListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    Notifications.removeNotificationSubscription(receivedListener);
    Notifications.removeNotificationSubscription(responseListener);
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
  
  // High-level flows
  enablePushNotifications,
  disablePushNotifications,
  initializeOnAppLaunch,
  syncStatusAfterLogin,
  handleTokenRefresh,
  getPushStatus,
  
  // Prompt management
  wasPromptRecentlyDismissed,
  dismissPrompt,
  
  // Utilities
  clearAllNotifications,
};

export default PushNotificationService;
