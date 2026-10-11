import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { generateAIQuiz } from '../core/services/sharedApi';
import QuizTakingScreen from '../screens/QuizTakingScreen';

jest.mock('../core/services/sharedApi', () => ({
  generateAIQuiz: jest.fn(),
}));

jest.mock('@core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'teacher-1', role: 'teacher' } }),
}));

jest.mock('../core/store/user.store', () => ({
  useUserStore: (selector: (s: { schoolId: string | null }) => unknown) =>
    selector({ schoolId: 'school-1' }),
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
      buttonText: '#fff',
    },
  }),
}));

jest.mock('../components/LoadingSpinner', () => 'LoadingSpinner');
jest.mock('../components/MathRenderer', () => 'MathRenderer');
jest.mock('../components/QuizExplanationAccordion', () => 'QuizExplanationAccordion');

const mockGenerateAIQuiz = generateAIQuiz as jest.MockedFunction<typeof generateAIQuiz>;

const baseQuestions = [
  {
    id: 'q-0',
    question: 'Sample?',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    answer: 'A',
    explanation: null,
  },
];

describe('QuizTakingScreen document regeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((b) => String(b.text).includes('Regenerate'));
      confirm?.onPress?.();
    });
    mockGenerateAIQuiz.mockResolvedValue({
      quiz: baseQuestions,
      quiz_id: 'regen-1',
      thread_id: 'thread-1',
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes gallery/camera regeneration instructions to generateAIQuiz', async () => {
    const { getByText } = render(
      <QuizTakingScreen
        navigation={{ navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() }}
        route={{
          params: {
            quizData: {
              id: 'doc-1',
              title: 'Camera doc',
              lesson: 'Optics',
              difficulty: 'medium',
              questions: baseQuestions,
              regenerationParams: {
                type: 'document',
                classId: 'class-10',
                subjectId: 'physics',
                count: 5,
                itext: 'Focus on lenses from gallery pages',
                uploadedFileName: 'camera-doc.pdf',
              },
            },
            showActionButtons: true,
            source: 'document',
          },
        }}
      />,
    );

    fireEvent.press(getByText('Regenerate'));

    await waitFor(() => {
      expect(mockGenerateAIQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          itext: 'Focus on lenses from gallery pages',
          count: 5,
        }),
      );
    });
  });
});
