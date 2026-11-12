/**
 * Queued notification-tap / deep-link destination that survives login and nav readiness.
 * Session ID alone is insufficient for graded / completion events.
 */

import {
  normalizeNotificationPayload,
  type NotificationPayloadParseOutcome,
} from './normalizeNotificationPayload';

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
  /** Stable backend event dedupe key, when present. */
  eventKey?: string | null;
  /** Sanitized parse metadata for diagnostics (no payload values). */
  parseOutcome?: NotificationPayloadParseOutcome;
  recognizedKeys?: string[];
};

export function normalizeNotificationType(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const t = raw.trim().toLowerCase();
  if (t === 'quiz_assigned' || t === 'new_quiz') return 'quiz_assigned';
  if (t === 'quiz_graded' || t === 'grade_update') return 'quiz_graded';
  if (t === 'quiz_completed' || t === 'student_completed' || t === 'quiz_submission') {
    return 'quiz_completed';
  }
  if (
    t === 'general' ||
    t === 'announcement' ||
    t === 'class_announcement' ||
    t === 'class_announcements' ||
    t === 'test' ||
    t === 'self_test'
  ) {
    return 'general';
  }
  return t;
}

export function intentFromNotificationData(
  data: Record<string, unknown> | undefined,
  notificationId?: string | null,
): PendingNotificationIntent | null {
  const normalized = normalizeNotificationPayload(data);
  const flat = normalized.data;

  const type = normalizeNotificationType(flat.type ?? flat.event_type ?? flat.eventType);
  const sessionId = asOptionalString(flat.session_id ?? flat.sessionId);
  const quizId = asOptionalString(flat.quiz_id ?? flat.quizId);

  const meta = {
    parseOutcome: normalized.parseOutcome,
    recognizedKeys: normalized.recognizedKeys,
  };

  if (!type && !sessionId && !quizId) {
    // Self-test / announcement / empty routing → general Notifications destination.
    // Backend `/send-test` sends only `{ test, self_test }` — never alert incomplete-data.
    return {
      type: 'general',
      notificationId: notificationId ?? null,
      eventKey: asOptionalString(flat.event_key ?? flat.eventKey),
      ...meta,
    };
  }

  return {
    type: type || (sessionId ? 'quiz_assigned' : 'general'),
    sessionId,
    quizId,
    studentId: asOptionalString(flat.student_id ?? flat.studentId),
    classroomId: asOptionalString(flat.classroom_id ?? flat.classroomId),
    attemptId: asOptionalString(flat.attempt_id ?? flat.attemptId),
    quizTitle: asOptionalString(flat.quiz_title ?? flat.quizTitle ?? flat.topic),
    studentName: asOptionalString(flat.student_name ?? flat.studentName),
    notificationId: notificationId ?? null,
    eventKey: asOptionalString(flat.event_key ?? flat.eventKey),
    ...meta,
  };
}

export function intentToData(intent: PendingNotificationIntent): Record<string, unknown> {
  return {
    type: intent.type,
    event_key: intent.eventKey ?? undefined,
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
  // The backend's FCM serializer uses str(value), so absent Python None
  // sometimes arrives as the literal "None" instead of an omitted ID.
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || ['none', 'null', 'undefined'].includes(trimmed.toLowerCase())) return null;
    return trimmed;
  }
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
    intent.eventKey ?? intent.notificationId ?? '',
  ].join('|');
}
