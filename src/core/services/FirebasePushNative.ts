/**
 * Firebase Cloud Messaging (FCM) Native Module
 * Direct access to Firebase FCM tokens without Expo Push Service
 */

import { NativeModules, Platform } from 'react-native';

interface FirebasePushInterface {
  getToken(): Promise<string>;
  deleteToken(): Promise<boolean>;
}

const { FirebasePush } = NativeModules;

/**
 * Get FCM token directly from Firebase SDK
 * This returns the actual FCM token that Firebase backend expects
 */
export async function getFCMToken(): Promise<string | null> {
  if (Platform.OS !== 'android') {
    console.warn('⚠️ FCM native module only available on Android');
    return null;
  }

  if (!FirebasePush) {
    console.error('❌ FirebasePush native module not found. Did you rebuild the Android app?');
    return null;
  }

  try {
    const token = await FirebasePush.getToken();
    console.log('FCM token obtained');
    return token;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
}

/**
 * Delete FCM token
 * Useful for logout or when user disables notifications
 */
export async function deleteFCMToken(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('⚠️ FCM native module only available on Android');
    return false;
  }

  if (!FirebasePush) {
    console.error('❌ FirebasePush native module not found');
    return false;
  }

  try {
    const success = await FirebasePush.deleteToken();
    console.log('✅ FCM Token deleted');
    return success;
  } catch (error) {
    console.error('❌ Error deleting FCM token:', error);
    return false;
  }
}

export default {
  getFCMToken,
  deleteFCMToken,
};
