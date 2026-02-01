/**
 * Deep Link Navigation Handler
 * Coordinates navigation based on deep link data and user role
 * Now uses unified openQuizHandler for consistency
 */

import { Alert } from 'react-native';
import { DeepLinkData } from './deepLinkService';
import { handleOpenQuiz } from './openQuizHandler';

export interface NavigationHandler {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
}

/**
 * Simplified handleAssessmentNavigation
 * Removed navigation logic and directly calls handleOpenQuiz.
 */
export async function handleAssessmentNavigation(
  deepLinkData: DeepLinkData,
  _userRole: 'student' | 'instructor' | 'admin' | undefined, // Kept for API compatibility but not used
  _navigation: NavigationHandler, // No longer used
  user: any = null
): Promise<void> {
  if (deepLinkData.type !== 'assessment' || !deepLinkData.sessionId) {
    return;
  }

  if (!user) {
    return;
  }

  try {
    // Directly call handleOpenQuiz
    const navigationAdapter = { 
      navigate: (screen: string, params?: any) => console.log('Navigate to', screen, params), 
      alert: Alert.alert 
    };
    await handleOpenQuiz(
      deepLinkData.sessionId,
      'deep_link',
      user,
      navigationAdapter
    );
  } catch (error) {
    // Error already handled by handleOpenQuiz
    return;
  }
}

/**
 * Determine if user should access assessment based on role
 */
export function canAccessAssessment(
  userRole: 'student' | 'instructor' | 'admin' | undefined
): boolean {
  // All roles can access assessments
  // Teachers/admins can view any assessment
  // Students can take assigned assessments
  return !!userRole;
}
