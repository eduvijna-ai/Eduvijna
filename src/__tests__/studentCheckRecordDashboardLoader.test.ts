import {
  dedupeCheckRecordQuizzes,
  computeCheckRecordDashboardStats,
  hydrateCompletedParsedQuizMetrics,
} from '../core/services/studentCheckRecordDashboardLoader';
import { fetchPersistedQuizResult } from '../core/services/quizResultRetrieval.service';

jest.mock('../core/services/quizResultRetrieval.service', () => ({
  fetchPersistedQuizResult: jest.fn(),
}));

const mockFetch = fetchPersistedQuizResult as jest.MockedFunction<typeof fetchPersistedQuizResult>;

describe('studentCheckRecordDashboardLoader', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('dedupe prefers completed over pending for same nested assignment', () => {
    const rows = dedupeCheckRecordQuizzes([
      {
        classid: 'c1',
        status: null,
        quiz_details: {
          quiz_id: 1,
          session_id: 's1',
          topic: 'Q',
          summary: '',
          start_time: '',
          end_time: '',
          duration: 0,
          has_time_limit: false,
          question_count: 5,
          questions: { quizzes: [] },
          status: 'active',
          is_active: true,
          is_public: false,
          created_at: '2026-01-02T00:00:00Z',
        },
      },
      {
        classid: 'c1',
        status: 'completed',
        quiz_details: {
          quiz_id: 1,
          session_id: 's1',
          topic: 'Q',
          summary: '',
          start_time: '',
          end_time: '',
          duration: 0,
          has_time_limit: false,
          question_count: 5,
          questions: { quizzes: [] },
          status: 'completed',
          is_active: true,
          is_public: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('completed');
  });

  it('stats average score ignores rows without numeric score', () => {
    const stats = computeCheckRecordDashboardStats([
      { status: 'completed', score: 80, time_spent_seconds: 60, question_count: 5, class_id: 'c1' } as any,
      { status: 'completed', score: null, time_spent_seconds: null, question_count: 5, class_id: 'c1' } as any,
      { status: 'pending', score: null, time_spent_seconds: null, question_count: 5, class_id: 'c1' } as any,
    ]);
    expect(stats.completed_count).toBe(2);
    expect(stats.pending_count).toBe(1);
    expect(stats.average_score).toBe(80);
  });

  it('hydrates completed metrics from attended-quiz without fabricating zeros', async () => {
    mockFetch.mockResolvedValue({
      status: 'ready',
      quizData: { questions: [{ id: 'q0', question: 'Q?', options: ['A', 'B'], correctAnswer: 'A', answer: 'A', explanation: null }] },
      userAnswers: ['A'],
      score: 100,
      logData: { '0': { answer: 'A' } },
      timeSpentSeconds: 42,
      completedAt: '2026-01-05T00:00:00Z',
    });
    const [hydrated] = await hydrateCompletedParsedQuizMetrics('student-1', [
      {
        quiz_id: 2,
        session_id: 'sess-2',
        class_id: 'c1',
        status: 'completed',
        score: null,
        question_count: 1,
      } as any,
    ]);
    expect(hydrated.score).toBe(100);
    expect(hydrated.time_spent_seconds).toBe(42);
    expect(hydrated.correct_answers).toBe(1);
  });
});
