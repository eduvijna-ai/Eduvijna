/**
 * Frontend-only semantic binding for Saved Books ↔ Curriculum Registry (ADR-034).
 * Mirrors Quiz-React savedBooksCurriculumSemantic.ts (origin/main 21f9a1d) — no fuzzy matching.
 */

import type { CurriculumCatalogContext, CurriculumResolveUnit } from './curriculumAssessment.service';

const ROMAN_TO_GRADE: Record<string, string> = {
  i: '1',
  ii: '2',
  iii: '3',
  iv: '4',
  v: '5',
  vi: '6',
  vii: '7',
  viii: '8',
  ix: '9',
  x: '10',
  xi: '11',
  xii: '12',
};

const GRADE_TO_ROMAN: Record<string, string> = Object.fromEntries(
  Object.entries(ROMAN_TO_GRADE).map(([roman, grade]) => [grade, roman.toUpperCase()]),
);

const GRADE_TOKEN_RE =
  /^(?:class|grade|std|standard)?[\s.\-_/]*(?<token>[ivxlcdm]+|\d{1,2})$/i;

const SUBJECT_ALIASES: Record<string, string> = {
  mathematics: 'mathematics',
  math: 'mathematics',
  maths: 'mathematics',
  science: 'science',
  english: 'english',
  'english language and literature': 'english',
  'english language & literature': 'english',
  physics: 'physics',
  chemistry: 'chemistry',
  telugu: 'telugu',
  evs: 'evs',
  'environmental studies': 'evs',
  'environmental science': 'evs',
  general_science: 'general_science',
  'general science': 'general_science',
  physical_science: 'physical_science',
  'physical science': 'physical_science',
  biological_science: 'biological_science',
  'biological science': 'biological_science',
  social_studies: 'social_studies',
  'social studies': 'social_studies',
  'social science': 'social_studies',
};

const BOARD_ALIASES: Record<string, string> = {
  brd_0001: 'BRD_0001',
  cbse: 'BRD_0001',
  'central board of secondary education': 'BRD_0001',
  'central board of secondary education (cbse)': 'BRD_0001',
  brd_tgbie: 'BRD_TGBIE',
  tgbie: 'BRD_TGBIE',
  tsbie: 'BRD_TGBIE',
  'telangana board of intermediate education': 'BRD_TGBIE',
  'telangana state board of intermediate education': 'BRD_TGBIE',
  'telangana intermediate': 'BRD_TGBIE',
  ts_scert: 'TS_SCERT',
  'scert telangana': 'TS_SCERT',
  'telangana scert': 'TS_SCERT',
  'state council of educational research and training telangana': 'TS_SCERT',
};

const IPE_GRADE_ALIASES: Record<string, string> = {
  'intermediate 1st year': 'INTERMEDIATE_1',
  'inter 1st year': 'INTERMEDIATE_1',
  '1st year intermediate': 'INTERMEDIATE_1',
  'first year intermediate': 'INTERMEDIATE_1',
  'ipe 1st year': 'INTERMEDIATE_1',
  intermediate_1: 'INTERMEDIATE_1',
  'intermediate 2nd year': 'INTERMEDIATE_2',
  'inter 2nd year': 'INTERMEDIATE_2',
  '2nd year intermediate': 'INTERMEDIATE_2',
  'second year intermediate': 'INTERMEDIATE_2',
  'ipe 2nd year': 'INTERMEDIATE_2',
  intermediate_2: 'INTERMEDIATE_2',
};

const SCHOOL_GRADE_TO_IPE: Record<string, string> = {
  '11': 'INTERMEDIATE_1',
  '12': 'INTERMEDIATE_2',
};

function fold(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

/** Deterministic grade code (1–12 school, INTERMEDIATE_* for IPE aliases). */
export function normalizeGradeToken(value: string | null | undefined): string | null {
  const text = (value || '').trim();
  if (!text) return null;

  const folded = fold(text);
  if (folded in IPE_GRADE_ALIASES) {
    return IPE_GRADE_ALIASES[folded];
  }

  const stripped = text.trim().replace(/^[[({\s]+|[\s)\]}]+$/g, '');
  const match = GRADE_TOKEN_RE.exec(stripped.replace(/\s{2,}/g, ' '));
  let schoolGrade: string | null = null;
  if (match?.groups?.token) {
    const token = match.groups.token.toLowerCase();
    if (/^\d{1,2}$/.test(token)) {
      const grade = String(parseInt(token, 10));
      if (grade in GRADE_TO_ROMAN) schoolGrade = grade;
    } else {
      schoolGrade = ROMAN_TO_GRADE[token] ?? null;
    }
  }
  if (schoolGrade === null) {
    if (/^\d{1,2}$/.test(folded)) {
      const grade = String(parseInt(folded, 10));
      if (grade in GRADE_TO_ROMAN) schoolGrade = grade;
    } else {
      schoolGrade = ROMAN_TO_GRADE[folded] ?? null;
    }
  }
  if (schoolGrade === null) return null;
  return SCHOOL_GRADE_TO_IPE[schoolGrade] ?? schoolGrade;
}

export function gradesEquivalent(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeGradeToken(left);
  const b = normalizeGradeToken(right);
  return a !== null && a === b;
}

export function normalizeSubjectFamily(value: string | null | undefined): string | null {
  const folded = fold(value);
  if (!folded) return null;
  if (folded in SUBJECT_ALIASES) return SUBJECT_ALIASES[folded];
  const bare = folded.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return SUBJECT_ALIASES[bare] ?? null;
}

export function subjectsEquivalent(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeSubjectFamily(left);
  const b = normalizeSubjectFamily(right);
  if (a !== null && a === b) return true;
  const lf = fold(left);
  const rf = fold(right);
  return Boolean(lf) && lf === rf;
}

export function normalizeBoardCode(value: string | null | undefined): string | null {
  const folded = fold(value);
  if (!folded) return null;
  if (folded in BOARD_ALIASES) return BOARD_ALIASES[folded];
  const upper = (value || '').trim().toUpperCase();
  if (upper.startsWith('BRD_') && upper !== 'BRD_0001') return upper;
  return null;
}

export function boardsEquivalent(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeBoardCode(left);
  const b = normalizeBoardCode(right);
  if (a !== null && b !== null) return a === b;
  const lf = fold(left);
  const rf = fold(right);
  return Boolean(lf) && lf === rf;
}

/** Document workflow display: numeric class with official Roman where applicable. */
export function formatSchoolGradeDocumentLabel(
  gradeCode: string,
  catalogLabel?: string,
): string {
  const n = Number(gradeCode);
  if (!Number.isInteger(n) || n < 1 || n > 12) {
    return catalogLabel?.trim() || gradeCode;
  }
  const roman = GRADE_TO_ROMAN[String(n)]?.toUpperCase();
  const numericLabel = `Class ${n}`;
  if (!roman) return catalogLabel?.trim() || numericLabel;
  if (!catalogLabel?.trim()) return `${numericLabel} (${roman})`;
  const folded = catalogLabel.trim().toLowerCase();
  if (
    folded === `class ${n}` ||
    folded === `grade ${n}` ||
    folded === `class ${roman.toLowerCase()}` ||
    folded === roman.toLowerCase()
  ) {
    return `${numericLabel} (${roman})`;
  }
  return catalogLabel.trim();
}

export interface SavedBooksCurriculumBinding {
  boardCode: string;
  gradeCode: string;
  subjectCode: string;
}

/** Bind Saved Books labels to catalog semantic codes when a matching context exists. */
export function bindSavedBooksSelectionToCatalog(
  boardLabel: string,
  classLabel: string,
  subjectLabel: string,
  contexts: CurriculumCatalogContext[],
): SavedBooksCurriculumBinding | null {
  if (!contexts.length) return null;

  let boardCode = normalizeBoardCode(boardLabel);
  if (!boardCode) {
    for (const ctx of contexts) {
      if (
        boardsEquivalent(boardLabel, ctx.board.code) ||
        boardsEquivalent(boardLabel, ctx.board.label)
      ) {
        boardCode = ctx.board.code;
        break;
      }
    }
  }

  const gradeCode = normalizeGradeToken(classLabel);
  let subjectCode = normalizeSubjectFamily(subjectLabel);

  if (!boardCode || !gradeCode) return null;

  if (!subjectCode) {
    for (const ctx of contexts) {
      if (
        ctx.board.code === boardCode &&
        ctx.grade.code === gradeCode &&
        subjectsEquivalent(subjectLabel, ctx.subject.code)
      ) {
        subjectCode = ctx.subject.code;
        break;
      }
      if (
        ctx.board.code === boardCode &&
        ctx.grade.code === gradeCode &&
        subjectsEquivalent(subjectLabel, ctx.subject.label)
      ) {
        subjectCode = ctx.subject.code;
        break;
      }
    }
  }

  if (!subjectCode) return null;

  const hasMatch = contexts.some(
    (ctx) =>
      ctx.board.code === boardCode &&
      ctx.grade.code === gradeCode &&
      ctx.subject.code === subjectCode,
  );
  if (!hasMatch) return null;

  return { boardCode, gradeCode, subjectCode };
}

/** Exact unique unit/chapter title match for optional OFF → ON unit preselect. */
export function findUniqueUnitCodeForSavedBookTopic(
  units: CurriculumResolveUnit[],
  topicLabel: string,
): string | null {
  const target = topicLabel.trim().toLowerCase();
  if (!target) return null;
  const matches = units.filter((u) => u.title.trim().toLowerCase() === target);
  if (matches.length === 1) return matches[0].unit_code;
  return null;
}

export const EMPTY_CURRICULUM_TOPIC_REFINEMENTS_MESSAGE =
  'No saved-book topic refinements are available for this curriculum unit. The selected Unit / Chapter will still be used for curriculum-aligned generation.';
