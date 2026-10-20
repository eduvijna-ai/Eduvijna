/**
 * Assessment recovery navigation: metadata-only row → full quiz + recovery params.
 */

import {
  buildRecoveryResumeParams,
  findPendingSubmissionCheckpoint,
} from '../core/services/assignedQuizRecovery.service';
import {
  buildQuizTakingNavigationParams,
  loadAssignedQuizDataForSession,
  navigateStudentToQuizTaking,
} from '../core/services/assessmentQuizStart.service';
import { getQuizBySessionId } from '../core/services/sharedApi';

jest.mock('../core/services/sharedApi', () => ({
  getQuizBySessionId: jest.fn(),
}));

jest.mock('../core/services/assignedQuizRecovery.service', () => {
  const actual = jest.requireActual('../core/services/assignedQuizRecovery.service');
  return {
    ...actual,
    findPendingSubmissionCheckpoint: jest.fn(),
  };
});

const mockFindPending = findPendingSubmissionCheckpoint as jest.MockedFunction<
  typeof findPendingSubmissionCheckpoint
>;
const mockGetQuiz = getQuizBySessionId as jest.MockedFunction<typeof getQuizBySessionId>;

describe('Assessment recovery navigation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches questions before recovery navigation when row lacks questions', async () => {
    mockFindPending.mockResolvedValue({
      userId: 's1',
      quizId: '99',
      sessionId: 'sess-a',
      attemptId: 3,
      startedAt: '2026-01-01T00:00:00.000Z',
      immutable: {
        version: 1,
        userId: 's1',
        quizId: '99',
        sessionId: 'sess-a',
        selectedAnswers: { 0: '4' },
        scorePercent: 100,
        questionCount: 1,
        logData: { score: 100 },
        startedAt: '2026-01-01T00:00:00.000Z',
        finalizedAt: '2026-01-01T00:01:00.000Z',
      },
    });

    mockGetQuiz.mockResolvedValue({
      success: true,
      quiz_data: {
        quiz_id: 99,
        question_count: 1,
        questions: {
          quizzes: [
            {
              quiz: { question: '2+2?', options: ['3', '4'], answer: 'B' },
              answer: 'B',
            },
          ],
        },
      },
    } as Awaited<ReturnType<typeof getQuizBySessionId>>);

    const attemptData = { quiz_id: 99, session_id: 'sess-a', classroom_id: 'c1' };
    const pending = await findPendingSubmissionCheckpoint('s1', 99, 'sess-a');
    const recovery = buildRecoveryResumeParams(pending!);
    const startCtx = {
      correctQuizId: 99,
      correctSessionId: 'sess-a',
      correctClassroomId: 'c1',
      attemptData,
    };
    const quizDataWithQuestions = await loadAssignedQuizDataForSession(startCtx);
    const navigation = { navigate: jest.fn() };

    navigateStudentToQuizTaking(
      navigation,
      undefined,
      buildQuizTakingNavigationParams(startCtx, quizDataWithQuestions, recovery),
    );

    expect(mockGetQuiz).toHaveBeenCalledWith('sess-a');
    expect(navigation.navigate).toHaveBeenCalledWith(
      'QuizTakingScreen',
      expect.objectContaining({
        submissionRecovery: expect.objectContaining({ scorePercent: 100 }),
        quizData: expect.objectContaining({
          questions: expect.arrayContaining([
            expect.objectContaining({ question: '2+2?' }),
          ]),
        }),
      }),
    );
  });
});
