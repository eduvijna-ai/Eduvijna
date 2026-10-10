import {
  dedupeCheckRecordQuizzes,
  computeCheckRecordDashboardStats,
} from '../core/services/studentCheckRecordDashboardLoader';

describe('studentCheckRecordDashboardLoader', () => {
  it('dedupe prefers completed over pending for same quiz/session', () => {
    const rows = dedupeCheckRecordQuizzes([
      {
        quiz_id: 1,
        session_id: 's1',
        status: 'pending',
        created_at: '2026-01-02T00:00:00Z',
        attempt_number: 1,
      },
      {
        quiz_id: 1,
        session_id: 's1',
        status: 'completed',
        created_at: '2026-01-01T00:00:00Z',
        attempt_number: 1,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('completed');
  });

  it('stats include completed for Recent Completions', () => {
    const stats = computeCheckRecordDashboardStats([
      { status: 'completed', score: 80, time_spent_seconds: 60, question_count: 5, class_id: 'c1' } as any,
      { status: 'pending', score: null, time_spent_seconds: 0, question_count: 5, class_id: 'c1' } as any,
    ]);
    expect(stats.completed_count).toBe(1);
    expect(stats.pending_count).toBe(1);
    expect(stats.average_score).toBe(80);
  });
});
