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

  it('queues session when unauthenticated for non-graded notifications', async () => {
    const setPending = jest.fn();
    await handleAppPushNotificationResponse({
      notificationId: 'n4',
      data: { type: 'quiz_assigned', session_id: 'sess-1' },
      isAuthenticated: false,
      user: null,
      processedIds: processed,
      navigation,
      setPendingSessionId: setPending,
    });

    expect(setPending).toHaveBeenCalledWith('sess-1');
    expect(mockOpenQuiz).not.toHaveBeenCalled();
  });
});
