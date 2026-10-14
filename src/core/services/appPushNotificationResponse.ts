import { Alert } from 'react-native';
import { buildQuizGradedResultsNavigationParams } from './notificationNavigation';
import { executeStudentAssignedQuizViewResults } from './assessmentQuizStart.service';
import { resolveStudentGradedAssignmentSession } from './gradedNotificationRouting.service';
import { handleOpenQuiz } from './openQuizHandler';
import { isAssignedQuizRecoveryProbeError } from './assignedQuizRecovery.service';

export type AppPushNotificationUser = {
  id?: string | number;
  role?: string;
} | null;

export type AppPushNavigation = {
  navigate: (screen: string, params?: unknown) => void;
};

export type HandleAppPushNotificationResponseArgs = {
  notificationId: string;
  data: Record<string, unknown> | undefined;
  isAuthenticated: boolean;
  user: AppPushNotificationUser;
  processedIds: Set<string>;
  navigation: AppPushNavigation;
  setPendingSessionId: (sessionId: string | null) => void;
};

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export async function handleAppPushNotificationResponse(
  args: HandleAppPushNotificationResponseArgs,
): Promise<void> {
  const { notificationId, data, isAuthenticated, user, processedIds, navigation, setPendingSessionId } =
    args;

  if (processedIds.has(notificationId)) {
    return;
  }

  const type = asString(data?.type);
  const quizId = data?.quiz_id ?? data?.quizId;
  const sessionId = asString(data?.session_id ?? data?.sessionId);
  const studentId = asString(data?.student_id ?? data?.studentId) ?? asString(user?.id);
  const quizTitle = asString(data?.quiz_title ?? data?.quizTitle);

  if (type === 'quiz_graded') {
    processedIds.add(notificationId);
    try {
      let resolvedSessionId = sessionId;
      let classroomId = asString(data?.classroom_id ?? data?.classroomId);

      if (!resolvedSessionId && quizId != null && studentId) {
        const resolution = await resolveStudentGradedAssignmentSession(String(studentId), quizId);
        if (resolution.kind === 'ambiguous') {
          navigation.navigate('Assessments');
          return;
        }
        if (resolution.kind === 'resolved') {
          resolvedSessionId = resolution.sessionId;
          classroomId = resolution.classroomId;
        }
      }

      const resultParams = buildQuizGradedResultsNavigationParams({
        quiz_id: quizId,
        session_id: resolvedSessionId,
        student_id: studentId,
        quiz_title: quizTitle,
      });

      if (!resultParams || !resolvedSessionId || quizId == null || !studentId) {
        navigation.navigate('Assessments');
        return;
      }

      const effectiveClassroomId = classroomId || asString(data?.classroom_id ?? data?.classroomId);
      if (!effectiveClassroomId) {
        navigation.navigate('Assessments');
        return;
      }

      await executeStudentAssignedQuizViewResults(
        {
          studentId: String(studentId),
          quizId,
          sessionId: String(resolvedSessionId),
          classroomId: String(effectiveClassroomId),
          quizName: typeof resultParams.quizName === 'string' ? resultParams.quizName : quizTitle,
        },
        { navigation },
      );
    } catch (error) {
      if (isAssignedQuizRecoveryProbeError(error)) {
        Alert.alert(
          'Could not open results',
          error.message,
          [
            { text: 'Open Assessments', onPress: () => navigation.navigate('Assessments') },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        return;
      }
      console.error('quiz_graded notification handling failed:', error);
      navigation.navigate('Assessments');
    }
    return;
  }

  if (!sessionId) {
    Alert.alert('Error', 'Notification data is incomplete. Please try again.');
    processedIds.add(notificationId);
    return;
  }

  if (!isAuthenticated) {
    setPendingSessionId(sessionId);
    processedIds.add(notificationId);
    return;
  }

  processedIds.add(notificationId);
  try {
    await handleOpenQuiz(sessionId, 'notification', user, {
      navigate: navigation.navigate,
      alert: Alert.alert,
    }, setPendingSessionId);
  } catch (error) {
    if (isAssignedQuizRecoveryProbeError(error)) {
      Alert.alert(
        'Could not open quiz',
        error.message,
        [
          { text: 'Open Assessments', onPress: () => navigation.navigate('Assessments') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    throw error;
  }
}
