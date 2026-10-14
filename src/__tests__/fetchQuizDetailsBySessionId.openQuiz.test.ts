import { fetchQuizDetailsBySessionId } from '../core/services/dashboardApi';
import * as TokenStorage from '../core/services/tokenStorage';

jest.mock('../core/services/tokenStorage', () => ({
  getAccessToken: jest.fn().mockResolvedValue('token'),
  clearAuthData: jest.fn(),
}));

describe('fetchQuizDetailsBySessionId open-quiz recovery', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = fetchMock;
    (TokenStorage.getAccessToken as jest.Mock).mockResolvedValue('token');
  });

  it('recovers student context from check-record when /quiz returns no quiz_data', async () => {
    fetchMock.mockImplementation(async (url: string, init?: { body?: string }) => {
      if (url.includes('/quiz?session_id=')) {
        return {
          ok: true,
          json: async () => ({ success: true, message: 'empty' }),
        };
      }
      if (url.includes('/quiz/check-record')) {
        const body = JSON.parse(init?.body || '{}');
        expect(body.p_session_id).toBe('sess-a');
        return {
          ok: true,
          json: async () => ({
            success: true,
            result: [
              {
                status: 'completed',
                classid: 'class_1',
                student_id: '70',
                quiz_details: {
                  quiz_id: 479,
                  session_id: 'sess-a',
                  topic: 'Fixture',
                  question_count: 10,
                  has_time_limit: false,
                  is_public: false,
                  start_time: null,
                  end_time: null,
                  questions: { quizzes: [] },
                },
              },
            ],
          }),
        };
      }
      if (url.includes('/quiz-attempts')) {
        return {
          ok: true,
          json: async () => [{ id: 207, status: 'completed', score: 60 }],
        };
      }
      throw new Error(`unexpected ${url}`);
    });

    const result = await fetchQuizDetailsBySessionId('sess-a', '70', 0, 'student');
    expect(result.exists).toBe(true);
    expect(result.isAttempted).toBe(true);
    expect(result.quizData?.quiz_id).toBe(479);
    expect(result.attemptData).toMatchObject({ id: 207, status: 'completed' });
  });
});
