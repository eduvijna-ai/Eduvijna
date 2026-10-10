import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import StudentDashboard from '../screens/StudentDashboard';
import { useStudentAssignmentDashboardStore } from '@core/store/studentAssignmentDashboard.store';

jest.mock('@core/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 70, role: 'student', username: 'demo_student' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

jest.mock('@core/store/dashboard.store', () => ({
  useDashboardStore: () => ({ setQuizzes: jest.fn() }),
}));

jest.mock('@core/services/studentDashboardData.service', () => ({
  loadStudentDashboardQuizzes: jest.fn().mockResolvedValue({
    quizzes: [
      {
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
      },
    ],
    stats: {
      total_quizzes: 1,
      completed_count: 0,
      pending_count: 1,
      missed_count: 0,
      average_score: 0,
      total_time_spent: 0,
      total_questions_attempted: 0,
      total_classes: 1,
    },
  }),
}));

jest.mock('../hooks/useStudentAssignmentBoundaryClock', () => ({
  useStudentAssignmentBoundaryClock: () => {},
}));

jest.mock('../erp_schools/theme/useTeacherTheme', () => ({
  useTeacherTheme: () => ({
    colors: {
      background: '#fff',
      text: '#000',
      primary: '#00f',
      border: '#ccc',
      surface: '#fff',
    },
  }),
}));

describe('StudentDashboard stats', () => {
  beforeEach(() => {
    useStudentAssignmentDashboardStore.getState().resetForAccount(null);
  });

  it('mounts and surfaces store stats without update loops', async () => {
    render(<StudentDashboard />);
    await waitFor(() => {
      expect(useStudentAssignmentDashboardStore.getState().rawQuizzes).toHaveLength(1);
    });
    expect(useStudentAssignmentDashboardStore.getState().rawQuizzes).toHaveLength(1);
  });
});
