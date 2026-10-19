/**
 * Queued notification-tap / deep-link destination that survives login and nav readiness.
 * Session ID alone is insufficient for graded / completion events.
 */

export type PendingNotificationIntent = {
  type: string;
  sessionId?: string | null;
  quizId?: string | null;
  studentId?: string | null;
  classroomId?: string | null;
  attemptId?: string | null;
  quizTitle?: string | null;
  studentName?: string | null;
  /** Expo / FCM request identifier for dedupe while processing. */
  notificationId?: string | null;
};

export function normalizeNotificationType(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const t = raw.trim().toLowerCase();
  if (t === 'quiz_assigned' || t === 'new_quiz') return 'quiz_assigned';
  if (t === 'quiz_graded' || t === 'grade_update') return 'quiz_graded';
  if (t === 'quiz_completed' || t === 'student_completed' || t === 'quiz_submission') {
    return 'quiz_completed';
  }
  return t;
}

export function intentFromNotificationData(
  data: Record<string, unknown> | undefined,
  notificationId?: string | null,
): PendingNotificationIntent | null {
  if (!data) return null;
  const type = normalizeNotificationType(data.type ?? data.event_type);
  const sessionId = asOptionalString(data.session_id ?? data.sessionId);
  const quizId = asOptionalString(data.quiz_id ?? data.quizId);
  if (!type && !sessionId && !quizId) return null;

  return {
    type: type || (sessionId ? 'quiz_assigned' : 'general'),
    sessionId,
    quizId,
    studentId: asOptionalString(data.student_id ?? data.studentId),
    classroomId: asOptionalString(data.classroom_id ?? data.classroomId),
    attemptId: asOptionalString(data.attempt_id ?? data.attemptId),
    quizTitle: asOptionalString(data.quiz_title ?? data.quizTitle ?? data.topic),
    studentName: asOptionalString(data.student_name ?? data.studentName),
    notificationId: notificationId ?? null,
  };
}

export function intentToData(intent: PendingNotificationIntent): Record<string, unknown> {
  return {
    type: intent.type,
    session_id: intent.sessionId ?? undefined,
    quiz_id: intent.quizId ?? undefined,
    student_id: intent.studentId ?? undefined,
    classroom_id: intent.classroomId ?? undefined,
    attempt_id: intent.attemptId ?? undefined,
    quiz_title: intent.quizTitle ?? undefined,
    student_name: intent.studentName ?? undefined,
  };
}

function asOptionalString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export function canProcessPendingNotificationIntent(input: {
  isAuthenticated: boolean;
  hasUser: boolean;
  navigationReady: boolean;
  navigationContainerReady: boolean;
  intent: PendingNotificationIntent | null;
  inFlightKey: string | null;
}): PendingNotificationIntent | null {
  if (
    !input.isAuthenticated ||
    !input.hasUser ||
    !input.navigationReady ||
    !input.navigationContainerReady ||
    !input.intent
  ) {
    return null;
  }
  const key = pendingIntentKey(input.intent);
  if (input.inFlightKey && input.inFlightKey === key) {
    return null;
  }
  return input.intent;
}

export function pendingIntentKey(intent: PendingNotificationIntent): string {
  return [
    intent.type,
    intent.sessionId ?? '',
    intent.quizId ?? '',
    intent.studentId ?? '',
    intent.attemptId ?? '',
    intent.notificationId ?? '',
  ].join('|');
}
