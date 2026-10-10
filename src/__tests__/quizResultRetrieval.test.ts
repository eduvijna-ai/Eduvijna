import { apiClient } from '../core/api/config';
import {
  fetchPersistedQuizResult,
  userAnswersFromAttended,
} from '../core/services/quizResultRetrieval.service';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

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
