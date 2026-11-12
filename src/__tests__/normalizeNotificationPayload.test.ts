import {
  hasAssessmentRoutingIdentifiers,
  isGeneralNotificationMarker,
  normalizeNotificationPayload,
} from '../core/navigation/normalizeNotificationPayload';

describe('normalizeNotificationPayload', () => {
  it('treats missing/empty iOS notification-only payloads as empty', () => {
    expect(normalizeNotificationPayload(undefined).parseOutcome).toBe('empty');
    expect(normalizeNotificationPayload(null).parseOutcome).toBe('empty');
    expect(normalizeNotificationPayload({}).parseOutcome).toBe('empty');
  });

  it('keeps flat assessment assignment fields', () => {
    const result = normalizeNotificationPayload({
      type: 'quiz_assigned',
      session_id: 'sess-1',
      quiz_id: '9',
      classroom_id: 'c1',
    });
    expect(result.parseOutcome).toBe('flat');
    expect(result.data.type).toBe('quiz_assigned');
    expect(result.recognizedKeys).toEqual(
      expect.arrayContaining(['type', 'session_id', 'quiz_id', 'classroom_id']),
    );
  });

  it('flattens nested data object envelopes', () => {
    const result = normalizeNotificationPayload({
      data: {
        type: 'quiz_graded',
        quizId: '12',
        student_id: 's1',
      },
    });
    expect(result.parseOutcome).toBe('nested_data_object');
    expect(result.data.type).toBe('quiz_graded');
    expect(result.data.quizId).toBe('12');
    expect(result.data.data).toBeUndefined();
  });

  it('flattens JSON-string data envelopes', () => {
    const result = normalizeNotificationPayload({
      data: JSON.stringify({
        type: 'quiz_completed',
        session_id: 'sess-9',
        quiz_id: '9',
      }),
    });
    expect(result.parseOutcome).toBe('nested_data_json_string');
    expect(result.data.type).toBe('quiz_completed');
    expect(result.data.session_id).toBe('sess-9');
  });

  it('recognizes backend self-test markers as general', () => {
    const data = { test: 'true', self_test: 'true' };
    expect(isGeneralNotificationMarker(data)).toBe(true);
    expect(hasAssessmentRoutingIdentifiers(data)).toBe(false);
  });
});
