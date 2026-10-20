import React from 'react';
import { render } from '@testing-library/react-native';
import QuizStudentAttemptCard from '../components/analytics/QuizStudentAttemptCard';
import type { QuizAttemptViewRow } from '../core/utils/teacherAnalyticsHelpers';

const colors = {
  card: '#fff',
  border: '#ddd',
  text: '#111',
  textSecondary: '#666',
  primary: '#06c',
};

const baseRow: QuizAttemptViewRow = {
  student_id: '70',
  student_username: 'aarya',
  student_fullname: 'Aarya',
  status: 'completed',
  derivedStatus: 'completed',
  score: 60,
  time_spent_seconds: 90,
  submitted_at: '2026-10-11T12:00:00Z',
  log_data: null,
  logSource: 'none',
  attempt_id: '207',
  canViewSavedResult: true,
};

describe('QuizStudentAttemptCard action visibility', () => {
  it('shows View Details when completed without embedded log_data', () => {
    const { getByText, getByTestId } = render(
      <QuizStudentAttemptCard
        row={baseRow}
        quizName="MATH_Quiz"
        colors={colors}
        onView={() => {}}
        viewResultTestId="analytics-view-result-479-a6882262-5c50-4cf5-a4a8-dc8786862916-70-207"
      />,
    );
    expect(getByText('View Details')).toBeTruthy();
    expect(
      getByTestId('analytics-view-result-479-a6882262-5c50-4cf5-a4a8-dc8786862916-70-207'),
    ).toBeTruthy();
  });

  it('hides View Details when canViewSavedResult is false', () => {
    const { queryByText } = render(
      <QuizStudentAttemptCard
        row={{ ...baseRow, status: 'pending', derivedStatus: 'pending', canViewSavedResult: false }}
        quizName="MATH_Quiz"
        colors={colors}
        onView={() => {}}
      />,
    );
    expect(queryByText('View Details')).toBeNull();
  });
});
