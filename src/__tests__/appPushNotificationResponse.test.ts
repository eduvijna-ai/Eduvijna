import { Alert } from 'react-native';
import { handleAppPushNotificationResponse } from '../core/services/appPushNotificationResponse';
import { resolveStudentGradedAssignmentSession } from '../core/services/gradedNotificationRouting.service';
import { executeStudentAssignedQuizViewResults } from '../core/services/assessmentQuizStart.service';
import { handleOpenQuiz } from '../core/services/openQuizHandler';
import { AssignedQuizRecoveryProbeError } from '../core/services/assignedQuizRecovery.service';

jest.mock('../core/services/gradedNotificationRouting.service', () => ({
  resolveStudentGradedAssignmentSession: jest.fn(),
}));

jest.mock('../core/services/assessmentQuizStart.service', () => ({
  executeStudentAssignedQuizViewResults: jest.fn(),
}));

jest.mock('../core/services/openQuizHandler', () => ({
  handleOpenQuiz: jest.fn(),
}));

const mockResolve = resolveStudentGradedAssignmentSession as jest.MockedFunction<
  typeof resolveStudentGradedAssignmentSession
>;
const mockViewResults = executeStudentAssignedQuizViewResults as jest.MockedFunction<
  typeof executeStudentAssignedQuizViewResults
>;
const mockOpenQuiz = handleOpenQuiz as jest.MockedFunction<typeof handleOpenQuiz>;

describe('handleAppPushNotificationResponse', () => {
  const navigation = { navigate: jest.fn() };
  const processed = new Set<string>();

  beforeEach(() => {
    jest.clearAllMocks();
    processed.clear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('routes quiz_graded via assignment lookup with classroomId', async () => {
    mockResolve.mockResolvedValue({
      kind: 'resolved',
      sessionId: 'sess-9',
      classroomId: 'class-9',
    });
    mockViewResults.mockResolvedValue({ kind: 'view_results', resultParams: {} as any });

    await handleAppPushNotificationResponse({
      notificationId: 'n1',
      data: { type: 'quiz_graded', quiz_id: 9, student_id: 'student-1' },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });

    expect(mockViewResults).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess-9',
        classroomId: 'class-9',
      }),
      expect.any(Object),
    );
    expect(mockOpenQuiz).not.toHaveBeenCalled();
  });

  it('opens Assessments when graded assignment is ambiguous', async () => {
    mockResolve.mockResolvedValue({ kind: 'ambiguous' });

    await handleAppPushNotificationResponse({
      notificationId: 'n2',
      data: { type: 'quiz_graded', quiz_id: 9, student_id: 'student-1' },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });

    expect(navigation.navigate).toHaveBeenCalledWith('Assessments');
  });

  it('offers fallback when recovery probe fails during graded open', async () => {
    mockViewResults.mockRejectedValue(
      new AssignedQuizRecoveryProbeError('probe failed'),
    );

    await handleAppPushNotificationResponse({
      notificationId: 'n3',
      data: {
        type: 'quiz_graded',
        quiz_id: 9,
        session_id: 'sess-9',
        classroom_id: 'class-9',
        student_id: 'student-1',
      },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });

    expect(Alert.alert).toHaveBeenCalled();
  });

  it('queues full intent when unauthenticated', async () => {
    const setPending = jest.fn();
    const setIntent = jest.fn();
    await handleAppPushNotificationResponse({
      notificationId: 'n4',
      data: { type: 'quiz_assigned', session_id: 'sess-1', quiz_id: 3 },
      isAuthenticated: false,
      user: null,
      processedIds: processed,
      navigation,
      setPendingSessionId: setPending,
      setPendingNotificationIntent: setIntent,
    });

    expect(setPending).toHaveBeenCalledWith('sess-1');
    expect(setIntent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'quiz_assigned', sessionId: 'sess-1', quizId: '3' }),
    );
    expect(mockOpenQuiz).not.toHaveBeenCalled();
  });

  it('routes quiz_completed to instructor teacher-view results', async () => {
    await handleAppPushNotificationResponse({
      notificationId: 'n5',
      data: {
        type: 'quiz_completed',
        quiz_id: 9,
        session_id: 'sess-9',
        classroom_id: 'class-9',
        student_id: 'student-1',
        attempt_id: 77,
        student_name: 'Ada',
        quiz_title: 'Optics',
      },
      isAuthenticated: true,
      user: { id: 'teacher-1', role: 'instructor' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });

    expect(navigation.navigate).toHaveBeenCalledWith(
      'QuizResultsScreen',
      expect.objectContaining({
        quizId: '9',
        studentId: 'student-1',
        attemptId: '77',
        isTeacherView: true,
      }),
    );
    expect(mockOpenQuiz).not.toHaveBeenCalled();
  });

  it('does not force students through instructor completion destination', async () => {
    await handleAppPushNotificationResponse({
      notificationId: 'n6',
      data: {
        type: 'quiz_completed',
        quiz_id: 9,
        student_id: 'student-1',
        session_id: 'sess-9',
      },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });

    expect(navigation.navigate).toHaveBeenCalledWith('Assessments');
    expect(mockOpenQuiz).not.toHaveBeenCalled();
  });

  it('opens assigned quiz for students via handleOpenQuiz', async () => {
    mockOpenQuiz.mockResolvedValue(undefined as any);
    await handleAppPushNotificationResponse({
      notificationId: 'n7',
      data: { type: 'QUIZ_ASSIGNED', session_id: 'sess-1' },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });
    expect(mockOpenQuiz).toHaveBeenCalledWith(
      'sess-1',
      'notification',
      expect.anything(),
      expect.anything(),
      expect.any(Function),
    );
  });
});
