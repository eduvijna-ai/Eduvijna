// @ts-expect-error — Node script module consumed by Jest for parity with verify scripts
import { redactDeep } from '../../scripts/lib/trace-redact.mjs';

describe('trace redact', () => {
  it('redacts email-like strings inside arrays under non-sensitive keys', () => {
    const out = redactDeep({ labels: ['demo_aarya@school.test', 'active'] });
    expect(out.labels[0]).toBe('[redacted]');
    expect(out.labels[1]).toBe('active');
  });

  it('redacts demo usernames in nested string values', () => {
    const out = redactDeep({ note: 'assigned to demo_aarya' });
    expect(out.note).toBe('assigned to [redacted-user]');
  });
});
