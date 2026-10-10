import { apiClient } from '../core/api/config';
import {
  fetchPersistedQuizResult,
  userAnswersFromAttended,
} from '../core/services/quizResultRetrieval.service';
import { fetchTeacherQuizzes } from '../core/services/dashboardApi';

jest.mock('../core/services/dashboardApi', () => ({
  fetchTeacherQuizzes: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockFetchTeacherQuizzes = fetchTeacherQuizzes as jest.MockedFunction<
  typeof fetchTeacherQuizzes
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchPersistedQuizResult', () => {
  it('loads student results via attended-quiz scoped by session_id', async () => {
    mockGet.mockResolvedValue({
      data: {
        student_id: 's1',
        classroom_id: 'session-a',
        quiz_id: 10,
        session_id: 'session-a',
        score: 0,
        submitted_at: '2026-01-02T00:00:00.000Z',
        time_spent_seconds: 30,
        log_data: {
          answers: [{ userAnswer: 'A', isCorrect: false }],
        },
        counts: { total_questions: 1, questions_answered: 0, questions_skipped: 1 },
        items: [],
      },
    });

    const result = await fetchPersistedQuizResult({
      quizId: 10,
      sessionId: 'session-a',
      studentId: 's1',
      isTeacherView: false,
    });

    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.score).toBe(0);
      expect(result.userAnswers[0]).toBe('A');
    }
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('attended-quiz'),
    );
    expect(mockGet.mock.calls[0][0]).toContain('session_id=session-a');
  });

  it('returns error when student sessionId is missing', async () => {
    const result = await fetchPersistedQuizResult({
      quizId: 10,
      studentId: 's1',
      isTeacherView: false,
    });
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.retryable).toBe(false);
    }
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns missing for 404 attended-quiz', async () => {
    mockGet.mockRejectedValue({ response: { status: 404 } });
    const result = await fetchPersistedQuizResult({
      quizId: 1,
      sessionId: 'sess',
      studentId: 's',
      isTeacherView: false,
    });
    expect(result.status).toBe('missing');
  });

  describe('teacher view identity matching', () => {
    const logPayload = {
      answers: [
        {
          questionNumber: 1,
          question: 'Q?',
          options: ['a', 'b'],
          correctAnswer: 'A',
          userAnswer: 'A',
          isCorrect: true,
        },
      ],
      score: 90,
    };

    beforeEach(() => {
      mockFetchTeacherQuizzes.mockResolvedValue({
        data: [
          {
            attempts: JSON.stringify([
              {
                attempt_id: 1,
                student_id: 'student-a',
                session_id: 'session-a',
                status: 'completed',
                score: 90,
                log_data: logPayload,
              },
              {
                attempt_id: 2,
                student_id: 'student-b',
                session_id: 'session-b',
                status: 'completed',
                score: 50,
                log_data: logPayload,
              },
            ]),
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      } as Awaited<ReturnType<typeof fetchTeacherQuizzes>>);
    });

    it('loads only when quiz, student, and session align', async () => {
      const result = await fetchPersistedQuizResult({
        quizId: 99,
        sessionId: 'session-a',
        studentId: 'student-a',
        isTeacherView: true,
      });
      expect(result.status).toBe('ready');
      if (result.status === 'ready') {
        expect(result.score).toBe(90);
      }
      expect(mockFetchTeacherQuizzes).toHaveBeenCalledWith(
        expect.objectContaining({ quiz_id: 99, view_type: 'all' }),
      );
    });

    it('errors when session does not match the student attempt', async () => {
      const result = await fetchPersistedQuizResult({
        quizId: 99,
        sessionId: 'session-b',
        studentId: 'student-a',
        isTeacherView: true,
      });
      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.message).toContain('session');
      }
    });

    it('errors when attemptId does not match session-scoped rows', async () => {
      const result = await fetchPersistedQuizResult({
        quizId: 99,
        sessionId: 'session-a',
        studentId: 'student-a',
        attemptId: 999,
        isTeacherView: true,
      });
      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.message).toContain('attempt identifier');
      }
    });
  });
});

describe('userAnswersFromAttended', () => {
  it('preserves question order including unanswered slots', () => {
    const answers = userAnswersFromAttended(
      {
        student_id: 's',
        classroom_id: 'c',
        quiz_id: 1,
        session_id: 'c',
        file_name: null,
        duration: 0,
        submitted_at: null,
        created_at: null,
        time_spent_seconds: null,
        log_data: {
          answers: [
            { userAnswer: 'B' },
            { userAnswer: null },
          ],
        },
        counts: { total_questions: 2, questions_answered: 1, questions_skipped: 1 },
        items: [],
      },
      2,
    );
    expect(answers).toEqual(['B', '']);
  });
});
