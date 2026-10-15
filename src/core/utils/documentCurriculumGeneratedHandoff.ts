/**
 * From Books → generated assessment preview handoff (no uploaded book required).
 * Marker string is embedded in Metro bundles for engineering runtime verification.
 */
import { sanitizeQuizQuestions, type SanitizedQuizQuestion } from './quizQuestionUtils';

export const ENGINEERING_BUILD_MARKER = 'curriculum-generated-preview-v1';

export type CurriculumSource = 'Doc-File-Curriculum' | 'Doc-File-Assessment';

export type CurriculumGeneratedMeta = {
  alignmentEnabled: boolean;
  boardCode: string;
  gradeCode: string;
  subjectCode: string;
  versionLabel: string;
  unitCodes: string[];
  topicTitles: string;
  subtopics?: string[];
  language: string;
  additionalInstructions: string;
  level: string;
  count: number;
  title: string;
  classLabel: string;
  subjectLabel: string;
};

export type CurriculumGeneratedPreviewParams = {
  generationResponse: unknown;
  sessionId?: string | null;
  source: CurriculumSource;
  curriculumMeta: CurriculumGeneratedMeta;
  assessmentId?: number | null;
  outputMode?: 'quiz' | 'worksheet';
};

export function extractQuizArrayFromGenerationResponse(res: unknown): unknown[] {
  const r = res as Record<string, unknown>;
  if (Array.isArray(r?.quiz)) return r.quiz as unknown[];
  const data = r?.data as Record<string, unknown> | undefined;
  if (Array.isArray(data?.quiz)) return data.quiz as unknown[];
  if (Array.isArray(r?.questions)) return r.questions as unknown[];
  return [];
}

export function normalizeGeneratedQuizQuestions(res: unknown): SanitizedQuizQuestion[] {
  return sanitizeQuizQuestions(extractQuizArrayFromGenerationResponse(res));
}

export function buildCurriculumGeneratedPreviewParams(input: {
  generationResponse: unknown;
  sessionId?: string | null;
  source: CurriculumSource;
  curriculumMeta: CurriculumGeneratedMeta;
  assessmentId?: number | null;
}): CurriculumGeneratedPreviewParams {
  const questions = normalizeGeneratedQuizQuestions(input.generationResponse);
  if (questions.length === 0) {
    throw new Error('generation_response_empty');
  }
  return {
    generationResponse: input.generationResponse,
    sessionId: input.sessionId ?? null,
    source: input.source,
    curriculumMeta: input.curriculumMeta,
    assessmentId: input.assessmentId ?? null,
    outputMode: 'quiz',
  };
}

export function buildQuizDataFromPreview(
  params: CurriculumGeneratedPreviewParams,
  questions: SanitizedQuizQuestion[],
  assessmentId?: number | string | null,
) {
  const meta = params.curriculumMeta;
  return {
    id: assessmentId ?? params.sessionId ?? `curriculum-${Date.now()}`,
    title: meta.title,
    class: meta.classLabel,
    subject: meta.subjectLabel,
    difficulty: meta.level,
    lesson: meta.topicTitles,
    questions,
    regenerationParams: {
      type: 'document-upload',
      curriculumAlignment: meta.alignmentEnabled,
      curriculum_context: {
        board_code: meta.boardCode,
        grade_code: meta.gradeCode,
        subject_code: meta.subjectCode,
        version_label: meta.versionLabel,
        unit_codes: meta.unitCodes,
      },
      language: meta.language,
      itext: meta.additionalInstructions,
      level: meta.level,
      count: meta.count,
      source: params.source,
      sessionId: params.sessionId,
    },
  };
}
