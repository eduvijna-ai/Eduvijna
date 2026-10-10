import test from 'node:test';
import assert from 'node:assert/strict';
import { redactDeep } from './trace-redact.mjs';

test('redacts email-like strings inside arrays under non-sensitive keys', () => {
  const out = redactDeep({ labels: ['demo_aarya@school.test', 'active'] });
  assert.equal(out.labels[0], '[redacted]');
  assert.equal(out.labels[1], 'active');
});

test('redacts demo usernames in nested string values', () => {
  const out = redactDeep({ note: 'assigned to demo_aarya' });
  assert.equal(out.note, 'assigned to [redacted-user]');
});
