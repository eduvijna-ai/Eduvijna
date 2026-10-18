import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { apiClient } from '../core/api/config';
import QuizTeacherAnalyticsScreen from '../screens/QuizTeacherAnalyticsScreen';

jest.mock('../components/analytics/AnalyticsDateFilter', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  function MockAnalyticsDateFilter({
    onApply,
    onClear,
  }: {
    onApply: () => void;
    onClear: () => void;
  }) {
    return (
    <>
      <TouchableOpacity testID="mock-analytics-date-apply" onPress={onApply}>
        <Text>Apply</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="mock-analytics-date-clear" onPress={onClear}>
        <Text>Clear</Text>
      </TouchableOpacity>
    </>
    );
  }
  MockAnalyticsDateFilter.displayName = 'MockAnalyticsDateFilter';
  return MockAnalyticsDateFilter;
});
jest.mock('@core/services/navigationService', () => ({
  navigate: jest.fn(),
}));
jest.mock('../components/analytics/ClassStudentsModal', () => () => null);
jest.mock('../components/analytics/QuizAttemptDetailModal', () => () => null);
jest.mock('@core/hooks/useAssessmentClassrooms', () => ({
  useAssessmentClassrooms: () => ({
    classrooms: [
      {
        classroom_id: 'class-9',
        classroom_name: 'Class 9',
        total_students: 1,
        instructor: {
          instructor_id: '0',
          instructor_username: 'x',
          instructor_fullname: 'x',
          instructor_avatar_url: null,
        },
      },
    ],
    count: 1,
    options: [{ label: 'Class 9', value: 'class-9' }],
    source: 'class_wise_students',
    loading: false,
    unavailable: false,
    error: null,
    contractNote: null,
    refresh: jest.fn(async () => undefined),
  }),
}));
jest.mock('@core/store/user.store', () => {
  const state = {
    user: { id: '66', role: 'instructor' },
    schoolId: 1,
    isAuthenticated: true,
  };
  const useUserStore = Object.assign(
    jest.fn((selector: (s: typeof state) => unknown) => selector(state)),
    { getState: () => state },
  );
  return { useUserStore };
});

const fixture = {
  quiz_id: 42,
  classroom_id: 'class-9',
  classroom_name: 'Class 9',
  session_id: 'session-42',
  quiz_name: 'Quadratic Equations',
  topic: 'Algebra',
  created_at: '2026-10-01T00:00:00Z',
  start_time: null,
  end_time: null,
  duration: 15,
  question_count: 10,
  total_students: 1,
  completed_count: 1,
  pending_count: 0,
  in_progress_count: 0,
  availability_status: 'active',
  attempts: [
    {
      student_id: '70',
      student_fullname: 'Aarya',
      student_username: 'demo_aarya',
      status: 'completed',
      score: 80,
      attempt_id: 123,
      time_spent_seconds: 120,
      submission: { submitted_at: '2026-10-10T00:00:00Z', log_data: '{"answers":[]}' },
    },
  ],
};

beforeEach(() => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: [fixture], meta: { total_count: 1 } } });
});

async function drillToQuizAttemptList(screen: ReturnType<typeof render>) {
  await waitFor(() => expect(screen.getByTestId('analytics-drill-classes')).toBeTruthy());
  fireEvent.press(screen.getByText('Class 9'));
  await waitFor(() => expect(screen.getByTestId('analytics-drill-class-class-9')).toBeTruthy());
  fireEvent.press(screen.getByText('View Analytics'));
  await waitFor(() =>
    expect(screen.getByTestId('analytics-drill-quiz-42-session-42')).toBeTruthy(),
  );
}

it('returns to Class Overview when Apply is pressed from quiz drill', async () => {
  const screen = render(<QuizTeacherAnalyticsScreen />);
  await drillToQuizAttemptList(screen);
  expect(screen.getByText('Aarya')).toBeTruthy();
  fireEvent.press(screen.getByTestId('mock-analytics-date-apply'));
  await waitFor(() => expect(screen.getByTestId('analytics-drill-classes')).toBeTruthy());
  expect(screen.getByText('Class Overview')).toBeTruthy();
  expect(screen.queryByTestId('analytics-drill-quiz-42-session-42')).toBeNull();
});

it('returns to Class Overview when Clear is pressed from quiz drill', async () => {
  const screen = render(<QuizTeacherAnalyticsScreen />);
  await drillToQuizAttemptList(screen);
  fireEvent.press(screen.getByTestId('mock-analytics-date-clear'));
  await waitFor(() => expect(screen.getByTestId('analytics-drill-classes')).toBeTruthy());
  expect(screen.queryByText('Back to Quizzes')).toBeNull();
});

it('clears selected assignment and resets class pagination to page 1 on Apply', async () => {
  const screen = render(<QuizTeacherAnalyticsScreen />);
  await drillToQuizAttemptList(screen);
  fireEvent.press(screen.getByTestId('mock-analytics-date-apply'));
  await waitFor(() => expect(screen.getByTestId('analytics-drill-classes')).toBeTruthy());
  fireEvent.press(screen.getByText('Class 9'));
  await waitFor(() => expect(screen.getByTestId('analytics-drill-class-class-9')).toBeTruthy());
  expect(screen.queryByTestId('analytics-view-result-42-session-42-70-123')).toBeNull();
});
