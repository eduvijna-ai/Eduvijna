/**
 * Push Notification Service - Firebase FCM Only
 * Production-ready service using direct Firebase Cloud Messaging
 * NO Expo Push Service - Only Firebase Provider
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@core/api/config';
import { getFCMToken, deleteFCMToken } from './FirebasePushNative';

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
 * Get Firebase FCM token directly from Firebase SDK
 * This is the ONLY token used - no Expo tokens
 */
async function getToken(): Promise<string | null> {
  try {
    if (!isPushSupported()) {
      console.log('❌ Push notifications only supported on Android');
      return null;
    }

    console.log('📱 Getting FCM token from Firebase...');
    
    // Get FCM token from native Firebase SDK
    const token = await getFCMToken();

    if (!token) {
      console.error('❌ Failed to get FCM token from Firebase');
      return null;
    }

    console.log('✅ FCM token obtained:', token);

    // Store token locally
    await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);

    return token;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
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
 * Register device for push notifications with Firebase FCM token
 * Calls API: POST /api/notifications/devices
 */
async function registerDevice(token: string): Promise<boolean> {
  try {
    const metadata = getDeviceMetadata();
    
    // Build the request body - Firebase FCM token format
    const requestBody = {
      token, // This is the FCM token from Firebase, not Expo token
      ...metadata,
    };
    
    console.log('📤 Registering device with backend (Firebase FCM)...');
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
      console.log('⚠️ No token ID found, marking as disabled locally');
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, 'false');
      // Delete FCM token from Firebase
      await deleteFCMToken();
      return true;
    }

    await apiClient.delete(`/api/notifications/devices/${tokenId}`);
    
    // Delete FCM token from Firebase
    await deleteFCMToken();
    
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
    await deleteFCMToken();
    
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

    // Get FCM token from Firebase (not Expo)
    const token = await getToken();
    
    if (!token) {
      return {
        success: false,
        message: 'Failed to get Firebase FCM token. Did you rebuild the Android app?',
      };
    }

    console.log('✅ FCM token received:', token.substring(0, 20) + '...');

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
  getToken, // Returns FCM token only
  registerDevice,
  unregisterDevice,
  
  // High-level flows
  enablePushNotifications,
  disablePushNotifications,
  syncStatusAfterLogin,
  getPushStatus,
  
  // Prompt management
  wasPromptRecentlyDismissed,
  dismissPrompt,
  
  // Utilities
  clearAllNotifications,
};

export default PushNotificationService;
