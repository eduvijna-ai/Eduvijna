/**
 * From Books screen: saved-books dropdowns, OFF/ON generate routing, alignment toggle.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import DocumentCurriculumFromBooksScreen from '../screens/document-upload/DocumentCurriculumFromBooksScreen';
import { resetSavedBooksServiceForTests } from '../core/services/savedBooksContent.service';

const mockNavigate = jest.fn();
const mockGenerate = jest.fn();
const mockGetBoards = jest.fn();
const mockGetClasses = jest.fn();
const mockGetSubjects = jest.fn();
const mockGetTopics = jest.fn();
const mockGetSubtopics = jest.fn();
const mockGetRefinements = jest.fn();
const mockGetCatalog = jest.fn();
const mockResolve = jest.fn();

jest.mock('@context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: '#fff',
        text: '#111',
        textSecondary: '#666',
        primary: '#0e7490',
        border: '#ddd',
        card: '#fafafa',
        surface: '#f8fafc',
      },
    },
  }),
}));

jest.mock('@core/store/user.store', () => ({
  useUserStore: (selector: (s: { schoolId: number; user: { id: string } }) => unknown) =>
    selector({ schoolId: 6, user: { id: '54' } }),
}));

jest.mock('@core/services/savedBooksContent.service', () => {
  const actual = jest.requireActual('@core/services/savedBooksContent.service');
  return {
    ...actual,
    getSavedBooksBoards: (...args: unknown[]) => mockGetBoards(...args),
    getSavedBooksClasses: (...args: unknown[]) => mockGetClasses(...args),
    getSavedBooksSubjects: (...args: unknown[]) => mockGetSubjects(...args),
    getSavedBooksTopics: (...args: unknown[]) => mockGetTopics(...args),
    getSavedBooksSubtopics: (...args: unknown[]) => mockGetSubtopics(...args),
    getSavedBooksCurriculumRefinements: (...args: unknown[]) => mockGetRefinements(...args),
    generateFromSavedBooks: (...args: unknown[]) => mockGenerate(...args),
    cancelGenerationJob: jest.fn(),
  };
});

jest.mock('@core/services/curriculumAssessment.service', () => {
  const actual = jest.requireActual('@core/services/curriculumAssessment.service');
  return {
    ...actual,
    getCurriculumCatalog: (...args: unknown[]) => mockGetCatalog(...args),
    resolveCurriculumByCodes: (...args: unknown[]) => mockResolve(...args),
  };
});

const board = { id: 1, label: 'CBSE' };
const classItem = { id: 10, label: 'Class 10' };
const subject = { id: 5, label: 'Mathematics' };
const topic = { id: 9, label: 'Polynomials' };

function renderScreen() {
  return render(
    <DocumentCurriculumFromBooksScreen
      navigation={{ navigate: mockNavigate, goBack: jest.fn() }}
      embedded
    />,
  );
}

describe('DocumentCurriculumFromBooksScreen saved-books flow', () => {
  beforeEach(() => {
    resetSavedBooksServiceForTests();
    mockNavigate.mockReset();
    mockGenerate.mockReset();
    mockGetBoards.mockResolvedValue([board]);
    mockGetClasses.mockResolvedValue([classItem]);
    mockGetSubjects.mockResolvedValue([subject]);
    mockGetTopics.mockResolvedValue([topic]);
    mockGetSubtopics.mockResolvedValue([]);
    mockGetRefinements.mockResolvedValue({ topics: [], subtopics: [] });
    mockGetCatalog.mockResolvedValue({
      contexts: [
        {
          board: { code: 'BRD_0001', label: 'CBSE' },
          grade: { code: '10', label: 'Class X' },
          subject: { code: 'mathematics', label: 'Mathematics' },
          curriculum_code: 'CBSE-10-MATHEMATICS-2026-27',
          version_label: '2026-27',
          is_current: true,
        },
      ],
    });
    mockResolve.mockResolvedValue({
      units: [{ unit_code: 'MATH-X-III', title: 'Polynomials' }],
    });
    mockGenerate.mockResolvedValue({
      success: true,
      generation_type: 'assessment',
      quiz: [{ question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' }],
      assessment_intelligence: { alignment_status: 'curriculum_mapped', warnings: [] },
    });
  });

  it('loads saved-books boards with school_id and does not call quiz/generate', async () => {
    const { getByText, getByTestId } = renderScreen();
    await waitFor(() => expect(mockGetBoards).toHaveBeenCalledWith(6, '54'));
    expect(getByText('Academic Context')).toBeTruthy();
    fireEvent.press(getByTestId('from-books-board-option-1'));
    await waitFor(() => expect(mockGetClasses).toHaveBeenCalledWith(1, 6, '54'));
    fireEvent.press(getByTestId('from-books-class-option-10'));
    await waitFor(() => expect(mockGetSubjects).toHaveBeenCalledWith(1, 10, 6, '54'));
    fireEvent.press(getByTestId('from-books-subject-option-5'));
    await waitFor(() => expect(mockGetTopics).toHaveBeenCalledWith(1, 10, 5, 6, '54'));
    expect(mockGetCatalog).not.toHaveBeenCalled();
  });

  it('OFF generate posts saved-books params with numeric IDs and format_type', async () => {
    const { getByTestId } = renderScreen();
    await waitFor(() => expect(mockGetBoards).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-board-option-1'));
    await waitFor(() => expect(mockGetClasses).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-class-option-10'));
    await waitFor(() => expect(mockGetSubjects).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-subject-option-5'));
    await waitFor(() => expect(mockGetTopics).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-topics-option-Polynomials'));
    fireEvent.press(getByTestId('from-books-generate'));
    await waitFor(() => expect(mockGenerate).toHaveBeenCalled());
    const payload = mockGenerate.mock.calls[0][0];
    expect(payload.generation_type).toBe('assessment');
    expect(payload.board_id).toBe(1);
    expect(payload.class_id).toBe(10);
    expect(payload.subject_id).toBe(5);
    expect(payload.topics).toEqual(['Polynomials']);
    expect(payload.format_type).toBe('katex');
    expect(payload.additional_instructions).toBe('summary');
    expect(payload.curriculum_context).toBeUndefined();
    expect(mockNavigate).toHaveBeenCalledWith(
      'DocumentCurriculumGeneratedPreviewScreen',
      expect.objectContaining({ source: 'Doc-File-Assessment' }),
    );
  });

  it('ON generate posts curriculum_context and never falls back to OFF IDs', async () => {
    const { getByTestId } = renderScreen();
    await waitFor(() => expect(mockGetBoards).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-board-option-1'));
    await waitFor(() => expect(mockGetClasses).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-class-option-10'));
    await waitFor(() => expect(mockGetSubjects).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-subject-option-5'));
    fireEvent(getByTestId('curriculum-alignment-switch'), 'valueChange', true);
    await waitFor(() => expect(mockGetCatalog).toHaveBeenCalledWith({ currentOnly: true }));
    await waitFor(() => expect(mockResolve).toHaveBeenCalled());
    await waitFor(() => getByTestId('from-books-unit-option-MATH-X-III'));
    fireEvent.press(getByTestId('from-books-unit-option-MATH-X-III'));
    await waitFor(() => expect(getByTestId('from-books-generate')).not.toBeDisabled());
    fireEvent.press(getByTestId('from-books-generate'));
    await waitFor(() => expect(mockGenerate).toHaveBeenCalled());
    const payload = mockGenerate.mock.calls[0][0];
    expect(payload.curriculum_context).toEqual({
      board_code: 'BRD_0001',
      grade_code: '10',
      subject_code: 'mathematics',
      version_label: '2026-27',
      unit_code: 'MATH-X-III',
    });
    expect(payload.board_id).toBeUndefined();
    expect(mockNavigate).toHaveBeenCalledWith(
      'DocumentCurriculumGeneratedPreviewScreen',
      expect.objectContaining({ source: 'Doc-File-Curriculum' }),
    );
  });

  it('rejects aligned responses without assessment_intelligence', async () => {
    mockGenerate.mockResolvedValue({
      success: true,
      quiz: [{ question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' }],
    });
    const { getByTestId, getByText } = renderScreen();
    await waitFor(() => expect(mockGetBoards).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-board-option-1'));
    await waitFor(() => expect(mockGetClasses).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-class-option-10'));
    await waitFor(() => expect(mockGetSubjects).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-subject-option-5'));
    fireEvent(getByTestId('curriculum-alignment-switch'), 'valueChange', true);
    await waitFor(() => getByTestId('from-books-unit-option-MATH-X-III'));
    fireEvent.press(getByTestId('from-books-unit-option-MATH-X-III'));
    fireEvent.press(getByTestId('from-books-generate'));
    await waitFor(() =>
      expect(
        getByText(/without curriculum alignment metadata/i),
      ).toBeTruthy(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('resets class/subject when board changes', async () => {
    mockGetBoards.mockResolvedValue([board, { id: 2, label: 'TS SCERT' }]);
    mockGetClasses.mockImplementation(async (boardId: number) =>
      boardId === 1 ? [classItem] : [{ id: 20, label: 'Class 8' }],
    );
    const { getByTestId, queryByTestId } = renderScreen();
    await waitFor(() => expect(mockGetBoards).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-board-option-1'));
    await waitFor(() => expect(mockGetClasses).toHaveBeenCalled());
    fireEvent.press(getByTestId('from-books-class-option-10'));
    fireEvent.press(getByTestId('from-books-board-option-2'));
    expect(queryByTestId('from-books-class-option-10')).toBeNull();
    await waitFor(() => expect(getByTestId('from-books-class-option-20')).toBeTruthy());
  });
});
