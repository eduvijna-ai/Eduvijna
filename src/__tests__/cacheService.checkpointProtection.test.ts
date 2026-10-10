import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  readQuizSubmissionCheckpoint,
  writeQuizSubmissionCheckpoint,
} from '../core/services/quizSubmissionCheckpoint';

const {
  isProtectedAsyncStorageKey,
  PROTECTED_ASYNC_STORAGE_PREFIXES,
  setCachedData,
} = jest.requireActual('../core/services/cacheService') as typeof import('../core/services/cacheService');

const store: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => store[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    store[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete store[key];
  });
  if (!AsyncStorage.getAllKeys) {
    (AsyncStorage as { getAllKeys: jest.Mock }).getAllKeys = jest.fn();
  }
  if (!AsyncStorage.multiRemove) {
    (AsyncStorage as { multiRemove: jest.Mock }).multiRemove = jest.fn();
  }
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(store));
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    for (const key of keys) {
      delete store[key];
    }
  });
});

describe('cacheService checkpoint protection', () => {
  it('marks assigned quiz checkpoint keys as protected', () => {
    const sample = `${PROTECTED_ASYNC_STORAGE_PREFIXES[0]}user:1:2:sess`;
    expect(isProtectedAsyncStorageKey(sample)).toBe(true);
    expect(isProtectedAsyncStorageKey('eduvijna:cache:dashboard')).toBe(false);
  });

  it('preserves immutable checkpoint payload across read/write', async () => {
    const checkpoint = {
      userId: 'student-1',
      quizId: '42',
      sessionId: 'sess-a',
      attemptId: 7,
      startedAt: '2026-01-01T00:00:00.000Z',
      immutable: {
        version: 1,
        userId: 'student-1',
        quizId: '42',
        sessionId: 'sess-a',
        selectedAnswers: { 0: 'A' },
        scorePercent: 80,
        questionCount: 1,
        logData: { '0': { answer: 'A' } },
        startedAt: '2026-01-01T00:00:00.000Z',
        finalizedAt: '2026-01-01T00:05:00.000Z',
      },
    };
    await writeQuizSubmissionCheckpoint(checkpoint);
    const raw = await AsyncStorage.getItem(
      'eduvijna:assigned_quiz_checkpoint:student-1:42:sess-a',
    );
    expect(raw).toContain('"scorePercent":80');
    const loaded = await readQuizSubmissionCheckpoint('student-1', 42, 'sess-a');
    expect(loaded?.immutable?.scorePercent).toBe(80);
  });

  it('keeps checkpoint keys when cache reclaim runs under storage pressure', async () => {
    const checkpointKey = 'eduvijna:assigned_quiz_checkpoint:student-1:42:sess-a';
    await AsyncStorage.setItem(
      checkpointKey,
      JSON.stringify({ immutable: { scorePercent: 80 } }),
    );
    const oldCacheKey = 'eduvijna:old-cache-entry';
    await AsyncStorage.setItem(
      oldCacheKey,
      JSON.stringify({ data: {}, timestamp: 1, ttl: 300 }),
    );
    await AsyncStorage.setItem(
      'eduvijna:newer-cache-entry',
      JSON.stringify({ data: {}, timestamp: Date.now(), ttl: 300 }),
    );

    let failPressureWriteOnce = true;
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      if (key === 'eduvijna:pressure-test' && failPressureWriteOnce) {
        failPressureWriteOnce = false;
        throw new Error('database or disk is full');
      }
      store[key] = value;
    });

    await setCachedData('pressure-test', { ok: true }, 300, 'TEST');

    expect(store[checkpointKey]).toContain('scorePercent');
    expect(store[oldCacheKey]).toBeUndefined();
  });
});
