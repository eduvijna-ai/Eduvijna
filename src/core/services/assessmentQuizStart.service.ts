/**
 * Shared assigned-quiz start payload: fetch full questions + navigate to QuizTakingScreen.
 */

import { getQuizBySessionId } from './sharedApi';
import type { AssignedQuizRecoveryResumeParams } from './assignedQuizRecovery.service';

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
    const questions = allQuestions.slice(0, questionLimit).map((q: any, index: number) => ({
      id: `q-${index}`,
      question: q.quiz.question,
      options: q.quiz.options,
      correctAnswer: q.quiz.answer,
      answer: q.answer,
      explanation: null,
    }));

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
