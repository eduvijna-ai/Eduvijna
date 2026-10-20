/**
 * Shared assigned-quiz start payload: fetch full questions + navigate to QuizTakingScreen.
 */

import { checkQuizAttempt, getQuizBySessionId } from './sharedApi';
import {
  AssignedQuizRecoveryProbeError,
  buildRecoveryResumeParams,
  findPendingSubmissionCheckpoint,
  isAssignedQuizRecoveryProbeError,
  isSubmissionPersistedOnServer,
  type AssignedQuizRecoveryResumeParams,
} from './assignedQuizRecovery.service';
import {
  clearQuizSubmissionCheckpointBestEffort,
  readQuizSubmissionCheckpoint,
} from './quizSubmissionCheckpoint';

export class AssignedQuizLoadError extends Error {
  readonly code = 'ASSIGNED_QUIZ_FETCH_FAILED';
  readonly retryable = true;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AssignedQuizLoadError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export function isAssignedQuizLoadError(error: unknown): boolean {
  return error instanceof AssignedQuizLoadError;
}

export interface AssignedQuizStartContext {
  correctQuizId: number | string;
  correctSessionId: string;
  correctClassroomId: string;
  attemptData?: Record<string, unknown> | null;
}

export interface QuizTakingNavigationParams {
  quizId: number | string;
  sessionId: string;
  classroomId: string;
  quizData: Record<string, unknown>;
  submissionRecovery?: AssignedQuizRecoveryResumeParams | null;
}

/**
 * Fetches GET /api/v1/quiz?session_id=… and merges question ordering with assignment metadata.
 */
export async function loadAssignedQuizDataForSession(
  ctx: AssignedQuizStartContext,
): Promise<Record<string, unknown>> {
  const { correctSessionId, correctClassroomId, attemptData } = ctx;
  let quizDataWithQuestions: Record<string, unknown> = { ...(attemptData ?? {}) };

  if (!correctSessionId) {
    return quizDataWithQuestions;
  }

  try {
    const quizResponse = await getQuizBySessionId(correctSessionId);
    if (!quizResponse.success || !quizResponse.quiz_data) {
      throw new AssignedQuizLoadError(
        'Assigned quiz payload was missing or unsuccessful',
        quizResponse,
      );
    }

    const fetchedQuiz = quizResponse.quiz_data;
    const allQuestions = fetchedQuiz.questions?.quizzes ?? [];
    const questionLimit = fetchedQuiz.question_count || allQuestions.length;
    const questions = allQuestions.slice(0, questionLimit).map((entry, index) => {
      const quiz = entry?.quiz;
      return {
        id: `q-${index}`,
        question: quiz?.question ?? '',
        options: Array.isArray(quiz?.options) ? quiz.options : [],
        correctAnswer: quiz?.answer,
        answer: entry?.answer,
        explanation: null,
      };
    });

    quizDataWithQuestions = {
      ...attemptData,
      id: fetchedQuiz.quiz_id || attemptData?.quiz_id,
      quiz_id: fetchedQuiz.quiz_id || attemptData?.quiz_id,
      session_id: correctSessionId,
      classroom_id: correctClassroomId,
      title: fetchedQuiz.topic || attemptData?.quiz_name || 'Assessment',
      duration: fetchedQuiz.duration || attemptData?.duration || 30,
      has_time_limit: fetchedQuiz.has_time_limit ?? true,
      is_public: fetchedQuiz.is_public ?? false,
      questions,
    };
  } catch (fetchErr) {
    if (fetchErr instanceof AssignedQuizLoadError) {
      throw fetchErr;
    }
    throw new AssignedQuizLoadError('Could not load assigned quiz questions', fetchErr);
  }

  return quizDataWithQuestions;
}

function attemptDataHasQuestions(attemptData: Record<string, unknown> | null | undefined): boolean {
  if (!attemptData) return false;
  const direct = attemptData.questions;
  if (Array.isArray(direct) && direct.length > 0) return true;
  const nested = (attemptData.questions as { quizzes?: unknown[] } | undefined)?.quizzes;
  return Array.isArray(nested) && nested.length > 0;
}

/**
 * Immutable recovery: replay attempt metadata when quiz GET is unavailable.
 */
export async function loadAssignedQuizDataForImmutableRecovery(
  ctx: AssignedQuizStartContext,
  recovery: AssignedQuizRecoveryResumeParams,
): Promise<Record<string, unknown>> {
  try {
    return await loadAssignedQuizDataForSession(ctx);
  } catch (fetchErr) {
    if (recovery.mode !== 'immutable_retry') {
      throw fetchErr;
    }
    if (attemptDataHasQuestions(ctx.attemptData)) {
      return {
        ...(ctx.attemptData ?? {}),
        session_id: ctx.correctSessionId,
        classroom_id: ctx.correctClassroomId,
      };
    }
    throw fetchErr;
  }
}

/**
 * Loads full quiz payload then navigates — used by Assessments start/resume and recovery.
 */
export async function navigateToAssignedQuizTaking(
  navigation: { navigate: (screen: string, params?: unknown) => void } | undefined,
  onNavigate: ((screen: string, params?: unknown) => void) | undefined,
  startCtx: AssignedQuizStartContext,
  submissionRecovery?: AssignedQuizRecoveryResumeParams | null,
): Promise<void> {
  const quizDataWithQuestions = await loadAssignedQuizDataForSession(startCtx);
  navigateStudentToQuizTaking(
    navigation,
    onNavigate,
    buildQuizTakingNavigationParams(startCtx, quizDataWithQuestions, submissionRecovery),
  );
}

export function buildQuizTakingNavigationParams(
  ctx: AssignedQuizStartContext,
  quizDataWithQuestions: Record<string, unknown>,
  submissionRecovery?: AssignedQuizRecoveryResumeParams | null,
): QuizTakingNavigationParams {
  return {
    quizId: ctx.correctQuizId,
    sessionId: ctx.correctSessionId,
    classroomId: ctx.correctClassroomId,
    quizData: quizDataWithQuestions,
    submissionRecovery: submissionRecovery ?? undefined,
  };
}

export type StudentAssignedQuizStartResult =
  | { kind: 'navigate'; params: QuizTakingNavigationParams }
  | {
      kind: 'already_completed';
      quizName: string;
      score: number | null;
      completedAt: string | null;
      quizId: number | string;
      attemptData: Record<string, unknown> | null;
    }
  | { kind: 'lookup_failed' };

export interface StudentQuizResultsNavigationParams {
  quizId: number | string;
  quizName?: string;
  sessionId: string;
  studentId: string;
  classroomId?: string;
  attemptId?: number;
  score?: number;
  attemptData?: Record<string, unknown>;
  isTeacherView: false;
}

export type StudentAssignedQuizViewResultsResult =
  | { kind: 'recovery_retry'; params: QuizTakingNavigationParams }
  | { kind: 'view_results'; resultParams: StudentQuizResultsNavigationParams }
  | { kind: 'probe_failed' };

/**
 * Student Assessments start/resume: never navigates on recovery-probe or quiz-load
 * failure, and never falls back to a metadata-only dashboard row.
 */
export async function resolveStudentAssignedQuizStart(args: {
  studentId: string;
  quizId: number | string;
  sessionId: string;
  classroomId: string;
  attemptData?: Record<string, unknown> | null;
}): Promise<StudentAssignedQuizStartResult> {
  const startCtx: AssignedQuizStartContext = {
    correctQuizId: args.quizId,
    correctSessionId: args.sessionId,
    correctClassroomId: args.classroomId,
    attemptData: args.attemptData,
  };

  const attemptCheck = await checkQuizAttempt(
    args.quizId,
    args.studentId,
    args.sessionId || undefined,
  );

  let pendingCheckpoint;
  try {
    pendingCheckpoint = await findPendingSubmissionCheckpoint(
      args.studentId,
      args.quizId,
      args.sessionId,
    );
  } catch (error) {
    if (isAssignedQuizRecoveryProbeError(error)) {
      return { kind: 'lookup_failed' };
    }
    throw error;
  }

  if (pendingCheckpoint) {
    const recovery = buildRecoveryResumeParams(pendingCheckpoint);
    const quizDataWithQuestions = recovery
      ? await loadAssignedQuizDataForImmutableRecovery(startCtx, recovery)
      : await loadAssignedQuizDataForSession(startCtx);
    return {
      kind: 'navigate',
      params: buildQuizTakingNavigationParams(startCtx, quizDataWithQuestions, recovery),
    };
  }

  if (attemptCheck.lookupFailed) {
    return { kind: 'lookup_failed' };
  }

  if (attemptCheck.hasAttempted && attemptCheck.status === 'completed') {
    return {
      kind: 'already_completed',
      quizName: String(args.attemptData?.quiz_name ?? 'Quiz'),
      score: attemptCheck.score ?? null,
      completedAt: attemptCheck.completedAt ?? null,
      quizId: args.quizId,
      attemptData: args.attemptData ?? null,
    };
  }

  const quizDataWithQuestions = await loadAssignedQuizDataForSession(startCtx);
  return {
    kind: 'navigate',
    params: buildQuizTakingNavigationParams(startCtx, quizDataWithQuestions),
  };
}

/**
 * Completed-card "View Results": probe pending immutable recovery before results screen.
 */
export async function resolveStudentAssignedQuizViewResults(args: {
  studentId: string;
  quizId: number | string;
  sessionId: string;
  classroomId: string;
  attemptData?: Record<string, unknown> | null;
  quizName?: string;
}): Promise<StudentAssignedQuizViewResultsResult> {
  const startCtx: AssignedQuizStartContext = {
    correctQuizId: args.quizId,
    correctSessionId: args.sessionId,
    correctClassroomId: args.classroomId,
    attemptData: args.attemptData,
  };

  let pendingCheckpoint;
  try {
    pendingCheckpoint = await findPendingSubmissionCheckpoint(
      args.studentId,
      args.quizId,
      args.sessionId,
    );
  } catch (error) {
    if (isAssignedQuizRecoveryProbeError(error)) {
      return { kind: 'probe_failed' };
    }
    throw error;
  }

  if (pendingCheckpoint) {
    const recovery = buildRecoveryResumeParams(pendingCheckpoint);
    const quizDataWithQuestions = recovery
      ? await loadAssignedQuizDataForImmutableRecovery(startCtx, recovery)
      : await loadAssignedQuizDataForSession(startCtx);
    return {
      kind: 'recovery_retry',
      params: buildQuizTakingNavigationParams(startCtx, quizDataWithQuestions, recovery),
    };
  }

  const localCheckpoint = await readQuizSubmissionCheckpoint(
    args.studentId,
    args.quizId,
    args.sessionId,
  );
  if (localCheckpoint) {
    await clearStaleCheckpointWhenPersistedOnServer(
      args.studentId,
      args.quizId,
      args.sessionId,
    );
  }

  const attemptIdRaw = args.attemptData?.id ?? args.attemptData?.attempt_id;
  const attemptId =
    attemptIdRaw != null && Number.isFinite(Number(attemptIdRaw)) ? Number(attemptIdRaw) : undefined;
  const scoreRaw = args.attemptData?.score;
  const score =
    scoreRaw != null && Number.isFinite(Number(scoreRaw)) ? Number(scoreRaw) : undefined;

  return {
    kind: 'view_results',
    resultParams: {
      quizId: args.quizId,
      quizName: args.quizName ?? String(args.attemptData?.quiz_name ?? 'Assessment'),
      sessionId: args.sessionId,
      studentId: args.studentId,
      classroomId: args.classroomId || undefined,
      attemptId,
      score,
      attemptData: args.attemptData ?? undefined,
      isTeacherView: false,
    },
  };
}

async function clearStaleCheckpointWhenPersistedOnServer(
  studentId: string,
  quizId: string | number,
  sessionId: string,
): Promise<void> {
  try {
    const persisted = await isSubmissionPersistedOnServer(studentId, sessionId, quizId);
    if (persisted) {
      await clearQuizSubmissionCheckpointBestEffort(studentId, quizId, sessionId);
    }
  } catch {
    // Best-effort cleanup must not block opening results.
  }
}

export type StudentViewResultsNavigationAdapters = {
  navigation?: { navigate: (screen: string, params?: unknown) => void };
  onNavigate?: (screen: string, params?: unknown) => void;
};

/**
 * Shared Home / Assessments / Analytics entry: recovery probe then navigate.
 */
export async function executeStudentAssignedQuizViewResults(
  args: {
    studentId: string;
    quizId: number | string;
    sessionId: string;
    classroomId: string;
    attemptData?: Record<string, unknown> | null;
    quizName?: string;
  },
  adapters: StudentViewResultsNavigationAdapters,
): Promise<StudentAssignedQuizViewResultsResult> {
  const viewResult = await resolveStudentAssignedQuizViewResults(args);

  if (viewResult.kind === 'recovery_retry') {
    navigateStudentToQuizTaking(adapters.navigation, adapters.onNavigate, viewResult.params);
    return viewResult;
  }

  if (viewResult.kind === 'probe_failed') {
    throw new AssignedQuizRecoveryProbeError(
      'Could not verify whether this assignment was already submitted. Please try again.',
    );
  }

  if (viewResult.kind === 'view_results') {
    const resultParams = viewResult.resultParams;
    if (adapters.onNavigate) {
      adapters.onNavigate('QuizResultsScreen', resultParams);
    } else if (adapters.navigation) {
      adapters.navigation.navigate('QuizResultsScreen', resultParams);
    }
    return viewResult;
  }

  return viewResult;
}

export function navigateStudentToQuizTaking(
  navigation: { navigate: (screen: string, params?: unknown) => void } | undefined,
  onNavigate: ((screen: string, params?: unknown) => void) | undefined,
  params: QuizTakingNavigationParams,
): void {
  const screenParams = {
    quizId: params.quizId,
    sessionId: params.sessionId,
    classroomId: params.classroomId,
    quizData: params.quizData,
    submissionRecovery: params.submissionRecovery,
  };

  if (navigation) {
    navigation.navigate('QuizTakingScreen', screenParams);
    return;
  }

  if (onNavigate) {
    onNavigate('QuizTakingScreen', {
      ...screenParams,
      quiz: params.quizData,
      is_public: false,
    });
  }
}
