/**
 * From Books API/payload contract fixtures derived from Quiz-React ContentService
 * + HandwrittenWorkspace builders (origin/main 21f9a1d), not from mobile internals.
 */
import {
  buildCurriculumSavedBooksGenerateParams,
  buildSavedBooksBoardsPath,
  buildSavedBooksClassesPath,
  buildSavedBooksCurriculumRefinementsPath,
  buildSavedBooksGenerateParams,
  buildSavedBooksSubtopicsPath,
  buildSavedBooksSubjectsPath,
  buildSavedBooksTopicsPath,
  buildTrustedGenerationJobStatusPath,
  fileFormValidationErrors,
  resolveSummaryFormat,
  SAVED_BOOKS_GENERATE_PATH,
} from '../core/services/savedBooksContent.service';

/** Hardcoded from Quiz-React ContentService query construction. */
const WEB_SAVED_BOOKS_URLS = {
  boards: '/api/v1/content/saved-books/boards?school_id=6',
  classes: '/api/v1/content/saved-books/classes?board_id=1&school_id=6',
  subjects: '/api/v1/content/saved-books/subjects?board_id=1&class_id=10&school_id=6',
  topics: '/api/v1/content/saved-books/topics?board_id=1&class_id=10&subject_id=5&school_id=6',
  subtopics:
    '/api/v1/content/saved-books/subtopics?board_id=1&class_id=10&subject_id=5&topics=Polynomials&school_id=6',
  refinements:
    '/api/v1/content/saved-books/curriculum-refinements?board_code=BRD_0001&grade_code=10&subject_code=mathematics&version_label=2026-27&unit_code=MATH-X-III&school_id=6',
  refinementsWithTopics:
    '/api/v1/content/saved-books/curriculum-refinements?board_code=BRD_0001&grade_code=10&subject_code=mathematics&version_label=2026-27&unit_code=MATH-X-III&school_id=6&topic=Polynomials&topic=Linear+Equations',
  generate: '/api/v1/content/saved-books/generate',
  jobStatus: '/api/v1/content/saved-books/generation-jobs/job-1?school_id=6',
};

const WEB_OFF_PAYLOAD = {
  generation_type: 'assessment',
  board_id: 1,
  board_name: 'CBSE',
  class_id: 10,
  class_name: 'Class 10',
  subject_id: 5,
  subject_name: 'Mathematics',
  topics: ['Polynomials'],
  subtopics: ['Zeros'],
  language: 'en',
  difficulty: 'mixed',
  num_questions: 5,
  additional_instructions: 'summary',
  school_id: 6,
  format_type: 'katex',
};

const WEB_ON_PAYLOAD = {
  generation_type: 'assessment',
  topics: ['Polynomials'],
  subtopics: [],
  language: 'en',
  difficulty: 'medium',
  num_questions: 5,
  additional_instructions: undefined,
  school_id: 6,
  curriculum_context: {
    board_code: 'BRD_0001',
    grade_code: '10',
    subject_code: 'mathematics',
    version_label: '2026-27',
    unit_code: 'MATH-X-III',
  },
};

describe('saved-books dropdown URL contract (web ContentService)', () => {
  it('matches boards/classes/subjects/topics/subtopics query keys', () => {
    expect(buildSavedBooksBoardsPath(6)).toBe(WEB_SAVED_BOOKS_URLS.boards);
    expect(buildSavedBooksClassesPath(1, 6)).toBe(WEB_SAVED_BOOKS_URLS.classes);
    expect(buildSavedBooksSubjectsPath(1, 10, 6)).toBe(WEB_SAVED_BOOKS_URLS.subjects);
    expect(buildSavedBooksTopicsPath(1, 10, 5, 6)).toBe(WEB_SAVED_BOOKS_URLS.topics);
    expect(buildSavedBooksSubtopicsPath(1, 10, 5, ['Polynomials'], 6)).toBe(
      WEB_SAVED_BOOKS_URLS.subtopics,
    );
  });

  it('omits school_id when not provided', () => {
    expect(buildSavedBooksBoardsPath()).toBe('/api/v1/content/saved-books/boards');
    expect(buildSavedBooksClassesPath(1)).toBe('/api/v1/content/saved-books/classes?board_id=1');
  });

  it('uses repeated topic params for curriculum-refinements (never numeric IDs)', () => {
    expect(
      buildSavedBooksCurriculumRefinementsPath({
        board_code: 'BRD_0001',
        grade_code: '10',
        subject_code: 'mathematics',
        version_label: '2026-27',
        unit_code: 'MATH-X-III',
        school_id: 6,
      }),
    ).toBe(WEB_SAVED_BOOKS_URLS.refinements);
    expect(
      buildSavedBooksCurriculumRefinementsPath({
        board_code: 'BRD_0001',
        grade_code: '10',
        subject_code: 'mathematics',
        version_label: '2026-27',
        unit_code: 'MATH-X-III',
        school_id: 6,
        topics: ['Polynomials', 'Linear Equations'],
      }),
    ).toBe(WEB_SAVED_BOOKS_URLS.refinementsWithTopics);
  });
});

describe('generate payload contract (web HandwrittenWorkspace builders)', () => {
  const board = { id: 1, label: 'CBSE' };
  const classItem = { id: 10, label: 'Class 10' };
  const subject = { id: 5, label: 'Mathematics' };

  it('Alignment OFF matches buildSavedBooksGenerateParams including format_type', () => {
    expect(resolveSummaryFormat('Mathematics')).toBe('katex');
    const payload = buildSavedBooksGenerateParams({
      board,
      classItem,
      subject,
      topics: ['Polynomials'],
      subtopics: ['Zeros'],
      language: 'en',
      difficulty: 'mixed',
      numQuestions: 5,
      additionalInstructions: 'summary',
      schoolId: 6,
    });
    expect(payload).toEqual(WEB_OFF_PAYLOAD);
    expect(payload.curriculum_context).toBeUndefined();
  });

  it('Alignment ON matches buildCurriculumSavedBooksGenerateParams and omits empty instructions', () => {
    const payload = buildCurriculumSavedBooksGenerateParams({
      topics: ['Polynomials'],
      subtopics: [],
      language: 'en',
      difficulty: 'medium',
      numQuestions: 5,
      additionalInstructions: '   ',
      schoolId: 6,
      curriculumContext: {
        board_code: 'BRD_0001',
        grade_code: '10',
        subject_code: 'mathematics',
        version_label: '2026-27',
        unit_code: 'MATH-X-III',
      },
    });
    expect(payload).toEqual(WEB_ON_PAYLOAD);
    expect(payload).not.toHaveProperty('board_id');
    expect(payload).not.toHaveProperty('format_type');
    expect(payload).not.toHaveProperty('input_text');
    expect(payload).not.toHaveProperty('source_evidence');
  });

  it('does not route From Books to quiz generate endpoints', () => {
    expect(SAVED_BOOKS_GENERATE_PATH).toBe(WEB_SAVED_BOOKS_URLS.generate);
    expect(SAVED_BOOKS_GENERATE_PATH).not.toContain('/quiz/generate');
  });

  it('requires topics + instructions in OFF mode only', () => {
    expect(
      fileFormValidationErrors({
        board,
        classItem,
        subject,
        topics: [],
        difficulty: 'medium',
        instructions: '',
      }),
    ).toEqual(['Select at least one Topic', 'Additional instructions are required']);
  });
});

describe('job status path contract', () => {
  it('appends school_id to trusted relative status URLs and rejects external hosts', () => {
    expect(
      buildTrustedGenerationJobStatusPath(
        'job-1',
        '/api/v1/content/saved-books/generation-jobs/job-1',
        6,
      ),
    ).toBe(WEB_SAVED_BOOKS_URLS.jobStatus);
    expect(
      buildTrustedGenerationJobStatusPath(
        'job-q',
        '/api/v1/content/saved-books/generation-jobs/job-q?foo=1',
        6,
      ),
    ).toBe('/api/v1/content/saved-books/generation-jobs/job-q?foo=1&school_id=6');
    expect(
      buildTrustedGenerationJobStatusPath(
        'job-ext',
        'https://evil.example/status',
        6,
      ),
    ).toBe('/api/v1/content/saved-books/generation-jobs/job-ext?school_id=6');
  });
});
