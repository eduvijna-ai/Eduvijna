/**
 * Durable, short-lived notification intent for signed-out / cold-start taps.
 *
 * No credentials or FCM token data are persisted. The destination is revalidated
 * against authenticated APIs before any assessment/results navigation.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  pendingIntentKey,
  type PendingNotificationIntent,
} from './pendingNotificationIntent';

export const MOBILE_PENDING_NOTIFICATION_KEY = '@eduvijna/push_pending_intent_v1';
export const MOBILE_PENDING_NOTIFICATION_MAX_AGE_MS = 30 * 60 * 1000;

export type StoredPendingNotification = {
  intent: PendingNotificationIntent;
  queuedAtIso: string;
};

function optionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : undefined;
}

export function normalizeStoredPendingNotification(
  raw: unknown,
  nowMs: number = Date.now(),
): StoredPendingNotification | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (!value.intent || typeof value.intent !== 'object') return null;
  const source = value.intent as Record<string, unknown>;
  const type = optionalText(source.type, 64);
  if (!type || !['general', 'quiz_assigned', 'quiz_graded', 'quiz_completed'].includes(type)) {
    return null;
  }
  if (typeof value.queuedAtIso !== 'string') return null;
  const queuedAt = Date.parse(value.queuedAtIso);
  if (!Number.isFinite(queuedAt) ||
      nowMs - queuedAt > MOBILE_PENDING_NOTIFICATION_MAX_AGE_MS ||
      queuedAt - nowMs > 60_000) {
    return null;
  }
  const intent: PendingNotificationIntent = {
    type,
    sessionId: optionalText(source.sessionId, 128),
    quizId: optionalText(source.quizId, 64),
    classroomId: optionalText(source.classroomId, 128),
    studentId: optionalText(source.studentId, 128),
    attemptId: optionalText(source.attemptId, 64),
    quizTitle: optionalText(source.quizTitle, 200),
    studentName: optionalText(source.studentName, 128),
    notificationId: optionalText(source.notificationId, 256),
    eventKey: optionalText(source.eventKey, 256),
  };
  return { intent, queuedAtIso: value.queuedAtIso };
}

export async function writeStoredPendingNotification(
  intent: PendingNotificationIntent,
): Promise<void> {
  const stored = normalizeStoredPendingNotification({
    intent,
    queuedAtIso: new Date().toISOString(),
  });
  if (!stored) return;
  await AsyncStorage.setItem(MOBILE_PENDING_NOTIFICATION_KEY, JSON.stringify(stored));
}

export async function readStoredPendingNotification(): Promise<PendingNotificationIntent | null> {
  try {
    const encoded = await AsyncStorage.getItem(MOBILE_PENDING_NOTIFICATION_KEY);
    if (!encoded) return null;
    const record = normalizeStoredPendingNotification(JSON.parse(encoded) as unknown);
    if (record) return record.intent;
  } catch {
    // Invalid / inaccessible storage is never interpreted as authorization.
  }
  await AsyncStorage.removeItem(MOBILE_PENDING_NOTIFICATION_KEY).catch(() => undefined);
  return null;
}

/** Do not erase a newer tap when completion of an older navigation races it. */
export async function clearStoredPendingNotification(expectedKey?: string): Promise<void> {
  if (expectedKey) {
    const existing = await readStoredPendingNotification();
    if (existing && pendingIntentKey(existing) !== expectedKey) return;
  }
  await AsyncStorage.removeItem(MOBILE_PENDING_NOTIFICATION_KEY);
}
