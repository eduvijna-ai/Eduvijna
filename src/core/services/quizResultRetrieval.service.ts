/**
 * Persisted quiz result retrieval for students (attended-quiz) and teachers (dashboard fallback).
 */

import { apiClient } from '../api/config';
import { fetchTeacherQuizzes } from './dashboardApi';
import type { AttendedQuizParams, AttendedQuizResponse } from '../types/attendedQuiz.types';
import type { PlayableQuizQuestion } from '../utils/answerMappingUtils';
import {
  normalizeAttendedQuizResponse,
  normalizeQuestionsAndAnswersFromLogData,
  userAnswersFromLogDataEntries,
} from './quizResultNormalization';

export type QuizResultLoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string; retryable: boolean }
  | {
      status: 'ready';
      quizData: { questions: PlayableQuizQuestion[] };
      userAnswers: string[];
      score: number | null;
      logData: Record<string, unknown> | null;
      timeSpentSeconds: number | null;
      completedAt: string | null;
    };

export async function getAttendedQuiz(
  params: AttendedQuizParams,
): Promise<AttendedQuizResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append('student_id', params.student_id);
  if (params.classroom_id) queryParams.append('classroom_id', params.classroom_id);
  if (params.session_id) queryParams.append('session_id', params.session_id);
  queryParams.append('quiz_id', String(params.quiz_id));

  const response = await apiClient.get<AttendedQuizResponse>(
    `/api/v1/dashboard/attended-quiz?${queryParams.toString()}`,
  );
  return response.data;
}

/** @deprecated use quizResultNormalization */
export function userAnswersFromAttended(
  attended: AttendedQuizResponse,
  questionCount: number,
): string[] {
  const normalized = normalizeAttendedQuizResponse(attended);
  if (normalized.userAnswers.length >= questionCount) {
    return normalized.userAnswers.slice(0, questionCount);
  }
  return [
    ...normalized.userAnswers,
    ...Array.from({ length: questionCount - normalized.userAnswers.length }, () => ''),
  ];
}

export function userAnswersFromLogData(
  logData: Record<string, unknown> | null | undefined,
  questions: PlayableQuizQuestion[],
): string[] {
  const fromLog = normalizeQuestionsAndAnswersFromLogData(logData);
  if (fromLog) {
    return fromLog.userAnswers;
  }
  return userAnswersFromLogDataEntries(logData, questions);
}

async function fetchTeacherAttemptBundle(params: {
  quizId: number | string;
  studentId?: string;
  attemptId?: number;
  sessionId?: string | null;
}): Promise<QuizResultLoadState> {
  if (!params.studentId) {
    return {
      status: 'error',
      message: 'Student context is required to load this result.',
      retryable: false,
    };
  }

  const response = await fetchTeacherQuizzes({
    view_type: 'all',
    quiz_id: Number(params.quizId),
  });
  if (!response?.data?.length) {
    return { status: 'missing' };
  }

  const quiz = response.data[0] as unknown as Record<string, unknown>;
  const attempts =
    typeof quiz.attempts === 'string' ? JSON.parse(quiz.attempts) : quiz.attempts;
  if (!Array.isArray(attempts)) {
    return { status: 'missing' };
  }

  type TeacherAttemptRow = {
    attempt_id?: number;
    student_id?: string;
    session_id?: string;
    class_id?: string;
    status?: string;
    score?: number | null;
    submission?: { log_data?: unknown };
    log_data?: unknown;
    time_spent_seconds?: number | null;
    completed_at?: string | null;
  };

  const rows = attempts as TeacherAttemptRow[];
  const studentMatches = rows.filter(
    (a) => String(a.student_id) === String(params.studentId),
  );

  const sessionMatches = params.sessionId
    ? studentMatches.filter(
        (a) =>
          String(a.session_id) === String(params.sessionId) ||
          String(a.class_id) === String(params.sessionId),
      )
    : studentMatches;

  if (params.sessionId && sessionMatches.length === 0) {
    return {
      status: 'error',
      message: 'No attempt matches the supplied student and assignment session.',
      retryable: false,
    };
  }

  let attempt: TeacherAttemptRow | undefined;

  if (params.attemptId != null) {
    attempt = sessionMatches.find((a) => a.attempt_id === params.attemptId);
    if (!attempt) {
      return {
        status: 'error',
        message: 'No attempt matches the supplied attempt identifier.',
        retryable: false,
      };
    }
  } else if (params.sessionId) {
    const completed = sessionMatches.filter((a) => a.status === 'completed');
    if (completed.length === 1) {
      attempt = completed[0];
    } else if (completed.length > 1) {
      return {
        status: 'error',
        message: 'Multiple completed attempts match this session; specify attemptId.',
        retryable: false,
      };
    } else if (sessionMatches.length === 1) {
      attempt = sessionMatches[0];
    } else {
      return { status: 'missing' };
    }
  } else {
    return {
      status: 'error',
      message: 'Assignment session or attempt identifier is required for teacher results.',
      retryable: false,
    };
  }

  if (!attempt) {
    return { status: 'missing' };
  }

  const logDataRaw = attempt.submission?.log_data ?? attempt.log_data;
  if (!logDataRaw) {
    return { status: 'missing' };
  }

  const logData =
    typeof logDataRaw === 'string' ? JSON.parse(logDataRaw) : logDataRaw;
  const normalized = normalizeQuestionsAndAnswersFromLogData(logData);
  if (!normalized) {
    return { status: 'missing' };
  }

  return {
    status: 'ready',
    quizData: { questions: normalized.questions },
    userAnswers: normalized.userAnswers,
    score:
      attempt.score != null
        ? Number(attempt.score)
        : normalized.score,
    logData,
    timeSpentSeconds: attempt.time_spent_seconds ?? normalized.timeSpentSeconds,
    completedAt: attempt.completed_at ?? normalized.completedAt,
  };
}

export async function fetchPersistedQuizResult(params: {
  quizId: number | string;
  sessionId?: string | null;
  studentId: string;
  attemptId?: number;
  isTeacherView?: boolean;
}): Promise<QuizResultLoadState> {
  const { quizId, sessionId, studentId, attemptId, isTeacherView } = params;

  if (!quizId || !studentId) {
    return { status: 'missing' };
  }

  if (!isTeacherView) {
    if (!sessionId || String(sessionId).trim() === '') {
      return {
        status: 'error',
        message: 'Assignment session is required to load this result.',
        retryable: false,
      };
    }

    try {
      const attended = await getAttendedQuiz({
        student_id: studentId,
        session_id: sessionId,
        quiz_id: quizId,
      });
      const normalized = normalizeAttendedQuizResponse(attended);
      return {
        status: 'ready',
        quizData: { questions: normalized.questions },
        userAnswers: normalized.userAnswers,
        score: normalized.score,
        logData: normalized.logData,
        timeSpentSeconds: normalized.timeSpentSeconds,
        completedAt: normalized.completedAt,
      };
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        return { status: 'missing' };
      }
      return {
        status: 'error',
        message: 'Could not load your submitted answers. Please try again.',
        retryable: true,
      };
    }
  }

  try {
    return await fetchTeacherAttemptBundle({
      quizId,
      studentId,
      attemptId,
      sessionId,
    });
  } catch {
    return {
      status: 'error',
      message: 'Could not load quiz results. Please try again.',
      retryable: true,
    };
  }
}
