/**
 * Central normalization for persisted quiz results (student + teacher paths).
 */

import type { AttendedQuizQuestion, AttendedQuizResponse } from '../types/attendedQuiz.types';
import { tryNormalizeWorksheetAttended } from './worksheetPersistedResult';
import {
  resolvePersistedScore,
  resolvePersistedTimeSpentSeconds,
} from './persistedResultMetadata';
import {
  letterToOptionString,
  type LetterOption,
  type PlayableQuizQuestion,
} from '../utils/answerMappingUtils';
import {
  isAnswerIdentityAligned,
  isAttemptAnswerIdentityV1,
  userAnswersArrayFromIdentity,
  type AttemptAnswerIdentityV1,
} from '../utils/attemptAnswerIdentity';

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
  userAnswerText?: string | null;
  user_answer?: string | null;
  selected_option?: string | null;
  selectedDisplayIndex?: number | null;
  correctDisplayIndex?: number | null;
  isCorrect?: boolean | null;
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
  // Prefer display text frozen at submit (survives letter/text/shuffle reopen).
  if (entry.userAnswerText != null && String(entry.userAnswerText).trim() !== '') {
    return String(entry.userAnswerText);
  }
  if (
    typeof entry.selectedDisplayIndex === 'number' &&
    entry.selectedDisplayIndex >= 0 &&
    entry.selectedDisplayIndex < options.length
  ) {
    return options[entry.selectedDisplayIndex];
  }
  const raw = entry.userAnswer ?? entry.user_answer ?? entry.selected_option ?? null;
  return letterOrTextToDisplayAnswer(raw, options);
}

function readAnswerIdentity(
  logData: Record<string, unknown> | null | undefined,
): AttemptAnswerIdentityV1 | null {
  const raw = logData?.answer_identity ?? logData?.answerIdentity;
  return isAttemptAnswerIdentityV1(raw) ? raw : null;
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
    attendedIsCorrect: item.is_correct ?? null,
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

export function normalizeQuestionsAndAnswersFromLogData(
  logData: Record<string, unknown> | null | undefined,
): NormalizedPersistedQuizResult | null {
  const identity = readAnswerIdentity(logData);
  if (identity && identity.questions.length > 0) {
    const questions: PlayableQuizQuestion[] = identity.questions.map((snap, index) => {
      const entry = readLogAnswerEntries(logData)[index];
      const options = snap.optionsDisplayed?.length
        ? snap.optionsDisplayed
        : Array.isArray(entry?.options)
          ? entry.options
          : [];
      const correctRaw =
        snap.correct?.displayText ??
        entry?.correctAnswer ??
        '';
      const correctDisplayIndex = snap.correct?.displayIndex;
      return {
        id: snap.questionId || `q-${index}`,
        question: snap.questionText || entry?.question || '',
        options,
        answer: correctRaw,
        correctAnswer: correctRaw,
        correctOptionIndex:
          typeof correctDisplayIndex === 'number' ? correctDisplayIndex : undefined,
        optionOrder: snap.optionOrder,
        originalOptions: snap.originalOptions,
        attendedIsCorrect: snap.isCorrect,
        gradingFrozen: true,
        explanation: null,
      };
    });
    return {
      questions,
      userAnswers: userAnswersArrayFromIdentity(identity),
      score: resolvePersistedScore(undefined, logData),
      logData: logData ?? null,
      timeSpentSeconds:
        typeof logData?.time_spent_seconds === 'number' ? logData.time_spent_seconds : null,
      completedAt: null,
    };
  }

  const entries = readLogAnswerEntries(logData);
  if (!logAnswersHaveSufficientQuestionData(entries)) {
    return null;
  }

  const questions: PlayableQuizQuestion[] = entries.map((entry, index) => {
    const options = Array.isArray(entry.options) ? entry.options : [];
    const correctRaw = entry.correctAnswer ?? '';
    const correctDisplayIndex =
      typeof entry.correctDisplayIndex === 'number' ? entry.correctDisplayIndex : undefined;
    return {
      id: `q-${index}`,
      question: entry.question ?? '',
      options,
      answer: correctRaw,
      correctAnswer: correctRaw,
      correctOptionIndex: correctDisplayIndex,
      attendedIsCorrect: typeof entry.isCorrect === 'boolean' ? entry.isCorrect : null,
      gradingFrozen: true,
      explanation: null,
    };
  });

  const userAnswers = entries.map((entry, index) =>
    extractUserAnswer(entry, questions[index]?.options ?? []),
  );

  return {
    questions,
    userAnswers,
    score: resolvePersistedScore(undefined, logData),
    logData: logData ?? null,
    timeSpentSeconds:
      typeof logData?.time_spent_seconds === 'number' ? logData.time_spent_seconds : null,
    completedAt: null,
  };
}

export { resolvePersistedScore, resolvePersistedTimeSpentSeconds } from './persistedResultMetadata';

export function userAnswersFromLogDataEntries(
  logData: Record<string, unknown> | null | undefined,
  questions: PlayableQuizQuestion[],
): string[] {
  const identity = readAnswerIdentity(logData);
  if (identity && identity.questions.length === questions.length) {
    return userAnswersArrayFromIdentity(identity);
  }
  const entries = readLogAnswerEntries(logData);
  return mergeUserAnswersOntoQuestions(questions, undefined, entries);
}

export function normalizeAttendedQuizResponse(
  attended: AttendedQuizResponse,
): NormalizedPersistedQuizResult | null {
  const worksheetNormalized = tryNormalizeWorksheetAttended(attended);
  if (worksheetNormalized) {
    return worksheetNormalized;
  }

  const logData = (attended.log_data as Record<string, unknown> | null) ?? null;
  const entries = readLogAnswerEntries(logData);
  const meta = {
    score: resolvePersistedScore(attended.score, logData),
    logData,
    timeSpentSeconds: resolvePersistedTimeSpentSeconds(attended.time_spent_seconds, logData),
    completedAt: attended.submitted_at,
  };

  const identity = readAnswerIdentity(logData);
  const referenceTexts =
    attendedItemsHaveQuestionStructure(attended.items)
      ? attended.items.map((item) => item.question)
      : entries.length > 0 && entries.every((e) => String(e.question ?? '').trim())
        ? entries.map((e) => String(e.question))
        : [];
  // Prefer frozen identity when structurally valid. If attended/log texts exist, require
  // in-order text alignment so same-count foreign/reordered snapshots cannot win.
  const identityUsable =
    !!identity &&
    (referenceTexts.length === 0 || isAnswerIdentityAligned(identity, referenceTexts));
  if (identityUsable) {
    try {
      const fromIdentity = normalizeQuestionsAndAnswersFromLogData(logData);
      if (
        fromIdentity &&
        (referenceTexts.length === 0 ||
          fromIdentity.questions.length === referenceTexts.length)
      ) {
        return {
          ...fromIdentity,
          ...meta,
          score: meta.score,
        };
      }
    } catch {
      // Malformed identity must not break reopen — fall through to attended/log.
    }
  }

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
