/**
 * sharedApi.assessments.test.ts
 *
 * Tests the user-assessment CRUD API functions and worksheet generation.
 * All HTTP calls are intercepted by a mock of the apiClient.
 */

import {
  listUserAssessments,
  getUserAssessmentById,
  saveUserAssessment,
  deleteUserAssessment,
  generateWorksheet,
  type AssessmentListItem,
  type SaveAssessmentPayload,
} from '../core/services/sharedApi';
import { apiClient } from '../core/api/config';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── mock fixtures ───────────────────────────────────────────────────────────

const MOCK_ITEM: AssessmentListItem = {
  id: 1,
  title: 'Physics Quiz',
  subject: 'Physics',
  class_name: 'Class 10',
  level: 'medium',
  lesson: 'Optics',
  assessment_type: 'quiz',
  question_count: 10,
  created_at: '2026-05-01T10:00:00Z',
  source: 'document',
};

const MOCK_WORKSHEET_RESULT = {
  WorksheetData: {
    Metadata: { Subject: 'Physics', Lesson: 'Optics', Class: 'Class 10', Difficulty: 'medium' },
    Worksheet: {
      Section_A_MCQ: [
        { question: 'What is light?', options: ['A', 'B', 'C', 'D'] },
      ],
      Section_D_Short_Questions: [
        { question: 'Explain reflection.' },
      ],
    },
    AnswerKey: { Section_A_MCQ: ['A'], Section_D_Short_Questions: ['Light bounces back.'] },
  },
};

// ────────────────────────────────────────────────────────────────────────────
describe('listUserAssessments', () => {
  it('returns array when API responds with array', async () => {
    mockGet.mockResolvedValueOnce({ data: [MOCK_ITEM] });
    const result = await listUserAssessments('quiz');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('extracts items from data.items when API wraps the list', async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [MOCK_ITEM] } });
    const result = await listUserAssessments('quiz');
    expect(result).toHaveLength(1);
  });

  it('passes assessment_type query param', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await listUserAssessments('quiz');
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('assessment_type=quiz'),
    );
  });

  it('passes source query param', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await listUserAssessments(undefined, 'Worksheet');
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('source=Worksheet'),
    );
  });

  it('passes both params together', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await listUserAssessments('worksheet', 'Worksheet');
    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).toContain('assessment_type=worksheet');
    expect(calledUrl).toContain('source=Worksheet');
  });

  it('returns empty array on network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const result = await listUserAssessments('quiz');
    expect(result).toEqual([]);
  });

  it('returns empty array on 401 HTTP error', async () => {
    const err: any = new Error('Unauthorized');
    err.response = { status: 401 };
    mockGet.mockRejectedValueOnce(err);
    const result = await listUserAssessments('quiz');
    expect(result).toEqual([]);
  });

  it('returns empty array when API returns non-array, non-items-wrapped value', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await listUserAssessments();
    expect(result).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('getUserAssessmentById', () => {
  it('returns assessment detail on success', async () => {
    const detail = { ...MOCK_ITEM, questions: [{ question: 'Q1', options: [] }] };
    mockGet.mockResolvedValueOnce({ data: detail });
    const result = await getUserAssessmentById(1);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(1);
    expect(result?.questions).toHaveLength(1);
  });

  it('calls correct endpoint with the given id', async () => {
    mockGet.mockResolvedValueOnce({ data: { ...MOCK_ITEM, questions: [] } });
    await getUserAssessmentById(99);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/user-assessments/99');
  });

  it('returns null on network failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const result = await getUserAssessmentById(1);
    expect(result).toBeNull();
  });

  it('returns null on 404', async () => {
    const err: any = new Error('Not found');
    err.response = { status: 404 };
    mockGet.mockRejectedValueOnce(err);
    const result = await getUserAssessmentById(99);
    expect(result).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('saveUserAssessment', () => {
  const payload: SaveAssessmentPayload = {
    title: 'Test Quiz',
    subject: 'Physics',
    class_name: 'Class 10',
    level: 'medium',
    lesson: 'Optics',
    questions: [{ quiz: { question: 'Q1', options: [] }, answer: 'A' }],
    assessment_type: 'quiz',
    school_id: 42,
    source: 'document',
  };

  it('posts to /api/v1/user-assessments with full payload', async () => {
    mockPost.mockResolvedValueOnce({ data: MOCK_ITEM });
    await saveUserAssessment(payload);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/user-assessments',
      expect.objectContaining({ title: 'Test Quiz', assessment_type: 'quiz' }),
    );
  });

  it('returns the saved assessment list item on success', async () => {
    mockPost.mockResolvedValueOnce({ data: MOCK_ITEM });
    const result = await saveUserAssessment(payload);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(1);
  });

  it('returns null on HTTP failure without throwing', async () => {
    const err: any = new Error('Server error');
    err.response = { status: 500 };
    mockPost.mockRejectedValueOnce(err);
    const result = await saveUserAssessment(payload);
    expect(result).toBeNull();
  });

  it('persists worksheet data when source is Worksheet', async () => {
    const wsPayload: SaveAssessmentPayload = {
      ...payload,
      title: 'Physics – Optics',
      assessment_type: 'worksheet',
      source: 'Worksheet',
    };
    mockPost.mockResolvedValueOnce({ data: { ...MOCK_ITEM, assessment_type: 'worksheet' } });
    const result = await saveUserAssessment(wsPayload);
    const callArgs = mockPost.mock.calls[0][1] as SaveAssessmentPayload;
    expect(callArgs.source).toBe('Worksheet');
    expect(result?.assessment_type).toBe('worksheet');
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('deleteUserAssessment', () => {
  it('calls DELETE on the correct endpoint', async () => {
    mockDelete.mockResolvedValueOnce({});
    await deleteUserAssessment(5);
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/user-assessments/5');
  });

  it('does not throw on network error (silent failure)', async () => {
    mockDelete.mockRejectedValueOnce(new Error('Network error'));
    await expect(deleteUserAssessment(5)).resolves.toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('generateWorksheet', () => {
  const WS_PARAMS = {
    class: 'Class 10',
    subject: 'Physics',
    lesson: 'Optics',
    level: 'medium',
    count: 10,
    mcq_count: 4,
    fitb_count: 2,
    tf_count: 1,
    short_q_count: 2,
    matching_count: 1,
    type: 'worksheet',
  };

  it('posts to /api/v1/worksheet/generate with correct body', async () => {
    mockPost.mockResolvedValueOnce({ data: MOCK_WORKSHEET_RESULT });
    await generateWorksheet(WS_PARAMS);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/worksheet/generate',
      expect.objectContaining({ class: 'Class 10', subject: 'Physics' }),
    );
  });

  it('returns the API response data', async () => {
    mockPost.mockResolvedValueOnce({ data: MOCK_WORKSHEET_RESULT });
    const result = await generateWorksheet(WS_PARAMS);
    expect(result.WorksheetData.Metadata.Subject).toBe('Physics');
  });

  it('propagates errors to the caller', async () => {
    mockPost.mockRejectedValueOnce(new Error('Generation failed'));
    await expect(generateWorksheet(WS_PARAMS)).rejects.toThrow('Generation failed');
  });

  it('includes itext field when provided', async () => {
    mockPost.mockResolvedValueOnce({ data: MOCK_WORKSHEET_RESULT });
    await generateWorksheet({ ...WS_PARAMS, itext: 'Focus on theory' });
    const body = mockPost.mock.calls[0][1] as any;
    expect(body.itext).toBe('Focus on theory');
  });
});
