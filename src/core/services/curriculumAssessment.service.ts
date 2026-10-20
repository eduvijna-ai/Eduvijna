/**
 * Curriculum catalog + resolve helpers (Quiz-React document-quiz parity).
 * From Books generation uses saved-books APIs, not /quiz/generate.
 */
import { apiClient } from '../api/config';
import { formatSchoolGradeDocumentLabel } from './savedBooksCurriculumSemantic';

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
  unit_id?: string;
  unit_code: string;
  title: string;
  unit_type?: string;
  sequence_no?: number;
  parent_unit_id?: string | null;
  active?: boolean;
}

export async function getCurriculumCatalog(currentOnly: boolean | { currentOnly?: boolean } = true) {
  const enabled = typeof currentOnly === 'object' ? currentOnly.currentOnly !== false : currentOnly;
  const query = enabled ? '?current_only=true' : '?current_only=false';
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
  const map = new Map<string, string>();
  for (const ctx of contexts) {
    if (ctx.board?.code && !map.has(ctx.board.code)) {
      map.set(ctx.board.code, ctx.board.label);
    }
  }
  return Array.from(map.entries())
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function deriveGradeOptions(
  contexts: CurriculumCatalogContext[],
  boardCode: string,
): CurriculumCodeLabel[] {
  const map = new Map<string, string>();
  for (const ctx of contexts) {
    if (ctx.board?.code !== boardCode) continue;
    if (ctx.grade?.code && !map.has(ctx.grade.code)) {
      map.set(ctx.grade.code, formatSchoolGradeDocumentLabel(ctx.grade.code, ctx.grade.label));
    }
  }
  return Array.from(map.entries())
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function deriveSubjectOptions(
  contexts: CurriculumCatalogContext[],
  boardCode: string,
  gradeCode: string,
): CurriculumCodeLabel[] {
  const map = new Map<string, string>();
  for (const ctx of contexts) {
    if (ctx.board?.code !== boardCode || ctx.grade?.code !== gradeCode) continue;
    if (ctx.subject?.code && !map.has(ctx.subject.code)) {
      map.set(ctx.subject.code, ctx.subject.label);
    }
  }
  return Array.from(map.entries())
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function deriveVersionOptions(
  contexts: CurriculumCatalogContext[],
  boardCode: string,
  gradeCode: string,
  subjectCode: string,
): string[] {
  const versions = new Set<string>();
  for (const ctx of contexts) {
    if (
      ctx.board?.code === boardCode &&
      ctx.grade?.code === gradeCode &&
      ctx.subject?.code === subjectCode &&
      ctx.version_label
    ) {
      versions.add(ctx.version_label);
    }
  }
  return Array.from(versions).sort((a, b) => a.localeCompare(b));
}

/** Current (is_current) catalog versions for board + grade + subject. */
export function deriveCurrentVersionOptions(
  contexts: CurriculumCatalogContext[],
  boardCode: string,
  gradeCode: string,
  subjectCode: string,
): string[] {
  const versions = new Set<string>();
  for (const ctx of contexts) {
    if (
      ctx.is_current &&
      ctx.board.code === boardCode &&
      ctx.grade.code === gradeCode &&
      ctx.subject.code === subjectCode
    ) {
      versions.add(ctx.version_label);
    }
  }
  return Array.from(versions).sort((a, b) => a.localeCompare(b));
}

export function findCatalogContext(
  contexts: CurriculumCatalogContext[],
  boardCode: string,
  gradeCode: string,
  subjectCode: string,
  versionLabel: string,
): CurriculumCatalogContext | undefined {
  return contexts.find(
    (ctx) =>
      ctx.board?.code === boardCode &&
      ctx.grade?.code === gradeCode &&
      ctx.subject?.code === subjectCode &&
      ctx.version_label === versionLabel,
  );
}

export interface CurriculumQuizGenerateRequest {
  class: string;
  subject: string;
  lesson: string;
  level: string | number;
  count: number;
  itext?: string;
  type?: string;
  input_text?: string;
  language?: string;
  curriculum_context: {
    board_code: string;
    grade_code: string;
    subject_code: string;
    version_label: string;
    unit_code: string;
  };
  source_evidence?: Array<Record<string, unknown>>;
}

export function buildCurriculumQuizGenerateRequest(args: {
  boardCode: string;
  gradeCode: string;
  gradeLabel: string;
  subjectCode: string;
  subjectLabel: string;
  versionLabel: string;
  unitCode: string;
  unitTitle: string;
  inputText?: string;
  level?: string | number;
  count?: number;
  language?: string;
}): CurriculumQuizGenerateRequest {
  return {
    class: args.gradeLabel || args.gradeCode,
    subject: args.subjectLabel,
    lesson: args.unitTitle,
    level: args.level ?? 'medium',
    count: args.count ?? 10,
    type: 'document',
    input_text: args.inputText ?? '',
    language: args.language ?? 'en',
    curriculum_context: {
      board_code: args.boardCode,
      grade_code: args.gradeCode,
      subject_code: args.subjectCode,
      version_label: args.versionLabel,
      unit_code: args.unitCode,
    },
    source_evidence: [],
  };
}

export async function generateCurriculumQuiz(payload: CurriculumQuizGenerateRequest) {
  const res = await apiClient.post('/api/v1/quiz/generate', payload);
  return res.data;
}

/**
 * Registry-only path for AI Assessment alignment ON.
 * Document From Books must not call this — it uses saved-books/generate.
 */
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

const ROMAN_NUMERALS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
];

function toRomanUnitPrefix(sequenceNo: number | undefined): string | null {
  if (sequenceNo == null || sequenceNo < 1) return null;
  if (sequenceNo > ROMAN_NUMERALS.length) return `Unit ${sequenceNo}`;
  return `Unit ${ROMAN_NUMERALS[sequenceNo - 1]}`;
}

export interface HierarchicalUnitOption {
  unit_code: string;
  title: string;
  label: string;
  depth: number;
  unit_id?: string;
  parent_unit_id?: string | null;
  unit_type?: string;
  sequence_no?: number;
}

export function buildHierarchicalUnitOptions(
  units: CurriculumResolveUnit[],
): HierarchicalUnitOption[] {
  const active = (units || []).filter((u) => u.active !== false);
  const byId = new Map<string, CurriculumResolveUnit>();
  for (const unit of active) {
    if (unit.unit_id) byId.set(unit.unit_id, unit);
  }

  const childrenByParent = new Map<string, CurriculumResolveUnit[]>();
  const roots: CurriculumResolveUnit[] = [];
  for (const unit of active) {
    const parentId = unit.parent_unit_id || null;
    if (parentId && byId.has(parentId)) {
      const list = childrenByParent.get(parentId) || [];
      list.push(unit);
      childrenByParent.set(parentId, list);
    } else {
      roots.push(unit);
    }
  }

  const sortBySequence = (a: CurriculumResolveUnit, b: CurriculumResolveUnit) => {
    const sa = a.sequence_no ?? 0;
    const sb = b.sequence_no ?? 0;
    if (sa !== sb) return sa - sb;
    return a.unit_code.localeCompare(b.unit_code);
  };
  roots.sort(sortBySequence);
  for (const kids of childrenByParent.values()) {
    kids.sort(sortBySequence);
  }

  const options: HierarchicalUnitOption[] = [];
  const visit = (unit: CurriculumResolveUnit, depth: number) => {
    let label = unit.title;
    if (depth === 0 && (unit.unit_type || '').toLowerCase() === 'unit') {
      const prefix = toRomanUnitPrefix(unit.sequence_no);
      label = prefix ? `${prefix} — ${unit.title}` : unit.title;
    } else if (depth > 0) {
      label = `${'  '.repeat(depth)}↳ ${unit.title}`;
    }
    options.push({
      unit_code: unit.unit_code,
      title: unit.title,
      label,
      depth,
      unit_id: unit.unit_id,
      parent_unit_id: unit.parent_unit_id ?? null,
      unit_type: unit.unit_type,
      sequence_no: unit.sequence_no,
    });
    const kids = unit.unit_id ? childrenByParent.get(unit.unit_id) || [] : [];
    for (const child of kids) visit(child, depth + 1);
  };
  for (const root of roots) visit(root, 0);
  return options;
}
