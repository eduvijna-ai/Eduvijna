/**
 * Typed quiz-attempt list/create helpers for assigned assessments.
 */

import { apiClient } from '../api/config';
import type { QuizAttemptRecord } from '../types/attendedQuiz.types';

export class QuizAttemptLookupError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'QuizAttemptLookupError';
    this.cause = cause;
  }
}

function isAxiosLike(error: unknown): error is { response?: { status?: number }; message?: string } {
  return typeof error === 'object' && error !== null && 'response' in error;
}

export async function listQuizAttempts(params: {
  quiz_id: number | string;
  student_id: string;
  class_id: string;
}): Promise<QuizAttemptRecord[]> {
  const query = new URLSearchParams({
    quiz_id: String(params.quiz_id),
    student_id: params.student_id,
    class_id: params.class_id,
  });

  try {
    const response = await apiClient.get(`/api/v1/dashboard/quiz-attempts?${query.toString()}`);
    if (!Array.isArray(response.data)) {
      throw new QuizAttemptLookupError('Quiz attempts response was not an array');
    }
    return response.data as QuizAttemptRecord[];
  } catch (error: unknown) {
    if (error instanceof QuizAttemptLookupError) throw error;
    throw new QuizAttemptLookupError(
      isAxiosLike(error) ? error.message ?? 'Failed to load quiz attempts' : 'Failed to load quiz attempts',
      error,
    );
  }
}

/**
 * Pick the attempt row to update for this submission.
 * Prefers checkpoint id, then earliest in-progress attempt (avoids phantom post-submit rows).
 */
export function selectAttemptForSubmission(
  attempts: QuizAttemptRecord[],
  checkpointAttemptId?: number,
): QuizAttemptRecord | undefined {
  if (attempts.length === 0) return undefined;

  if (checkpointAttemptId != null) {
    const fromCheckpoint = attempts.find((a) => a.id === checkpointAttemptId);
    if (fromCheckpoint) return fromCheckpoint;
  }

  const started = attempts
    .filter((a) => a.status === 'started')
    .sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    );
  if (started.length > 0) return started[0];

  const completed = attempts
    .filter((a) => a.status === 'completed')
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? b.started_at).getTime() -
        new Date(a.completed_at ?? a.started_at).getTime(),
    );
  return completed[0];
}
