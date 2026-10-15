/**
 * Worksheet persisted result normalization (shared by student, teacher, analytics).
 */

import type { AttendedQuizResponse } from '../types/attendedQuiz.types';
import type { ParsedLogData, QuizAnswerLog } from '../types/quizAnalytics.types';
import type { PlayableQuizQuestion } from '../utils/answerMappingUtils';
import { letterToOptionString, type LetterOption } from '../utils/answerMappingUtils';
import {
  buildWorksheetParsedLogData,
  evaluationFromLogData,
  isWorksheetLogData,
  worksheetAnswersFromLogData,
  worksheetResponseFromReviewData,
} from '../utils/worksheetShareUtils';
import type { WorksheetDataShape } from '../types/worksheet.types';
import type { NormalizedPersistedQuizResult } from './quizResultNormalization';
import {
  resolvePersistedScore,
  resolvePersistedTimeSpentSeconds,
} from './persistedResultMetadata';

export type PersistedAssessmentKind = 'quiz' | 'worksheet';

export function isWorksheetAttendedResponse(attended: AttendedQuizResponse): boolean {
  if ((attended.assessment_type || '').toLowerCase() === 'worksheet') {
    return true;
  }
  if (attended.worksheet_data) {
    return true;
  }
  return isWorksheetLogData(attended.log_data);
}

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

export function normalizedResultFromWorksheetParsedLog(
  parsed: ParsedLogData,
  meta: {
    score: number | null;
    logData: Record<string, unknown> | null;
    timeSpentSeconds: number | null;
    completedAt: string | null;
  },
): NormalizedPersistedQuizResult {
  const questions: PlayableQuizQuestion[] = parsed.answers.map((entry, index) => {
    const extended = entry as QuizAnswerLog;
    if (extended.isTextAnswer) {
      const correctText = extended.correctAnswerText || '';
      return {
        id: `q-${index}`,
        question: entry.question,
        options: [],
        correctAnswer: correctText,
        answer: correctText,
        attendedIsCorrect: entry.isCorrect,
      };
    }
    return {
      id: `q-${index}`,
      question: entry.question,
      options: entry.options ?? [],
      correctAnswer: entry.correctAnswer,
      answer: entry.correctAnswer,
      attendedIsCorrect: entry.isCorrect,
    };
  });

  const userAnswers = parsed.answers.map((entry) =>
    letterOrTextToDisplayAnswer(entry.userAnswer, entry.options ?? []),
  );

  return {
    questions,
    userAnswers,
    ...meta,
  };
}

export function tryNormalizeWorksheetAttended(
  attended: AttendedQuizResponse,
): NormalizedPersistedQuizResult | null {
  if (!isWorksheetAttendedResponse(attended)) {
    return null;
  }

  const logData = (attended.log_data as Record<string, unknown> | null) ?? null;
  const evalState = evaluationFromLogData(logData);
  const answerState = worksheetAnswersFromLogData(logData);

  const worksheetData = attended.worksheet_data as WorksheetDataShape | null | undefined;
  if (!worksheetData?.Worksheet) {
    return null;
  }

  const worksheetResponse = worksheetResponseFromReviewData(worksheetData);
  const effectiveEval =
    evalState ?? (logData ? evaluationFromLogData(logData) : null);
  if (!effectiveEval?.results?.length) {
    return null;
  }

  const effectiveAnswers =
    Object.keys(answerState).length > 0
      ? answerState
      : worksheetAnswersFromLogData(logData);

  const parsed = buildWorksheetParsedLogData(
    worksheetResponse,
    effectiveAnswers,
    effectiveEval,
    resolvePersistedTimeSpentSeconds(attended.time_spent_seconds, logData) ?? 0,
    Number(logData?.attempt_id ?? 0),
  );

  return normalizedResultFromWorksheetParsedLog(parsed, {
    score: resolvePersistedScore(attended.score, logData),
    logData,
    timeSpentSeconds: resolvePersistedTimeSpentSeconds(attended.time_spent_seconds, logData),
    completedAt: attended.submitted_at,
  });
}
