import {
  attemptRowMatchesScopedSession,
  coerceQuizAttemptsListResponse,
  pickCompletedAttemptForScopedList,
  resolveAssignmentClassroomId,
} from '../core/services/openQuizAttemptResolution';

const SESSION = 'sess-assignment-a';
const OTHER_SESSION = 'sess-assignment-b';

describe('pickCompletedAttemptForScopedList', () => {
  it('returns none when no completed attempts', () => {
    expect(pickCompletedAttemptForScopedList([{ id: 1, status: 'started' }])).toEqual({
      kind: 'none',
    });
  });

  it('returns found for a single completed attempt', () => {
    const row = { id: 207, status: 'completed', score: 60, class_id: SESSION };
    expect(pickCompletedAttemptForScopedList([row], SESSION)).toEqual({ kind: 'found', attempt: row });
  });

  it('returns ambiguous for multiple completed attempts in the same scoped session', () => {
    expect(
      pickCompletedAttemptForScopedList(
        [
          { id: 1, status: 'completed', class_id: SESSION },
          { id: 2, status: 'completed', class_id: SESSION },
        ],
        SESSION,
      ),
    ).toEqual({ kind: 'ambiguous' });
  });

  it('keeps only rows matching scoped session when metadata is present', () => {
    expect(
      pickCompletedAttemptForScopedList(
        [
          { id: 1, status: 'completed', class_id: SESSION },
          { id: 2, status: 'completed', class_id: OTHER_SESSION },
        ],
        SESSION,
      ),
    ).toEqual({ kind: 'found', attempt: { id: 1, status: 'completed', class_id: SESSION } });
  });

  it('accepts a sessionless completed row when the list is already server-scoped', () => {
    const row = { id: 207, status: 'completed' };
    expect(pickCompletedAttemptForScopedList([row], SESSION)).toEqual({ kind: 'found', attempt: row });
  });

  it('rejects contradictory session metadata on a lone completed row', () => {
    expect(
      pickCompletedAttemptForScopedList(
        [{ id: 207, status: 'completed', session_id: OTHER_SESSION }],
        SESSION,
      ),
    ).toEqual({ kind: 'session_mismatch' });
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

describe('attemptRowMatchesScopedSession', () => {
  it('matches class_id to scoped session per client contract', () => {
    expect(attemptRowMatchesScopedSession({ class_id: SESSION }, SESSION)).toBe(true);
    expect(attemptRowMatchesScopedSession({ class_id: OTHER_SESSION }, SESSION)).toBe(false);
  });
});
