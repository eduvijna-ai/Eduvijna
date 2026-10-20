import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  readQuizSubmissionCheckpoint,
  writeQuizSubmissionCheckpoint,
  clearQuizSubmissionCheckpoint,
} from '../core/services/quizSubmissionCheckpoint';

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
});

describe('quizSubmissionCheckpoint', () => {
  it('isolates checkpoints by user quiz and session', async () => {
    await writeQuizSubmissionCheckpoint({
      userId: 'user-a',
      quizId: '9',
      sessionId: 'sess-1',
      attemptId: 1,
      startedAt: '2026-01-01T00:00:00.000Z',
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key.includes('user-a:9:sess-1')) {
        return JSON.stringify({
          userId: 'user-a',
          quizId: '9',
          sessionId: 'sess-1',
          attemptId: 1,
          startedAt: '2026-01-01T00:00:00.000Z',
        });
      }
      return null;
    });

    const match = await readQuizSubmissionCheckpoint('user-a', 9, 'sess-1');
    const otherUser = await readQuizSubmissionCheckpoint('user-b', 9, 'sess-1');

    expect(match?.attemptId).toBe(1);
    expect(otherUser).toBeNull();
  });

  it('clears checkpoint after successful persistence handoff', async () => {
    await clearQuizSubmissionCheckpoint('user-a', 9, 'sess-1');
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });
});
