/**
 * Scoped recovery checkpoint for assigned quiz submission (user + quiz + session).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QuizSubmissionCheckpoint {
  userId: string;
  quizId: string;
  sessionId: string;
  attemptId: number;
  startedAt: string;
  /** Attempt PUT succeeded but submission POST may still be pending */
  attemptUpdated?: boolean;
}

const KEY_PREFIX = 'eduvijna:assigned_quiz_checkpoint:';

function checkpointKey(userId: string, quizId: string, sessionId: string): string {
  return `${KEY_PREFIX}${userId}:${quizId}:${sessionId}`;
}

export async function readQuizSubmissionCheckpoint(
  userId: string,
  quizId: string | number,
  sessionId: string,
): Promise<QuizSubmissionCheckpoint | null> {
  const raw = await AsyncStorage.getItem(
    checkpointKey(userId, String(quizId), sessionId),
  );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as QuizSubmissionCheckpoint;
    if (
      parsed.userId === userId &&
      parsed.quizId === String(quizId) &&
      parsed.sessionId === sessionId &&
      typeof parsed.attemptId === 'number'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeQuizSubmissionCheckpoint(
  checkpoint: QuizSubmissionCheckpoint,
): Promise<void> {
  await AsyncStorage.setItem(
    checkpointKey(checkpoint.userId, checkpoint.quizId, checkpoint.sessionId),
    JSON.stringify(checkpoint),
  );
}

export async function clearQuizSubmissionCheckpoint(
  userId: string,
  quizId: string | number,
  sessionId: string,
): Promise<void> {
  await AsyncStorage.removeItem(checkpointKey(userId, String(quizId), sessionId));
}
