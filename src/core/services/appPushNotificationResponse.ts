import { Alert, Platform } from 'react-native';
import { buildQuizGradedResultsNavigationParams } from './notificationNavigation';
import { executeStudentAssignedQuizViewResults } from './assessmentQuizStart.service';
import { resolveStudentGradedAssignmentSession } from './gradedNotificationRouting.service';
import { handleOpenQuiz } from './openQuizHandler';
import { isAssignedQuizRecoveryProbeError } from './assignedQuizRecovery.service';
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
  const quizId = data.quiz_id ?? data.quizId;
  const sessionId = asString(data.session_id ?? data.sessionId);
  const studentId = asString(data.student_id ?? data.studentId) ?? asString(user?.id);
  const quizTitle = asString(data.quiz_title ?? data.quizTitle);

  let resolvedSessionId = sessionId;
  let classroomId = asString(data.classroom_id ?? data.classroomId);

  if (!resolvedSessionId && quizId != null && studentId) {
    const resolution = await resolveStudentGradedAssignmentSession(String(studentId), quizId);
    if (resolution.kind === 'ambiguous') {
      logNotificationRoutingDiag({
        eventType: 'quiz_graded',
        recognizedKeys: Object.keys(data),
        parseOutcome: 'flat',
        routingDecision: 'Assessments',
        fallbackReason: 'graded_assignment_ambiguous',
        navigationReady: true,
        authenticated: true,
      });
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
    logNotificationRoutingDiag({
      eventType: 'quiz_graded',
      recognizedKeys: Object.keys(data),
      parseOutcome: 'flat',
      routingDecision: 'Assessments',
      fallbackReason: 'graded_missing_routing_identifiers',
      navigationReady: true,
      authenticated: true,
    });
    navigation.navigate('Assessments');
    return;
  }

  const effectiveClassroomId = classroomId || asString(data.classroom_id ?? data.classroomId);
  if (!effectiveClassroomId) {
    logNotificationRoutingDiag({
      eventType: 'quiz_graded',
      recognizedKeys: Object.keys(data),
      parseOutcome: 'flat',
      routingDecision: 'Assessments',
      fallbackReason: 'graded_missing_classroom_id',
      navigationReady: true,
      authenticated: true,
    });
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
    logNotificationRoutingDiag({
      eventType: asString(data.type),
      recognizedKeys: Object.keys(data),
      parseOutcome: 'flat',
      routingDecision: 'Assessments',
      fallbackReason: 'instructor_result_missing_quiz_or_student',
      navigationReady: true,
      authenticated: true,
    });
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
      if (
        isInstructorLike(user) &&
        asString(flatData.student_id ?? flatData.studentId) &&
        asString(flatData.student_id ?? flatData.studentId) !== asString(user?.id)
      ) {
        logNotificationRoutingDiag({
          eventType: type,
          recognizedKeys: intent.recognizedKeys ?? normalized.recognizedKeys,
          parseOutcome: intent.parseOutcome ?? normalized.parseOutcome,
          routingDecision: 'QuizResultsScreen_teacher',
          navigationReady,
          authenticated: isAuthenticated,
        });
        openInstructorStudentResult(args, intentToData(intent));
        return;
      }
      logNotificationRoutingDiag({
        eventType: type,
        recognizedKeys: intent.recognizedKeys ?? normalized.recognizedKeys,
        parseOutcome: intent.parseOutcome ?? normalized.parseOutcome,
        routingDecision: 'student_graded_results',
        navigationReady,
        authenticated: isAuthenticated,
      });
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
      openInstructorStudentResult(args, intentToData(intent));
      return;
    }

    if (type === 'quiz_assigned') {
      const sessionId = intent.sessionId;
      if (!sessionId) {
        logNotificationRoutingDiag({
          eventType: type,
          recognizedKeys: intent.recognizedKeys ?? normalized.recognizedKeys,
          parseOutcome: intent.parseOutcome ?? normalized.parseOutcome,
          routingDecision: 'Assessments',
          fallbackReason: 'assigned_missing_session_id',
          navigationReady,
          authenticated: isAuthenticated,
        });
        navigation.navigate('Assessments');
        return;
      }
      if (isInstructorLike(user)) {
        logNotificationRoutingDiag({
          eventType: type,
          recognizedKeys: intent.recognizedKeys ?? normalized.recognizedKeys,
          parseOutcome: intent.parseOutcome ?? normalized.parseOutcome,
          routingDecision: 'Assessments',
          fallbackReason: 'assigned_instructor_role',
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
        routingDecision: 'handleOpenQuiz',
        navigationReady,
        authenticated: isAuthenticated,
      });
      await handleOpenQuiz(sessionId, 'notification', user, {
        navigate: navigation.navigate,
        alert: Alert.alert,
      }, setPendingSessionId);
      return;
    }

    // Fallback: session-bearing events
    if (intent.sessionId) {
      if (isInstructorLike(user) && type !== 'quiz_assigned') {
        logNotificationRoutingDiag({
          eventType: type,
          recognizedKeys: intent.recognizedKeys ?? normalized.recognizedKeys,
          parseOutcome: intent.parseOutcome ?? normalized.parseOutcome,
          routingDecision: 'Assessments',
          fallbackReason: 'session_bearing_instructor',
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
        routingDecision: 'handleOpenQuiz',
        fallbackReason: 'session_bearing_unknown_type',
        navigationReady,
        authenticated: isAuthenticated,
      });
      await handleOpenQuiz(intent.sessionId, 'notification', user, {
        navigate: navigation.navigate,
        alert: Alert.alert,
      }, setPendingSessionId);
      return;
    }

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
