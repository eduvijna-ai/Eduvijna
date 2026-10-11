import test from 'node:test';
import assert from 'node:assert/strict';
import { redactDeep } from './trace-redact.mjs';

test('redacts email-like strings inside arrays under non-sensitive keys', () => {
  const out = redactDeep({ labels: ['demo_aarya@school.test', 'active'] });
  assert.equal(out.labels[0], '[redacted]');
  assert.equal(out.labels[1], 'active');
});

test('redacts demo usernames in nested string values', () => {
  const out = redactDeep({ message: 'assigned to demo_aarya' });
  assert.equal(out.message, 'assigned to [redacted-user]');
});

test('redacts camelCase resource identifiers', () => {
  const out = redactDeep({ sessionId: 'sess-abc-123', quizId: 99 });
  assert.match(out.sessionId, /^ref:[0-9a-f]+$/);
  assert.match(out.quizId, /^ref:[0-9a-f]+$/);
});

test('redacts classid resource identifiers', () => {
  const out = redactDeep({ classid: 'class-9a' });
  assert.match(out.classid, /^ref:[0-9a-f]+$/);
});
