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
import {
  isWorksheetAttendedResponse,
  tryNormalizeWorksheetAttended,
} from './worksheetPersistedResult';
import { isWorksheetLogData } from '../utils/worksheetShareUtils';

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
  const answers = normalized?.userAnswers ?? [];
  if (answers.length >= questionCount) {
    return answers.slice(0, questionCount);
  }
  return [
    ...answers,
    ...Array.from({ length: questionCount - answers.length }, () => ''),
  ];
}

export function userAnswersFromLogData(
  logData: Record<string, unknown> | null | undefined,
  questions: PlayableQuizQuestion[],
): string[] {
  return userAnswersFromLogDataEntries(logData, questions);
}

type TeacherAssignmentRow = Record<string, unknown>;

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

function assignmentClassroomId(row: TeacherAssignmentRow): string | null {
  const raw = row.classroom_id ?? row.class_id;
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw);
}

function assignmentSessionId(row: TeacherAssignmentRow): string | null {
  const raw = row.session_id;
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw);
}

function classroomConflictsWithSession(classroomId: string, sessionId: string | null | undefined): boolean {
  if (!sessionId) return false;
  return String(classroomId) === String(sessionId);
}

function pickTeacherAssignment(
  apiRows: TeacherAssignmentRow[],
  params: { quizId: number; sessionId?: string | null; classroomId?: string | null },
): { assignment: TeacherAssignmentRow } | { error: QuizResultLoadState } {
  const matchingQuiz = apiRows.filter(
    (row) => row.quiz_id != null && row.quiz_id !== '' && Number(row.quiz_id) === params.quizId,
  );
  if (matchingQuiz.length === 0) {
    return {
      error: {
        status: 'error',
        message: 'No assignment matches the requested quiz.',
        retryable: false,
      },
    };
  }

  let candidates = matchingQuiz;
  if (params.sessionId) {
    const sessionMatches = matchingQuiz.filter(
      (row) => assignmentSessionId(row) === String(params.sessionId),
    );
    if (sessionMatches.length === 0) {
      return {
        error: {
          status: 'error',
          message: 'No assignment matches the requested quiz and session.',
          retryable: false,
        },
      };
    }
    if (sessionMatches.length > 1) {
      return {
        error: {
          status: 'error',
          message: 'Multiple assignments match this quiz and session.',
          retryable: false,
        },
      };
    }
    candidates = sessionMatches;
  } else if (matchingQuiz.length > 1) {
    return {
      error: {
        status: 'error',
        message:
          'Multiple assignments match this quiz; open results from the specific class assignment.',
        retryable: false,
      },
    };
  }

  const assignment = candidates[0];
  const rowSession = assignmentSessionId(assignment);
  if (params.sessionId) {
    if (!rowSession) {
      return {
        error: {
          status: 'error',
          message: 'Assignment session could not be verified for this result.',
          retryable: false,
        },
      };
    }
    if (rowSession !== String(params.sessionId)) {
      return {
        error: {
          status: 'error',
          message: 'Assignment session does not match the requested session.',
          retryable: false,
        },
      };
    }
  }

  const rowClassroom = assignmentClassroomId(assignment);
  if (params.classroomId) {
    if (classroomConflictsWithSession(String(params.classroomId), params.sessionId)) {
      return {
        error: {
          status: 'error',
          message: 'Classroom identifier must not be used as assignment session.',
          retryable: false,
        },
      };
    }
    if (rowClassroom && rowClassroom !== String(params.classroomId)) {
      return {
        error: {
          status: 'error',
          message: 'Classroom does not match the selected assignment.',
          retryable: false,
        },
      };
    }
  }
  if (rowClassroom && params.sessionId && classroomConflictsWithSession(rowClassroom, params.sessionId)) {
    return {
      error: {
        status: 'error',
        message: 'Assignment classroom conflicts with assignment session identifier.',
        retryable: false,
      },
    };
  }

  return { assignment };
}

function resolveAttemptClassroom(
  assignment: TeacherAssignmentRow,
  attempt: TeacherAttemptRow,
  routeClassroomId?: string | null,
): { classroomId?: string; error?: QuizResultLoadState } {
  const fromAssignment = assignmentClassroomId(assignment);
  const fromAttempt =
    attempt.class_id != null && String(attempt.class_id).trim() !== ''
      ? String(attempt.class_id)
      : null;

  if (fromAttempt && fromAssignment && fromAttempt !== fromAssignment) {
    return {
      error: {
        status: 'error',
        message: 'Attempt classroom conflicts with assignment classroom.',
        retryable: false,
      },
    };
  }

  const effective = fromAttempt ?? fromAssignment ?? (routeClassroomId ? String(routeClassroomId) : undefined);
  if (routeClassroomId && effective && effective !== String(routeClassroomId)) {
    return {
      error: {
        status: 'error',
        message: 'Classroom does not match the selected assignment.',
        retryable: false,
      },
    };
  }

  return { classroomId: effective };
}

function verifyAttendedQuizIdentity(
  attended: AttendedQuizResponse,
  expected: {
    studentId: string;
    quizId: number | string;
    sessionId: string;
    classroomId?: string;
  },
): boolean {
  if (String(attended.student_id) !== String(expected.studentId)) return false;
  if (Number(attended.quiz_id) !== Number(expected.quizId)) return false;
  if (String(attended.session_id ?? '') !== String(expected.sessionId)) return false;
  if (
    expected.classroomId &&
    attended.classroom_id &&
    String(attended.classroom_id) !== String(expected.classroomId)
  ) {
    return false;
  }
  return true;
}

function readyFromAttemptAndNormalized(
  attempt: TeacherAttemptRow,
  normalized: {
    questions: PlayableQuizQuestion[];
    userAnswers: string[];
    score: number | null;
    logData: Record<string, unknown> | null;
    timeSpentSeconds: number | null;
    completedAt: string | null;
  },
): QuizResultLoadState {
  return {
    status: 'ready',
    quizData: { questions: normalized.questions },
    userAnswers: normalized.userAnswers,
    score: attempt.score != null ? Number(attempt.score) : normalized.score,
    logData: normalized.logData,
    timeSpentSeconds: attempt.time_spent_seconds ?? normalized.timeSpentSeconds,
    completedAt: attempt.completed_at ?? normalized.completedAt,
  };
}

async function fetchTeacherAttemptBundle(params: {
  quizId: number | string;
  studentId?: string;
  attemptId?: number;
  sessionId?: string | null;
  classroomId?: string | null;
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

  const apiRows = response.data as unknown as TeacherAssignmentRow[];
  const quizIdNum = Number(params.quizId);
  const picked = pickTeacherAssignment(apiRows, {
    quizId: quizIdNum,
    sessionId: params.sessionId,
    classroomId: params.classroomId,
  });
  if ('error' in picked) {
    return picked.error;
  }
  const quiz = picked.assignment;

  const quizAssignmentSessionId = assignmentSessionId(quiz);

  const attempts =
    typeof quiz.attempts === 'string' ? JSON.parse(quiz.attempts) : quiz.attempts;
  if (!Array.isArray(attempts)) {
    return { status: 'missing' };
  }

  const attemptRows = attempts as TeacherAttemptRow[];
  const studentMatches = attemptRows.filter(
    (a) => String(a.student_id) === String(params.studentId),
  );

  const resolveAttemptSessionId = (row: TeacherAttemptRow): string | null => {
    if (row.session_id != null && String(row.session_id).trim() !== '') {
      return String(row.session_id);
    }
    return quizAssignmentSessionId;
  };

  const sessionMatches = params.sessionId
    ? studentMatches.filter(
        (a) => String(resolveAttemptSessionId(a)) === String(params.sessionId),
      )
    : studentMatches;

  let attempt: TeacherAttemptRow | undefined;

  if (params.attemptId != null) {
    attempt = studentMatches.find((a) => a.attempt_id === params.attemptId);
    if (!attempt) {
      return {
        status: 'error',
        message: 'No attempt matches the supplied attempt identifier.',
        retryable: false,
      };
    }
    if (params.sessionId) {
      const attemptSession = resolveAttemptSessionId(attempt);
      if (attemptSession && String(attemptSession) !== String(params.sessionId)) {
        return {
          status: 'error',
          message: 'No attempt matches the supplied student and assignment session.',
          retryable: false,
        };
      }
    }
  } else if (params.sessionId) {
    if (sessionMatches.length === 0) {
      return {
        status: 'error',
        message: 'No attempt matches the supplied student and assignment session.',
        retryable: false,
      };
    }
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

  const classroomPick = resolveAttemptClassroom(quiz, attempt, params.classroomId);
  if (classroomPick.error) {
    return classroomPick.error;
  }
  const effectiveClassroomId = classroomPick.classroomId;

  const logDataRaw = attempt.submission?.log_data ?? attempt.log_data;
  if (!logDataRaw) {
    return { status: 'missing' };
  }

  const logData =
    typeof logDataRaw === 'string' ? JSON.parse(logDataRaw) : logDataRaw;

  if (isWorksheetLogData(logData)) {
    const sessionForAttended = resolveAttemptSessionId(attempt);
    if (!sessionForAttended) {
      return {
        status: 'error',
        message: 'Assignment session is required to load this worksheet result.',
        retryable: false,
      };
    }
    if (params.sessionId && String(sessionForAttended) !== String(params.sessionId)) {
      return {
        status: 'error',
        message: 'No attempt matches the supplied student and assignment session.',
        retryable: false,
      };
    }

    const attendedParams: AttendedQuizParams = {
      student_id: params.studentId,
      quiz_id: params.quizId,
      session_id: sessionForAttended,
      classroom_id: effectiveClassroomId,
    };

    const loadAttendedForAttempt = async (): Promise<AttendedQuizResponse | null> => {
      try {
        const attended = await loadStudentAttendedWithWorksheetFallback(
          attendedParams,
          effectiveClassroomId ?? null,
        );
        if (
          !verifyAttendedQuizIdentity(attended, {
            studentId: params.studentId!,
            quizId: params.quizId,
            sessionId: sessionForAttended,
            classroomId: effectiveClassroomId,
          })
        ) {
          return null;
        }
        return attended;
      } catch {
        return null;
      }
    };

    const attended = await loadAttendedForAttempt();
    if (attended) {
      const mergedAttended = {
        ...attended,
        log_data: (attended.log_data as Record<string, unknown> | null) ?? logData,
      };
      const itemsNormalized = normalizeAttendedQuizResponse(mergedAttended);
      if (itemsNormalized) {
        return readyFromAttemptAndNormalized(attempt, itemsNormalized);
      }
      const worksheetNormalized = tryNormalizeWorksheetAttended(mergedAttended);
      if (worksheetNormalized) {
        return readyFromAttemptAndNormalized(attempt, worksheetNormalized);
      }
    }

    const fallback = normalizeQuestionsAndAnswersFromLogData(logData);
    if (fallback) {
      return readyFromAttemptAndNormalized(attempt, fallback);
    }
    return {
      status: 'error',
      message: attended
        ? 'Worksheet submission found but review content is incomplete.'
        : 'Could not load worksheet review content. Please try again.',
      retryable: true,
    };
  }

  const normalized = normalizeQuestionsAndAnswersFromLogData(logData);
  if (!normalized) {
    return { status: 'missing' };
  }

  return readyFromAttemptAndNormalized(attempt, normalized);
}

async function loadStudentAttendedWithWorksheetFallback(
  baseParams: AttendedQuizParams,
  classroomId?: string | null,
): Promise<AttendedQuizResponse> {
  const attended = await getAttendedQuiz(baseParams);
  if (
    isWorksheetAttendedResponse(attended) &&
    !attended.worksheet_data &&
    classroomId &&
    String(classroomId).trim()
  ) {
    return getAttendedQuiz({
      ...baseParams,
      classroom_id: classroomId,
    });
  }
  return attended;
}

export async function fetchPersistedQuizResult(params: {
  quizId: number | string;
  sessionId?: string | null;
  classroomId?: string | null;
  studentId: string;
  attemptId?: number;
  isTeacherView?: boolean;
}): Promise<QuizResultLoadState> {
  const { quizId, sessionId, classroomId, studentId, attemptId, isTeacherView } = params;

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
      const attended = await loadStudentAttendedWithWorksheetFallback(
        {
          student_id: studentId,
          session_id: sessionId,
          quiz_id: quizId,
          classroom_id: classroomId || undefined,
        },
        classroomId,
      );
      const normalized = normalizeAttendedQuizResponse(attended);
      if (!normalized) {
        if (isWorksheetAttendedResponse(attended)) {
          return {
            status: 'error',
            message: 'Worksheet submission found but review content is incomplete.',
            retryable: true,
          };
        }
        return { status: 'missing' };
      }
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
      classroomId,
    });
  } catch {
    return {
      status: 'error',
      message: 'Could not load quiz results. Please try again.',
      retryable: true,
    };
  }
}
