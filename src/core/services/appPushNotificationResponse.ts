import { Alert, Platform } from 'react-native';
import { executeStudentAssignedQuizViewResults } from './assessmentQuizStart.service';
import { resolveStudentGradedAssignmentSession } from './gradedNotificationRouting.service';
import { handleOpenQuiz } from './openQuizHandler';
import { isAssignedQuizRecoveryProbeError } from './assignedQuizRecovery.service';
import { authorizeInstructorCompletionNotification, authorizeStudentAssignedNotification } from './assessmentNotificationAccess';
import { normalizeNotificationPayload } from '../navigation/normalizeNotificationPayload';
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

/** Structured, non-sensitive routing diagnostics only. */
function logNotificationRoutingDiag(info: {
  eventType: string | null;
  recognizedKeys: string[];
  parseOutcome: string;
  routingDecision: string;
  fallbackReason?: string;
  navigationReady: boolean;
  authenticated: boolean;
}): void {
  console.log('[push-nav]', {
    platform: Platform.OS,
    eventType: info.eventType,
    recognizedKeys: info.recognizedKeys,
    parseOutcome: info.parseOutcome,
    routingDecision: info.routingDecision,
    fallbackReason: info.fallbackReason,
    navigationReady: info.navigationReady,
    authenticated: info.authenticated,
  });
}

async function openStudentGradedResults(
  args: HandleAppPushNotificationResponseArgs,
  data: Record<string, unknown>,
): Promise<void> {
  const { navigation, user } = args;
  const studentId = asString(user?.id);
  const quizId = asString(data.quiz_id ?? data.quizId);
  const targetedStudentId = asString(data.student_id ?? data.studentId);

  if (
    !studentId || !quizId || isInstructorLike(user) ||
    (targetedStudentId && targetedStudentId !== studentId)
  ) {
    navigation.navigate('Assessments');
    return;
  }
  const resolution = await resolveStudentGradedAssignmentSession(
    studentId, quizId, {
      sessionId: asString(data.session_id ?? data.sessionId),
      classroomId: asString(data.classroom_id ?? data.classroomId),
    },
  );
  if (resolution.kind !== 'resolved') {
    logNotificationRoutingDiag({
      eventType: 'quiz_graded',
      recognizedKeys: Object.keys(data),
      parseOutcome: 'flat',
      routingDecision: 'Assessments',
      fallbackReason: resolution.kind === 'ambiguous'
        ? 'graded_assignment_ambiguous' : 'graded_assignment_not_verified',
      navigationReady: true,
      authenticated: true,
    });
    navigation.navigate('Assessments');
    return;
  }
  await executeStudentAssignedQuizViewResults(
    {
      studentId,
      quizId,
      sessionId: resolution.sessionId,
      classroomId: resolution.classroomId,
      quizName: asString(data.quiz_title ?? data.quizTitle) ?? undefined,
    },
    { navigation },
  );
}

async function openInstructorStudentResult(
  args: HandleAppPushNotificationResponseArgs,
  data: Record<string, unknown>,
): Promise<void> {
  const quizId = asString(data.quiz_id ?? data.quizId);
  const studentId = asString(data.student_id ?? data.studentId);
  const sessionId = asString(data.session_id ?? data.sessionId);
  const classroomId = asString(data.classroom_id ?? data.classroomId);
  if (!quizId || !studentId || !sessionId || !classroomId) {
    args.navigation.navigate('Assessments');
    return;
  }
  const access = await authorizeInstructorCompletionNotification({
    quizId, studentId, sessionId, classroomId,
  });
  if (access.kind !== 'authorized') {
    logNotificationRoutingDiag({
      eventType: 'quiz_completed',
      recognizedKeys: Object.keys(data),
      parseOutcome: 'flat',
      routingDecision: 'Assessments',
      fallbackReason: access.reason,
      navigationReady: true,
      authenticated: true,
    });
    args.navigation.navigate('Assessments');
    return;
  }
  args.navigation.navigate('QuizResultsScreen', {
    quizId: access.quizId,
    sessionId: access.sessionId,
    classroomId: access.classroomId,
    studentId,
    studentName: asString(data.student_name ?? data.studentName) ?? undefined,
    attemptId: asString(data.attempt_id ?? data.attemptId) ?? undefined,
    quizName: asString(data.quiz_title ?? data.quizTitle) ?? undefined,
    isTeacherView: true,
  });
}

function openGeneralNotifications(
  args: HandleAppPushNotificationResponseArgs,
  intent: PendingNotificationIntent,
  fallbackReason: string,
): void {
  const navigationReady = args.navigationReady !== false;
  logNotificationRoutingDiag({
    eventType: intent.type,
    recognizedKeys: intent.recognizedKeys ?? [],
    parseOutcome: intent.parseOutcome ?? 'flat',
    routingDecision:
      !args.isAuthenticated || !navigationReady ? 'queue_Notifications' : 'Notifications',
    fallbackReason,
    navigationReady,
    authenticated: args.isAuthenticated,
  });

  if (!args.isAuthenticated || !navigationReady) {
    queuePending(args, { ...intent, type: 'general' });
    args.processedIds.add(args.notificationId);
    return;
  }

  args.processedIds.add(args.notificationId);
  args.navigation.navigate('Notifications');
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

  const normalized = normalizeNotificationPayload(data);
  const flatData = normalized.data;

  const intent =
    intentFromNotificationData(flatData, notificationId) ||
    (asString(flatData.session_id ?? flatData.sessionId)
      ? {
          type: 'quiz_assigned',
          sessionId: asString(flatData.session_id ?? flatData.sessionId),
          notificationId,
          parseOutcome: normalized.parseOutcome,
          recognizedKeys: normalized.recognizedKeys,
        }
      : {
          type: 'general',
          notificationId,
          parseOutcome: normalized.parseOutcome,
          recognizedKeys: normalized.recognizedKeys,
        });

  const type = normalizeNotificationType(intent.type) || intent.type;
  // FCM identifiers vary across devices, but backend event_key is stable.
  const stableEventKey = intent.eventKey ? `event:${intent.eventKey}` : null;
  if (stableEventKey && processedIds.has(stableEventKey)) return;
  if (stableEventKey) processedIds.add(stableEventKey);

  // Ordinary general / self-test / announcement — never show incomplete-data alert.
  if (type === 'general') {
    openGeneralNotifications(args, intent, 'general_or_self_test_notification');
    return;
  }

  // Queue full intent until auth + navigation are ready (incl. graded / completion).
  if (!isAuthenticated || !navigationReady) {
    logNotificationRoutingDiag({
      eventType: type,
      recognizedKeys: intent.recognizedKeys ?? normalized.recognizedKeys,
      parseOutcome: intent.parseOutcome ?? normalized.parseOutcome,
      routingDecision: 'queue_pending_intent',
      fallbackReason: !isAuthenticated ? 'signed_out' : 'navigation_not_ready',
      navigationReady,
      authenticated: isAuthenticated,
    });
    queuePending(args, intent);
    // The full pending intent owns this navigation. Do not also trigger
    // the separate open-quiz post-login resume.
    if (!args.setPendingNotificationIntent && intent.sessionId) {
      setPendingSessionId(intent.sessionId);
    }
    processedIds.add(notificationId);
    return;
  }

  processedIds.add(notificationId);

  try {
    if (type === 'quiz_graded') {
      if (isInstructorLike(user)) {
        navigation.navigate('Assessments');
        return;
      }
      await openStudentGradedResults(args, intentToData(intent));
      return;
    }

    if (type === 'quiz_completed') {
      if (!isInstructorLike(user)) {
        logNotificationRoutingDiag({
          eventType: type,
          recognizedKeys: intent.recognizedKeys ?? normalized.recognizedKeys,
          parseOutcome: intent.parseOutcome ?? normalized.parseOutcome,
          routingDecision: 'Assessments',
          fallbackReason: 'completion_wrong_role_student',
          navigationReady,
          authenticated: isAuthenticated,
        });
        navigation.navigate('Assessments');
        return;
      }
      logNotificationRoutingDiag({
        eventType: type,
        recognizedKeys: intent.recognizedKeys ?? normalized.recognizedKeys,
        parseOutcome: intent.parseOutcome ?? normalized.parseOutcome,
        routingDecision: 'QuizResultsScreen_teacher',
        navigationReady,
        authenticated: isAuthenticated,
      });
      await openInstructorStudentResult(args, intentToData(intent));
      return;
    }

    if (type === 'quiz_assigned') {
      const sessionId = intent.sessionId;
      if (!sessionId || isInstructorLike(user) ||
          String(user?.role ?? '').toLowerCase() !== 'student') {
        navigation.navigate('Assessments');
        return;
      }
      const studentId = asString(user?.id);
      if (!studentId || (intent.studentId && intent.studentId !== studentId)) {
        navigation.navigate('Assessments');
        return;
      }
      const access = await authorizeStudentAssignedNotification({
        studentId, sessionId,
        quizId: intent.quizId,
        classroomId: intent.classroomId,
      });
      if (access.kind !== 'authorized') {
        logNotificationRoutingDiag({
          eventType: type,
          recognizedKeys: intent.recognizedKeys ?? normalized.recognizedKeys,
          parseOutcome: intent.parseOutcome ?? normalized.parseOutcome,
          routingDecision: 'Assessments',
          fallbackReason: access.reason,
          navigationReady,
          authenticated: isAuthenticated,
        });
        navigation.navigate('Assessments');
        return;
      }
      await handleOpenQuiz(access.sessionId, 'notification', user, {
        navigate: navigation.navigate,
        alert: Alert.alert,
      }, setPendingSessionId, { quizId: access.quizId });
      return;
    }

    // Unrecognized event types, even if session-bearing, must not bypass
    // explicit assessment authorization. Use a safe destination instead.

    // Unknown / incomplete assessment-like event without session → safe Notifications.
    logNotificationRoutingDiag({
      eventType: type,
      recognizedKeys: intent.recognizedKeys ?? normalized.recognizedKeys,
      parseOutcome: intent.parseOutcome ?? normalized.parseOutcome,
      routingDecision: 'Notifications',
      fallbackReason: 'unknown_or_incomplete_event',
      navigationReady,
      authenticated: isAuthenticated,
    });
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
