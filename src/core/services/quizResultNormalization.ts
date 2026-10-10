/**
 * Central normalization for persisted quiz results (student + teacher paths).
 */

import type { AttendedQuizResponse } from '../types/attendedQuiz.types';
import {
  letterToOptionString,
  type LetterOption,
  type PlayableQuizQuestion,
} from '../utils/answerMappingUtils';

export interface NormalizedPersistedQuizResult {
  questions: PlayableQuizQuestion[];
  userAnswers: string[];
  score: number | null;
  logData: Record<string, unknown> | null;
  timeSpentSeconds: number | null;
  completedAt: string | null;
}

type LogAnswerEntry = {
  questionNumber?: number;
  question?: string;
  options?: string[];
  correctAnswer?: string;
  userAnswer?: string | null;
  user_answer?: string | null;
  selected_option?: string | null;
  isCorrect?: boolean;
};

function letterOrTextToDisplayAnswer(
  raw: string | null | undefined,
  options: string[],
): string {
  if (raw == null || raw === '') return '';
  const letter = String(raw).trim().toUpperCase();
  if (/^[A-D]$/.test(letter) && options.length) {
    return letterToOptionString(letter as LetterOption, options) || letter;
  }
  return String(raw);
}

export function normalizeQuestionsAndAnswersFromLogData(
  logData: Record<string, unknown> | null | undefined,
): NormalizedPersistedQuizResult | null {
  const answersRaw = logData?.answers;
  if (!Array.isArray(answersRaw) || answersRaw.length === 0) {
    return null;
  }

  const entries = answersRaw as LogAnswerEntry[];
  const questions: PlayableQuizQuestion[] = entries.map((entry, index) => {
    const options = Array.isArray(entry.options) ? entry.options : [];
    const correctRaw = entry.correctAnswer ?? '';
    return {
      id: `q-${index}`,
      question: entry.question ?? '',
      options,
      answer: correctRaw,
      correctAnswer: correctRaw,
      explanation: null,
    };
  });

  const userAnswers = entries.map((entry, index) => {
    const raw =
      entry.userAnswer ??
      entry.user_answer ??
      entry.selected_option ??
      null;
    return letterOrTextToDisplayAnswer(raw, questions[index]?.options ?? []);
  });

  const scoreFromLog =
    logData?.score != null && logData.score !== ''
      ? Number(logData.score)
      : null;

  return {
    questions,
    userAnswers,
    score: Number.isFinite(scoreFromLog as number) ? (scoreFromLog as number) : null,
    logData: logData ?? null,
    timeSpentSeconds:
      typeof logData?.time_spent_seconds === 'number'
        ? logData.time_spent_seconds
        : null,
    completedAt: null,
  };
}

export function resolvePersistedScore(
  attendedScore: number | null | undefined,
  logData: Record<string, unknown> | null | undefined,
): number | null {
  if (attendedScore != null && attendedScore !== '') {
    return Number(attendedScore);
  }
  if (logData?.score != null && logData.score !== '') {
    return Number(logData.score);
  }
  return null;
}

export function userAnswersFromLogDataEntries(
  logData: Record<string, unknown> | null | undefined,
  questions: PlayableQuizQuestion[],
): string[] {
  const fromLog = normalizeQuestionsAndAnswersFromLogData(logData);
  if (fromLog) {
    return fromLog.userAnswers;
  }
  return Array.from({ length: questions.length }, () => '');
}

export function normalizeAttendedQuizResponse(
  attended: AttendedQuizResponse,
): NormalizedPersistedQuizResult {
  const logData = (attended.log_data as Record<string, unknown> | null) ?? null;
  const fromLog = normalizeQuestionsAndAnswersFromLogData(logData);

  if (fromLog) {
    return {
      ...fromLog,
      score: resolvePersistedScore(attended.score, logData),
      timeSpentSeconds: attended.time_spent_seconds,
      completedAt: attended.submitted_at,
    };
  }

  if (attended.items?.length) {
    const questions: PlayableQuizQuestion[] = attended.items.map((item, index) => ({
      id: `q-${index}`,
      question: item.question,
      options: item.options ?? [],
      answer: item.answer_key ?? '',
      correctAnswer: item.answer_key ?? '',
      explanation: null,
    }));
    const userAnswers = attended.items.map((item) =>
      letterOrTextToDisplayAnswer(item.student_answer, item.options ?? []),
    );
    return {
      questions,
      userAnswers,
      score: resolvePersistedScore(attended.score, logData),
      logData,
      timeSpentSeconds: attended.time_spent_seconds,
      completedAt: attended.submitted_at,
    };
  }

  return {
    questions: [],
    userAnswers: [],
    score: resolvePersistedScore(attended.score, logData),
    logData,
    timeSpentSeconds: attended.time_spent_seconds,
    completedAt: attended.submitted_at,
  };
}
