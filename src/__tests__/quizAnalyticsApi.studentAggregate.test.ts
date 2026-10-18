import { aggregateClassOverview } from '../core/services/quizAnalyticsApi';
import type { QuizListItem } from '../core/types/quizAnalytics.types';

describe('aggregateClassOverview student_total_details', () => {
  it('derives Done from student_status even when cohort completed_count is present', () => {
    const rows = [
      {
        classroom_id: 'c1',
        classroom_name: 'Class A',
        quiz_id: 1,
        quiz_name: 'Q1',
        student_status: 'completed',
        completed_count: 1,
        total_students: 10,
        availability_status: 'expired',
        best_score: null,
      },
      {
        classroom_id: 'c1',
        classroom_name: 'Class A',
        quiz_id: 2,
        quiz_name: 'Q2',
        student_status: 'completed',
        completed_count: 0,
        total_students: 10,
        availability_status: 'active',
        latest_score: null,
      },
      {
        classroom_id: 'c1',
        classroom_name: 'Class A',
        quiz_id: 3,
        quiz_name: 'Q3',
        student_status: 'pending',
        completed_count: 0,
        total_students: 10,
        availability_status: 'active',
      },
      {
        classroom_id: 'c1',
        classroom_name: 'Class A',
        quiz_id: 4,
        quiz_name: 'Q4',
        student_status: 'missed',
        completed_count: 0,
        total_students: 10,
        availability_status: 'expired',
      },
    ] as QuizListItem[];

    const [overview] = aggregateClassOverview(rows, { mode: 'student' });
    expect(overview.completed_count).toBe(2);
    expect(overview.pending_count).toBe(1);
    expect(overview.missed_count).toBe(1);
  });

  it('teacher mode: availability buckets separate from gated pending submissions', () => {
    const rows = [
      {
        classroom_id: 'c1',
        classroom_name: 'Class A',
        quiz_id: 1,
        session_id: 's1',
        quiz_name: 'Q1',
        total_students: 10,
        completed_count: 4,
        pending_count: 3,
        in_progress_count: 1,
        availability_status: 'active',
      },
      {
        classroom_id: 'c1',
        classroom_name: 'Class A',
        quiz_id: 2,
        session_id: 's2',
        quiz_name: 'Q2',
        total_students: 10,
        completed_count: 2,
        pending_count: 5,
        in_progress_count: 0,
        availability_status: 'expired',
      },
      {
        classroom_id: 'c1',
        classroom_name: 'Class A',
        quiz_id: 2,
        session_id: 's3',
        quiz_name: 'Q2 again',
        total_students: 10,
        completed_count: 0,
        pending_count: 2,
        in_progress_count: 0,
        availability_status: 'coming soon',
      },
    ] as QuizListItem[];

    const [overview] = aggregateClassOverview(rows, { mode: 'teacher' });
    expect(overview.total_quizzes).toBe(3);
    expect(overview.active_assignment_count).toBe(1);
    expect(overview.upcoming_assignment_count).toBe(1);
    expect(overview.expired_assignment_count).toBe(1);
    // Pending only from active assignment — not expired pending_count=5
    expect(overview.pending_count).toBe(3);
    expect(overview.completed_count).toBe(6);
    expect(overview.missed_count).toBe(5);
  });

  it('does not infer student mode from mixed teacher payload with occasional student_status', () => {
    const rows = [
      {
        classroom_id: 'c1',
        classroom_name: 'Class A',
        quiz_id: 1,
        session_id: 's1',
        quiz_name: 'Q1',
        total_students: 10,
        completed_count: 4,
        pending_count: 2,
        in_progress_count: 0,
        availability_status: 'active',
        student_status: 'pending',
      },
      {
        classroom_id: 'c1',
        classroom_name: 'Class A',
        quiz_id: 2,
        session_id: 's2',
        quiz_name: 'Q2',
        total_students: 10,
        completed_count: 1,
        pending_count: 0,
        in_progress_count: 0,
        availability_status: 'active',
      },
    ] as QuizListItem[];

    const [overview] = aggregateClassOverview(rows, { mode: 'teacher' });
    expect(overview.completed_count).toBe(5);
    expect(overview.pending_count).toBe(2);
    expect(overview.total_quizzes).toBe(2);
  });
});
