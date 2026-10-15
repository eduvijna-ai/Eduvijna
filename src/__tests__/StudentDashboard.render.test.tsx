import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import StudentDashboard from '../screens/StudentDashboard';
import { useStudentAssignmentDashboardStore } from '../core/store/studentAssignmentDashboard.store';
import { loadStudentDashboardQuizzes } from '../core/services/studentDashboardData.service';

jest.mock('@core/hooks/useAuth', () => {
  const auth = { user: { id: '70', username: 'demo_aarya', role: 'student' }, isAuthenticated: true, isLoading: false };
  return { useAuth: () => auth };
});
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../core/services/studentDashboardData.service', () => ({
  loadStudentDashboardQuizzes: jest.fn(),
}));
jest.mock('../core/services/assessmentQuizStart.service', () => ({
  executeStudentAssignedQuizViewResults: jest.fn(), isAssignedQuizLoadError: jest.fn(),
}));
jest.mock('../core/services/assignedQuizRecovery.service', () => ({ isAssignedQuizRecoveryProbeError: jest.fn() }));
jest.mock('@components/QuizGenerationGrid', () => () => null, { virtual: true });

const load = loadStudentDashboardQuizzes as jest.Mock;

describe('authenticated StudentDashboard rendering', () => {
  beforeEach(() => {
    useStudentAssignmentDashboardStore.getState().resetForAccount('70');
    load.mockReset();
  });

  it('renders the loading state then an empty dashboard after login', async () => {
    let resolve!: (value: any) => void;
    load.mockReturnValue(new Promise((r) => { resolve = r; }));
    const screen = render(<StudentDashboard />);
    expect(screen.getByText('Loading dashboard…')).toBeTruthy();
    await act(async () => resolve({ quizzes: [] }));
    await waitFor(() => expect(screen.getByText('No completions yet')).toBeTruthy());
    expect(load).toHaveBeenCalledWith('70');
  });

  it('renders populated assignments and stays stable on rerender', async () => {
    load.mockResolvedValue({ quizzes: [{
      quiz_id: 1, session_id: 's1', class_id: 'c1', classroom_id: 'c1',
      classroom_name: 'Class 9', quiz_name: 'Math Quiz', status: 'completed',
      score: 80, question_count: 10, completed_at: '2026-10-10T10:00:00Z',
      created_at: '2026-10-01T10:00:00Z', availability_status: 'active',
      end_time: null,
    }] });
    const screen = render(<StudentDashboard />);
    await waitFor(() => expect(screen.getByText('Math Quiz')).toBeTruthy());
    screen.rerender(<StudentDashboard />);
    expect(screen.getByText('Math Quiz')).toBeTruthy();
    expect(load.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
