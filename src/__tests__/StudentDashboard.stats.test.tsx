import { renderHook } from '@testing-library/react-native';
import {
  useStudentAssignmentDashboardStats,
  useStudentAssignmentDashboardStore,
} from '@core/store/studentAssignmentDashboard.store';

describe('StudentDashboard stats', () => {
  beforeEach(() => {
    useStudentAssignmentDashboardStore.getState().resetForAccount(null);
  });

  it('derives stats from store rows without unstable selector loops', () => {
    const row = {
      quiz_id: 1,
      session_id: 's1',
      class_id: 'c1',
      classroom_id: 'c1',
      classroom_name: 'Class',
      quiz_name: 'Quiz',
      status: 'pending',
      score: null,
      completed_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      availability_status: 'active',
      end_time: '2099-01-01T00:00:00.000Z',
      has_time_limit: true,
      is_active: true,
    };
    useStudentAssignmentDashboardStore.getState().setRawQuizzes([row as any]);
    const { result, rerender } = renderHook(() => useStudentAssignmentDashboardStats());
    expect(result.current.pending_count).toBe(1);
    const firstRef = result.current;
    rerender({});
    expect(result.current).toBe(firstRef);
  });
});
