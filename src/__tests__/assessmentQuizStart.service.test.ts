import { getQuizBySessionId } from '../core/services/sharedApi';
import {
  loadAssignedQuizDataForSession,
  navigateStudentToQuizTaking,
  buildQuizTakingNavigationParams,
} from '../core/services/assessmentQuizStart.service';

jest.mock('../core/services/sharedApi', () => ({
  getQuizBySessionId: jest.fn(),
}));

const mockGetQuiz = getQuizBySessionId as jest.MockedFunction<typeof getQuizBySessionId>;

describe('assessmentQuizStart.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads full questions when dashboard row has metadata only', async () => {
    mockGetQuiz.mockResolvedValue({
      success: true,
      quiz_data: {
        quiz_id: 42,
        topic: 'Algebra',
        question_count: 2,
        duration: 20,
        questions: {
          quizzes: [
            { quiz: { question: 'Q1', options: ['a', 'b'], answer: 'A' }, answer: 'A' },
            { quiz: { question: 'Q2', options: ['c', 'd'], answer: 'B' }, answer: 'B' },
          ],
        },
      },
    } as Awaited<ReturnType<typeof getQuizBySessionId>>);

    const result = await loadAssignedQuizDataForSession({
      correctQuizId: 42,
      correctSessionId: 'session-1',
      correctClassroomId: 'class-1',
      attemptData: { quiz_id: 42, session_id: 'session-1', quiz_name: 'Row title' },
    });

    expect(result.questions).toHaveLength(2);
    expect((result.questions as { question: string }[])[0].question).toBe('Q1');
    expect(result.session_id).toBe('session-1');
    expect(result.quiz_id).toBe(42);
  });

  it('navigates via onNavigate on web with recovery params', () => {
    const onNavigate = jest.fn();
    const params = buildQuizTakingNavigationParams(
      {
        correctQuizId: 7,
        correctSessionId: 'sess',
        correctClassroomId: 'room',
        attemptData: { quiz_id: 7 },
      },
      { quiz_id: 7, questions: [{ id: 'q-0' }] },
      {
        quizId: 7,
        sessionId: 'sess',
        selectedAnswers: { 0: 'A' },
        startedAtIso: '2026-01-01T00:00:00.000Z',
        scorePercent: 50,
        questionCount: 1,
      },
    );

    navigateStudentToQuizTaking(undefined, onNavigate, params);

    expect(onNavigate).toHaveBeenCalledWith(
      'QuizTakingScreen',
      expect.objectContaining({
        submissionRecovery: expect.objectContaining({ selectedAnswers: { 0: 'A' } }),
        quiz: expect.objectContaining({ quiz_id: 7 }),
        is_public: false,
      }),
    );
  });
});
