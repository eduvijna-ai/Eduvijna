import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isProtectedAsyncStorageKey,
  PROTECTED_ASYNC_STORAGE_PREFIXES,
} from '../core/services/cacheService';
import {
  readQuizSubmissionCheckpoint,
  writeQuizSubmissionCheckpoint,
} from '../core/services/quizSubmissionCheckpoint';

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
});
