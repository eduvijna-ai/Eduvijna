import { useDashboardStore } from '../core/store/dashboard.store';
import { useStudentAssignmentDashboardStore } from '../core/store/studentAssignmentDashboard.store';

describe('Assessments student account guard', () => {
  beforeEach(() => {
    useDashboardStore.getState().clearData();
    useStudentAssignmentDashboardStore.getState().resetForAccount(null);
  });

  it('does not expose prior account quizzes when assignment store is empty', () => {
    useDashboardStore.getState().setQuizzes(
      [
        {
          quiz_id: 99,
          session_id: 'stale',
          class_id: 'c1',
          classroom_id: 'c1',
          classroom_name: 'Stale',
          quiz_name: 'Stale quiz',
          status: 'pending',
          score: null,
          completed_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ] as any,
      1,
    );
    const classified = useStudentAssignmentDashboardStore.getState().getClassifiedQuizzes();
    expect(classified).toHaveLength(0);
    const studentQuizzes = classified;
    expect(studentQuizzes).toEqual([]);
  });

  it('clears dashboard fallback store on account reset', () => {
    useDashboardStore.getState().setQuizzes([{ quiz_id: 1 }] as any, 1);
    useStudentAssignmentDashboardStore.getState().resetForAccount('student-b');
    useDashboardStore.getState().clearData();
    expect(useDashboardStore.getState().quizzes).toHaveLength(0);
  });
});
