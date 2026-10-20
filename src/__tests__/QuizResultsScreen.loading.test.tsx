import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import QuizResultsScreen from '../screens/QuizResultsScreen';
import { fetchPersistedQuizResult } from '../core/services/quizResultRetrieval.service';

jest.mock('../core/services/quizResultRetrieval.service', () => ({
  fetchPersistedQuizResult: jest.fn(),
}));

jest.mock('@core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'student-1', role: 'student' } }),
}));

jest.mock('../erp_schools/theme/useTeacherTheme', () => ({
  useTeacherTheme: () => ({
    colors: {
      background: '#fff',
      text: '#000',
      textSecondary: '#666',
      primary: '#005',
      border: '#ccc',
      card: '#fff',
    },
  }),
}));

const mockFetch = fetchPersistedQuizResult as jest.MockedFunction<
  typeof fetchPersistedQuizResult
>;

describe('QuizResultsScreen loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exits loading on error with retry affordance', async () => {
    mockFetch.mockResolvedValue({
      status: 'error',
      message: 'Network error',
      retryable: true,
    });

    const { queryByText } = render(
      <QuizResultsScreen
        navigation={{ goBack: jest.fn() }}
        route={{
          params: {
            quizId: 1,
            sessionId: 'sess-a',
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(queryByText('Network error')).toBeTruthy();
    });
    expect(queryByText(/Loading/i)).toBeNull();
  });

  it('exits loading on missing without retry', async () => {
    mockFetch.mockResolvedValue({ status: 'missing' });

    const { queryByText } = render(
      <QuizResultsScreen
        navigation={{ goBack: jest.fn() }}
        route={{
          params: {
            quizId: 1,
            sessionId: 'sess-a',
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(queryByText(/No saved results/i)).toBeTruthy();
    });
  });
});
