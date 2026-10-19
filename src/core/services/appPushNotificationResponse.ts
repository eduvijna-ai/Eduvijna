import { Alert } from 'react-native';
import { buildQuizGradedResultsNavigationParams } from './notificationNavigation';
import { executeStudentAssignedQuizViewResults } from './assessmentQuizStart.service';
import { resolveStudentGradedAssignmentSession } from './gradedNotificationRouting.service';
import { handleOpenQuiz } from './openQuizHandler';
import { isAssignedQuizRecoveryProbeError } from './assignedQuizRecovery.service';
import {
  intentFromNotificationData,
  intentToData,
  normalizeNotificationType,
  type PendingNotificationIntent,
} from '../navigation/pendingNotificationIntent';

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
  /** @deprecated prefer setPendingNotificationIntent — kept for open-quiz session queue */
  setPendingSessionId: (sessionId: string | null) => void;
  setPendingNotificationIntent?: (intent: PendingNotificationIntent | null) => void;
  /** When false, queue even if authenticated (nav/container not ready). Default true. */
  navigationReady?: boolean;
};

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function isInstructorLike(user: AppPushNotificationUser): boolean {
  const role = String(user?.role || '').toLowerCase();
  return (
    role === 'instructor' ||
    role === 'teacher' ||
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'administrator'
  );
}

function queuePending(
  args: HandleAppPushNotificationResponseArgs,
  intent: PendingNotificationIntent,
): void {
  if (args.setPendingNotificationIntent) {
    args.setPendingNotificationIntent(intent);
  } else if (intent.sessionId) {
    args.setPendingSessionId(intent.sessionId);
  }
}

async function openStudentGradedResults(
  args: HandleAppPushNotificationResponseArgs,
  data: Record<string, unknown>,
): Promise<void> {
  const { navigation, user } = args;
  const quizId = data.quiz_id ?? data.quizId;
  const sessionId = asString(data.session_id ?? data.sessionId);
  const studentId = asString(data.student_id ?? data.studentId) ?? asString(user?.id);
  const quizTitle = asString(data.quiz_title ?? data.quizTitle);

  let resolvedSessionId = sessionId;
  let classroomId = asString(data.classroom_id ?? data.classroomId);

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

  const effectiveClassroomId = classroomId || asString(data.classroom_id ?? data.classroomId);
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
}

function openInstructorStudentResult(
  args: HandleAppPushNotificationResponseArgs,
  data: Record<string, unknown>,
): void {
  const quizId = asString(data.quiz_id ?? data.quizId);
  const studentId = asString(data.student_id ?? data.studentId);
  const sessionId = asString(data.session_id ?? data.sessionId);
  const classroomId = asString(data.classroom_id ?? data.classroomId);
  const attemptId = asString(data.attempt_id ?? data.attemptId);
  const quizTitle = asString(data.quiz_title ?? data.quizTitle);
  const studentName = asString(data.student_name ?? data.studentName);

  if (!quizId || !studentId) {
    args.navigation.navigate('Assessments');
    return;
  }

  args.navigation.navigate('QuizResultsScreen', {
    quizId,
    sessionId: sessionId ?? undefined,
    classroomId: classroomId ?? undefined,
    studentId,
    studentName: studentName ?? undefined,
    attemptId: attemptId ?? undefined,
    quizName: quizTitle ?? undefined,
    isTeacherView: true,
  });
}

export async function handleAppPushNotificationResponse(
  args: HandleAppPushNotificationResponseArgs,
): Promise<void> {
  const {
    notificationId,
    data,
    isAuthenticated,
    user,
    processedIds,
    navigation,
    setPendingSessionId,
    navigationReady = true,
  } = args;

  if (processedIds.has(notificationId)) {
    return;
  }

  const intent =
    intentFromNotificationData(data, notificationId) ||
    (asString(data?.session_id ?? data?.sessionId)
      ? {
          type: 'quiz_assigned',
          sessionId: asString(data?.session_id ?? data?.sessionId),
          notificationId,
        }
      : null);

  if (!intent) {
    Alert.alert('Error', 'Notification data is incomplete. Please try again.');
    processedIds.add(notificationId);
    return;
  }

  const type = normalizeNotificationType(intent.type) || intent.type;

  // Queue full intent until auth + navigation are ready (incl. graded / completion).
  if (!isAuthenticated || !navigationReady) {
    queuePending(args, intent);
    if (intent.sessionId) {
      setPendingSessionId(intent.sessionId);
    }
    processedIds.add(notificationId);
    return;
  }

  processedIds.add(notificationId);

  try {
    if (type === 'quiz_graded') {
      // Graded results are student-facing; instructors tapping graded templates fall through to Assessments.
      if (isInstructorLike(user) && asString(data?.student_id ?? data?.studentId) &&
          asString(data?.student_id ?? data?.studentId) !== asString(user?.id)) {
        openInstructorStudentResult(args, intentToData(intent));
        return;
      }
      await openStudentGradedResults(args, intentToData(intent));
      return;
    }

    if (type === 'quiz_completed') {
      if (!isInstructorLike(user)) {
        // Wrong role for this event — avoid forcing student assessment take flow.
        navigation.navigate('Assessments');
        return;
      }
      openInstructorStudentResult(args, intentToData(intent));
      return;
    }

    if (type === 'quiz_assigned') {
      const sessionId = intent.sessionId;
      if (!sessionId) {
        navigation.navigate('Assessments');
        return;
      }
      if (isInstructorLike(user)) {
        // Assignment share is student-targeted; instructor opens Assessments inventory.
        navigation.navigate('Assessments');
        return;
      }
      await handleOpenQuiz(sessionId, 'notification', user, {
        navigate: navigation.navigate,
        alert: Alert.alert,
      }, setPendingSessionId);
      return;
    }

    // Fallback: session-bearing events
    if (intent.sessionId) {
      if (isInstructorLike(user) && type !== 'quiz_assigned') {
        navigation.navigate('Assessments');
        return;
      }
      await handleOpenQuiz(intent.sessionId, 'notification', user, {
        navigate: navigation.navigate,
        alert: Alert.alert,
      }, setPendingSessionId);
      return;
    }

    navigation.navigate('Notifications');
  } catch (error) {
    if (isAssignedQuizRecoveryProbeError(error)) {
      Alert.alert(
        'Could not open notification',
        error.message,
        [
          { text: 'Open Assessments', onPress: () => navigation.navigate('Assessments') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    console.error('notification handling failed:', error);
    Alert.alert(
      'Could not open',
      'Something went wrong opening this notification. You can retry from Assessments.',
      [
        { text: 'Open Assessments', onPress: () => navigation.navigate('Assessments') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }
}
