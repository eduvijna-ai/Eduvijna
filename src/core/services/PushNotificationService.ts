/**
 * Push Notification Service
 * Comprehensive service for managing push notifications following API reference
 * Handles permissions, tokens, registration, and device management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@core/api/config';

// Storage keys
const STORAGE_KEYS = {
  PUSH_TOKEN: 'expoPushToken',
  PUSH_ENABLED: 'pushNotificationsEnabled',
  PUSH_PROMPT_DISMISSED: 'pushPromptDismissedAt',
  LAST_TOKEN_REGISTERED: 'lastTokenRegistered',
  TOKEN_ID: 'deviceTokenId', // ID returned from backend after registration
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configure Android notification channels
async function configureAndroidChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B9D',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('quiz-notifications', {
      name: 'Quiz Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90E2',
      sound: 'default',
      description: 'Notifications for new quizzes and assessments',
    });
  }
}

/**
 * Check if push notifications are supported on this platform
 */
function isPushSupported(): boolean {
  // Web push requires specific browser support
  if (Platform.OS === 'web') {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }
  
  // Mobile requires physical device
  // NOTE: Set to true for simulator testing (tokens won't work for actual push)
  return true; // Changed from: Device.isDevice
}

/**
 * Request push notification permission
 * @returns Permission status: 'granted' | 'denied' | 'undetermined'
 */
async function requestPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    if (!isPushSupported()) {
      console.log('❌ Push notifications not supported on this device');
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
 * Get push token for current platform
 * Returns Expo push token for easy testing with Expo's notification tool
 */
async function getToken(): Promise<string | null> {
  try {
    if (!isPushSupported()) {
      return null;
    }

    // Configure Android channels first
    await configureAndroidChannels();

    // Get Expo Push Token (works with expo.dev/notifications)
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'defde510-23b4-48d3-915b-8623f373039b',
    });

    const token = tokenData.data;
    console.log('✅ Expo push token obtained:', token);

    // Store token locally
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);

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
    platform: Platform.OS as 'android' | 'ios' | 'web',
    device_name: `${Device.brand || 'Unknown'} ${Device.modelName || 'Device'}`,
    device_model: Device.modelName || undefined,
    os_version: Device.osVersion || undefined,
    app_version: '1.0.0', // TODO: Get from app.json
  };
}

/**
 * Register device for push notifications
 * Calls API: POST /api/notifications/devices/register
 */
async function registerDevice(token: string): Promise<boolean> {
  try {
    const metadata = getDeviceMetadata();
    
    // Build the request body
    const requestBody = {
      token,
      ...metadata, // Spreads: platform, device_name, device_model, os_version, app_version
    };
    
    console.log('📤 Registering device with backend...');
    console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
    
    // API endpoint: POST /api/notifications/devices/register
    const response = await apiClient.post('/api/notifications/devices', requestBody);

    console.log('📥 Registration response:', response.data);

    if (response.data?.id) {
      // Store the device token ID for future reference
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_ID, response.data.id.toString());
    }

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_TOKEN_REGISTERED, token);
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, 'true');

    console.log('✅ Device registered successfully:', response.data);
    return true;
  } catch (error: any) {
    // More robust error logging
    console.error('❌ Failed to register device:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      isAxiosError: error?.isAxiosError,
      config: error?.config ? {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL,
      } : undefined,
    });
    
    // Network error (no response from server)
    if (!error?.response) {
      if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
        throw new Error('Request timeout. Please check your internet connection.');
      }
      if (error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK') {
        throw new Error('Network error. Please ensure the backend API is running and accessible.');
      }
      throw new Error(`Network error: ${error?.message || 'Unable to connect to server'}`);
    }
    
    // Authentication error
    if (error?.response?.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Server responded with error
    let errorMessage = 'Failed to register device for push notifications';
    if (error?.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail; // FastAPI format
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      }
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
      return true;
    }

    await apiClient.delete(`/api/notifications/devices/${tokenId}`);
    
    // Clear local storage
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN_ID,
      STORAGE_KEYS.LAST_TOKEN_REGISTERED,
      STORAGE_KEYS.PUSH_ENABLED,
    ]);

    console.log('✅ Device unregistered successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to unregister device:', error?.response?.data || error?.message || error);
    
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
    const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
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
 * Enable push notifications (full flow)
 * 1. Check permission
 * 2. Request if needed
 * 3. Get token
 * 4. Register with backend
 */
async function enablePushNotifications(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Check if supported
    if (!isPushSupported()) {
      return {
        success: false,
        message: 'Push notifications are not supported on this device',
      };
    }

    // Request permission
    const permissionStatus = await requestPermission();
    
    if (permissionStatus === 'denied') {
      return {
        success: false,
        message: 'Permission denied. Please enable notifications in device settings.',
      };
    }

    // Get token
    const token = await getToken();
    
    if (!token) {
      return {
        success: false,
        message: 'Failed to get push notification token',
      };
    }

    // Register with backend
    await registerDevice(token);

    return {
      success: true,
      message: 'Push notifications enabled successfully',
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
    
    // If has permission and token but not registered, register
    if (status.hasPermission && status.hasToken && !status.isEnabled) {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
      if (token) {
        await registerDevice(token);
      }
    }
  } catch (error) {
    console.error('❌ Error syncing push status:', error);
  }
}

/**
 * Check if push prompt was recently dismissed
 * Returns true if dismissed within last 24 hours
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

    // Show again after 24 hours
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
 * Setup notification listeners
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
  syncStatusAfterLogin,
  getPushStatus,
  
  // Prompt management
  wasPromptRecentlyDismissed,
  dismissPrompt,
  
  // Utilities
  clearAllNotifications,
};

export default PushNotificationService;
