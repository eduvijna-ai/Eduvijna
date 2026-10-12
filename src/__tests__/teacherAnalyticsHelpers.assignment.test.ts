import type { QuizListItem } from '../core/types/quizAnalytics.types';
import {
  getQuizAttemptsForView,
  resolveQuizAssignment,
  resolveQuizInClass,
} from '../core/utils/teacherAnalyticsHelpers';

function makeAssignmentRow(overrides: Partial<QuizListItem> & Pick<QuizListItem, 'session_id'>): QuizListItem {
  return {
    quiz_id: 479,
    classroom_id: 'class_4d82c60e',
    classroom_name: '4A-Mathematics',
    file_name: null,
    session_id: overrides.session_id,
    quiz_name: 'MATH_Quiz',
    topic: null,
    subject: null,
    created_at: '2026-10-11T00:00:00Z',
    assigned_at: null,
    due_date: null,
    start_time: null,
    end_time: null,
    duration: 30,
    has_time_limit: false,
    question_count: 10,
    total_questions: 10,
    status: 'active',
    availability: null,
    availability_status: 'active',
    attempts_allowed: 1,
    student_attempts: null,
    best_score: null,
    latest_score: null,
    avg_score: null,
    score: null,
    attempt_id: null,
    attempt_number: null,
    started_at: null,
    completed_at: null,
    time_spent_seconds: null,
    submission_id: null,
    submitted_at: null,
    log_data: null,
    total_students: 3,
    pending_count: 1,
    in_progress_count: 0,
    completed_count: 1,
    attempts: [],
    ...overrides,
  };
}

describe('teacher analytics assignment selection', () => {
  const sessionOpen = 'session-open-unattempted';
  const sessionDone = 'session-completed';

  const raw: QuizListItem[] = [
    makeAssignmentRow({
      session_id: sessionOpen,
      attempts: [
        {
          student_id: '70',
          student_username: 'aarya',
          student_fullname: 'Aarya',
          status: 'pending',
          score: null,
          attempt_id: 0,
          avatar_url: null,
          started_at: '',
          submission: null,
          completed_at: null,
          attempt_number: 1,
          time_spent_seconds: null,
        },
      ],
    }),
    makeAssignmentRow({
      session_id: sessionDone,
      attempts: [
        {
          student_id: '70',
          student_username: 'aarya',
          student_fullname: 'Aarya',
          status: 'completed',
          score: 60,
          attempt_id: 207,
          avatar_url: null,
          started_at: '',
          submission: null,
          completed_at: '2026-10-11T14:30:00Z',
          attempt_number: 1,
          time_spent_seconds: 120,
        },
      ],
    }),
  ];

  it('does not fall back to another assignment with the same quiz id', () => {
    expect(resolveQuizInClass(raw, 479, 'class_4d82c60e', sessionDone)?.session_id).toBe(sessionDone);
    expect(resolveQuizInClass(raw, 479, 'class_4d82c60e', sessionOpen)?.session_id).toBe(sessionOpen);
    expect(resolveQuizInClass(raw, 479, 'class_4d82c60e')).toBeNull();
    expect(resolveQuizInClass(raw, 479, 'other-class', sessionDone)).toBeNull();
  });

  it('shows completed attempt for the selected assignment without embedded log_data', () => {
    const assignment = resolveQuizAssignment(raw, {
      quizId: 479,
      classroomId: 'class_4d82c60e',
      sessionId: sessionDone,
    });
    expect(assignment).not.toBeNull();
    const rows = getQuizAttemptsForView(assignment!, null);
    const aarya = rows.find((r) => r.student_id === '70');
    expect(aarya?.status).toBe('completed');
    expect(aarya?.canViewSavedResult).toBe(true);
    expect(aarya?.log_data).toBeNull();
    expect(aarya?.derivedStatus).toBe('completed');
  });

  it('does not treat the unattempted assignment as completed', () => {
    const assignment = resolveQuizAssignment(raw, {
      quizId: 479,
      classroomId: 'class_4d82c60e',
      sessionId: sessionOpen,
    });
    const rows = getQuizAttemptsForView(assignment!, null);
    const aarya = rows.find((r) => r.student_id === '70');
    expect(aarya?.canViewSavedResult).toBe(false);
    expect(aarya?.derivedStatus).toBe('pending');
  });
});
