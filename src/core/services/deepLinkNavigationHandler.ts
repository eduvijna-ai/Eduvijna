/**
 * Deep Link Navigation Handler
 * Coordinates navigation based on deep link data and user role
 */

import { DeepLinkData } from './deepLinkService';
import { getQuizBySessionId } from './sharedApi';

export interface NavigationHandler {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
}

/**
 * Handle assessment deep link navigation
 * Routes to appropriate screen based on user role and available data
 */
export async function handleAssessmentNavigation(
  deepLinkData: DeepLinkData,
  userRole: 'student' | 'instructor' | 'admin' | undefined,
  navigation: NavigationHandler
): Promise<void> {
  if (deepLinkData.type !== 'assessment' || !deepLinkData.assessmentId) {
    console.warn('⚠️ Invalid assessment deep link data');
    return;
  }

  console.log('📱 Handling assessment navigation:', {
    assessmentId: deepLinkData.assessmentId,
    role: userRole,
    hasSessionId: !!deepLinkData.sessionId,
  });

  try {
    // If we have sessionId, fetch quiz data and navigate to QuizTakingScreen
    if (deepLinkData.sessionId) {
      console.log('🔄 Fetching quiz data for session:', deepLinkData.sessionId);
      
      const quizData = await getQuizBySessionId(deepLinkData.sessionId);
      
      if (quizData.success && quizData.quiz_data) {
        // Transform questions from API format
        const transformedQuestions = quizData.quiz_data.questions?.quizzes?.map((q: any, index: number) => ({
          id: (index + 1).toString(),
          question: q.quiz?.question || q.question || '',
          options: q.quiz?.options || q.options || [],
          correctAnswer: q.quiz?.answer || q.answer || '',
          explanation: q.explanation || null,
        })) || [];

        const quizParams = {
          quizId: deepLinkData.quizId || quizData.quiz_data.quiz_id,
          sessionId: deepLinkData.sessionId,
          classroomId: deepLinkData.classroomId,
          quizData: {
            quiz_id: quizData.quiz_data.quiz_id,
            session_id: deepLinkData.sessionId,
            classroom_id: deepLinkData.classroomId,
            title: quizData.quiz_data.topic || 'Assessment',
            questions: transformedQuestions,
            duration: quizData.quiz_data.duration,
            has_time_limit: quizData.quiz_data.has_time_limit,
          },
          showShareButton: false,
          showActionButtons: true,
        };

        console.log('✅ Navigating to QuizTakingScreen with', transformedQuestions.length, 'questions');
        navigation.navigate('QuizTakingScreen', quizParams);
        return;
      }
    }

    // Fallback: Navigate to Assessments screen and let user find the quiz
    console.log('📋 Navigating to Assessments screen');
    navigation.navigate('Assessments', {
      highlightAssessmentId: deepLinkData.assessmentId,
    });
  } catch (error) {
    console.error('❌ Error handling assessment navigation:', error);
    // Fallback to Assessments screen on error
    navigation.navigate('Assessments', {
      error: 'Failed to load assessment. Please try again.',
    });
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
