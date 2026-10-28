import {
  __resetOpenQuizRequestGuardForTests,
  beginOpenQuizRequest,
  cancelPendingOpenQuizRequest,
  isOpenQuizRequestCurrent,
} from '../core/services/openQuizRequestGuard';
import { handleOpenQuiz } from '../core/services/openQuizHandler';
import * as dashboardApi from '../core/services/dashboardApi';

jest.mock('../core/services/dashboardApi');
jest.mock('../core/services/assessmentQuizStart.service', () => ({
  executeStudentAssignedQuizViewResults: jest.fn(),
  loadAssignedQuizDataForImmutableRecovery: jest.fn(),
  loadAssignedQuizDataForSession: jest.fn(),
}));
jest.mock('../core/services/assignedQuizRecovery.service', () => ({
  findPendingSubmissionCheckpoint: jest.fn().mockResolvedValue(null),
  buildRecoveryResumeParams: jest.fn(),
  isAssignedQuizRecoveryProbeError: jest.fn().mockReturnValue(false),
}));

describe('openQuizRequestGuard + stale navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetOpenQuizRequestGuardForTests();
  });

  it('cancelPendingOpenQuizRequest invalidates the current generation', () => {
    const gen = beginOpenQuizRequest();
    expect(isOpenQuizRequestCurrent(gen)).toBe(true);
    cancelPendingOpenQuizRequest();
    expect(isOpenQuizRequestCurrent(gen)).toBe(false);
  });

  it('late in-flight fetch after Cancel does not navigate to QuizTakingScreen', async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    let fetchStarted = false;
    (dashboardApi.fetchQuizDetailsBySessionId as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          fetchStarted = true;
          resolveFetch = resolve;
        }),
    );

    const navigate = jest.fn();
    const replace = jest.fn();
    const alert = jest.fn();
    const student = { id: '70', role: 'student' };

    const pending = handleOpenQuiz('sess-late', 'deep_link', student, {
      navigate,
      replace,
      alert,
    });

    // Wait until fetch is genuinely in flight (after the 100ms loading settle).
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (fetchStarted) {
          resolve();
          return;
        }
        setTimeout(tick, 20);
      };
      tick();
    });

    cancelPendingOpenQuizRequest();

    resolveFetch({
      exists: true,
      isExpired: false,
      isScheduled: false,
      isAssigned: true,
      isAttempted: false,
      quizData: {
        quiz_id: 479,
        classroom_id: 'class_x',
        topic: 'Math',
        session_id: 'sess-late',
        questions: [
          {
            id: 'q1',
            question: '2+2?',
            options: ['3', '4', '5', '6'],
            answer: 'B',
          },
        ],
      },
      startTime: null,
      endTime: null,
    });

    await pending;

    expect(fetchStarted).toBe(true);
    expect(replace).not.toHaveBeenCalledWith(
      'QuizTakingScreen',
      expect.anything(),
    );
    expect(navigate).not.toHaveBeenCalledWith(
      'QuizTakingScreen',
      expect.anything(),
    );
  });
});
