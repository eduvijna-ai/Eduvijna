import {
  coerceQuizAttemptsListResponse,
  pickCompletedAttemptForScopedList,
  resolveAssignmentClassroomId,
} from '../core/services/openQuizAttemptResolution';

describe('pickCompletedAttemptForScopedList', () => {
  it('returns none when no completed attempts', () => {
    expect(pickCompletedAttemptForScopedList([{ id: 1, status: 'started' }])).toEqual({
      kind: 'none',
    });
  });

  it('returns found for a single completed attempt', () => {
    const row = { id: 207, status: 'completed', score: 60 };
    expect(pickCompletedAttemptForScopedList([row])).toEqual({ kind: 'found', attempt: row });
  });

  it('returns ambiguous for multiple completed attempts (same quiz, different assignments)', () => {
    expect(
      pickCompletedAttemptForScopedList([
        { id: 1, status: 'completed' },
        { id: 2, status: 'completed' },
      ]),
    ).toEqual({ kind: 'ambiguous' });
  });

  it('does not infer session from missing metadata on a lone row', () => {
    expect(pickCompletedAttemptForScopedList([])).toEqual({ kind: 'none' });
  });

  it('coerces nested quiz-attempts API envelopes', () => {
    const row = { id: 207, status: 'completed' };
    expect(coerceQuizAttemptsListResponse([row])).toEqual([row]);
    expect(coerceQuizAttemptsListResponse({ data: [row] })).toEqual([row]);
    expect(coerceQuizAttemptsListResponse({ data: { data: [row] } })).toEqual([row]);
  });

  it('rejects using session_id as classroom_id', () => {
    const session = 'a6882262-5c50-4cf5-a4a8-dc8786862916';
    expect(resolveAssignmentClassroomId(session, session, 'class_4d82c60e')).toBe('class_4d82c60e');
    expect(resolveAssignmentClassroomId(session, session)).toBeUndefined();
  });
});
