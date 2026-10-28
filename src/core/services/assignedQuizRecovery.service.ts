/**
 * Pending assigned-quiz submission recovery (local checkpoint vs server persistence).
 */

import { readQuizSubmissionCheckpoint, type QuizSubmissionCheckpoint } from './quizSubmissionCheckpoint';
import { getAttendedQuiz } from './quizResultRetrieval.service';

export class AssignedQuizRecoveryProbeError extends Error {
  readonly code = 'RECOVERY_PROBE_FAILED';
  readonly retryable = true;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AssignedQuizRecoveryProbeError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export function isAssignedQuizRecoveryProbeError(
  error: unknown,
): error is AssignedQuizRecoveryProbeError {
  return error instanceof AssignedQuizRecoveryProbeError;
}

export async function isSubmissionPersistedOnServer(
  studentId: string,
  sessionId: string,
  quizId: string | number,
): Promise<boolean> {
  try {
    const attended = await getAttendedQuiz({
      student_id: studentId,
      session_id: sessionId,
      quiz_id: quizId,
    });
    const answers = attended.log_data?.answers;
    const hasAnswers =
      (Array.isArray(answers) && answers.length > 0) ||
      (attended.items?.length ?? 0) > 0;
    return Boolean(attended.submitted_at || hasAnswers);
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return false;
    throw new AssignedQuizRecoveryProbeError(
      'Could not verify whether this assignment was already submitted. Please try again.',
      error,
    );
  }
}

export function isPendingSubmissionCheckpoint(
  checkpoint: QuizSubmissionCheckpoint | null,
): checkpoint is QuizSubmissionCheckpoint & {
  immutable: NonNullable<QuizSubmissionCheckpoint['immutable']>;
} {
  return Boolean(checkpoint?.immutable);
}

/**
 * Returns a pending checkpoint when local immutable payload exists but server submission does not.
 */
export async function findPendingSubmissionCheckpoint(
  studentId: string,
  quizId: string | number,
  sessionId: string,
): Promise<QuizSubmissionCheckpoint | null> {
  if (!studentId || !sessionId || !quizId) return null;

  const checkpoint = await readQuizSubmissionCheckpoint(studentId, quizId, sessionId);
  if (!isPendingSubmissionCheckpoint(checkpoint)) {
    return null;
  }
  if (checkpoint.immutable.userId !== studentId) {
    return null;
  }

  const persisted = await isSubmissionPersistedOnServer(studentId, sessionId, quizId);
  if (persisted) {
    return null;
  }

  return checkpoint;
}

export type AssignedQuizRecoveryMode = 'resume' | 'immutable_retry';

export interface AssignedQuizRecoveryResumeParams {
  quizId: string | number;
  sessionId: string;
  classroomId?: string | null;
  selectedAnswers: Record<number, string>;
  startedAtIso: string;
  scorePercent: number;
  questionCount: number;
  attemptId?: number;
  /** Immutable local submit not yet on server — read-only answers, explicit retry only. */
  mode: AssignedQuizRecoveryMode;
}

export function buildRecoveryResumeParams(
  checkpoint: QuizSubmissionCheckpoint,
): AssignedQuizRecoveryResumeParams | null {
  if (!checkpoint.immutable) return null;
  return {
    quizId: checkpoint.quizId,
    sessionId: checkpoint.sessionId,
    selectedAnswers: checkpoint.immutable.selectedAnswers,
    startedAtIso: checkpoint.immutable.startedAt,
    scorePercent: checkpoint.immutable.scorePercent,
    questionCount: checkpoint.immutable.questionCount,
    attemptId: checkpoint.attemptId,
    mode: 'immutable_retry',
  };
}
