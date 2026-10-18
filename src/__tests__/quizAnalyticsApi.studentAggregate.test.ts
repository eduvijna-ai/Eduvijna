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

    const [overview] = aggregateClassOverview(rows);
    expect(overview.completed_count).toBe(2);
    expect(overview.pending_count).toBe(1);
    expect(overview.missed_count).toBe(1);
  });

  it('preserves teacher cohort completed_count aggregation', () => {
    const rows = [
      {
        classroom_id: 'c1',
        classroom_name: 'Class A',
        quiz_id: 1,
        quiz_name: 'Q1',
        total_students: 10,
        completed_count: 4,
        pending_count: 3,
        in_progress_count: 1,
      },
      {
        classroom_id: 'c1',
        classroom_name: 'Class A',
        quiz_id: 2,
        quiz_name: 'Q2',
        total_students: 10,
        completed_count: 2,
        pending_count: 5,
        in_progress_count: 0,
      },
    ] as QuizListItem[];

    const [overview] = aggregateClassOverview(rows);
    expect(overview.completed_count).toBe(6);
    expect(overview.pending_count).toBe(8);
    expect(overview.in_progress_count).toBe(1);
  });
});
