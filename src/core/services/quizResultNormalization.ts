/**
 * Central normalization for persisted quiz results (student + teacher paths).
 */

import type { AttendedQuizQuestion, AttendedQuizResponse } from '../types/attendedQuiz.types';
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

function readLogAnswerEntries(
  logData: Record<string, unknown> | null | undefined,
): LogAnswerEntry[] {
  const answersRaw = logData?.answers;
  if (!Array.isArray(answersRaw)) {
    return [];
  }
  return answersRaw as LogAnswerEntry[];
}

function normalizeQuestionText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function logEntryHasQuestionStructure(entry: LogAnswerEntry): boolean {
  return (
    normalizeQuestionText(entry.question).length > 0 &&
    Array.isArray(entry.options) &&
    entry.options.length > 0
  );
}

function logAnswersHaveSufficientQuestionData(entries: LogAnswerEntry[]): boolean {
  return entries.length > 0 && entries.every(logEntryHasQuestionStructure);
}

function attendedItemsHaveQuestionStructure(
  items: AttendedQuizQuestion[] | undefined,
): items is AttendedQuizQuestion[] {
  if (!items?.length) {
    return false;
  }
  return items.every((item) => normalizeQuestionText(item.question).length > 0);
}

function extractUserAnswer(entry: LogAnswerEntry | undefined, options: string[]): string {
  if (!entry) return '';
  const raw = entry.userAnswer ?? entry.user_answer ?? entry.selected_option ?? null;
  return letterOrTextToDisplayAnswer(raw, options);
}

function isUsableMergedAnswer(answer: string): boolean {
  return answer.trim() !== '';
}

function matchLogEntryToQuestion(
  questionText: string,
  index: number,
  entries: LogAnswerEntry[],
  verifiedOrder: boolean,
): LogAnswerEntry | undefined {
  const targetText = normalizeQuestionText(questionText);
  if (targetText) {
    const textMatches = entries.filter(
      (entry) => normalizeQuestionText(entry.question) === targetText,
    );
    if (textMatches.length === 1) {
      return textMatches[0];
    }
  }

  const numbered = entries.filter((entry) => Number(entry.questionNumber) === index + 1);
  if (numbered.length === 1) {
    return numbered[0];
  }

  if (verifiedOrder) {
    return entries[index];
  }

  return undefined;
}

function questionsFromAttendedItems(items: AttendedQuizQuestion[]): PlayableQuizQuestion[] {
  return items.map((item, index) => ({
    id: `q-${index}`,
    question: item.question,
    options: item.options ?? [],
    answer: item.answer_key ?? '',
    correctAnswer: item.answer_key ?? '',
    explanation: null,
  }));
}

function mergeUserAnswersOntoQuestions(
  questions: PlayableQuizQuestion[],
  items: AttendedQuizQuestion[] | undefined,
  entries: LogAnswerEntry[],
): string[] {
  const verifiedOrder = entries.length === questions.length;
  return questions.map((question, index) => {
    const item = items?.[index];
    const attendedAnswer = letterOrTextToDisplayAnswer(
      item?.student_answer,
      question.options ?? [],
    );
    const matched = matchLogEntryToQuestion(question.question, index, entries, verifiedOrder);
    if (matched) {
      const fromLog = extractUserAnswer(matched, question.options ?? []);
      if (isUsableMergedAnswer(fromLog)) {
        return fromLog;
      }
    }
    return attendedAnswer;
  });
}

function scoreFromUnknown(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeQuestionsAndAnswersFromLogData(
  logData: Record<string, unknown> | null | undefined,
): NormalizedPersistedQuizResult | null {
  const entries = readLogAnswerEntries(logData);
  if (!logAnswersHaveSufficientQuestionData(entries)) {
    return null;
  }

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

  const userAnswers = entries.map((entry, index) =>
    extractUserAnswer(entry, questions[index]?.options ?? []),
  );

  return {
    questions,
    userAnswers,
    score: scoreFromUnknown(logData?.score),
    logData: logData ?? null,
    timeSpentSeconds:
      typeof logData?.time_spent_seconds === 'number' ? logData.time_spent_seconds : null,
    completedAt: null,
  };
}

export function resolvePersistedScore(
  attendedScore: number | null | undefined,
  logData: Record<string, unknown> | null | undefined,
): number | null {
  if (attendedScore != null) {
    return Number(attendedScore);
  }
  return scoreFromUnknown(logData?.score);
}

/** Prefer attended time; fall back to log time_spent_seconds or log duration (seconds). */
export function resolvePersistedTimeSpentSeconds(
  attendedSeconds: number | null | undefined,
  logData: Record<string, unknown> | null | undefined,
): number | null {
  if (typeof attendedSeconds === 'number' && Number.isFinite(attendedSeconds)) {
    return attendedSeconds;
  }
  if (typeof logData?.time_spent_seconds === 'number' && Number.isFinite(logData.time_spent_seconds)) {
    return logData.time_spent_seconds;
  }
  if (typeof logData?.duration === 'number' && Number.isFinite(logData.duration)) {
    return logData.duration;
  }
  return null;
}

export function userAnswersFromLogDataEntries(
  logData: Record<string, unknown> | null | undefined,
  questions: PlayableQuizQuestion[],
): string[] {
  const entries = readLogAnswerEntries(logData);
  return mergeUserAnswersOntoQuestions(questions, undefined, entries);
}

export function normalizeAttendedQuizResponse(
  attended: AttendedQuizResponse,
): NormalizedPersistedQuizResult | null {
  const logData = (attended.log_data as Record<string, unknown> | null) ?? null;
  const entries = readLogAnswerEntries(logData);
  const meta = {
    score: resolvePersistedScore(attended.score, logData),
    logData,
    timeSpentSeconds: resolvePersistedTimeSpentSeconds(attended.time_spent_seconds, logData),
    completedAt: attended.submitted_at,
  };

  if (attendedItemsHaveQuestionStructure(attended.items)) {
    const questions = questionsFromAttendedItems(attended.items);
    return {
      questions,
      userAnswers: mergeUserAnswersOntoQuestions(questions, attended.items, entries),
      ...meta,
    };
  }

  const fromLog = normalizeQuestionsAndAnswersFromLogData(logData);
  if (fromLog) {
    return {
      ...fromLog,
      ...meta,
      score: meta.score,
    };
  }

  return null;
}
