import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { apiClient } from '../core/api/config';
import QuizTeacherAnalyticsScreen from '../screens/QuizTeacherAnalyticsScreen';

jest.mock('../components/analytics/AnalyticsDateFilter', () => () => null);
jest.mock('../components/analytics/ClassStudentsModal', () => () => null);
jest.mock('../components/analytics/QuizAttemptDetailModal', () => () => null);

const fixture = {
  quiz_id: 42, classroom_id: 'class-9', classroom_name: 'Class 9',
  session_id: 'session-42', quiz_name: 'Quadratic Equations', topic: 'Algebra',
  created_at: '2026-10-01T00:00:00Z', start_time: null, end_time: null,
  duration: 15, question_count: 10, total_students: 1, completed_count: 1,
  pending_count: 0, in_progress_count: 0, availability_status: 'active',
  attempts: [{
    student_id: '70', student_fullname: 'Aarya', student_username: 'demo_aarya',
    status: 'completed', score: 80, attempt_id: 123, time_spent_seconds: 120,
    submission: { submitted_at: '2026-10-10T00:00:00Z', log_data: '{"answers":[]}' },
  }],
};

beforeEach(() => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: [fixture], meta: { total_count: 1 } } });
});

it('opens the actual quiz card with its ID and renders existing student attempts', async () => {
  const screen = render(<QuizTeacherAnalyticsScreen />);
  await waitFor(() => expect(screen.getByText('Class 9')).toBeTruthy());
  expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('limit=500'));
  fireEvent.press(screen.getByText('Class 9'));
  fireEvent.press(screen.getByText('View Analytics'));
  expect(screen.getByText('Showing 1 attempt')).toBeTruthy();
  expect(screen.getByText('Aarya')).toBeTruthy();
  expect(screen.getByText('View Details')).toBeTruthy();
  expect(screen.queryByText('No student attempts available for this quiz.')).toBeNull();
});

it('keeps the performance-summary route and back navigation working', async () => {
  const screen = render(<QuizTeacherAnalyticsScreen />);
  await waitFor(() => expect(screen.getByText('Class 9')).toBeTruthy());
  fireEvent.press(screen.getByText('Class 9'));
  const quizNames = screen.getAllByText('Quadratic Equations');
  fireEvent.press(quizNames[quizNames.length - 1]);
  expect(screen.getByText('Aarya')).toBeTruthy();
  fireEvent.press(screen.getByText('Back to Quizzes'));
  expect(screen.getByText('View Analytics')).toBeTruthy();
  fireEvent.press(screen.getByText('All Classes'));
  expect(screen.getByText('Class Overview')).toBeTruthy();
});
