import {
  computeStudentDashboardStats,
  dedupeStudentDashboardQuizzes,
} from '../core/services/studentDashboardData.service';
import { checkRecordToQuiz } from '../core/services/dashboardApi';

describe('studentDashboardData', () => {
  it('prefers classroom_name from quiz_details over raw class id', () => {
    const row = checkRecordToQuiz({
      status: null,
      classid: 'class_abc',
      student_id: 's1',
      quiz_details: {
        quiz_id: 1,
        topic: 'Math',
        summary: '',
        session_id: 'sess-1',
        start_time: '2026-01-01T00:00:00.000Z',
        end_time: '2026-01-10T00:00:00.000Z',
        duration: 30,
        has_time_limit: true,
        question_count: 5,
        questions: { quizzes: [] },
        status: 'active',
        is_active: true,
        is_public: false,
        classroom_name: 'Grade 8 — Algebra',
      },
    });
    expect(row.classroom_name).toBe('Grade 8 — Algebra');
  });

  it('does not use due date as completed_at when completion timestamp missing', () => {
    const row = checkRecordToQuiz({
      status: 'completed',
      classid: 'class_abc',
      student_id: 's1',
      quiz_details: {
        quiz_id: 2,
        topic: 'Done',
        summary: '',
        session_id: 'sess-2',
        start_time: '2026-01-01T00:00:00.000Z',
        end_time: '2026-01-10T00:00:00.000Z',
        duration: 30,
        has_time_limit: true,
        question_count: 5,
        questions: { quizzes: [] },
        status: 'active',
        is_active: true,
        is_public: false,
      },
    });
    expect(row.completed_at).toBeNull();
    expect(row.correct_answers).toBeUndefined();
  });

  it('dedupes by quiz_id + session_id keeping completed row', () => {
    const merged = dedupeStudentDashboardQuizzes([
      {
        quiz_id: 1,
        session_id: 's',
        class_id: 'c',
        classroom_id: 'c',
        classroom_name: 'Class',
        quiz_name: 'Q',
        status: 'pending',
        score: null,
        completed_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        quiz_id: 1,
        session_id: 's',
        class_id: 'c',
        classroom_id: 'c',
        classroom_name: 'Class',
        quiz_name: 'Q',
        status: 'completed',
        score: 90,
        completed_at: '2026-01-02T00:00:00.000Z',
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe('completed');
  });

  it('computes stats across pending and completed scopes', () => {
    const stats = computeStudentDashboardStats([
      {
        quiz_id: 1,
        session_id: 'a',
        class_id: 'c1',
        classroom_id: 'c1',
        classroom_name: 'A',
        quiz_name: 'One',
        status: 'pending',
        score: null,
        completed_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        availability_status: 'active',
        end_time: '2099-01-01T00:00:00.000Z',
      },
      {
        quiz_id: 2,
        session_id: 'b',
        class_id: 'c1',
        classroom_id: 'c1',
        classroom_name: 'A',
        quiz_name: 'Two',
        status: 'completed',
        score: 80,
        completed_at: '2026-01-02T00:00:00.000Z',
        created_at: '2026-01-02T00:00:00.000Z',
        time_spent_seconds: 120,
      },
    ] as any);
    expect(stats.total_quizzes).toBe(2);
    expect(stats.completed_count).toBe(1);
    expect(stats.pending_count).toBe(1);
    expect(stats.average_score).toBe(80);
  });
});
