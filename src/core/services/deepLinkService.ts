/**
 * Deep Link Handler Service
 * Handles incoming deep links for assessments across web and mobile platforms
 */

import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { handleOpenQuiz } from './openQuizHandler';

export interface DeepLinkData {
  type: 'assessment' | 'unknown';
  assessmentId?: string;
  sessionId?: string;
  classroomId?: string;
  quizId?: string;
}

/**
 * Parse deep link URL to extract assessment data
 * Supports formats:
 * - eduvijna://openquiz?session_id=xxx
 * - https://ui.eduvijna.com/openquiz?session_id=xxx
 */
export function parseDeepLink(url: string): DeepLinkData | null {
  if (!url) return null;

  try {

    // Match /openquiz pattern
    const openQuizMatch = url.match(/\/openquiz/);
    
    if (openQuizMatch) {
      // Parse query parameters
      const urlObj = new URL(url.replace('eduvijna://', 'https://temp.com/'));
      const sessionId = urlObj.searchParams.get('session_id') || undefined;
      const classroomId = urlObj.searchParams.get('classroom_id') || undefined;
      const quizId = urlObj.searchParams.get('quiz_id') || undefined;
      
      // Use session_id as assessmentId for compatibility
      const assessmentId = sessionId || 'unknown';

      return {
        type: 'assessment',
        assessmentId,
        sessionId,
        classroomId,
        quizId,
      };
    }

    return { type: 'unknown' };
  } catch (error) {
    console.error('❌ Error parsing deep link:', error);
    return null;
  }
}

/**
 * Get the initial deep link URL when app is opened from a link
 * This can only be called once per app launch
 */
let initialUrlPromise: Promise<string | null> | null = null;

export async function getInitialDeepLink(): Promise<string | null> {
  // Prevent multiple concurrent calls to getInitialURL()
  if (initialUrlPromise) {
    console.log('🚫 getInitialDeepLink already called, returning cached promise');
    return initialUrlPromise;
  }
  
  initialUrlPromise = (async () => {
    try {
      const url = await Linking.getInitialURL();
      return url;
    } catch (error) {
      console.error('❌ Error getting initial deep link:', error);
      return null;
    }
  })();
  
  return initialUrlPromise;
}

/**
 * Subscribe to deep link events while app is running
 */
export function subscribeToDeepLinks(
  handler: (data: DeepLinkData | null) => void
): () => void {
  const subscription = Linking.addEventListener('url', (event) => {
    const data = parseDeepLink(event.url);
    handler(data);
  });

  return () => subscription.remove();
}

/**
 * Simplified handleNotificationResponse
 * Directly calls handleOpenQuiz for quiz navigation.
 */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  user: any,
  navigationHelpers: any
): Promise<void> {
  const sessionId = response.notification.request.content.data?.sessionId;

  if (!sessionId) {
    console.log('❌ No sessionId found in notification data');
    return;
  }

  if (!user) {
    console.log('❌ User not logged in');
    return;
  }

  try {
    const navigationAdapter = { 
      navigate: (screen: string, params?: any) => {
        navigationHelpers.setActiveScreen(screen);
        navigationHelpers.setNavigationParams(params || {});
      }, 
      alert: (title: string, message: string, buttons?: any[]) => {
        // For web notifications, perhaps show alert
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(`${title}: ${message}`);
        }
      }
    };
    await handleOpenQuiz(sessionId, 'notification', user, navigationAdapter);
  } catch (error) {
    console.error('❌ Error handling notification response:', error);
  }
}

/**
 * Build assessment deep link URL
 */
export function buildAssessmentLink(params: {
  sessionId: string;
  classroomId?: string;
  quizId?: string;
}): string {
  const baseUrl = 'https://ui.eduvijna.com';
  const queryParams = new URLSearchParams();
  
  queryParams.append('session_id', params.sessionId);
  if (params.classroomId) queryParams.append('classroom_id', params.classroomId);
  if (params.quizId) queryParams.append('quiz_id', params.quizId);
  
  return `${baseUrl}/openquiz?${queryParams.toString()}`;
}

/**
 * Build app store URLs for fallback
 */
export function getAppStoreUrls() {
  return {
    ios: 'https://apps.apple.com/app/eduvijna/id123456789', // Replace with actual App Store ID
    android: 'https://play.google.com/store/apps/details?id=com.eduvijna.app',
  };
}
