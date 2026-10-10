/**
 * Regression tests for assigned quiz submission orchestration.
 */

import { apiClient } from '../core/api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  submitAssignedQuiz,
  AssignedQuizSubmissionInProgressError,
} from '../core/services/assignedQuizSubmission.service';
import { QuizAttemptLookupError } from '../core/services/quizAttemptApi';

jest.mock('../core/services/studentQuizCacheInvalidation', () => ({
  invalidateStudentQuizCaches: jest.fn().mockResolvedValue(undefined),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPut = apiClient.put as jest.MockedFunction<typeof apiClient.put>;

const baseQuestion = {
  id: 'q-0',
  question: '2+2?',
  options: ['3', '4', '5', '6'],
  answer: 'B',
  correctAnswer: 'B',
  explanation: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

describe('submitAssignedQuiz', () => {
  const input = {
    quizId: 42,
    studentId: 'student-1',
    sessionId: 'session-uuid',
    questions: [baseQuestion],
    selectedAnswers: { 0: '4' },
    startedAtIso: '2026-01-01T00:00:00.000Z',
    scorePercent: 100,
    questionCount: 1,
  };

  it('persists attempt update and submission with session_id as classroom_id', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('attended-quiz')) {
        return Promise.reject({ response: { status: 404 } });
      }
      if (url.includes('quiz-attempts')) {
        return { data: [] };
      }
      return { data: {} };
    });
    mockPost.mockImplementation(async (url: string) => {
      if (url.includes('quiz-attempts')) {
        return { data: { id: 99 } };
      }
      if (url.includes('quiz-submissions')) {
        return { data: { submission_id: 1 } };
      }
      return { data: {} };
    });
    mockPut.mockResolvedValue({ data: { id: 99, status: 'completed' } });

    const result = await submitAssignedQuiz(input);
    expect(result.attemptId).toBe(99);

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/dashboard/quiz-submissions',
      expect.objectContaining({
        classroom_id: 'session-uuid',
        student_id: 'student-1',
        quiz_id: 42,
        log_data: expect.objectContaining({
          questionCount: 1,
          attempt_id: 99,
        }),
      }),
    );
  });

  it('does not create a new attempt when lookup fails', async () => {
    mockGet.mockRejectedValue(new Error('network down'));

    await expect(submitAssignedQuiz(input)).rejects.toBeTruthy();
    expect(mockPost).not.toHaveBeenCalledWith(
      '/api/v1/dashboard/quiz-attempts',
      expect.anything(),
    );
  });

  it('blocks concurrent submissions for the same assignment', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('attended-quiz')) {
        return Promise.reject({ response: { status: 404 } });
      }
      return { data: [{ id: 5, status: 'started', started_at: '2026-01-01T00:00:00.000Z' }] };
    });
    mockPut.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { id: 5 } }), 50);
        }),
    );
    mockPost.mockResolvedValue({ data: { submission_id: 1 } });

    const first = submitAssignedQuiz(input);
    await expect(submitAssignedQuiz(input)).rejects.toBeInstanceOf(
      AssignedQuizSubmissionInProgressError,
    );
    await first;
  });

  it('surfaces attempt update failure without calling submission', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('attended-quiz')) {
        return Promise.reject({ response: { status: 404 } });
      }
      return { data: [{ id: 7, status: 'started', started_at: '2026-01-01T00:00:00.000Z' }] };
    });
    mockPut.mockRejectedValue(new Error('put failed'));

    await expect(submitAssignedQuiz(input)).rejects.toMatchObject({
      phase: 'attempt_update',
    });
    expect(mockPost).not.toHaveBeenCalledWith(
      '/api/v1/dashboard/quiz-submissions',
      expect.anything(),
    );
  });

  it('recovers submission after partial completion (attempt updated only)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        userId: 'student-1',
        quizId: '42',
        sessionId: 'session-uuid',
        attemptId: 12,
        startedAt: input.startedAtIso,
        attemptUpdated: true,
      }),
    );

    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('attended-quiz')) {
        return Promise.reject({ response: { status: 404 } });
      }
      return { data: [] };
    });
    mockPost.mockResolvedValue({ data: { submission_id: 2 } });

    const result = await submitAssignedQuiz(input);
    expect(result.attemptId).toBe(12);
    expect(mockPut).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/dashboard/quiz-submissions',
      expect.any(Object),
    );
  });

  it('treats zero score as valid', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('attended-quiz')) {
        return Promise.reject({ response: { status: 404 } });
      }
      return { data: [{ id: 3, status: 'started', started_at: '2026-01-01T00:00:00.000Z' }] };
    });
    mockPut.mockResolvedValue({ data: { id: 3 } });
    mockPost.mockResolvedValue({ data: { submission_id: 1 } });

    await submitAssignedQuiz({ ...input, scorePercent: 0, selectedAnswers: {} });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/dashboard/quiz-submissions',
      expect.objectContaining({ score: 0 }),
    );
  });
});

describe('listQuizAttempts errors', () => {
  it('throws QuizAttemptLookupError instead of empty list', async () => {
    const { listQuizAttempts } = require('../core/services/quizAttemptApi');
    mockGet.mockRejectedValue(new Error('timeout'));
    await expect(
      listQuizAttempts({
        quiz_id: 1,
        student_id: 's',
        class_id: 'sess',
      }),
    ).rejects.toBeInstanceOf(QuizAttemptLookupError);
  });
});
