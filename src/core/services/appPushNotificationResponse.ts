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

/**
 * Terminal outcomes clear durable pending intents.
 * `retryable` keeps storage so a later tap / cold start can retry.
 */
export type AppPushHandleOutcome =
  | 'navigated'
  | 'queued'
  | 'denied'
  | 'ignored'
  | 'retryable';

export type AppPushHandleResult = {
  outcome: AppPushHandleOutcome;
};

function asString(value: unknown): string | null {
  // Align with payload scrubbing: backend may stringify Python None as "None".
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || ['none', 'null', 'undefined'].includes(trimmed.toLowerCase())) {
      return null;
    }
    return trimmed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asOptionalAttemptId(value: unknown): number | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
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

function isRetryableAccessReason(reason: string | undefined): boolean {
  return !!reason && reason.endsWith('_lookup_unavailable');
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

function markTerminalProcessed(
  processedIds: Set<string>,
  notificationId: string,
  stableEventKey: string | null,
): void {
  processedIds.add(notificationId);
  if (stableEventKey) processedIds.add(stableEventKey);
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
): Promise<AppPushHandleResult> {
  const { navigation, user } = args;
  const studentId = asString(user?.id);
  const quizId = asString(data.quiz_id ?? data.quizId);
  const targetedStudentId = asString(data.student_id ?? data.studentId);

  if (
    !studentId || !quizId ||
    String(user?.role ?? '').toLowerCase() !== 'student' ||
    (targetedStudentId && targetedStudentId !== studentId)
  ) {
    navigation.navigate('Assessments');
    return { outcome: 'denied' };
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
    return { outcome: 'denied' };
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
  return { outcome: 'navigated' };
}

async function openInstructorStudentResult(
  args: HandleAppPushNotificationResponseArgs,
  data: Record<string, unknown>,
): Promise<AppPushHandleResult> {
  const quizId = asString(data.quiz_id ?? data.quizId);
  const studentId = asString(data.student_id ?? data.studentId);
  const sessionId = asString(data.session_id ?? data.sessionId);
  const classroomId = asString(data.classroom_id ?? data.classroomId);
  if (!quizId || !studentId || !sessionId || !classroomId) {
    args.navigation.navigate('Assessments');
    return { outcome: 'denied' };
  }
  const access = await authorizeInstructorCompletionNotification({
    quizId, studentId, sessionId, classroomId,
  });
  if (access.kind !== 'authorized') {
    logNotificationRoutingDiag({
      eventType: 'quiz_completed',
      recognizedKeys: Object.keys(data),
      parseOutcome: 'flat',
      routingDecision: isRetryableAccessReason(access.reason) ? 'retryable' : 'Assessments',
      fallbackReason: access.reason,
      navigationReady: true,
      authenticated: true,
    });
    if (isRetryableAccessReason(access.reason)) {
      Alert.alert(
        'Could not open notification',
        'Assessment details are temporarily unavailable. Please try again shortly.',
      );
      return { outcome: 'retryable' };
    }
    args.navigation.navigate('Assessments');
    return { outcome: 'denied' };
  }
  args.navigation.navigate('QuizResultsScreen', {
    quizId: access.quizId,
    sessionId: access.sessionId,
    classroomId: access.classroomId,
    studentId,
    studentName: asString(data.student_name ?? data.studentName) ?? undefined,
    attemptId: asOptionalAttemptId(data.attempt_id ?? data.attemptId),
    quizName: asString(data.quiz_title ?? data.quizTitle) ?? undefined,
    isTeacherView: true,
  });
  return { outcome: 'navigated' };
}

function openGeneralNotifications(
  args: HandleAppPushNotificationResponseArgs,
  intent: PendingNotificationIntent,
  fallbackReason: string,
): AppPushHandleResult {
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
    return { outcome: 'queued' };
  }

  args.processedIds.add(args.notificationId);
  args.navigation.navigate('Notifications');
  return { outcome: 'navigated' };
}

export async function handleAppPushNotificationResponse(
  args: HandleAppPushNotificationResponseArgs,
): Promise<AppPushHandleResult> {
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
    return { outcome: 'ignored' };
  }

  const normalized = normalizeNotificationPayload(data);
  const flatData = normalized.data;

  const intent: PendingNotificationIntent =
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
  if (stableEventKey && processedIds.has(stableEventKey)) {
    return { outcome: 'ignored' };
  }
  // Do NOT consume the event key until navigation succeeds or access is
  // definitively denied. Soft/lookup failures must remain retryable, including
  // post-login resume of the same persisted backend key.

  // Ordinary general / self-test / announcement — never show incomplete-data alert.
  if (type === 'general') {
    return openGeneralNotifications(args, intent, 'general_or_self_test_notification');
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
    return { outcome: 'queued' };
  }

  try {
    if (type === 'quiz_graded') {
      if (isInstructorLike(user)) {
        navigation.navigate('Assessments');
        markTerminalProcessed(processedIds, notificationId, stableEventKey);
        return { outcome: 'denied' };
      }
      const graded = await openStudentGradedResults(args, intentToData(intent));
      if (graded.outcome === 'navigated' || graded.outcome === 'denied') {
        markTerminalProcessed(processedIds, notificationId, stableEventKey);
      }
      return graded;
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
        markTerminalProcessed(processedIds, notificationId, stableEventKey);
        return { outcome: 'denied' };
      }
      logNotificationRoutingDiag({
        eventType: type,
        recognizedKeys: intent.recognizedKeys ?? normalized.recognizedKeys,
        parseOutcome: intent.parseOutcome ?? normalized.parseOutcome,
        routingDecision: 'QuizResultsScreen_teacher',
        navigationReady,
        authenticated: isAuthenticated,
      });
      const completion = await openInstructorStudentResult(args, intentToData(intent));
      if (completion.outcome === 'navigated' || completion.outcome === 'denied') {
        markTerminalProcessed(processedIds, notificationId, stableEventKey);
      }
      return completion;
    }

    if (type === 'quiz_assigned') {
      const sessionId = intent.sessionId;
      if (!sessionId || isInstructorLike(user) ||
          String(user?.role ?? '').toLowerCase() !== 'student') {
        navigation.navigate('Assessments');
        markTerminalProcessed(processedIds, notificationId, stableEventKey);
        return { outcome: 'denied' };
      }
      const studentId = asString(user?.id);
      if (!studentId || (intent.studentId && intent.studentId !== studentId)) {
        navigation.navigate('Assessments');
        markTerminalProcessed(processedIds, notificationId, stableEventKey);
        return { outcome: 'denied' };
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
          routingDecision: isRetryableAccessReason(access.reason) ? 'retryable' : 'Assessments',
          fallbackReason: access.reason,
          navigationReady,
          authenticated: isAuthenticated,
        });
        if (isRetryableAccessReason(access.reason)) {
          Alert.alert(
            'Could not open notification',
            'Assignment details are temporarily unavailable. Please try again shortly.',
          );
          return { outcome: 'retryable' };
        }
        navigation.navigate('Assessments');
        markTerminalProcessed(processedIds, notificationId, stableEventKey);
        return { outcome: 'denied' };
      }
      const openQuizUser =
        user && user.id != null
          ? { id: String(user.id), role: String(user.role ?? '') }
          : null;
      await handleOpenQuiz(
        access.sessionId,
        'notification',
        openQuizUser,
        {
          navigate: navigation.navigate,
          alert: Alert.alert,
        },
        setPendingSessionId,
        { quizId: access.quizId },
      );
      markTerminalProcessed(processedIds, notificationId, stableEventKey);
      return { outcome: 'navigated' };
    }

    // Unrecognized event types, even if session-bearing, must not bypass
    // explicit assessment authorization. Use a safe destination instead.
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
    markTerminalProcessed(processedIds, notificationId, stableEventKey);
    return { outcome: 'navigated' };
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
      return { outcome: 'retryable' };
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
    return { outcome: 'retryable' };
  }
}
