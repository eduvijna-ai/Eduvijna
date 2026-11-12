/**
 * Normalize expo-notifications / FCM tap payloads into a flat routing map.
 *
 * Verified backend contracts (read-only):
 * - Assessment events: flat string fields (snake_case + camelCase duplicates)
 * - Self-test `/api/notifications/send-test`: `{ test: "true", self_test: "true" }`
 * - FCM Admin SDK stringifies all data values before send
 *
 * Also accepts nested `data` object / JSON-string wrappers when the outer
 * content.data envelope nests the routing map (observed iOS/expo envelopes).
 */

export type NotificationPayloadParseOutcome =
  | 'flat'
  | 'nested_data_object'
  | 'nested_data_json_string'
  | 'empty'
  | 'unusable';

export type NormalizedNotificationPayload = {
  data: Record<string, unknown>;
  /** Sanitized key names present after normalization (no values). */
  recognizedKeys: string[];
  parseOutcome: NotificationPayloadParseOutcome;
};

const ROUTING_KEY_ALIASES = [
  'type',
  'event_type',
  'eventType',
  'session_id',
  'sessionId',
  'quiz_id',
  'quizId',
  'student_id',
  'studentId',
  'classroom_id',
  'classroomId',
  'attempt_id',
  'attemptId',
  'quiz_title',
  'quizTitle',
  'student_name',
  'studentName',
  'topic',
  'screen',
  'test',
  'self_test',
  'selfTest',
  'announcement',
  'event_key',
  'eventKey',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function tryParseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function collectRecognizedKeys(data: Record<string, unknown>): string[] {
  const keys = Object.keys(data).filter((k) =>
    (ROUTING_KEY_ALIASES as readonly string[]).includes(k),
  );
  keys.sort();
  return keys;
}

/**
 * Flatten notification content.data into a routing-friendly record.
 */
export function normalizeNotificationPayload(raw: unknown): NormalizedNotificationPayload {
  if (raw == null) {
    return { data: {}, recognizedKeys: [], parseOutcome: 'empty' };
  }

  if (typeof raw === 'string') {
    const parsed = tryParseJsonObject(raw);
    if (!parsed) {
      return { data: {}, recognizedKeys: [], parseOutcome: 'unusable' };
    }
    return finalize(parsed, 'nested_data_json_string');
  }

  if (!isPlainObject(raw)) {
    return { data: {}, recognizedKeys: [], parseOutcome: 'unusable' };
  }

  let outcome: NotificationPayloadParseOutcome = 'flat';
  const merged: Record<string, unknown> = { ...raw };

  const nested = raw.data;
  if (isPlainObject(nested)) {
    Object.assign(merged, nested);
    outcome = 'nested_data_object';
  } else {
    const fromJson = tryParseJsonObject(nested);
    if (fromJson) {
      Object.assign(merged, fromJson);
      outcome = 'nested_data_json_string';
    }
  }

  // Drop the wrapper key once expanded so type/session lookups stay flat.
  if ('data' in merged && (isPlainObject(nested) || tryParseJsonObject(nested))) {
    delete merged.data;
  }

  if (Object.keys(merged).length === 0) {
    return { data: {}, recognizedKeys: [], parseOutcome: 'empty' };
  }

  return finalize(merged, outcome);
}

function finalize(
  data: Record<string, unknown>,
  parseOutcome: NotificationPayloadParseOutcome,
): NormalizedNotificationPayload {
  return {
    data,
    recognizedKeys: collectRecognizedKeys(data),
    parseOutcome,
  };
}

export function isGeneralNotificationMarker(data: Record<string, unknown>): boolean {
  const typeRaw = data.type ?? data.event_type ?? data.eventType;
  if (typeof typeRaw === 'string') {
    const t = typeRaw.trim().toLowerCase();
    if (
      t === 'general' ||
      t === 'announcement' ||
      t === 'class_announcement' ||
      t === 'class_announcements' ||
      t === 'test' ||
      t === 'self_test'
    ) {
      return true;
    }
  }

  const truthy = (v: unknown) => {
    if (v === true) return true;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes';
    }
    return false;
  };

  return truthy(data.test) || truthy(data.self_test) || truthy(data.selfTest);
}

export function hasAssessmentRoutingIdentifiers(data: Record<string, unknown>): boolean {
  const session =
    (typeof data.session_id === 'string' && data.session_id.trim()) ||
    (typeof data.sessionId === 'string' && data.sessionId.trim()) ||
    (typeof data.session_id === 'number' && Number.isFinite(data.session_id)) ||
    (typeof data.sessionId === 'number' && Number.isFinite(data.sessionId));
  const quiz =
    data.quiz_id != null && String(data.quiz_id).trim() !== ''
      ? true
      : data.quizId != null && String(data.quizId).trim() !== '';
  return Boolean(session || quiz);
}
