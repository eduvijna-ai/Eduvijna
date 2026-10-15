import {
  MOBILE_OPEN_QUIZ_PENDING_MAX_AGE_MS,
  normalizeStoredOpenQuizPending,
} from '../core/navigation/mobileOpenQuizPendingStorage';

describe('mobileOpenQuizPendingStorage', () => {
  const now = Date.parse('2026-10-14T12:00:00.000Z');

  it('accepts minimal destination without credentials', () => {
    const v = normalizeStoredOpenQuizPending(
      {
        sessionId: 'sess-1',
        source: 'initial_deep_link_signed_out',
        queuedAtIso: '2026-10-14T11:00:00.000Z',
        quizId: '479',
      },
      now,
    );
    expect(v).toEqual({
      sessionId: 'sess-1',
      quizId: '479',
      source: 'initial_deep_link_signed_out',
      queuedAtIso: '2026-10-14T11:00:00.000Z',
    });
    expect(JSON.stringify(v)).not.toMatch(/password|token|Bearer/i);
  });

  it('discards expired, malformed and future-dated entries', () => {
    expect(normalizeStoredOpenQuizPending({ sessionId: 'x' }, now)).toBeNull();
    expect(
      normalizeStoredOpenQuizPending(
        {
          sessionId: 'sess-1',
          source: 'deep_link',
          queuedAtIso: new Date(now - MOBILE_OPEN_QUIZ_PENDING_MAX_AGE_MS - 1).toISOString(),
        },
        now,
      ),
    ).toBeNull();
    expect(
      normalizeStoredOpenQuizPending(
        {
          sessionId: 'sess-1',
          source: 'deep_link',
          queuedAtIso: new Date(now + 120_000).toISOString(),
        },
        now,
      ),
    ).toBeNull();
  });
});
