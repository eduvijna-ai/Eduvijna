/**
 * Persisted quiz result retrieval for students (attended-quiz) and teachers (dashboard fallback).
 */

import { apiClient } from '../api/config';
import { fetchTeacherQuizzes } from './dashboardApi';
import type { AttendedQuizParams, AttendedQuizResponse } from '../types/attendedQuiz.types';
import type { PlayableQuizQuestion } from '../utils/answerMappingUtils';

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

type SubjectQuizEntry = {
  quiz?: { question?: string; options?: string[]; answer?: string };
  question?: string;
  options?: string[];
  answer?: string;
  explanation?: string | null;
};

function normalizeQuestionsFromSubject(subjectData: unknown): PlayableQuizQuestion[] {
  const subject =
    typeof subjectData === 'string' ? JSON.parse(subjectData) : subjectData;
  const quizzes = (subject as { quizzes?: SubjectQuizEntry[] })?.quizzes;
  if (!Array.isArray(quizzes)) return [];

  return quizzes.map((q, index: number) => ({
    id: `q-${index}`,
    question: q.quiz?.question || q.question || '',
    options: q.quiz?.options || q.options || [],
    answer: q.quiz?.answer || q.answer || '',
    correctAnswer: q.quiz?.answer || q.answer || '',
    explanation: q.explanation ?? null,
  }));
}

export function userAnswersFromAttended(
  attended: AttendedQuizResponse,
  questionCount: number,
): string[] {
  const answersRaw = attended.log_data?.answers;
  if (Array.isArray(answersRaw)) {
    return Array.from({ length: questionCount }, (_, index) => {
      const item = answersRaw[index] as Record<string, unknown> | undefined;
      const raw =
        item?.userAnswer ??
        item?.selected_option ??
        item?.user_answer ??
        '';
      return raw ? String(raw).toUpperCase() : '';
    });
  }

  if (attended.items?.length) {
    return attended.items.map((item) =>
      item.student_answer ? String(item.student_answer).toUpperCase() : '',
    );
  }

  return Array.from({ length: questionCount }, () => '');
}

export function userAnswersFromLogData(
  logData: Record<string, unknown> | null | undefined,
  questions: PlayableQuizQuestion[],
): string[] {
  if (!logData?.answers) {
    return Array.from({ length: questions.length }, () => '');
  }

  const answers = logData.answers;
  if (Array.isArray(answers)) {
    return answers.map((entry: Record<string, unknown>, index: number) => {
      const raw = entry?.userAnswer ?? entry?.user_answer ?? '';
      if (!raw) return '';
      const letter = String(raw).toUpperCase();
      if (/^[A-D]$/.test(letter)) {
        const q = questions[index];
        if (q?.options?.length) {
          const idx = letter.charCodeAt(0) - 65;
          return q.options[idx] ?? letter;
        }
      }
      return String(raw);
    });
  }

  if (typeof answers === 'object') {
    return Object.keys(answers as Record<string, string>)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map((key) => {
        const value = (answers as Record<string, string>)[key];
        return value ?? '';
      });
  }

  return Array.from({ length: questions.length }, () => '');
}

async function fetchTeacherAttemptBundle(params: {
  quizId: number | string;
  studentId?: string;
  attemptId?: number;
}): Promise<QuizResultLoadState> {
  const response = await fetchTeacherQuizzes({
    view_type: 'all',
    quiz_id: Number(params.quizId),
  });
  if (!response?.data?.length) {
    return { status: 'missing' };
  }

  const quiz = response.data[0] as Record<string, unknown>;
  const attempts =
    typeof quiz.attempts === 'string' ? JSON.parse(quiz.attempts) : quiz.attempts;
  if (!Array.isArray(attempts)) {
    return { status: 'missing' };
  }

  type TeacherAttemptRow = {
    attempt_id?: number;
    student_id?: string;
    status?: string;
    score?: number | null;
    submission?: { log_data?: unknown };
    log_data?: unknown;
    time_spent_seconds?: number | null;
    completed_at?: string | null;
  };

  let attempt: TeacherAttemptRow | undefined;
  if (params.attemptId) {
    attempt = (attempts as TeacherAttemptRow[]).find(
      (a) => a.attempt_id === params.attemptId,
    );
  }
  if (!attempt && params.studentId) {
    const studentAttempts = (attempts as TeacherAttemptRow[]).filter(
      (a) => String(a.student_id) === String(params.studentId),
    );
    attempt =
      studentAttempts.find((a) => a.status === 'completed') || studentAttempts[0];
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
  const questions = normalizeQuestionsFromSubject(quiz.subject);
  const userAnswers = userAnswersFromLogData(logData, questions);

  return {
    status: 'ready',
    quizData: { questions },
    userAnswers,
    score:
      attempt.score != null
        ? Number(attempt.score)
        : logData?.score != null
          ? Number(logData.score)
          : null,
    logData,
    timeSpentSeconds: attempt.time_spent_seconds ?? logData?.time_spent_seconds ?? null,
    completedAt: attempt.completed_at ?? null,
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

  if (!isTeacherView && sessionId) {
    try {
      const attended = await getAttendedQuiz({
        student_id: studentId,
        session_id: sessionId,
        quiz_id: quizId,
      });

      const questions: PlayableQuizQuestion[] =
        attended.items?.length > 0
          ? attended.items.map((item, index) => ({
              id: `q-${index}`,
              question: item.question,
              options: item.options ?? [],
              answer: item.answer_key ?? '',
              correctAnswer: item.answer_key ?? '',
              explanation: null,
            }))
          : [];

      const questionCount =
        attended.counts?.total_questions ||
        (Array.isArray(attended.log_data?.answers)
          ? (attended.log_data?.answers as unknown[]).length
          : questions.length);

      const userAnswers =
        questions.length > 0
          ? attended.items.map((item) => {
              if (!item.student_answer) return '';
              const letter = String(item.student_answer).toUpperCase();
              if (/^[A-D]$/.test(letter) && item.options?.length) {
                return item.options[letter.charCodeAt(0) - 65] ?? letter;
              }
              return String(item.student_answer);
            })
          : userAnswersFromAttended(attended, questionCount);

      const logData = (attended.log_data as Record<string, unknown> | null) ?? null;

      if (questions.length === 0 && logData?.answers) {
        const fromLog = userAnswersFromLogData(logData, []);
        return {
          status: 'ready',
          quizData: {
            questions: fromLog.map((_, index) => ({
              id: `q-${index}`,
              question: '',
              options: [],
              answer: '',
              correctAnswer: '',
              explanation: null,
            })),
          },
          userAnswers: fromLog,
          score: attended.score != null ? Number(attended.score) : 0,
          logData,
          timeSpentSeconds: attended.time_spent_seconds,
          completedAt: attended.submitted_at,
        };
      }

      return {
        status: 'ready',
        quizData: { questions },
        userAnswers,
        score: attended.score != null ? Number(attended.score) : 0,
        logData,
        timeSpentSeconds: attended.time_spent_seconds,
        completedAt: attended.submitted_at,
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
    if (sessionId && studentId) {
      const attended = await getAttendedQuiz({
        student_id: studentId,
        session_id: sessionId,
        quiz_id: quizId,
      });
      const questionCount =
        attended.counts?.total_questions ||
        (Array.isArray(attended.log_data?.answers)
          ? (attended.log_data?.answers as unknown[]).length
          : attended.items?.length ?? 0);
      const questions: PlayableQuizQuestion[] =
        attended.items?.length > 0
          ? attended.items.map((item, index) => ({
              id: `q-${index}`,
              question: item.question,
              options: item.options ?? [],
              answer: item.answer_key ?? '',
              correctAnswer: item.answer_key ?? '',
              explanation: null,
            }))
          : Array.from({ length: questionCount }, (_, index) => ({
              id: `q-${index}`,
              question: '',
              options: [],
              answer: '',
              correctAnswer: '',
              explanation: null,
            }));

      return {
        status: 'ready',
        quizData: { questions },
        userAnswers: userAnswersFromAttended(attended, questions.length),
        score: attended.score != null ? Number(attended.score) : 0,
        logData: (attended.log_data as Record<string, unknown> | null) ?? null,
        timeSpentSeconds: attended.time_spent_seconds,
        completedAt: attended.submitted_at,
      };
    }

    return await fetchTeacherAttemptBundle({ quizId, studentId, attemptId });
  } catch {
    return {
      status: 'error',
      message: 'Could not load quiz results. Please try again.',
      retryable: true,
    };
  }
}
