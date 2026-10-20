import {
  canProcessPendingNotificationIntent,
  intentFromNotificationData,
  normalizeNotificationType,
  pendingIntentKey,
} from '../core/navigation/pendingNotificationIntent';

describe('pendingNotificationIntent', () => {
  it('normalizes QUIZ_ASSIGNED and completion aliases', () => {
    expect(normalizeNotificationType('QUIZ_ASSIGNED')).toBe('quiz_assigned');
    expect(normalizeNotificationType('student_completed')).toBe('quiz_completed');
    expect(normalizeNotificationType('quiz_graded')).toBe('quiz_graded');
  });

  it('builds intent with assignment + attempt identity', () => {
    const intent = intentFromNotificationData(
      {
        type: 'quiz_completed',
        quiz_id: 9,
        session_id: 'sess-1',
        student_id: 's1',
        classroom_id: 'c1',
        attempt_id: 44,
      },
      'n-1',
    );
    expect(intent).toMatchObject({
      type: 'quiz_completed',
      quizId: '9',
      sessionId: 'sess-1',
      studentId: 's1',
      attemptId: '44',
      notificationId: 'n-1',
    });
    expect(pendingIntentKey(intent!)).toContain('quiz_completed');
  });

  it('waits for auth and navigation readiness', () => {
    const intent = intentFromNotificationData({ type: 'quiz_assigned', session_id: 's' }, 'n');
    expect(
      canProcessPendingNotificationIntent({
        isAuthenticated: true,
        hasUser: true,
        navigationReady: false,
        navigationContainerReady: true,
        intent,
        inFlightKey: null,
      }),
    ).toBeNull();
    expect(
      canProcessPendingNotificationIntent({
        isAuthenticated: true,
        hasUser: true,
        navigationReady: true,
        navigationContainerReady: true,
        intent,
        inFlightKey: null,
      }),
    ).toEqual(intent);
  });
});
