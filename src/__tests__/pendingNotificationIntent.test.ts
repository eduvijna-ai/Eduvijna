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
    expect(normalizeNotificationType('announcement')).toBe('general');
    expect(normalizeNotificationType('self_test')).toBe('general');
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

  it('maps backend self-test payload to general intent', () => {
    const intent = intentFromNotificationData(
      { test: 'true', self_test: 'true' },
      'self-1',
    );
    expect(intent).toMatchObject({
      type: 'general',
      notificationId: 'self-1',
    });
    expect(intent?.recognizedKeys).toEqual(expect.arrayContaining(['test', 'self_test']));
  });

  it('maps empty / notification-only payload to general intent', () => {
    expect(intentFromNotificationData(undefined, 'e1')?.type).toBe('general');
    expect(intentFromNotificationData({}, 'e2')?.type).toBe('general');
  });

  it('infers quiz_assigned when only session id is present', () => {
    const intent = intentFromNotificationData({ session_id: 's-only' }, 'n');
    expect(intent).toMatchObject({ type: 'quiz_assigned', sessionId: 's-only' });
  });

  it('flattens nested data before building intent', () => {
    const intent = intentFromNotificationData(
      {
        data: { type: 'quiz_graded', quiz_id: '9', studentId: 's1' },
      },
      'nested',
    );
    expect(intent).toMatchObject({
      type: 'quiz_graded',
      quizId: '9',
      studentId: 's1',
      parseOutcome: 'nested_data_object',
    });
  });

  it('drops backend Python None string for an absent attempt id', () => {
    const intent = intentFromNotificationData({
      type:'quiz_completed',session_id:'sess-9',
      quiz_id:9,student_id:'s1',attempt_id:'None',
    },'fcm-complete');
    expect(intent?.attemptId).toBeNull();
    expect(intent?.quizId).toBe('9');
  });

  it('uses backend event_key rather than device notification id for stable dedupe', () => {
    const a = intentFromNotificationData({
      type:'quiz_completed',quiz_id:'9',event_key:'quiz_completed:9:s1:1',
    },'ios-a');
    const b = intentFromNotificationData({
      type:'quiz_completed',quiz_id:'9',event_key:'quiz_completed:9:s1:1',
    },'ios-b');
    expect(a?.eventKey).toBe('quiz_completed:9:s1:1');
    expect(pendingIntentKey(a!)).toEqual(pendingIntentKey(b!));
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
        inFlightKey: 'another-push-event',
      }),
    ).toBeNull(); // serialize concurrent taps
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
