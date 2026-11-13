import { Alert, Platform } from 'react-native';
import { handleAppPushNotificationResponse } from '../core/services/appPushNotificationResponse';
import { resolveStudentGradedAssignmentSession } from '../core/services/gradedNotificationRouting.service';
import { executeStudentAssignedQuizViewResults } from '../core/services/assessmentQuizStart.service';
import { handleOpenQuiz } from '../core/services/openQuizHandler';
import { AssignedQuizRecoveryProbeError } from '../core/services/assignedQuizRecovery.service';
import {
  authorizeStudentAssignedNotification,
  authorizeInstructorCompletionNotification,
} from '../core/services/assessmentNotificationAccess';

jest.mock('../core/services/gradedNotificationRouting.service', () => ({
  resolveStudentGradedAssignmentSession: jest.fn(),
}));

jest.mock('../core/services/assessmentQuizStart.service', () => ({
  executeStudentAssignedQuizViewResults: jest.fn(),
}));

jest.mock('../core/services/openQuizHandler', () => ({
  handleOpenQuiz: jest.fn(),
}));

jest.mock('../core/services/assessmentNotificationAccess', () => ({
  authorizeStudentAssignedNotification: jest.fn(),
  authorizeInstructorCompletionNotification: jest.fn(),
}));

const mockResolve = resolveStudentGradedAssignmentSession as jest.MockedFunction<
  typeof resolveStudentGradedAssignmentSession
>;
const mockViewResults = executeStudentAssignedQuizViewResults as jest.MockedFunction<
  typeof executeStudentAssignedQuizViewResults
>;
const mockOpenQuiz = handleOpenQuiz as jest.MockedFunction<typeof handleOpenQuiz>;
const mockAssignedAccess = authorizeStudentAssignedNotification as jest.MockedFunction<typeof authorizeStudentAssignedNotification>;
const mockInstructorAccess = authorizeInstructorCompletionNotification as jest.MockedFunction<typeof authorizeInstructorCompletionNotification>;

describe('handleAppPushNotificationResponse', () => {
  const navigation = { navigate: jest.fn() };
  const processed = new Set<string>();

  beforeEach(() => {
    jest.clearAllMocks();
    processed.clear();
    mockAssignedAccess.mockImplementation(async (args) => ({
      kind: 'authorized',
      quizId: args.quizId ?? '9',
      sessionId: args.sessionId,
      classroomId: args.classroomId ?? 'class-9',
    }));
    mockInstructorAccess.mockImplementation(async (args) => ({
      kind: 'authorized',
      quizId: args.quizId,
      sessionId: args.sessionId,
      classroomId: args.classroomId,
    }));
    mockResolve.mockResolvedValue({kind:'resolved',sessionId:'sess-9',classroomId:'class-9'});
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
      expect.objectContaining({ quizId: expect.any(String) }),
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
        attemptId: 77,
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
      expect.objectContaining({ quizId: expect.any(String) }),
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
      expect.objectContaining({ quizId: expect.any(String) }),
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

    expect(setPending).not.toHaveBeenCalled(); // full intent prevents duplicate session-only resume
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
      expect.objectContaining({ quizId: expect.any(String) }),
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

  it('rejects assignment tap when authenticated check-record denies access', async () => {
    mockAssignedAccess.mockResolvedValueOnce({ kind: 'denied', reason: 'assignment_not_found' });
    await handleAppPushNotificationResponse({
      notificationId: 'not-enrolled', data: {type:'quiz_assigned',session_id:'sess-other',quiz_id:99},
      isAuthenticated: true, user: {id:'student-1',role:'student'}, processedIds: processed,
      navigation, setPendingSessionId: jest.fn(),
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Assessments');
    expect(mockOpenQuiz).not.toHaveBeenCalled();
  });

  it('rejects graded result when notification targets a different student', async () => {
    await handleAppPushNotificationResponse({
      notificationId: 'other-student',
      data: {type:'quiz_graded',student_id:'other',quiz_id:9,session_id:'sess-9'},
      isAuthenticated: true, user: {id:'student-1',role:'student'},
      processedIds: processed, navigation, setPendingSessionId: jest.fn(),
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Assessments');
    expect(mockViewResults).not.toHaveBeenCalled();
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it('requires server-verified grade session even when payload has all identifiers', async () => {
    mockResolve.mockResolvedValueOnce({kind:'none'});
    await handleAppPushNotificationResponse({
      notificationId:'unverified-grade',
      data:{type:'quiz_graded',quiz_id:9,student_id:'student-1',session_id:'untrusted',classroom_id:'c'},
      isAuthenticated:true,user:{id:'student-1',role:'student'},
      processedIds:processed,navigation,setPendingSessionId:jest.fn(),
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Assessments');
    expect(mockViewResults).not.toHaveBeenCalled();
  });

  it('replays a queued backend event_key after login exactly once', async () => {
    const setIntent = jest.fn();
    const data = {
      type:'quiz_assigned',session_id:'sess-1',quiz_id:'9',
      event_key:'quiz_assigned:9:c1:student-1',
    };
    await handleAppPushNotificationResponse({
      notificationId:'apns-signed-out',
      data,
      isAuthenticated:false,user:null,
      processedIds:processed,navigation,
      setPendingSessionId:jest.fn(),
      setPendingNotificationIntent:setIntent,
    });
    expect(setIntent).toHaveBeenCalledWith(expect.objectContaining({
      eventKey:'quiz_assigned:9:c1:student-1',
    }));
    expect(mockOpenQuiz).not.toHaveBeenCalled();
    await handleAppPushNotificationResponse({
      notificationId:'resume:quiz_assigned',
      data,
      isAuthenticated:true,user:{id:'student-1',role:'student'},
      processedIds:processed,navigation,
      setPendingSessionId:jest.fn(),
    });
    expect(mockOpenQuiz).toHaveBeenCalledTimes(1);
    await handleAppPushNotificationResponse({
      notificationId:'apns-another-id',
      data,
      isAuthenticated:true,user:{id:'student-1',role:'student'},
      processedIds:processed,navigation,
      setPendingSessionId:jest.fn(),
    });
    expect(mockOpenQuiz).toHaveBeenCalledTimes(1);
  });

  it('requires instructor authorization before opening a student completion result', async () => {
    mockInstructorAccess.mockResolvedValueOnce({kind:'denied',reason:'completion_classroom_not_authorized'});
    await handleAppPushNotificationResponse({
      notificationId:'unauthorized-completion',
      data:{type:'quiz_completed',quiz_id:9,student_id:'s1',session_id:'ss',classroom_id:'other'},
      isAuthenticated:true,user:{id:'teacher-1',role:'instructor'},
      processedIds:processed,navigation,setPendingSessionId:jest.fn(),
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Assessments');
    expect(navigation.navigate).not.toHaveBeenCalledWith('QuizResultsScreen',expect.anything());
  });

  it('deduplicates backend event_key across distinct iOS FCM identifiers', async () => {
    mockOpenQuiz.mockResolvedValue(undefined as any);
    for (const notificationId of ['apns-first','apns-duplicate']) {
      await handleAppPushNotificationResponse({
        notificationId,
        data:{type:'quiz_assigned',session_id:'sess-1',event_key:'quiz_assigned:9:c1:s1'},
        isAuthenticated:true,user:{id:'student-1',role:'student'},
        processedIds:processed,navigation,setPendingSessionId:jest.fn(),
      });
    }
    expect(mockOpenQuiz).toHaveBeenCalledTimes(1);
  });

  it('does not consume event_key on retryable assignment lookup failures', async () => {
    mockAssignedAccess.mockResolvedValueOnce({
      kind: 'denied',
      reason: 'assignment_lookup_unavailable',
    });
    const first = await handleAppPushNotificationResponse({
      notificationId: 'soft-fail-1',
      data: {
        type: 'quiz_assigned',
        session_id: 'sess-1',
        event_key: 'quiz_assigned:9:c1:s1',
      },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });
    expect(first.outcome).toBe('retryable');
    expect(processed.has('event:quiz_assigned:9:c1:s1')).toBe(false);
    expect(mockOpenQuiz).not.toHaveBeenCalled();

    mockAssignedAccess.mockResolvedValueOnce({
      kind: 'authorized',
      quizId: '9',
      sessionId: 'sess-1',
      classroomId: 'c1',
    });
    mockOpenQuiz.mockResolvedValue(undefined as any);
    const second = await handleAppPushNotificationResponse({
      notificationId: 'soft-fail-retry',
      data: {
        type: 'quiz_assigned',
        session_id: 'sess-1',
        event_key: 'quiz_assigned:9:c1:s1',
      },
      isAuthenticated: true,
      user: { id: 'student-1', role: 'student' },
      processedIds: processed,
      navigation,
      setPendingSessionId: jest.fn(),
    });
    expect(second.outcome).toBe('navigated');
    expect(mockOpenQuiz).toHaveBeenCalledTimes(1);
    expect(processed.has('event:quiz_assigned:9:c1:s1')).toBe(true);
  });

  it('does not interpret unknown event types with session ids as assigned quizzes', async () => {
    await handleAppPushNotificationResponse({
      notificationId:'unknown-type',
      data:{type:'future_unrecognized',session_id:'untrusted'},
      isAuthenticated:true,user:{id:'student-1',role:'student'},
      processedIds:processed,navigation,setPendingSessionId:jest.fn(),
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Notifications');
    expect(mockOpenQuiz).not.toHaveBeenCalled();
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
      expect.objectContaining({ quizId: expect.any(String) }),
    );
  });
});
