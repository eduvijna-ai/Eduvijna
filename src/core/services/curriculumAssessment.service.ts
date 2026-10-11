/**
 * Curriculum catalog + generation (Quiz-React /document-quiz From Books parity).
 */
import { apiClient } from '../api/config';

export interface CurriculumCodeLabel {
  code: string;
  label: string;
}

export interface CurriculumCatalogContext {
  board: CurriculumCodeLabel;
  grade: CurriculumCodeLabel;
  subject: CurriculumCodeLabel;
  curriculum_code: string;
  version_label: string;
  is_current: boolean;
}

export interface CurriculumResolveUnit {
  unit_code: string;
  title: string;
  unit_type?: string;
  sequence_no?: number;
}

export async function getCurriculumCatalog(currentOnly = true) {
  const query = currentOnly ? '?current_only=true' : '?current_only=false';
  const res = await apiClient.get<{ contexts: CurriculumCatalogContext[]; count: number }>(
    `/api/v1/curriculum/catalog${query}`,
  );
  return res.data;
}

export async function resolveCurriculumByCodes(params: {
  board_code: string;
  grade_code: string;
  subject_code: string;
  version_label?: string;
  unit_code?: string;
}) {
  const search = new URLSearchParams();
  search.set('board_code', params.board_code);
  search.set('grade_code', params.grade_code);
  search.set('subject_code', params.subject_code);
  if (params.version_label) search.set('version_label', params.version_label);
  if (params.unit_code) search.set('unit_code', params.unit_code);
  const res = await apiClient.get<{ units: CurriculumResolveUnit[] }>(
    `/api/v1/curriculum/resolve-by-codes?${search.toString()}`,
  );
  return res.data;
}

export function deriveBoardOptions(contexts: CurriculumCatalogContext[]): CurriculumCodeLabel[] {
  const map = new Map<string, CurriculumCodeLabel>();
  for (const ctx of contexts) {
    if (ctx.board?.code) map.set(ctx.board.code, ctx.board);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function deriveGradeOptions(
  contexts: CurriculumCatalogContext[],
  boardCode: string,
): CurriculumCodeLabel[] {
  const map = new Map<string, CurriculumCodeLabel>();
  for (const ctx of contexts) {
    if (ctx.board?.code !== boardCode) continue;
    if (ctx.grade?.code) map.set(ctx.grade.code, ctx.grade);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function deriveSubjectOptions(
  contexts: CurriculumCatalogContext[],
  boardCode: string,
  gradeCode: string,
): CurriculumCatalogContext[] {
  return contexts.filter(
    (ctx) => ctx.board?.code === boardCode && ctx.grade?.code === gradeCode,
  );
}

export async function generateRegistryCurriculumQuiz(payload: {
  curriculum_context: {
    board_code: string;
    grade_code: string;
    subject_code: string;
    version_label: string;
    unit_code: string;
  };
  count: number;
  level: string;
  language: string;
  itext?: string;
  topic?: string;
  subtopic?: string;
}) {
  const res = await apiClient.post('/api/v1/quiz/generate-curriculum', payload);
  return res.data;
}
