import { attendedQuizRetryDelayMs } from '../core/services/quizResultRetrieval.service';

describe('attendedQuizRetryDelayMs', () => {
  it('honors Retry-After header for 429', () => {
    const delay = attendedQuizRetryDelayMs(
      { response: { status: 429, headers: { 'retry-after': '12' } } },
      0,
    );
    expect(delay).toBe(12_000);
  });

  it('uses bounded backoff when Retry-After is absent', () => {
    expect(attendedQuizRetryDelayMs({ response: { status: 429, headers: {} } }, 0)).toBe(2000);
    expect(attendedQuizRetryDelayMs({ response: { status: 429, headers: {} } }, 4)).toBe(10_000);
  });

  it('retries 5xx with backoff', () => {
    expect(attendedQuizRetryDelayMs({ response: { status: 503, headers: {} } }, 1)).toBe(3000);
  });

  it('does not retry account-switch supersession', () => {
    expect(
      attendedQuizRetryDelayMs({ message: 'Request superseded by account switch' }, 0),
    ).toBeNull();
  });

  it('does not retry 404', () => {
    expect(attendedQuizRetryDelayMs({ response: { status: 404, headers: {} } }, 0)).toBeNull();
  });
});
