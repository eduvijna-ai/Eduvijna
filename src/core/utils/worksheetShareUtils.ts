/**
 * Worksheet share + interactive helpers — mirrors Quiz-React worksheetShareUtils.
 */

import type {
  WorksheetAnswers,
  WorksheetQuestionResult,
  WorksheetSectionKey,
} from '../types/worksheet.types';

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
