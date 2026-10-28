import { handleOpenQuiz } from '../core/services/openQuizHandler';
import * as dashboardApi from '../core/services/dashboardApi';
import * as assessmentQuizStart from '../core/services/assessmentQuizStart.service';

jest.mock('../core/services/dashboardApi');
jest.mock('../core/services/assessmentQuizStart.service');
jest.mock('../core/services/assignedQuizRecovery.service', () => ({
  findPendingSubmissionCheckpoint: jest.fn().mockResolvedValue(null),
  buildRecoveryResumeParams: jest.fn(),
  isAssignedQuizRecoveryProbeError: jest.fn().mockReturnValue(false),
}));

const student = { id: '70', role: 'student' };

function navAdapter() {
  const navigate = jest.fn();
  return { navigate, alert: jest.fn() };
}

describe('handleOpenQuiz routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const recovery = jest.requireMock('../core/services/assignedQuizRecovery.service');
    recovery.findPendingSubmissionCheckpoint.mockResolvedValue(null);
    recovery.isAssignedQuizRecoveryProbeError.mockReturnValue(false);
  });

  it('routes completed student assignments to shared view-results resolver', async () => {
    (dashboardApi.fetchQuizDetailsBySessionId as jest.Mock).mockResolvedValue({
      exists: true,
      isExpired: false,
      isScheduled: false,
      isAssigned: true,
      isAttempted: true,
      quizData: { quiz_id: 479, classroom_id: 'class_x', topic: 'Math' },
      attemptData: { id: 207, status: 'completed', score: 60 },
      startTime: null,
      endTime: null,
    });
    (assessmentQuizStart.executeStudentAssignedQuizViewResults as jest.Mock).mockResolvedValue({
      kind: 'view_results',
    });

    const adapter = navAdapter();
    await handleOpenQuiz('sess-1', 'deep_link', student, adapter, undefined, { quizId: '479' });

    expect(assessmentQuizStart.executeStudentAssignedQuizViewResults).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: '70',
        quizId: 479,
        sessionId: 'sess-1',
      }),
      expect.any(Object),
    );
    expect(adapter.navigate).not.toHaveBeenCalledWith('QuizStatusScreen', expect.objectContaining({ status: 'not_found' }));
  });

  it('shows not_found when session cannot be resolved', async () => {
    (dashboardApi.fetchQuizDetailsBySessionId as jest.Mock).mockResolvedValue({
      exists: false,
      isExpired: false,
      isScheduled: false,
      isAssigned: false,
      isAttempted: false,
      quizData: null,
      startTime: null,
      endTime: null,
    });

    const adapter = navAdapter();
    await handleOpenQuiz('missing', 'deep_link', student, adapter);

    expect(adapter.navigate).toHaveBeenCalledWith(
      'QuizStatusScreen',
      expect.objectContaining({ status: 'not_found', title: 'No Quiz Available' }),
    );
  });

  it('queues unauthenticated deep links without navigating', async () => {
    const savePending = jest.fn();
    const adapter = navAdapter();
    await handleOpenQuiz('sess-2', 'deep_link', null, adapter, savePending);
    expect(savePending).toHaveBeenCalledWith('sess-2');
    expect(adapter.navigate).not.toHaveBeenCalled();
  });

  it('Cancel on recovery-probe alert leaves QuizLoadingScreen (Issue 6)', async () => {
    const { isAssignedQuizRecoveryProbeError } = jest.requireMock(
      '../core/services/assignedQuizRecovery.service',
    );
    const { findPendingSubmissionCheckpoint } = jest.requireMock(
      '../core/services/assignedQuizRecovery.service',
    );

    (dashboardApi.fetchQuizDetailsBySessionId as jest.Mock).mockResolvedValue({
      exists: true,
      isExpired: false,
      isScheduled: false,
      isAssigned: true,
      isAttempted: false,
      quizData: {
        quiz_id: 99,
        session_id: 'sess-cancel',
        topic: 'Probe',
        questions: { quizzes: [] },
        has_time_limit: false,
        is_public: false,
      },
      startTime: null,
      endTime: null,
    });

    const probeError = Object.assign(new Error('Recovery probe timed out'), {
      code: 'ASSIGNED_QUIZ_RECOVERY_PROBE',
    });
    (isAssignedQuizRecoveryProbeError as jest.Mock).mockReturnValue(true);
    (findPendingSubmissionCheckpoint as jest.Mock).mockRejectedValue(probeError);

    const replace = jest.fn();
    const navigate = jest.fn();
    const alert = jest.fn((_title: string, _msg: string, buttons?: any[]) => {
      const cancel = buttons?.find((b) => b.style === 'cancel' || b.text === 'Cancel');
      cancel?.onPress?.();
    });

    await handleOpenQuiz('sess-cancel', 'deep_link', student, { navigate, replace, alert });

    expect(alert).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('Main', { screen: 'Dashboard' });
  });

  it('routes available unattempted student quiz to QuizTakingScreen', async () => {
    (dashboardApi.fetchQuizDetailsBySessionId as jest.Mock).mockResolvedValue({
      exists: true,
      isExpired: false,
      isScheduled: false,
      isAssigned: true,
      isAttempted: false,
      quizData: {
        quiz_id: 11,
        session_id: 'sess-3',
        topic: 'Sample',
        questions: { quizzes: [] },
        has_time_limit: false,
        is_public: false,
      },
      startTime: null,
      endTime: null,
    });

    const adapter = navAdapter();
    await handleOpenQuiz('sess-3', 'deep_link', student, adapter);

    expect(adapter.navigate).toHaveBeenCalledWith(
      'QuizTakingScreen',
      expect.objectContaining({ quizId: 11, sessionId: 'sess-3' }),
    );
  });
});
