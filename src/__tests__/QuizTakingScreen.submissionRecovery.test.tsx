import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import QuizTakingScreen from '../screens/QuizTakingScreen';

jest.mock('@core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'student-1', role: 'student' } }),
}));

jest.mock('../core/store/user.store', () => ({
  useUserStore: (selector: (s: { schoolId: string | null }) => unknown) =>
    selector({ schoolId: null }),
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

jest.mock('../components/LoadingSpinner', () => 'LoadingSpinner');
jest.mock('../components/MathRenderer', () => 'MathRenderer');
jest.mock('../components/QuizExplanationAccordion', () => 'QuizExplanationAccordion');

describe('QuizTakingScreen submissionRecovery', () => {
  const baseQuestions = [
    {
      id: 'q-0',
      question: 'Pick four',
      options: ['3', '4', '5', '6'],
      correctAnswer: 'B',
      answer: 'B',
      explanation: null,
    },
  ];

  it('keeps restored answers after quiz load effect runs', async () => {
    const { getByText } = render(
      <QuizTakingScreen
        navigation={{ navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() }}
        route={{
          params: {
            quizData: {
              quiz_id: 42,
              session_id: 'sess',
              classroom_id: 'room',
              title: 'Test',
              questions: baseQuestions,
            },
            submissionRecovery: {
              quizId: 42,
              sessionId: 'sess',
              selectedAnswers: { 0: '4' },
              startedAtIso: '2026-01-01T00:00:00.000Z',
              scorePercent: 100,
              questionCount: 1,
            },
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(getByText('checkmark-circle')).toBeTruthy();
    });
  });
});
