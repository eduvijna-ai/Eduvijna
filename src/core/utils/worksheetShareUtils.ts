/**
 * Worksheet share + interactive helpers — mirrors Quiz-React worksheetShareUtils.
 */

import type {
  WorksheetAnswers,
  WorksheetDataShape,
  WorksheetQuestionResult,
  WorksheetSectionKey,
} from '../types/worksheet.types';
import type { ParsedLogData, QuizAnswerLog } from '../types/quizAnalytics.types';
import { normalizeMcqOptionText } from './optionLabelUtils';

export const WORKSHEET_SUBMISSION_KEY = '__worksheet_submission__';

export interface WorksheetResponseShape {
  WorksheetData?: {
    Metadata?: {
      Subject?: string;
      Lesson?: string;
      Class?: string;
      Difficulty?: string;
      Focus_Instructions?: string;
    };
    Worksheet?: Record<string, unknown>;
    AnswerKey?: Record<string, unknown>;
  };
}

/** Count total questions across all worksheet sections. */
export function countWorksheetQuestions(worksheet: WorksheetResponseShape | null | undefined): number {
  const ws = worksheet?.WorksheetData?.Worksheet;
  if (!ws) return 0;

  let total = 0;
  const listSections = [
    'Section_A_MCQ',
    'Section_B_Fill_in_the_Blank',
    'Section_C_True_False',
    'Section_D_Short_Questions',
    'Section_F_Long_Questions',
  ] as const;

  listSections.forEach((key) => {
    const section = ws[key];
    if (Array.isArray(section)) total += section.length;
  });

  const pairs = (ws.Section_E_Matching as { Pairs?: unknown[] } | undefined)?.Pairs;
  if (Array.isArray(pairs)) total += pairs.length;

  return total;
}

/** Build share payload questions object preserving WorksheetData structure. */
export function buildWorksheetShareQuestions(worksheet: WorksheetResponseShape) {
  return {
    WorksheetData: worksheet.WorksheetData,
  };
}

export function worksheetShareTopic(worksheet: WorksheetResponseShape): string {
  const meta = worksheet.WorksheetData?.Metadata;
  if (!meta) return 'Worksheet';
  return [meta.Subject, meta.Lesson].filter(Boolean).join(' — ') || 'Worksheet';
}

export function encodeWorksheetSubmissionState(
  answers: WorksheetAnswers,
  evaluation: {
    results: WorksheetQuestionResult[];
    totalMarks: number;
    maxMarks: number;
    percentage: number;
  },
): Record<string, string> {
  return {
    [WORKSHEET_SUBMISSION_KEY]: JSON.stringify({ answers, evaluation }),
  };
}

export function decodeWorksheetSubmissionState(
  responses?: Record<string, string> | null,
): {
  answers: WorksheetAnswers;
  evaluation: {
    results: WorksheetQuestionResult[];
    totalMarks: number;
    maxMarks: number;
    percentage: number;
  };
} | null {
  if (!responses?.[WORKSHEET_SUBMISSION_KEY]) return null;
  try {
    return JSON.parse(responses[WORKSHEET_SUBMISSION_KEY]);
  } catch {
    return null;
  }
}

export function buildAnswersPayload(
  answers: WorksheetAnswers,
): Record<WorksheetSectionKey, Array<{ id: number; answer: string }>> {
  const payload = {} as Record<WorksheetSectionKey, Array<{ id: number; answer: string }>>;
  (Object.entries(answers) as [WorksheetSectionKey, Record<number, string>][]).forEach(
    ([section, sectionAnswers]) => {
      const items = Object.entries(sectionAnswers)
        .filter(([, val]) => val.trim())
        .map(([id, answer]) => ({ id: Number(id), answer }));
      if (items.length) payload[section] = items;
    },
  );
  return payload;
}

export function isWorksheetLogData(logData: unknown): boolean {
  if (!logData) return false;
  try {
    const parsed = typeof logData === 'string' ? JSON.parse(logData) : logData;
    return (
      (parsed as { assessment_type?: string })?.assessment_type === 'worksheet' ||
      !!(parsed as { worksheet_answers?: unknown })?.worksheet_answers
    );
  } catch {
    return false;
  }
}

export function worksheetAnswersFromLogData(
  logData?: Record<string, unknown> | null,
): WorksheetAnswers {
  const answers: WorksheetAnswers = {};
  const payload = logData?.worksheet_answers;
  if (!payload || typeof payload !== 'object') return answers;

  (Object.entries(payload) as [WorksheetSectionKey, Array<{ id: number; answer: string }>][]).forEach(
    ([section, items]) => {
      if (!Array.isArray(items)) return;
      answers[section] = {};
      items.forEach((item) => {
        if (item?.id != null) {
          answers[section]![item.id] = String(item.answer ?? '');
        }
      });
    },
  );
  return answers;
}

export function evaluationFromLogData(logData?: Record<string, unknown> | null): {
  results: WorksheetQuestionResult[];
  totalMarks: number;
  maxMarks: number;
  percentage: number;
} | null {
  if (!logData) return null;
  const evaluation = logData.evaluation as Record<string, unknown> | undefined;
  const results = (logData.results || evaluation?.results || []) as WorksheetQuestionResult[];
  if (!results.length && !evaluation) return null;

  const totalMarks = Number(logData.totalMarks ?? evaluation?.totalMarks ?? 0);
  const maxMarks = Number(logData.maxMarks ?? evaluation?.maxMarks ?? 0);
  const percentage = Number(evaluation?.percentage ?? logData.score ?? 0);

  return { results, totalMarks, maxMarks, percentage };
}

export function worksheetResponseFromReviewData(
  worksheetData: WorksheetResponseShape['WorksheetData'],
): WorksheetResponseShape {
  return {
    WorksheetData: worksheetData!,
  };
}

function findWorksheetQuestion(
  ws: WorksheetDataShape['Worksheet'],
  section: WorksheetSectionKey,
  id: number,
): Record<string, unknown> | undefined {
  if (section === 'Section_E_Matching') {
    const pairs = ws.Section_E_Matching?.Pairs;
    if (!Array.isArray(pairs)) return undefined;
    return pairs.find((pair, idx) => (pair.id ?? idx + 1) === id) as Record<string, unknown>;
  }
  const items = (ws as Record<string, unknown>)[section];
  if (!Array.isArray(items)) return undefined;
  return items.find((item: { id?: number }) => item.id === id) as Record<string, unknown>;
}

function findAnswerKeyItem(answerKey: Record<string, unknown>, section: string, id: number) {
  const sectionItems = answerKey[section];
  if (!Array.isArray(sectionItems)) return undefined;
  return sectionItems.find((item: { id?: number }) => item.id === id);
}

/** Map worksheet submission + content into quiz-style attempt review data. */
export function buildWorksheetParsedLogData(
  worksheet: WorksheetResponseShape,
  answers: WorksheetAnswers,
  evaluation: { results: WorksheetQuestionResult[] },
  timeSpentSeconds = 0,
  attemptId = 0,
): ParsedLogData {
  const ws = worksheet.WorksheetData!.Worksheet as WorksheetDataShape['Worksheet'];
  const answerKey = worksheet.WorksheetData!.AnswerKey || {};
  const results = evaluation.results || [];

  const answerLogs: QuizAnswerLog[] = results.map((result, index) => {
    const section = result.section as WorksheetSectionKey;
    const id = result.id;
    const questionItem = findWorksheetQuestion(ws, section, id);
    const keyItem = findAnswerKeyItem(answerKey as Record<string, unknown>, section, id);
    const userRaw = answers[section]?.[id]?.trim() || '';
    const userAnswer = userRaw || null;
    const isCorrect = Boolean(result.isCorrect);

    let question =
      (questionItem?.question as string) ||
      `${section.replace(/^Section_[A-Z]_/, '').replace(/_/g, ' ')} #${id}`;

    if (section === 'Section_E_Matching' && questionItem) {
      const left = (questionItem.term || questionItem.left || '') as string;
      question = left ? `Match: ${left}` : question;
    }

    if (section === 'Section_A_MCQ' && Array.isArray(questionItem?.options)) {
      const options = (questionItem.options as string[]).map((opt, oIdx) =>
        normalizeMcqOptionText(opt, oIdx, 'prefixed'),
      );
      const correctLetter = String(keyItem?.correctAnswer || '').trim().toUpperCase();
      const normalizedUser =
        userAnswer && /^[A-D]$/i.test(userAnswer) ? userAnswer.toUpperCase() : userAnswer;

      return {
        questionNumber: index + 1,
        question,
        options,
        correctAnswer: correctLetter,
        userAnswer: normalizedUser,
        isCorrect,
      };
    }

    if (section === 'Section_C_True_False') {
      const options = ['True', 'False'];
      const correctRaw = String(keyItem?.correctAnswer || '').trim();
      const correctIsFalse = correctRaw.toLowerCase() === 'false';
      const correctLetter = correctIsFalse ? 'B' : 'A';
      const userLetter =
        userAnswer?.toLowerCase() === 'false'
          ? 'B'
          : userAnswer?.toLowerCase() === 'true'
            ? 'A'
            : userAnswer;

      return {
        questionNumber: index + 1,
        question,
        options,
        correctAnswer: correctLetter,
        userAnswer: userLetter,
        isCorrect,
      };
    }

    const correctText = String(
      keyItem?.correctAnswer || keyItem?.modelAnswer || keyItem?.correctMatch || '',
    );

    return {
      questionNumber: index + 1,
      question,
      options: [],
      correctAnswer: '',
      userAnswer,
      isCorrect,
      isTextAnswer: true,
      correctAnswerText: correctText,
    };
  });

  return {
    answers: answerLogs,
    questionCount: answerLogs.length,
    time_spent_seconds: timeSpentSeconds,
    attempt_id: attemptId,
  };
}
