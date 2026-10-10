/**
 * Assigned quiz submission: OpenAPI-shaped POST, attempt reuse, retry semantics.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createQuizAttempt,
  createQuizSubmission,
  updateQuizAttempt,
} from '../core/services/sharedApi';
import {
  listQuizAttempts,
  QuizAttemptLookupError,
  selectAttemptForSubmission,
} from '../core/services/quizAttemptApi';
import { getAttendedQuiz } from '../core/services/quizResultRetrieval.service';
import {
  submitAssignedQuiz,
  AssignedQuizSubmissionInProgressError,
} from '../core/services/assignedQuizSubmission.service';

jest.mock('../core/services/studentQuizCacheInvalidation', () => ({
  invalidateStudentQuizCaches: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../core/services/sharedApi', () => ({
  createQuizAttempt: jest.fn(),
  createQuizSubmission: jest.fn(),
  updateQuizAttempt: jest.fn(),
}));

jest.mock('../core/services/quizAttemptApi', () => {
  const actual = jest.requireActual('../core/services/quizAttemptApi') as typeof import('../core/services/quizAttemptApi');
  return {
    ...actual,
    listQuizAttempts: jest.fn(),
  };
});

jest.mock('../core/services/quizResultRetrieval.service', () => ({
  getAttendedQuiz: jest.fn(),
  fetchPersistedQuizResult: jest.fn(),
}));

const mockCreateAttempt = createQuizAttempt as jest.MockedFunction<typeof createQuizAttempt>;
const mockCreateSubmission = createQuizSubmission as jest.MockedFunction<typeof createQuizSubmission>;
const mockUpdateAttempt = updateQuizAttempt as jest.MockedFunction<typeof updateQuizAttempt>;
const mockListAttempts = listQuizAttempts as jest.MockedFunction<typeof listQuizAttempts>;
const mockGetAttended = getAttendedQuiz as jest.MockedFunction<typeof getAttendedQuiz>;

const OPENAPI_SUBMISSION_KEYS = [
  'quiz_id',
  'student_id',
  'classroom_id',
  'score',
  'summary',
  'log_data',
  'submitted_at',
] as const;

const baseQuestion = {
  id: 'q-0',
  question: '2+2?',
  options: ['3', '4', '5', '6'],
  answer: 'B',
  correctAnswer: 'B',
  explanation: null,
};

const asyncStorageStore: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(asyncStorageStore)) {
    delete asyncStorageStore[key];
  }
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key: string) => asyncStorageStore[key] ?? null,
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    asyncStorageStore[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete asyncStorageStore[key];
  });
  mockGetAttended.mockRejectedValue({ response: { status: 404 } });
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
    questionResults: { 0: true },
  };

  it('PUTs the selected attempt then POSTs OpenAPI submission fields (no top-level attempt_id)', async () => {
    mockListAttempts.mockResolvedValue([]);
    mockCreateAttempt.mockResolvedValue({
      id: 99,
      quiz_id: 42,
      student_id: 'student-1',
      class_id: 'session-uuid',
      attempt_number: 1,
      score: null,
      status: 'started',
      started_at: input.startedAtIso,
      completed_at: null,
      time_spent_seconds: null,
    });

    const order: string[] = [];
    mockUpdateAttempt.mockImplementation(async () => {
      order.push('put-attempt');
      return {
        id: 99,
        quiz_id: 42,
        student_id: 'student-1',
        class_id: 'session-uuid',
        attempt_number: 1,
        score: 100,
        status: 'completed',
        started_at: input.startedAtIso,
        completed_at: input.startedAtIso,
        time_spent_seconds: 0,
      };
    });
    mockCreateSubmission.mockImplementation(async () => {
      order.push('post-submission');
      return {
        submission_id: 1,
        quiz_id: 42,
        student_id: 'student-1',
        classroom_id: 'session-uuid',
        score: 100,
        summary: null,
        log_data: null,
        submitted_at: input.startedAtIso,
      };
    });

    const result = await submitAssignedQuiz(input);
    expect(result.attemptId).toBe(99);
    expect(order).toEqual(['put-attempt', 'post-submission']);

    expect(mockUpdateAttempt).toHaveBeenCalledWith(
      99,
      expect.objectContaining({ status: 'completed', score: 100 }),
    );
    expect(mockUpdateAttempt.mock.calls[0][1]).not.toHaveProperty('log_data');

    const submissionBody = mockCreateSubmission.mock.calls[0][0];
    expect(Object.keys(submissionBody).sort()).toEqual([...OPENAPI_SUBMISSION_KEYS].sort());
    expect(submissionBody).not.toHaveProperty('attempt_id');
    expect(submissionBody.classroom_id).toBe('session-uuid');
    expect(submissionBody.log_data).toEqual(
      expect.objectContaining({
        questionCount: 1,
        attempt_id: 99,
      }),
    );
  });

  it('does not create a new attempt when lookup fails', async () => {
    mockListAttempts.mockRejectedValue(new QuizAttemptLookupError('network down'));

    await expect(submitAssignedQuiz(input)).rejects.toBeTruthy();
    expect(mockCreateAttempt).not.toHaveBeenCalled();
    expect(mockCreateSubmission).not.toHaveBeenCalled();
  });

  it('blocks concurrent submissions for the same assignment', async () => {
    mockListAttempts.mockResolvedValue([
      {
        id: 5,
        quiz_id: 42,
        student_id: 'student-1',
        class_id: 'session-uuid',
        attempt_number: 1,
        score: null,
        status: 'started',
        started_at: '2026-01-01T00:00:00.000Z',
        completed_at: null,
        time_spent_seconds: null,
      },
    ]);
    mockUpdateAttempt.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                id: 5,
                quiz_id: 42,
                student_id: 'student-1',
                class_id: 'session-uuid',
                attempt_number: 1,
                score: 100,
                status: 'completed',
                started_at: input.startedAtIso,
                completed_at: input.startedAtIso,
                time_spent_seconds: 0,
              }),
            50,
          );
        }),
    );
    mockCreateSubmission.mockResolvedValue({
      submission_id: 1,
      quiz_id: 42,
      student_id: 'student-1',
      classroom_id: 'session-uuid',
      score: 100,
      summary: null,
      log_data: null,
      submitted_at: input.startedAtIso,
    });

    const first = submitAssignedQuiz(input);
    await expect(submitAssignedQuiz(input)).rejects.toBeInstanceOf(
      AssignedQuizSubmissionInProgressError,
    );
    await first;
  });

  it('surfaces attempt update failure without calling submission', async () => {
    mockListAttempts.mockResolvedValue([
      {
        id: 7,
        quiz_id: 42,
        student_id: 'student-1',
        class_id: 'session-uuid',
        attempt_number: 1,
        score: null,
        status: 'started',
        started_at: '2026-01-01T00:00:00.000Z',
        completed_at: null,
        time_spent_seconds: null,
      },
    ]);
    mockUpdateAttempt.mockRejectedValue(new Error('put failed'));

    await expect(submitAssignedQuiz(input)).rejects.toMatchObject({
      phase: 'attempt_update',
    });
    expect(mockCreateSubmission).not.toHaveBeenCalled();
  });

  it('rejects checkpoint owned by another account', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        userId: 'student-1',
        quizId: '42',
        sessionId: 'session-uuid',
        attemptId: 12,
        startedAt: input.startedAtIso,
        immutable: {
          version: 1,
          userId: 'other-user',
          quizId: '42',
          sessionId: 'session-uuid',
          selectedAnswers: { 0: '4' },
          scorePercent: 100,
          questionCount: 1,
          logData: { answers: [] },
          startedAt: input.startedAtIso,
          finalizedAt: input.startedAtIso,
        },
      }),
    );

    await expect(submitAssignedQuiz(input)).rejects.toMatchObject({
      phase: 'validation',
    });
  });

  it('retries POST submission on the same attempt without creating another attempt', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (asyncStorageStore[key]) return asyncStorageStore[key];
      return JSON.stringify({
        userId: 'student-1',
        quizId: '42',
        sessionId: 'session-uuid',
        attemptId: 12,
        startedAt: input.startedAtIso,
        attemptUpdated: true,
        immutable: {
          version: 1,
          userId: 'student-1',
          quizId: '42',
          sessionId: 'session-uuid',
          selectedAnswers: { 0: '4' },
          scorePercent: 100,
          questionCount: 1,
          logData: {
            answers: [
              {
                questionNumber: 1,
                question: '2+2?',
                options: ['3', '4', '5', '6'],
                correctAnswer: 'B',
                userAnswer: 'B',
                isCorrect: true,
              },
            ],
            score: 100,
            attempt_id: 12,
          },
          startedAt: input.startedAtIso,
          finalizedAt: input.startedAtIso,
        },
      });
    });

    mockCreateSubmission.mockRejectedValueOnce(new Error('post failed'));
    await expect(submitAssignedQuiz(input)).rejects.toMatchObject({ phase: 'submission' });
    expect(mockCreateAttempt).not.toHaveBeenCalled();
    expect(mockUpdateAttempt).not.toHaveBeenCalled();
    expect(mockListAttempts).not.toHaveBeenCalled();

    mockCreateSubmission.mockResolvedValue({
      submission_id: 2,
      quiz_id: 42,
      student_id: 'student-1',
      classroom_id: 'session-uuid',
      score: 100,
      summary: null,
      log_data: null,
      submitted_at: input.startedAtIso,
    });
    const retried = await submitAssignedQuiz(input);
    expect(retried.attemptId).toBe(12);
    expect(mockCreateAttempt).not.toHaveBeenCalled();
    expect(mockCreateSubmission).toHaveBeenCalledTimes(2);
    const retryBody = mockCreateSubmission.mock.calls[1][0];
    expect(retryBody).not.toHaveProperty('attempt_id');
    expect(retryBody.log_data).toEqual(expect.objectContaining({ attempt_id: 12 }));
  });

  it('treats zero score as valid', async () => {
    mockListAttempts.mockResolvedValue([
      {
        id: 3,
        quiz_id: 42,
        student_id: 'student-1',
        class_id: 'session-uuid',
        attempt_number: 1,
        score: null,
        status: 'started',
        started_at: '2026-01-01T00:00:00.000Z',
        completed_at: null,
        time_spent_seconds: null,
      },
    ]);
    mockUpdateAttempt.mockResolvedValue({
      id: 3,
      quiz_id: 42,
      student_id: 'student-1',
      class_id: 'session-uuid',
      attempt_number: 1,
      score: 0,
      status: 'completed',
      started_at: input.startedAtIso,
      completed_at: input.startedAtIso,
      time_spent_seconds: 0,
    });
    mockCreateSubmission.mockResolvedValue({
      submission_id: 1,
      quiz_id: 42,
      student_id: 'student-1',
      classroom_id: 'session-uuid',
      score: 0,
      summary: null,
      log_data: null,
      submitted_at: input.startedAtIso,
    });

    await submitAssignedQuiz({
      ...input,
      scorePercent: 0,
      selectedAnswers: {},
      questionResults: { 0: false },
    });

    expect(mockCreateSubmission).toHaveBeenCalledWith(expect.objectContaining({ score: 0 }));
  });

  it('succeeds when checkpoint cleanup fails after successful POST', async () => {
    const { invalidateStudentQuizCaches } = jest.requireMock(
      '../core/services/studentQuizCacheInvalidation',
    ) as { invalidateStudentQuizCaches: jest.Mock };

    mockListAttempts.mockResolvedValue([
      {
        id: 3,
        quiz_id: 42,
        student_id: 'student-1',
        class_id: 'session-uuid',
        attempt_number: 1,
        score: null,
        status: 'started',
        started_at: '2026-01-01T00:00:00.000Z',
        completed_at: null,
        time_spent_seconds: null,
      },
    ]);
    mockUpdateAttempt.mockResolvedValue({
      id: 3,
      quiz_id: 42,
      student_id: 'student-1',
      class_id: 'session-uuid',
      attempt_number: 1,
      score: 100,
      status: 'completed',
      started_at: input.startedAtIso,
      completed_at: input.startedAtIso,
      time_spent_seconds: 60,
    });
    mockCreateSubmission.mockResolvedValue({
      submission_id: 1,
      quiz_id: 42,
      student_id: 'student-1',
      classroom_id: 'session-uuid',
      score: 100,
      summary: null,
      log_data: null,
      submitted_at: input.startedAtIso,
    });
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('storage locked'));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await submitAssignedQuiz(input);

    expect(result.alreadySubmitted).toBe(false);
    expect(result.attemptId).toBe(3);
    expect(invalidateStudentQuizCaches).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('selectAttemptForSubmission', () => {
  it('prefers the earliest started attempt, not a later row', () => {
    const selected = selectAttemptForSubmission(
      [
        {
          id: 20,
          quiz_id: 1,
          student_id: 's',
          class_id: 'c',
          attempt_number: 2,
          score: null,
          status: 'started',
          started_at: '2026-01-02T00:00:00.000Z',
          completed_at: null,
          time_spent_seconds: null,
        },
        {
          id: 10,
          quiz_id: 1,
          student_id: 's',
          class_id: 'c',
          attempt_number: 1,
          score: null,
          status: 'started',
          started_at: '2026-01-01T00:00:00.000Z',
          completed_at: null,
          time_spent_seconds: null,
        },
      ],
    );
    expect(selected?.id).toBe(10);
  });
});
