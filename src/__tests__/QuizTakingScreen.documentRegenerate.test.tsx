import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { regenerateDocumentUploadQuiz } from '../core/services/documentUploadApi';
import QuizTakingScreen from '../screens/QuizTakingScreen';

jest.mock('../core/services/documentUploadApi', () => ({
  regenerateDocumentUploadQuiz: jest.fn(),
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

const mockRegenerate = regenerateDocumentUploadQuiz as jest.MockedFunction<
  typeof regenerateDocumentUploadQuiz
>;

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
    mockRegenerate.mockResolvedValue({
      questions: baseQuestions,
      regenerationParams: {
        type: 'document-upload',
        ocrText: 'Focus on lenses from gallery pages',
        count: 5,
      },
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls regenerateDocumentUploadQuiz for document-upload source with preserved instructions', async () => {
    const regenerationParams = {
      type: 'document-upload' as const,
      grade: 'Class 10',
      subject: 'Physics',
      count: 5,
      ocrText: 'Focus on lenses from gallery pages',
      fileName: 'camera-doc.pdf',
    };

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
              regenerationParams,
            },
            showActionButtons: true,
            source: 'document-upload',
          },
        }}
      />,
    );

    fireEvent.press(getByText('Regenerate'));

    await waitFor(() => {
      expect(mockRegenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'document-upload',
          ocrText: 'Focus on lenses from gallery pages',
          count: 5,
        }),
        expect.objectContaining({ id: 'doc-1' }),
      );
    });
  });
});
