/**
 * Assigned assessment submission orchestration (session_id → class_id / classroom_id).
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
import {
  fetchPersistedQuizResult,
  type QuizResultLoadState,
} from './quizResultRetrieval.service';
import { isSubmissionPersistedOnServer } from './assignedQuizRecovery.service';
import {
  clearQuizSubmissionCheckpoint,
  QUIZ_SUBMISSION_CHECKPOINT_VERSION,
  readQuizSubmissionCheckpoint,
  writeQuizSubmissionCheckpoint,
  type QuizSubmissionCheckpoint,
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
  persistedResult?: Extract<QuizResultLoadState, { status: 'ready' }>;
}

function assertCheckpointOwner(
  checkpoint: QuizSubmissionCheckpoint | null,
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

function mergeCheckpointWrite(
  base: QuizSubmissionCheckpoint | null | undefined,
  patch: Partial<QuizSubmissionCheckpoint>,
): QuizSubmissionCheckpoint {
  if (!base) {
    if (
      !patch.userId ||
      !patch.quizId ||
      !patch.sessionId ||
      patch.attemptId == null ||
      !patch.startedAt
    ) {
      throw new AssignedQuizSubmissionError(
        'Submission checkpoint missing during persistence',
        'validation',
      );
    }
    return patch as QuizSubmissionCheckpoint;
  }
  return {
    ...base,
    ...patch,
    immutable: patch.immutable ?? base.immutable,
    persistenceStep: patch.persistenceStep ?? base.persistenceStep,
    attemptUpdated: patch.attemptUpdated ?? base.attemptUpdated,
  };
}

async function ensureAttemptId(
  input: SubmitAssignedQuizInput,
  checkpoint: QuizSubmissionCheckpoint | null,
): Promise<number> {
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
    await writeQuizSubmissionCheckpoint(
      mergeCheckpointWrite(
        checkpoint ?? {
          userId: input.studentId,
          quizId: String(input.quizId),
          sessionId: input.sessionId,
          attemptId: existing.id,
          startedAt: input.startedAtIso,
        },
        {
          attemptId: existing.id,
          startedAt: checkpoint?.immutable?.startedAt ?? input.startedAtIso,
        },
      ),
    );
    return existing.id;
  }

  try {
    const created = await createQuizAttempt({
      quiz_id: input.quizId,
      student_id: input.studentId,
      class_id: input.sessionId,
      attempt_number: 1,
      status: 'started',
      started_at: checkpoint?.immutable?.startedAt ?? input.startedAtIso,
    });
    await writeQuizSubmissionCheckpoint(
      mergeCheckpointWrite(
        checkpoint ?? {
          userId: input.studentId,
          quizId: String(input.quizId),
          sessionId: input.sessionId,
          attemptId: created.id,
          startedAt: input.startedAtIso,
        },
        {
          attemptId: created.id,
          startedAt: checkpoint?.immutable?.startedAt ?? input.startedAtIso,
          persistenceStep: checkpoint?.persistenceStep ?? 'attempt_ready',
        },
      ),
    );
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

function resolvePersistenceFromCheckpoint(
  checkpoint: QuizSubmissionCheckpoint | null,
  input: SubmitAssignedQuizInput,
  attemptId: number,
): {
  log_data: Record<string, unknown>;
  scoreToPersist: number;
  completedAt: string;
  timeSpent: number;
} {
  if (checkpoint?.immutable) {
    const immutable = checkpoint.immutable;
    const log_data = immutable.logData;
    const timeSpent =
      typeof log_data.time_spent_seconds === 'number'
        ? log_data.time_spent_seconds
        : Math.max(
            0,
            Math.floor(
              (new Date(immutable.finalizedAt).getTime() -
                new Date(immutable.startedAt).getTime()) /
                1000,
            ),
          );
    return {
      log_data,
      scoreToPersist: immutable.scorePercent,
      completedAt: immutable.finalizedAt,
      timeSpent,
    };
  }

  const completedAt = new Date().toISOString();
  const timeSpent = Math.max(
    0,
    Math.floor(
      (new Date(completedAt).getTime() - new Date(input.startedAtIso).getTime()) / 1000,
    ),
  );
  const log_data = buildAssignedQuizLogData({
    questions: input.questions,
    selectedAnswers: input.selectedAnswers,
    questionCount: input.questionCount,
    timeSpentSeconds: timeSpent,
    attemptId,
    scorePercent: input.scorePercent,
    questionResults: input.questionResults,
  });

  return {
    log_data,
    scoreToPersist: input.scorePercent,
    completedAt,
    timeSpent,
  };
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
    let already: boolean;
    try {
      already = await isSubmissionPersistedOnServer(
        input.studentId,
        input.sessionId,
        input.quizId,
      );
    } catch (probeError: unknown) {
      throw new AssignedQuizSubmissionError(
        probeError instanceof Error
          ? probeError.message
          : 'Could not verify whether this assignment was already submitted',
        'validation',
      );
    }
    if (already) {
      await clearQuizSubmissionCheckpoint(input.studentId, input.quizId, input.sessionId);
      await invalidateStudentQuizCaches({
        classroomId: input.classroomId,
        sessionId: input.sessionId,
      });
      const persisted = await fetchPersistedQuizResult({
        quizId: input.quizId,
        sessionId: input.sessionId,
        studentId: input.studentId,
        isTeacherView: false,
      });
      if (persisted.status !== 'ready') {
        throw new AssignedQuizSubmissionError(
          'Quiz already submitted but persisted result could not be loaded',
          'validation',
        );
      }
      return {
        attemptId: 0,
        alreadySubmitted: true,
        persistedResult: persisted,
      };
    }

    let checkpoint = await readQuizSubmissionCheckpoint(
      input.studentId,
      input.quizId,
      input.sessionId,
    );
    assertCheckpointOwner(checkpoint, input.studentId);

    let attemptId: number;
    if (checkpoint?.attemptUpdated && checkpoint.attemptId) {
      attemptId = checkpoint.attemptId;
    } else {
      attemptId = await ensureAttemptId(input, checkpoint);
      checkpoint = await readQuizSubmissionCheckpoint(
        input.studentId,
        input.quizId,
        input.sessionId,
      );
      assertCheckpointOwner(checkpoint, input.studentId);
    }

    let { log_data, scoreToPersist, completedAt, timeSpent } =
      resolvePersistenceFromCheckpoint(checkpoint, input, attemptId);

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
      await writeQuizSubmissionCheckpoint(
        mergeCheckpointWrite(
          checkpoint ?? {
            userId: input.studentId,
            quizId: String(input.quizId),
            sessionId: input.sessionId,
            attemptId,
            startedAt: input.startedAtIso,
          },
          {
            attemptId,
            immutable,
            persistenceStep: 'immutable_saved',
          },
        ),
      );
      checkpoint = await readQuizSubmissionCheckpoint(
        input.studentId,
        input.quizId,
        input.sessionId,
      );
      ({ log_data, scoreToPersist, completedAt, timeSpent } = resolvePersistenceFromCheckpoint(
        checkpoint,
        input,
        attemptId,
      ));
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

      const attemptUpdatedCheckpoint = mergeCheckpointWrite(checkpoint, {
        userId: input.studentId,
        quizId: String(input.quizId),
        sessionId: input.sessionId,
        attemptId,
        startedAt: checkpoint?.startedAt ?? input.startedAtIso,
        attemptUpdated: true,
        persistenceStep: 'attempt_updated',
      });
      await writeQuizSubmissionCheckpoint(attemptUpdatedCheckpoint);
      checkpoint = attemptUpdatedCheckpoint;
      checkpoint = await readQuizSubmissionCheckpoint(
        input.studentId,
        input.quizId,
        input.sessionId,
      );
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
