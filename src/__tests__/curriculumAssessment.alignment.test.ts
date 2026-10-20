import {
  buildCurriculumQuizGenerateRequest,
  deriveVersionOptions,
} from '../core/services/curriculumAssessment.service';

describe('curriculumAssessment alignment contracts', () => {
  const contexts = [
    {
      board: { code: 'CBSE', label: 'CBSE' },
      grade: { code: '9', label: 'Class 9' },
      subject: { code: 'MAT', label: 'Mathematics' },
      curriculum_code: 'CBSE-9-MAT',
      version_label: '2026-27',
      is_current: true,
    },
  ];

  it('derives version labels for board/class/subject', () => {
    expect(deriveVersionOptions(contexts, 'CBSE', '9', 'MAT')).toEqual(['2026-27']);
  });

  it('keeps registry quiz/generate builder for non-From-Books callers', () => {
    const payload = buildCurriculumQuizGenerateRequest({
      boardCode: 'CBSE',
      gradeCode: '9',
      gradeLabel: 'Class 9',
      subjectCode: 'MAT',
      subjectLabel: 'Mathematics',
      versionLabel: '2026-27',
      unitCode: 'U1',
      unitTitle: 'Number Systems',
      count: 10,
      level: 'medium',
    });
    expect(payload.curriculum_context.unit_code).toBe('U1');
    expect(payload.class).toBe('Class 9');
    expect(payload.type).toBe('document');
    expect(payload.count).toBe(10);
  });
});
