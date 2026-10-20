import { selectCheckRecordProbeTarget } from '../utils/checkRecordProbeSelection';

describe('selectCheckRecordProbeTarget', () => {
  it('prefers completed rows when present', () => {
    const target = selectCheckRecordProbeTarget(
      [{ quiz_details: { quiz_id: 1, session_id: 'pending-sess' } }],
      [{ quiz_details: { quiz_id: 2, session_id: 'done-sess' } }],
    );
    expect(target).toEqual({
      quiz_id: 2,
      session_id: 'done-sess',
      source: 'completed',
    });
  });

  it('falls back to pending when completed is empty', () => {
    const target = selectCheckRecordProbeTarget(
      [{ quiz_details: { quiz_id: 9, session_id: 'sess-9' } }],
      [],
    );
    expect(target).toEqual({
      quiz_id: 9,
      session_id: 'sess-9',
      source: 'pending',
    });
  });

  it('returns null when no rows have quiz/session', () => {
    expect(selectCheckRecordProbeTarget([], [])).toBeNull();
  });
});
