import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import DocumentCurriculumGeneratedPreviewScreen from '../screens/document-upload/DocumentCurriculumGeneratedPreviewScreen';
import {
  buildCurriculumGeneratedPreviewParams,
  buildQuizDataFromPreview,
  normalizeGeneratedQuizQuestions,
} from '../core/utils/documentCurriculumGeneratedHandoff';

jest.mock('@context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: '#fff',
        text: '#111',
        textSecondary: '#666',
        primary: '#06c',
        border: '#ddd',
        card: '#fafafa',
      },
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@core/store/user.store', () => ({
  useUserStore: (selector: (s: { schoolId: number }) => unknown) =>
    selector({ schoolId: 1 }),
}));

jest.mock('@core/services/sharedApi', () => ({
  saveUserAssessment: jest.fn().mockResolvedValue({ id: 9001 }),
  generateWorksheet: jest.fn(),
}));

jest.mock('../components/EducationalContent', () => {
  const { Text } = require('react-native');
  return function MockEducationalContent({ content }: { content: string }) {
    return <Text>{content}</Text>;
  };
});

const mockGenerationResponse = {
  session_id: 'sess-integration-1',
  quiz: [
    {
      question: 'What is 2 + 2?',
      options: ['3', '4', '5'],
      answer: '4',
      explanation: 'Basic addition.',
    },
  ],
};

const curriculumMeta = {
  alignmentEnabled: false,
  boardCode: 'CBSE',
  gradeCode: '10',
  subjectCode: 'MATH',
  versionLabel: '2024-25',
  unitCodes: ['U1'],
  topicTitles: 'Algebra',
  subtopics: ['linear'],
  language: 'en',
  additionalInstructions: 'Focus on integers',
  level: 'medium',
  count: 5,
  title: 'Math - Algebra',
  classLabel: 'Class 10',
  subjectLabel: 'Mathematics',
};

describe('curriculum generated preview handoff', () => {
  it('builds navigation params the preview screen accepts', () => {
    const navParams = buildCurriculumGeneratedPreviewParams({
      generationResponse: mockGenerationResponse,
      sessionId: 'sess-integration-1',
      source: 'Doc-File-Curriculum',
      curriculumMeta,
    });
    const questions = normalizeGeneratedQuizQuestions(navParams.generationResponse);
    expect(questions).toHaveLength(1);
    expect(questions[0].correctAnswer).toBe('4');

    const quizData = buildQuizDataFromPreview(navParams, questions, 9001);
    expect(quizData.regenerationParams.source).toBe('Doc-File-Curriculum');
    expect(quizData.regenerationParams.itext).toBe('Focus on integers');
    expect(quizData.id).toBe(9001);
  });

  it('renders preview from source-screen navigation payload', async () => {
    const routeParams = buildCurriculumGeneratedPreviewParams({
      generationResponse: mockGenerationResponse,
      sessionId: 'sess-integration-1',
      source: 'Doc-File-Curriculum',
      curriculumMeta,
    });

    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const { getByText, getByTestId } = render(
      <DocumentCurriculumGeneratedPreviewScreen
        navigation={navigation}
        route={{ params: routeParams }}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('curriculum-preview-meta').props.children.join('')).toContain('Alignment OFF');
    });
    expect(getByText('What is 2 + 2?')).toBeTruthy();
    expect(getByText('Basic addition.')).toBeTruthy();
    expect(getByTestId('curriculum-preview-start-quiz')).toBeTruthy();
  });
});
