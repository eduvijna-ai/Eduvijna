/**
 * Durable saved-books generation polling — Quiz-React contentService.assessmentGenerationJobs.
 */
import { apiClient } from '../core/api/config';
import {
  ASSESSMENT_GENERATION_TIMEOUT_CODE,
  CURRICULUM_VERIFICATION_FAILED_CODE,
} from '../core/services/curriculumGenerationErrors';
import {
  generateFromSavedBooks,
  getAssessmentGenerationStageLabel,
  isTransientGenerationStatusError,
} from '../core/services/savedBooksContent.service';

jest.mock('../core/api/config', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const getMock = apiClient.get as jest.Mock;
const postMock = apiClient.post as jest.Mock;

const alignedResult = {
  success: true,
  generation_type: 'assessment',
  context_chunks: 2,
  quiz: [
    {
      question: 'What is a polynomial?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      explanation: 'def',
    },
  ],
  assessment_intelligence: {
    alignment_status: 'framework_verified',
    curriculum: { board: { label: 'CBSE' } },
    specification: { version_label: '2026-27' },
    selected_unit: { title: 'Polynomials', unit_code: 'MATH-IX-II-CH1' },
    warnings: [],
  },
};

const curriculumParams = {
  generation_type: 'assessment' as const,
  topics: [],
  school_id: 6,
  curriculum_context: {
    board_code: 'BRD_0001',
    grade_code: '9',
    subject_code: 'mathematics',
    version_label: '2026-27',
    unit_code: 'MATH-IX-II-CH1',
  },
  num_questions: 5,
};

describe('saved-books assessment generation jobs', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('POST sends Idempotency-Key header to saved-books/generate', async () => {
    postMock.mockResolvedValue({
      data: { success: true, generation_type: 'assessment', context_chunks: 0, quiz: [] },
    });
    await generateFromSavedBooks(curriculumParams, { idempotencyKey: 'fixed-key-1' });
    expect(postMock).toHaveBeenCalledWith(
      '/api/v1/content/saved-books/generate',
      expect.objectContaining({ generation_type: 'assessment' }),
      expect.objectContaining({
        headers: { 'Idempotency-Key': 'fixed-key-1' },
      }),
    );
  });

  it('legacy immediate result skips polling', async () => {
    postMock.mockResolvedValue({ data: alignedResult });
    const result = await generateFromSavedBooks(curriculumParams);
    expect(result.assessment_intelligence?.alignment_status).toBe('framework_verified');
    expect(getMock).not.toHaveBeenCalled();
  });

  it('accepted job polls trusted status URL with school_id and returns persisted result', async () => {
    postMock.mockResolvedValue({
      data: {
        accepted: true,
        job_id: 'job-1',
        status: 'queued',
        stage: 'queued',
        poll_after_ms: 1000,
        status_url: '/api/v1/content/saved-books/generation-jobs/job-1',
      },
    });
    getMock
      .mockResolvedValueOnce({
        data: { job_id: 'job-1', status: 'running', stage: 'generating', poll_after_ms: 1000 },
      })
      .mockResolvedValueOnce({
        data: { job_id: 'job-1', status: 'persisted', stage: 'completed', result: alignedResult },
      });

    const stages: string[] = [];
    const promise = generateFromSavedBooks(curriculumParams, {
      onStage: (stage) => {
        if (stage) stages.push(stage);
      },
    });

    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result.quiz?.[0]?.question).toBe('What is a polynomial?');
    expect(getMock).toHaveBeenCalledWith(
      '/api/v1/content/saved-books/generation-jobs/job-1?school_id=6',
      expect.objectContaining({ signal: undefined }),
    );
    expect(stages).toContain('queued');
    expect(stages).toContain('generating');
  });

  it('abort signal ignores later persisted completion', async () => {
    const controller = new AbortController();
    postMock.mockResolvedValue({
      data: {
        accepted: true,
        job_id: 'job-stale',
        status: 'queued',
        stage: 'queued',
        poll_after_ms: 1000,
        status_url: '/api/v1/content/saved-books/generation-jobs/job-stale',
      },
    });
    getMock.mockImplementation(async () => {
      if (controller.signal.aborted) {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        throw err;
      }
      return {
        data: { job_id: 'job-stale', status: 'persisted', result: alignedResult },
      };
    });

    const promise = generateFromSavedBooks(curriculumParams, { signal: controller.signal });
    const rejected = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    await jest.advanceTimersByTimeAsync(500);
    controller.abort();
    await jest.advanceTimersByTimeAsync(1000);
    await rejected;
  });

  it('maps failed job verification errors', async () => {
    postMock.mockResolvedValue({
      data: {
        accepted: true,
        job_id: 'job-fail',
        status: 'queued',
        poll_after_ms: 1000,
        status_url: '/api/v1/content/saved-books/generation-jobs/job-fail',
      },
    });
    getMock.mockResolvedValue({
      data: {
        job_id: 'job-fail',
        status: 'failed',
        error_code: CURRICULUM_VERIFICATION_FAILED_CODE,
        error_message: 'The assessment could not be fully verified against the selected curriculum.',
      },
    });
    const promise = generateFromSavedBooks(curriculumParams);
    const rejected = expect(promise).rejects.toMatchObject({
      code: CURRICULUM_VERIFICATION_FAILED_CODE,
    });
    await jest.advanceTimersByTimeAsync(1000);
    await rejected;
  });

  it('stage labels never invent percentages', () => {
    expect(getAssessmentGenerationStageLabel('queued')).toBe('Preparing assessment…');
    expect(getAssessmentGenerationStageLabel('verifying')).toBe('Verifying curriculum alignment…');
    expect(getAssessmentGenerationStageLabel('generating')).not.toMatch(/%/);
  });

  it('treats 502/503/504 as transient poll errors', () => {
    expect(isTransientGenerationStatusError({ response: { status: 503 } })).toBe(true);
    expect(isTransientGenerationStatusError({ name: 'AbortError' })).toBe(false);
    expect(ASSESSMENT_GENERATION_TIMEOUT_CODE).toBe('assessment_generation_timeout');
  });
});
