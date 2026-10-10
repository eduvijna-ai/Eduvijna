/**
 * Scoped recovery checkpoint for assigned quiz submission (user + quiz + session).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const QUIZ_SUBMISSION_CHECKPOINT_VERSION = 1;

export type QuizSubmissionPersistenceStep =
  | 'attempt_ready'
  | 'immutable_saved'
  | 'attempt_updated'
  | 'submission_posted';

export interface QuizSubmissionImmutablePayload {
  version: typeof QUIZ_SUBMISSION_CHECKPOINT_VERSION;
  userId: string;
  quizId: string;
  sessionId: string;
  selectedAnswers: Record<number, string>;
  scorePercent: number;
  questionCount: number;
  logData: Record<string, unknown>;
  startedAt: string;
  finalizedAt: string;
}

export interface QuizSubmissionCheckpoint {
  userId: string;
  quizId: string;
  sessionId: string;
  attemptId: number;
  startedAt: string;
  attemptUpdated?: boolean;
  immutable?: QuizSubmissionImmutablePayload;
  persistenceStep?: QuizSubmissionPersistenceStep;
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
