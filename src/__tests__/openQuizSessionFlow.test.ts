import { parseDeepLink } from '../core/services/deepLinkService';
import { handleOpenQuiz } from '../core/services/openQuizHandler';
import { loadAssignedQuizDataForSession } from '../core/services/assessmentQuizStart.service';

jest.mock('../core/services/assessmentQuizStart.service', () => ({
  loadAssignedQuizDataForSession: jest.fn(),
  executeStudentAssignedQuizViewResults: jest.fn(),
}));

jest.mock('../core/services/assignedQuizRecovery.service', () => ({
  findPendingSubmissionCheckpoint: jest.fn().mockResolvedValue(null),
  buildRecoveryResumeParams: jest.fn(),
}));

jest.mock('../core/services/dashboardApi', () => ({
  fetchQuizDetailsBySessionId: jest.fn().mockResolvedValue({
    quiz_id: 1,
    session_id: 'sess-1',
    title: 'Quiz',
    questions: [],
  }),
}));

const mockLoadAssigned = loadAssignedQuizDataForSession as jest.MockedFunction<
  typeof loadAssignedQuizDataForSession
>;

function shouldBlockDuplicateOpenQuiz(
  sessionId: string,
  lastSessionId: string | null,
  lastProcessedTime: number,
  now: number,
): boolean {
  return sessionId === lastSessionId && now - lastProcessedTime < 2000;
}

describe('openquiz session flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadAssigned.mockResolvedValue({
      normalizedQuiz: {
        quizId: 1,
        sessionId: 'sess-1',
        classroomId: 'sess-1',
        type: 'ASSIGNED',
        title: 'Quiz',
        duration: 30,
        questions: [
          {
            id: 'q0',
            question: 'Q?',
            options: ['A', 'B'],
            correctAnswer: 'A',
            answer: 'A',
            explanation: null,
          },
        ],
      },
      validation: {
        exists: true,
        isExpired: false,
        isScheduled: false,
        isAssigned: true,
        isAttempted: false,
        quizData: {},
        startTime: null,
        endTime: null,
      },
    } as any);
  });

  it('parses /openquiz session_id for post-login resume', () => {
    expect(parseDeepLink('https://app.eduvijna.com/openquiz?session_id=abc-123')).toMatchObject({
      type: 'assessment',
      sessionId: 'abc-123',
      assessmentId: 'abc-123',
    });
  });

  it('blocks concurrent duplicate deep-link events within debounce window', () => {
    const now = 10_000;
    expect(shouldBlockDuplicateOpenQuiz('sess', 'sess', now - 500, now)).toBe(true);
    expect(shouldBlockDuplicateOpenQuiz('sess', 'sess', now - 2500, now)).toBe(false);
    expect(shouldBlockDuplicateOpenQuiz('sess', 'other', now - 100, now)).toBe(false);
  });

  it('invokes navigation adapter through handleOpenQuiz for post_login source', async () => {
    const navigate = jest.fn();
    const setPending = jest.fn();
    const user = { id: 'student-1', role: 'student' };

    await handleOpenQuiz('sess-1', 'post_login', user, { navigate, alert: jest.fn() }, setPending);

    expect(navigate).toHaveBeenCalledWith('QuizLoadingScreen', expect.any(Object));
    expect(navigate.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(setPending).not.toHaveBeenCalled();
  });

  it('does not navigate when user is missing', async () => {
    const navigate = jest.fn();
    const setPending = jest.fn();
    await handleOpenQuiz(
      'sess-2',
      'deep_link',
      null as any,
      { navigate, alert: jest.fn() },
      setPending,
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(setPending).toHaveBeenCalledWith('sess-2');
  });
});
