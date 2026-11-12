import { Alert, Platform } from 'react-native';
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
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('1. iOS notification-only / empty data opens Notifications without incomplete alert', async () => {
    await handleAppPushNotificationResponse({
      notificationId: 'ios-empty',
      data: undefined,
      isAuthenticated: true,
      user: { id: 'u1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });

    expect(navigation.navigate).toHaveBeenCalledWith('Notifications');
    expect(Alert.alert).not.toHaveBeenCalledWith(
      'Error',
      'Notification data is incomplete. Please try again.',
    );
  });

  it('2. routes valid flat assessment-assignment data via handleOpenQuiz', async () => {
    mockOpenQuiz.mockResolvedValue(undefined as any);
    await handleAppPushNotificationResponse({
      notificationId: 'n-assign',
      data: { type: 'quiz_assigned', session_id: 'sess-1', quiz_id: '3' },
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

  it('3. routes quiz_graded via assignment lookup with classroomId', async () => {
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

  it('4. routes quiz_completed to instructor teacher-view results', async () => {
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

  it('5. general / self-test notification falls back to Notifications (no incomplete alert)', async () => {
    await handleAppPushNotificationResponse({
      notificationId: 'self-test-1',
      data: { test: 'true', self_test: 'true' },
      isAuthenticated: true,
      user: { id: 'u1', role: 'instructor' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });

    expect(navigation.navigate).toHaveBeenCalledWith('Notifications');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('6. missing type with valid session identifier opens assigned quiz', async () => {
    mockOpenQuiz.mockResolvedValue(undefined as any);
    await handleAppPushNotificationResponse({
      notificationId: 'sess-only',
      data: { session_id: 'sess-42' },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });
    expect(mockOpenQuiz).toHaveBeenCalledWith(
      'sess-42',
      'notification',
      expect.anything(),
      expect.anything(),
      expect.any(Function),
    );
  });

  it('7. assessment type missing routing identifiers uses Assessments (not incomplete alert)', async () => {
    await handleAppPushNotificationResponse({
      notificationId: 'assign-no-sess',
      data: { type: 'quiz_assigned' },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Assessments');
    expect(Alert.alert).not.toHaveBeenCalledWith(
      'Error',
      'Notification data is incomplete. Please try again.',
    );
  });

  it('8. nested encoded data format is normalized and routed', async () => {
    mockOpenQuiz.mockResolvedValue(undefined as any);
    await handleAppPushNotificationResponse({
      notificationId: 'nested-1',
      data: {
        data: JSON.stringify({ type: 'quiz_assigned', sessionId: 'sess-nested' }),
      },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });
    expect(mockOpenQuiz).toHaveBeenCalledWith(
      'sess-nested',
      'notification',
      expect.anything(),
      expect.anything(),
      expect.any(Function),
    );
  });

  it('9. signed-out notification tap queues intent for post-login resume', async () => {
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

  it('9b. signed-out general/self-test queues Notifications destination', async () => {
    const setIntent = jest.fn();
    await handleAppPushNotificationResponse({
      notificationId: 'signed-out-general',
      data: { test: 'true', self_test: 'true' },
      isAuthenticated: false,
      user: null,
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
      setPendingNotificationIntent: setIntent,
    });
    expect(setIntent).toHaveBeenCalledWith(expect.objectContaining({ type: 'general' }));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('10. navigation not yet ready queues intent even when authenticated', async () => {
    const setIntent = jest.fn();
    await handleAppPushNotificationResponse({
      notificationId: 'nav-wait',
      data: { type: 'quiz_assigned', session_id: 'sess-1' },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
      setPendingNotificationIntent: setIntent,
      navigationReady: false,
    });
    expect(setIntent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'quiz_assigned', sessionId: 'sess-1' }),
    );
    expect(mockOpenQuiz).not.toHaveBeenCalled();
  });

  it('11. repeated notification responses are handled exactly once', async () => {
    mockOpenQuiz.mockResolvedValue(undefined as any);
    const args = {
      notificationId: 'dup-1',
      data: { type: 'QUIZ_ASSIGNED', session_id: 'sess-1' },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    };
    await handleAppPushNotificationResponse(args);
    await handleAppPushNotificationResponse(args);
    expect(mockOpenQuiz).toHaveBeenCalledTimes(1);
  });

  it('12. iOS foreground/background/cold-start response paths share handler', async () => {
    mockOpenQuiz.mockResolvedValue(undefined as any);
    // Simulate distinct Expo identifiers for FG / BG / cold-start entries.
    for (const notificationId of ['fg-1', 'bg-1', 'cold-1']) {
      await handleAppPushNotificationResponse({
        notificationId,
        data: { type: 'quiz_assigned', session_id: 'sess-1' },
        isAuthenticated: true,
        user: { id: 'student-1', role: 'student' },
        processedIds: processed,
        navigation,
        setPendingSessionId: jest.fn(),
      });
    }
    expect(mockOpenQuiz).toHaveBeenCalledTimes(3);
  });

  it('13. Android notification routing regression for assignment', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });
    mockOpenQuiz.mockResolvedValue(undefined as any);
    await handleAppPushNotificationResponse({
      notificationId: 'android-1',
      data: { type: 'quiz_assigned', session_id: 'sess-android' },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });
    expect(mockOpenQuiz).toHaveBeenCalledWith(
      'sess-android',
      'notification',
      expect.anything(),
      expect.anything(),
      expect.any(Function),
    );
  });

  it('14. role-specific routing: student completion does not open teacher results', async () => {
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

  it('14b. instructor tapping assignment opens Assessments inventory', async () => {
    await handleAppPushNotificationResponse({
      notificationId: 'instr-assign',
      data: { type: 'quiz_assigned', session_id: 'sess-1' },
      isAuthenticated: true,
      user: { id: 'teacher-1', role: 'instructor' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Assessments');
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

  it('opens assigned quiz for students via handleOpenQuiz (case-insensitive type)', async () => {
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
