import { pickCompletedAttemptForScopedList } from '../core/services/openQuizAttemptResolution';

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
});
