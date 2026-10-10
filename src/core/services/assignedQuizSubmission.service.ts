/**
 * Assigned assessment submission orchestration (session_id → class_id / classroom_id).
 *
 * Server-side exactly-once submission is not guaranteed; client guards reduce duplicate
 * concurrent POSTs but cannot prevent duplicate attempt rows if the API creates side-effect
 * attempts on quiz-submissions.
 */

import {
  createQuizAttempt,
  createQuizSubmission,
  updateQuizAttempt,
} from './sharedApi';
import {
  listQuizAttempts,
  selectAttemptForSubmission,
  QuizAttemptLookupError,
} from './quizAttemptApi';
import { getAttendedQuiz } from './quizResultRetrieval.service';
import {
  clearQuizSubmissionCheckpoint,
  QUIZ_SUBMISSION_CHECKPOINT_VERSION,
  readQuizSubmissionCheckpoint,
  writeQuizSubmissionCheckpoint,
  type QuizSubmissionImmutablePayload,
} from './quizSubmissionCheckpoint';
import { buildAssignedQuizLogData } from '../utils/quizLogDataBuilder';
import { invalidateStudentQuizCaches } from './studentQuizCacheInvalidation';
import type { PlayableQuizQuestion } from '../utils/answerMappingUtils';

export class AssignedQuizSubmissionInProgressError extends Error {
  constructor() {
    super('Submission already in progress');
    this.name = 'AssignedQuizSubmissionInProgressError';
  }
}

export class AssignedQuizSubmissionError extends Error {
  readonly phase: 'validation' | 'attempt' | 'attempt_update' | 'submission';

  constructor(
    message: string,
    phase: 'validation' | 'attempt' | 'attempt_update' | 'submission',
  ) {
    super(message);
    this.name = 'AssignedQuizSubmissionError';
    this.phase = phase;
  }
}

const inFlightKeys = new Set<string>();

function submissionKey(studentId: string, quizId: string | number, sessionId: string): string {
  return `${studentId}:${quizId}:${sessionId}`;
}

export interface SubmitAssignedQuizInput {
  quizId: number | string;
  studentId: string;
  sessionId: string;
  questions: PlayableQuizQuestion[];
  selectedAnswers: Record<number, string>;
  startedAtIso: string;
  scorePercent: number;
  questionCount: number;
  questionResults: Record<number, boolean>;
  classroomId?: string | null;
}

export interface SubmitAssignedQuizResult {
  attemptId: number;
  alreadySubmitted: boolean;
}

async function hasPersistedSubmission(
  studentId: string,
  sessionId: string,
  quizId: number | string,
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
    throw error;
  }
}

function assertCheckpointOwner(
  checkpoint: Awaited<ReturnType<typeof readQuizSubmissionCheckpoint>>,
  studentId: string,
): void {
  if (!checkpoint) return;
  if (checkpoint.userId !== studentId) {
    throw new AssignedQuizSubmissionError(
      'Submission checkpoint belongs to a different account',
      'validation',
    );
  }
  if (checkpoint.immutable && checkpoint.immutable.userId !== studentId) {
    throw new AssignedQuizSubmissionError(
      'Submission checkpoint belongs to a different account',
      'validation',
    );
  }
}

async function ensureAttemptId(input: SubmitAssignedQuizInput): Promise<number> {
  const checkpoint = await readQuizSubmissionCheckpoint(
    input.studentId,
    input.quizId,
    input.sessionId,
  );
  assertCheckpointOwner(checkpoint, input.studentId);

  if (checkpoint?.attemptUpdated && checkpoint.attemptId) {
    return checkpoint.attemptId;
  }

  const attempts = await listQuizAttempts({
    quiz_id: input.quizId,
    student_id: input.studentId,
    class_id: input.sessionId,
  });

  const existing = selectAttemptForSubmission(attempts, checkpoint?.attemptId);
  if (existing) {
    await writeQuizSubmissionCheckpoint({
      userId: input.studentId,
      quizId: String(input.quizId),
      sessionId: input.sessionId,
      attemptId: existing.id,
      startedAt: input.startedAtIso,
    });
    return existing.id;
  }

  try {
    const created = await createQuizAttempt({
      quiz_id: input.quizId,
      student_id: input.studentId,
      class_id: input.sessionId,
      attempt_number: 1,
      status: 'started',
      started_at: input.startedAtIso,
    });
    await writeQuizSubmissionCheckpoint({
      userId: input.studentId,
      quizId: String(input.quizId),
      sessionId: input.sessionId,
      attemptId: created.id,
      startedAt: input.startedAtIso,
    });
    return created.id;
  } catch (createError: unknown) {
    const attemptsAfter = await listQuizAttempts({
      quiz_id: input.quizId,
      student_id: input.studentId,
      class_id: input.sessionId,
    });
    const recovered = selectAttemptForSubmission(attemptsAfter, checkpoint?.attemptId);
    if (recovered) {
      return recovered.id;
    }
    throw new AssignedQuizSubmissionError(
      createError instanceof Error ? createError.message : 'Failed to create quiz attempt',
      'attempt',
    );
  }
}

/**
 * Persist assigned quiz answers: attempt update + quiz-submissions log_data.
 */
export async function submitAssignedQuiz(
  input: SubmitAssignedQuizInput,
): Promise<SubmitAssignedQuizResult> {
  if (!input.studentId || !input.quizId || !input.sessionId) {
    throw new AssignedQuizSubmissionError(
      'Missing student, quiz, or assignment session',
      'validation',
    );
  }

  const lockKey = submissionKey(input.studentId, input.quizId, input.sessionId);
  if (inFlightKeys.has(lockKey)) {
    throw new AssignedQuizSubmissionInProgressError();
  }
  inFlightKeys.add(lockKey);

  try {
    const already = await hasPersistedSubmission(
      input.studentId,
      input.sessionId,
      input.quizId,
    );
    if (already) {
      const checkpoint = await readQuizSubmissionCheckpoint(
        input.studentId,
        input.quizId,
        input.sessionId,
      );
      await clearQuizSubmissionCheckpoint(input.studentId, input.quizId, input.sessionId);
      await invalidateStudentQuizCaches({
        classroomId: input.classroomId,
        sessionId: input.sessionId,
      });
      return {
        attemptId: checkpoint?.attemptId ?? 0,
        alreadySubmitted: true,
      };
    }

    let checkpoint = await readQuizSubmissionCheckpoint(
      input.studentId,
      input.quizId,
      input.sessionId,
    );
    assertCheckpointOwner(checkpoint, input.studentId);

    const completedAt = new Date().toISOString();
    const timeSpent = Math.max(
      0,
      Math.floor(
        (new Date(completedAt).getTime() - new Date(input.startedAtIso).getTime()) / 1000,
      ),
    );

    let attemptId: number;
    if (checkpoint?.attemptUpdated && checkpoint.attemptId) {
      attemptId = checkpoint.attemptId;
    } else {
      attemptId = await ensureAttemptId(input);
      checkpoint = await readQuizSubmissionCheckpoint(
        input.studentId,
        input.quizId,
        input.sessionId,
      );
    }

    const log_data =
      checkpoint?.immutable?.logData ??
      buildAssignedQuizLogData({
        questions: input.questions,
        selectedAnswers: input.selectedAnswers,
        questionCount: input.questionCount,
        timeSpentSeconds: timeSpent,
        attemptId,
        scorePercent: checkpoint?.immutable?.scorePercent ?? input.scorePercent,
        questionResults: input.questionResults,
      });

    const scoreToPersist = checkpoint?.immutable?.scorePercent ?? input.scorePercent;

    if (!checkpoint?.immutable) {
      const immutable: QuizSubmissionImmutablePayload = {
        version: QUIZ_SUBMISSION_CHECKPOINT_VERSION,
        userId: input.studentId,
        quizId: String(input.quizId),
        sessionId: input.sessionId,
        selectedAnswers: input.selectedAnswers,
        scorePercent: input.scorePercent,
        questionCount: input.questionCount,
        logData: log_data,
        startedAt: input.startedAtIso,
        finalizedAt: completedAt,
      };
      await writeQuizSubmissionCheckpoint({
        userId: input.studentId,
        quizId: String(input.quizId),
        sessionId: input.sessionId,
        attemptId,
        startedAt: input.startedAtIso,
        immutable,
        persistenceStep: 'immutable_saved',
      });
      checkpoint = await readQuizSubmissionCheckpoint(
        input.studentId,
        input.quizId,
        input.sessionId,
      );
    }

    if (!checkpoint?.attemptUpdated) {
      try {
        await updateQuizAttempt(attemptId, {
          score: scoreToPersist,
          status: 'completed',
          completed_at: completedAt,
          time_spent_seconds: timeSpent,
        });
      } catch (updateError: unknown) {
        throw new AssignedQuizSubmissionError(
          updateError instanceof Error
            ? updateError.message
            : 'Failed to update quiz attempt',
          'attempt_update',
        );
      }

      await writeQuizSubmissionCheckpoint({
        userId: input.studentId,
        quizId: String(input.quizId),
        sessionId: input.sessionId,
        attemptId,
        startedAt: input.startedAtIso,
        attemptUpdated: true,
        immutable: checkpoint?.immutable,
        persistenceStep: 'attempt_updated',
      });
    }

    try {
      await createQuizSubmission({
        quiz_id: input.quizId,
        student_id: input.studentId,
        classroom_id: input.sessionId,
        score: scoreToPersist,
        summary: 'Auto-scored client-side',
        log_data,
        submitted_at: completedAt,
      });
    } catch (submissionError: unknown) {
      throw new AssignedQuizSubmissionError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Failed to save quiz submission',
        'submission',
      );
    }

    await clearQuizSubmissionCheckpoint(input.studentId, input.quizId, input.sessionId);
    await invalidateStudentQuizCaches({
      classroomId: input.classroomId,
      sessionId: input.sessionId,
    });

    return { attemptId, alreadySubmitted: false };
  } finally {
    inFlightKeys.delete(lockKey);
  }
}

export { QuizAttemptLookupError };
