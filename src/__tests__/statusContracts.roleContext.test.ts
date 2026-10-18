import { aggregateClassOverview } from '../core/services/quizAnalyticsApi';
import type { QuizListItem } from '../core/types/quizAnalytics.types';
import { computeClassStats, getQuizAttemptsForView } from '../core/utils/teacherAnalyticsHelpers';
import {
  teacherAvailabilityTabMatch,
  usesTeacherQuizAnalyticsAggregation,
  TEACHER_CLASS_CARD_PENDING,
  TEACHER_DRILL_PENDING,
} from '../core/utils/statusContracts';
import {
  isStudentAnalyticsCompleted,
  scoreForStudentAnalyticsDisplay,
} from '../core/utils/studentAnalyticsClassification';

describe('role × page status contracts', () => {
  it('maps teacher/instructor/admin to teacher quiz-analytics aggregation', () => {
    expect(usesTeacherQuizAnalyticsAggregation('teacher')).toBe(true);
    expect(usesTeacherQuizAnalyticsAggregation('instructor')).toBe(true);
    expect(usesTeacherQuizAnalyticsAggregation('admin')).toBe(true);
    expect(usesTeacherQuizAnalyticsAggregation('student')).toBe(false);
  });

  it('Assessments teacher tabs match availability, not Pending submissions', () => {
    expect(teacherAvailabilityTabMatch('active', 'active')).toBe(true);
    expect(teacherAvailabilityTabMatch('coming soon', 'available_soon')).toBe(true);
    expect(teacherAvailabilityTabMatch('available_soon', 'available_soon')).toBe(true);
    expect(teacherAvailabilityTabMatch('expired', 'expired')).toBe(true);
    expect(teacherAvailabilityTabMatch('active', 'expired')).toBe(false);
  });

  it('class-card Pending is ungated; class-drill Pending is active-gated (web split)', () => {
    expect(TEACHER_CLASS_CARD_PENDING).toBe('ungated_cohort_pending');
    expect(TEACHER_DRILL_PENDING).toBe('active_availability_gated');

    const rows = [
      {
        classroom_id: 'c1',
        classroom_name: '4A-Mathematics',
        quiz_id: 1,
        session_id: 's1',
        quiz_name: 'Active Q',
        total_students: 10,
        completed_count: 1,
        pending_count: 2,
        in_progress_count: 0,
        availability_status: 'active',
        attempts: [
          { student_id: 'a', status: 'completed', score: null, attempt_id: 1 },
          { student_id: 'b', status: 'pending', score: null },
          { student_id: 'c', status: 'pending', score: null },
        ],
      },
      {
        classroom_id: 'c1',
        classroom_name: '4A-Mathematics',
        quiz_id: 2,
        session_id: 's2',
        quiz_name: 'Expired Q',
        total_students: 10,
        completed_count: 0,
        pending_count: 7,
        in_progress_count: 0,
        availability_status: 'expired',
        attempts: [
          { student_id: 'd', status: 'pending', score: null },
        ],
      },
    ] as QuizListItem[];

    const [card] = aggregateClassOverview(rows, { mode: 'teacher' });
    // Class card: ungated Pending includes expired assignment's 7
    expect(card.pending_count).toBe(9);
    expect(card.active_assignment_count).toBe(1);
    expect(card.expired_assignment_count).toBe(1);
    expect(card.total_quizzes).toBe(2);

    const drill = computeClassStats(rows);
    // Drill: pending only from active assignment
    expect(drill.pendingCount).toBe(2);

    const activeAttempts = getQuizAttemptsForView(rows[0], 'pending');
    expect(activeAttempts).toHaveLength(2);
    const expiredPendingFilter = getQuizAttemptsForView(rows[1], 'pending');
    expect(expiredPendingFilter).toHaveLength(0);
    const expiredMissed = getQuizAttemptsForView(rows[1], 'missed');
    expect(expiredMissed.length).toBeGreaterThan(0);
  });

  it('does not treat completed+null score as pending (student attempt axis)', () => {
    const quiz = {
      classroom_id: 'c1',
      availability_status: 'active',
      student_status: 'completed',
      best_score: null,
      latest_score: null,
      score: null,
    } as QuizListItem;
    expect(isStudentAnalyticsCompleted(quiz)).toBe(true);
    expect(scoreForStudentAnalyticsDisplay(quiz)).toBeNull();
  });

  it('explicit teacher mode ignores student_status fields in mixed payloads', () => {
    const rows = [
      {
        classroom_id: 'c1',
        classroom_name: 'X',
        quiz_id: 1,
        session_id: 's1',
        quiz_name: 'Q',
        total_students: 5,
        completed_count: 3,
        pending_count: 2,
        in_progress_count: 0,
        availability_status: 'active',
        student_status: 'pending',
      },
    ] as QuizListItem[];
    const [asTeacher] = aggregateClassOverview(rows, { mode: 'teacher' });
    const [asStudent] = aggregateClassOverview(rows, { mode: 'student' });
    expect(asTeacher.completed_count).toBe(3);
    expect(asTeacher.pending_count).toBe(2);
    expect(asStudent.completed_count).toBe(0);
    expect(asStudent.pending_count).toBe(1);
  });
});
