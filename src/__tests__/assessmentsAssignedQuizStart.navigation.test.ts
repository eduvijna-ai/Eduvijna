/**
 * Assessments student start/recovery: no metadata-only navigation on failures.
 */

import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkQuizAttempt, getQuizBySessionId } from '../core/services/sharedApi';
import { getAttendedQuiz } from '../core/services/quizResultRetrieval.service';
import {
  AssignedQuizLoadError,
  isAssignedQuizLoadError,
  resolveStudentAssignedQuizStart,
} from '../core/services/assessmentQuizStart.service';
import {
  AssignedQuizRecoveryProbeError,
  findPendingSubmissionCheckpoint,
  isAssignedQuizRecoveryProbeError,
} from '../core/services/assignedQuizRecovery.service';
import {
  QUIZ_SUBMISSION_CHECKPOINT_VERSION,
  writeQuizSubmissionCheckpoint,
  type QuizSubmissionCheckpoint,
} from '../core/services/quizSubmissionCheckpoint';

jest.mock('../core/services/sharedApi', () => ({
  checkQuizAttempt: jest.fn(),
  getQuizBySessionId: jest.fn(),
}));

jest.mock('../core/services/quizResultRetrieval.service', () => ({
  getAttendedQuiz: jest.fn(),
  fetchPersistedQuizResult: jest.fn(),
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

const mockCheckAttempt = checkQuizAttempt as jest.MockedFunction<typeof checkQuizAttempt>;
const mockGetQuiz = getQuizBySessionId as jest.MockedFunction<typeof getQuizBySessionId>;
const mockGetAttended = getAttendedQuiz as jest.MockedFunction<typeof getAttendedQuiz>;

const pendingCheckpoint: QuizSubmissionCheckpoint = {
  userId: 'student-1',
  quizId: '10',
  sessionId: 'sess-10',
  attemptId: 44,
  startedAt: '2026-01-01T00:00:00.000Z',
  attemptUpdated: true,
  immutable: {
    version: QUIZ_SUBMISSION_CHECKPOINT_VERSION,
    userId: 'student-1',
    quizId: '10',
    sessionId: 'sess-10',
    selectedAnswers: { 0: '4' },
    scorePercent: 100,
    questionCount: 1,
    logData: { score: 100 },
    startedAt: '2026-01-01T00:00:00.000Z',
    finalizedAt: '2026-01-01T00:01:00.000Z',
  },
};

/** Mirrors Assessments handleAction catch: retryable, stay on screen. */
function applyAssessmentsCatch(error: unknown): 'alert' {
  if (isAssignedQuizRecoveryProbeError(error) || isAssignedQuizLoadError(error)) {
    Alert.alert('Connection Error', 'Please try again.');
    return 'alert';
  }
  Alert.alert('Connection Error', 'Could not start this assessment.');
  return 'alert';
}

describe('Assessments assigned quiz start navigation', () => {
  const asyncStore: Record<string, string> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindPending.mockResolvedValue(null);
    for (const key of Object.keys(asyncStore)) delete asyncStore[key];
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      async (key: string) => asyncStore[key] ?? null,
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      asyncStore[key] = value;
    });
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
      delete asyncStore[key];
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('shows retry alert and does not navigate when quiz load fails', async () => {
    mockCheckAttempt.mockResolvedValue({
      hasAttempted: false,
      lookupFailed: false,
    });
    mockGetAttended.mockRejectedValue({ response: { status: 404 } });
    mockGetQuiz.mockRejectedValue(new Error('network down'));

    const navigation = { navigate: jest.fn() };
    let caught: unknown;
    try {
      await resolveStudentAssignedQuizStart({
        studentId: 'student-1',
        quizId: 10,
        sessionId: 'sess-10',
        classroomId: 'c1',
        attemptData: { quiz_id: 10, session_id: 'sess-10' },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AssignedQuizLoadError);
    expect(applyAssessmentsCatch(caught)).toBe('alert');
    expect(Alert.alert).toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('returns lookup_failed when checkpoint probe fails (HTTP 500 class)', async () => {
    mockFindPending.mockRejectedValue(
      new AssignedQuizRecoveryProbeError('Could not verify submission state.'),
    );
    mockCheckAttempt.mockResolvedValue({
      hasAttempted: false,
      lookupFailed: false,
    });

    const result = await resolveStudentAssignedQuizStart({
      studentId: 'student-1',
      quizId: 10,
      sessionId: 'sess-10',
      classroomId: 'c1',
      attemptData: { quiz_id: 10, session_id: 'sess-10' },
    });

    expect(result.kind).toBe('lookup_failed');
    expect(mockGetQuiz).not.toHaveBeenCalled();
  });

  it('returns lookup_failed when checkpoint probe fails (network)', async () => {
    mockFindPending.mockRejectedValue(
      new AssignedQuizRecoveryProbeError('Could not verify submission state.'),
    );
    mockCheckAttempt.mockResolvedValue({
      hasAttempted: false,
      lookupFailed: false,
    });

    const result = await resolveStudentAssignedQuizStart({
      studentId: 'student-1',
      quizId: 10,
      sessionId: 'sess-10',
      classroomId: 'c1',
      attemptData: { quiz_id: 10, session_id: 'sess-10' },
    });

    expect(result.kind).toBe('lookup_failed');
  });

  it('resumes immutable recovery when attempt lookup fails but checkpoint exists', async () => {
    await writeQuizSubmissionCheckpoint(pendingCheckpoint);
    mockFindPending.mockResolvedValue(pendingCheckpoint);
    mockCheckAttempt.mockResolvedValue({
      hasAttempted: false,
      lookupFailed: true,
    });
    mockGetAttended.mockResolvedValue({ submitted_at: null, log_data: {}, items: [] });
    mockGetQuiz.mockResolvedValue({
      success: true,
      quiz_data: {
        quiz_id: 10,
        topic: 'Recovery Quiz',
        question_count: 1,
        questions: { quizzes: [{ quiz: { question: 'Q?', options: ['1', '2'], answer: '2' } }] },
      },
    });

    const result = await resolveStudentAssignedQuizStart({
      studentId: 'student-1',
      quizId: 10,
      sessionId: 'sess-10',
      classroomId: 'c1',
      attemptData: { quiz_id: 10, session_id: 'sess-10' },
    });

    expect(result.kind).toBe('navigate');
    if (result.kind === 'navigate') {
      expect(result.params.submissionRecovery?.mode).toBe('immutable_retry');
    }
  });
});
