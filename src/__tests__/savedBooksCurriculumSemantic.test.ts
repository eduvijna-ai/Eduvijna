/**
 * Saved Books ↔ Curriculum semantic binding (Quiz-React origin/main 21f9a1d fixtures).
 */
import {
  bindSavedBooksSelectionToCatalog,
  EMPTY_CURRICULUM_TOPIC_REFINEMENTS_MESSAGE,
  findUniqueUnitCodeForSavedBookTopic,
  formatSchoolGradeDocumentLabel,
  normalizeGradeToken,
} from '../core/services/savedBooksCurriculumSemantic';
import { deriveCurrentVersionOptions } from '../core/services/curriculumAssessment.service';
import type { CurriculumCatalogContext } from '../core/services/curriculumAssessment.service';

const cbse10MathContexts: CurriculumCatalogContext[] = [
  {
    board: { code: 'BRD_0001', label: 'CBSE' },
    grade: { code: '10', label: 'Class X' },
    subject: { code: 'mathematics', label: 'Mathematics' },
    curriculum_code: 'CBSE-10-MATHEMATICS-2026-27',
    version_label: '2026-27',
    is_current: true,
  },
  {
    board: { code: 'BRD_0001', label: 'CBSE' },
    grade: { code: '10', label: 'Class X' },
    subject: { code: 'mathematics', label: 'Mathematics' },
    curriculum_code: 'CBSE-10-MATHEMATICS-2025-26',
    version_label: '2025-26',
    is_current: false,
  },
];

describe('grade identity normalization (web 21f9a1d)', () => {
  it('maps Class 10, Class X, and Grade 10 to grade code 10', () => {
    expect(normalizeGradeToken('Class 10')).toBe('10');
    expect(normalizeGradeToken('Class X')).toBe('10');
    expect(normalizeGradeToken('Grade 10')).toBe('10');
    expect(normalizeGradeToken('X')).toBe('10');
  });

  it('formats document class label as Class 10 (X)', () => {
    expect(formatSchoolGradeDocumentLabel('10', 'Class X')).toBe('Class 10 (X)');
    expect(formatSchoolGradeDocumentLabel('10', 'Class 10')).toBe('Class 10 (X)');
  });
});

describe('current version auto-select inputs', () => {
  it('returns single current version 2026-27 for CBSE / 10 / mathematics', () => {
    const versions = deriveCurrentVersionOptions(
      cbse10MathContexts,
      'BRD_0001',
      '10',
      'mathematics',
    );
    expect(versions).toEqual(['2026-27']);
  });
});

describe('OFF → ON Saved Books semantic rebind', () => {
  it('binds CBSE / Class 10 / Mathematics to BRD_0001 / 10 / mathematics', () => {
    expect(
      bindSavedBooksSelectionToCatalog(
        'CBSE',
        'Class 10',
        'Mathematics',
        cbse10MathContexts,
      ),
    ).toEqual({
      boardCode: 'BRD_0001',
      gradeCode: '10',
      subjectCode: 'mathematics',
    });
  });

  it('binds Class X equivalently to grade code 10', () => {
    expect(
      bindSavedBooksSelectionToCatalog('CBSE', 'Class X', 'Mathematics', cbse10MathContexts),
    ).toMatchObject({ gradeCode: '10' });
  });
});

describe('optional unit preselect from saved-book topic', () => {
  it('matches unique unit title only and never treats units as refinements', () => {
    const units = [
      { unit_code: 'MATH-X-III', title: 'Coordinate Geometry' },
      { unit_code: 'MATH-X-IV', title: 'Trigonometry' },
    ];
    expect(findUniqueUnitCodeForSavedBookTopic(units, 'Trigonometry')).toBe('MATH-X-IV');
    expect(findUniqueUnitCodeForSavedBookTopic(units, 'Geometry')).toBeNull();
  });
});

describe('empty refinement UX copy', () => {
  it('uses explanatory curriculum-unit message', () => {
    expect(EMPTY_CURRICULUM_TOPIC_REFINEMENTS_MESSAGE).toMatch(/curriculum unit/i);
    expect(EMPTY_CURRICULUM_TOPIC_REFINEMENTS_MESSAGE).not.toMatch(/^No options available$/i);
  });
});
