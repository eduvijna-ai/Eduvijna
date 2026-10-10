/**
 * Integration-style flows: checkpoint recovery, immutable replay, alreadySubmitted.
 */

import { apiClient } from '../core/api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  findPendingSubmissionCheckpoint,
  buildRecoveryResumeParams,
} from '../core/services/assignedQuizRecovery.service';
import { submitAssignedQuiz } from '../core/services/assignedQuizSubmission.service';

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

const checkpointKey = 'eduvijna:assigned_quiz_checkpoint:student-1:42:session-uuid';

const immutableCheckpoint = {
  userId: 'student-1',
  quizId: '42',
  sessionId: 'session-uuid',
  attemptId: 12,
  startedAt: '2026-01-01T00:00:00.000Z',
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
      time_spent_seconds: 60,
      attempt_id: 12,
    },
    startedAt: '2026-01-01T00:00:00.000Z',
    finalizedAt: '2026-01-01T00:01:00.000Z',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === checkpointKey) {
      return JSON.stringify(immutableCheckpoint);
    }
    return null;
  });
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

describe('assigned quiz recovery (partial submit → restart)', () => {
  it('findPendingSubmissionCheckpoint resumes when server has no submission yet', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('attended-quiz')) {
        return Promise.reject({ response: { status: 404 } });
      }
      return { data: {} };
    });

    const pending = await findPendingSubmissionCheckpoint(
      'student-1',
      42,
      'session-uuid',
    );
    expect(pending).not.toBeNull();
    const resume = buildRecoveryResumeParams(pending!);
    expect(resume).toMatchObject({
      sessionId: 'session-uuid',
      selectedAnswers: { 0: '4' },
      scorePercent: 100,
      attemptId: 12,
    });
  });

  it('skips recovery when attended-quiz shows a persisted submission', async () => {
    mockGet.mockResolvedValue({
      data: {
        student_id: 'student-1',
        session_id: 'session-uuid',
        quiz_id: 42,
        submitted_at: '2026-01-01T00:05:00.000Z',
        log_data: { answers: [{ userAnswer: 'B' }] },
        counts: { total_questions: 1, questions_answered: 1, questions_skipped: 0 },
        items: [],
      },
    });

    const pending = await findPendingSubmissionCheckpoint(
      'student-1',
      42,
      'session-uuid',
    );
    expect(pending).toBeNull();
  });
});

describe('assigned quiz immutable replay on retry', () => {
  it('replays immutable payload after attempt_update failure and changed local answers', async () => {
    const pendingUpdate = {
      ...immutableCheckpoint,
      attemptUpdated: false,
      persistenceStep: 'immutable_saved' as const,
    };
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === checkpointKey) {
        return JSON.stringify(pendingUpdate);
      }
      return null;
    });

    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('attended-quiz')) {
        return Promise.reject({ response: { status: 404 } });
      }
      return { data: [{ id: 12, status: 'started' }] };
    });
    mockPut.mockRejectedValueOnce(new Error('put failed'));

    await expect(
      submitAssignedQuiz({
        quizId: 42,
        studentId: 'student-1',
        sessionId: 'session-uuid',
        questions: [baseQuestion],
        selectedAnswers: { 0: '3' },
        startedAtIso: '2026-06-01T00:00:00.000Z',
        scorePercent: 0,
        questionCount: 1,
        questionResults: { 0: false },
      }),
    ).rejects.toMatchObject({ phase: 'attempt_update' });

    mockPut.mockResolvedValue({ data: { id: 12 } });
    mockPost.mockResolvedValue({ data: { submission_id: 10 } });

    await submitAssignedQuiz({
      quizId: 42,
      studentId: 'student-1',
      sessionId: 'session-uuid',
      questions: [baseQuestion],
      selectedAnswers: { 0: '3' },
      startedAtIso: '2026-06-01T00:00:00.000Z',
      scorePercent: 0,
      questionCount: 1,
      questionResults: { 0: false },
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/dashboard/quiz-submissions',
      expect.objectContaining({ score: 100 }),
    );
  });

  it('posts checkpoint score and log_data when local answers changed after failure', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('attended-quiz')) {
        return Promise.reject({ response: { status: 404 } });
      }
      if (url.includes('quiz-attempts')) {
        return { data: [{ id: 12, status: 'started' }] };
      }
      return { data: {} };
    });
    mockPut.mockResolvedValue({ data: { id: 12 } });
    mockPost.mockResolvedValue({ data: { submission_id: 9 } });

    await submitAssignedQuiz({
      quizId: 42,
      studentId: 'student-1',
      sessionId: 'session-uuid',
      questions: [baseQuestion],
      selectedAnswers: { 0: '3' },
      startedAtIso: '2026-06-01T00:00:00.000Z',
      scorePercent: 0,
      questionCount: 1,
      questionResults: { 0: false },
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/dashboard/quiz-submissions',
      expect.objectContaining({
        score: 100,
        log_data: expect.objectContaining({
          score: 100,
          attempt_id: 12,
        }),
      }),
    );
    expect(mockPut).not.toHaveBeenCalled();
  });
});

describe('alreadySubmitted persisted result', () => {
  it('returns saved attended-quiz payload instead of recomputing locally', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    mockGet.mockResolvedValue({
      data: {
        student_id: 'student-1',
        classroom_id: 'session-uuid',
        quiz_id: 42,
        session_id: 'session-uuid',
        score: 88,
        submitted_at: '2026-01-02T00:00:00.000Z',
        time_spent_seconds: 45,
        log_data: {
          answers: [{ userAnswer: 'B', isCorrect: true, options: ['3', '4', '5', '6'] }],
        },
        counts: { total_questions: 1, questions_answered: 1, questions_skipped: 0 },
        items: [],
      },
    });

    const result = await submitAssignedQuiz({
      quizId: 42,
      studentId: 'student-1',
      sessionId: 'session-uuid',
      questions: [baseQuestion],
      selectedAnswers: { 0: '3' },
      startedAtIso: '2026-01-01T00:00:00.000Z',
      scorePercent: 0,
      questionCount: 1,
      questionResults: { 0: false },
    });

    expect(result.alreadySubmitted).toBe(true);
    expect(result.persistedResult?.status).toBe('ready');
    if (result.persistedResult?.status === 'ready') {
      expect(result.persistedResult.score).toBe(88);
    }
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });
});
