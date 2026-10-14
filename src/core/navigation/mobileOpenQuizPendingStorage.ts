import AsyncStorage from '@react-native-async-storage/async-storage';

export const MOBILE_OPEN_QUIZ_PENDING_STORAGE_KEY = '@eduvijna/mobile_open_quiz_pending_v1';

export type StoredOpenQuizPending = {
  sessionId: string;
  quizId?: string;
  source: string;
  queuedAtIso: string;
};

export async function readStoredOpenQuizPending(): Promise<StoredOpenQuizPending | null> {
  try {
    const raw = await AsyncStorage.getItem(MOBILE_OPEN_QUIZ_PENDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredOpenQuizPending;
    if (!parsed?.sessionId || typeof parsed.sessionId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeStoredOpenQuizPending(value: StoredOpenQuizPending): Promise<void> {
  await AsyncStorage.setItem(MOBILE_OPEN_QUIZ_PENDING_STORAGE_KEY, JSON.stringify(value));
}

export async function clearStoredOpenQuizPending(): Promise<void> {
  await AsyncStorage.removeItem(MOBILE_OPEN_QUIZ_PENDING_STORAGE_KEY);
}
