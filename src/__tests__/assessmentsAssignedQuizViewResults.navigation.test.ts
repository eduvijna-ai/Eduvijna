/**
 * Completed-card View Results: pending immutable recovery before QuizResultsScreen.
 */

import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getQuizBySessionId } from '../core/services/sharedApi';
import { getAttendedQuiz } from '../core/services/quizResultRetrieval.service';
import {
  resolveStudentAssignedQuizViewResults,
} from '../core/services/assessmentQuizStart.service';
import { isAssignedQuizRecoveryProbeError } from '../core/services/assignedQuizRecovery.service';
import {
  QUIZ_SUBMISSION_CHECKPOINT_VERSION,
  writeQuizSubmissionCheckpoint,
  type QuizSubmissionCheckpoint,
} from '../core/services/quizSubmissionCheckpoint';

jest.mock('../core/services/sharedApi', () => ({
  getQuizBySessionId: jest.fn(),
}));

jest.mock('../core/services/quizResultRetrieval.service', () => ({
  getAttendedQuiz: jest.fn(),
  fetchPersistedQuizResult: jest.fn(),
}));

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

describe('resolveStudentAssignedQuizViewResults', () => {
  const asyncStore: Record<string, string> = {};

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('routes to immutable recovery retry when checkpoint pending on completed card', async () => {
    await writeQuizSubmissionCheckpoint(pendingCheckpoint);
    mockGetAttended.mockRejectedValue({ response: { status: 404 } });
    mockGetQuiz.mockResolvedValue({
      success: true,
      quiz_data: {
        quiz_id: 10,
        topic: 'Math',
        questions: { quizzes: [{ quiz: { question: '2+2?', options: ['3', '4'] }, answer: 'B' }] },
      },
    });

    const result = await resolveStudentAssignedQuizViewResults({
      studentId: 'student-1',
      quizId: 10,
      sessionId: 'sess-10',
      classroomId: 'class-1',
      attemptData: { quiz_id: 10, session_id: 'sess-10', status: 'completed' },
      quizName: 'Math',
    });

    expect(result.kind).toBe('recovery_retry');
    if (result.kind === 'recovery_retry') {
      expect(result.params.submissionRecovery).toEqual(
        expect.objectContaining({
          mode: 'immutable_retry',
          selectedAnswers: { 0: '4' },
        }),
      );
    }
  });

  it('opens results when server already has submission', async () => {
    await writeQuizSubmissionCheckpoint(pendingCheckpoint);
    mockGetAttended.mockResolvedValue({
      submitted_at: '2026-01-02T00:00:00.000Z',
      log_data: { answers: [{ questionNumber: 1 }] },
      items: [],
    });

    const result = await resolveStudentAssignedQuizViewResults({
      studentId: 'student-1',
      quizId: 10,
      sessionId: 'sess-10',
      classroomId: 'class-1',
      attemptData: { quiz_id: 10, quiz_name: 'Math' },
    });

    expect(result.kind).toBe('view_results');
    if (result.kind === 'view_results') {
      expect(result.resultParams.sessionId).toBe('sess-10');
      expect(result.resultParams.studentId).toBe('student-1');
    }
    expect(mockGetQuiz).not.toHaveBeenCalled();
  });

  it('surfaces probe failure for Assessments retry alert', async () => {
    await writeQuizSubmissionCheckpoint(pendingCheckpoint);
    mockGetAttended.mockRejectedValue({ response: { status: 500 } });

    let caught: unknown;
    try {
      await resolveStudentAssignedQuizViewResults({
        studentId: 'student-1',
        quizId: 10,
        sessionId: 'sess-10',
        classroomId: 'class-1',
        attemptData: { quiz_id: 10 },
      });
    } catch (error) {
      caught = error;
    }

    expect(isAssignedQuizRecoveryProbeError(caught)).toBe(true);
  });
});
