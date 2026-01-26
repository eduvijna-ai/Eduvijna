/**
 * Deep Link Handler Service
 * Handles incoming deep links for assessments across web and mobile platforms
 */

import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

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
    console.log('🔗 Parsing deep link:', url);

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
      
      console.log('✅ Parsed session ID:', sessionId);

      return {
        type: 'assessment',
        assessmentId,
        sessionId,
        classroomId,
        quizId,
      };
    }

    console.log('⚠️ No openquiz pattern found in URL');
    return { type: 'unknown' };
  } catch (error) {
    console.error('❌ Error parsing deep link:', error);
    return null;
  }
}

/**
 * Get the initial deep link URL when app is opened from a link
 */
export async function getInitialDeepLink(): Promise<string | null> {
  try {
    const url = await Linking.getInitialURL();
    console.log('🔗 Initial deep link URL:', url);
    return url;
  } catch (error) {
    console.error('❌ Error getting initial deep link:', error);
    return null;
  }
}

/**
 * Subscribe to deep link events while app is running
 */
export function subscribeToDeepLinks(
  handler: (data: DeepLinkData | null) => void
): () => void {
  const subscription = Linking.addEventListener('url', (event) => {
    console.log('🔗 Deep link received:', event.url);
    const data = parseDeepLink(event.url);
    handler(data);
  });

  return () => subscription.remove();
}

/**
 * Handle notification response and extract deep link data
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse
): DeepLinkData | null {
  const url = response.notification.request.content.data?.url;
  if (url && typeof url === 'string') {
    return parseDeepLink(url);
  }
  return null;
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
