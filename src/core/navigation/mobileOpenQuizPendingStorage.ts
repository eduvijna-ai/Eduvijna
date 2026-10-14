import AsyncStorage from '@react-native-async-storage/async-storage';

export const MOBILE_OPEN_QUIZ_PENDING_STORAGE_KEY = '@eduvijna/mobile_open_quiz_pending_v1';

/** Pending deep-link destinations expire; credentials are never stored here. */
export const MOBILE_OPEN_QUIZ_PENDING_MAX_AGE_MS = 72 * 60 * 60 * 1000;

export type StoredOpenQuizPending = {
  sessionId: string;
  quizId?: string;
  source: string;
  queuedAtIso: string;
};

export function normalizeStoredOpenQuizPending(
  raw: unknown,
  nowMs: number = Date.now(),
): StoredOpenQuizPending | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const sessionId = record.sessionId;
  if (typeof sessionId !== 'string' || !sessionId.trim()) return null;
  const quizId = record.quizId;
  const source = record.source;
  if (typeof source !== 'string' || !source.trim()) return null;
  const queuedAtIso = record.queuedAtIso;
  if (typeof queuedAtIso !== 'string' || !queuedAtIso.trim()) return null;
  const queuedAt = Date.parse(queuedAtIso);
  if (!Number.isFinite(queuedAt)) return null;
  if (nowMs - queuedAt > MOBILE_OPEN_QUIZ_PENDING_MAX_AGE_MS) return null;
  if (nowMs - queuedAt < -60_000) return null;
  return {
    sessionId: sessionId.trim(),
    quizId: typeof quizId === 'string' && quizId.trim() ? quizId.trim() : undefined,
    source: source.trim(),
    queuedAtIso,
  };
}

export async function readStoredOpenQuizPending(): Promise<StoredOpenQuizPending | null> {
  try {
    const raw = await AsyncStorage.getItem(MOBILE_OPEN_QUIZ_PENDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeStoredOpenQuizPending(parsed);
    if (!normalized) {
      await AsyncStorage.removeItem(MOBILE_OPEN_QUIZ_PENDING_STORAGE_KEY);
    }
    return normalized;
  } catch {
    await AsyncStorage.removeItem(MOBILE_OPEN_QUIZ_PENDING_STORAGE_KEY).catch(() => undefined);
    return null;
  }
}

export async function writeStoredOpenQuizPending(value: StoredOpenQuizPending): Promise<void> {
  const normalized = normalizeStoredOpenQuizPending(value, Date.parse(value.queuedAtIso));
  if (!normalized) return;
  await AsyncStorage.setItem(MOBILE_OPEN_QUIZ_PENDING_STORAGE_KEY, JSON.stringify(normalized));
}

export async function clearStoredOpenQuizPending(): Promise<void> {
  await AsyncStorage.removeItem(MOBILE_OPEN_QUIZ_PENDING_STORAGE_KEY);
}
