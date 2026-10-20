import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  countQuizPaginationTapsNeeded,
  executeTapWith,
} from '../lib/android-journey-tap.mjs';

test('executeTapWith performs exactly one tap per call', () => {
  let calls = 0;
  const log = { steps: [] };
  const tapFn = (t) => {
    calls += 1;
    return t;
  };
  executeTapWith(log, 'quiz_pagination_next', { x: 1, y: 2, kind: 'testId' }, tapFn, { from: 1, to: 2 });
  assert.equal(calls, 1);
  assert.equal(log.steps.length, 1);
  assert.equal(log.steps[0].actionSucceeded, true);
});

test('page 1 to target page 3 requires two Next taps not four', () => {
  assert.equal(countQuizPaginationTapsNeeded(1, 3), 2);
  let calls = 0;
  const log = { steps: [] };
  const tapFn = (t) => {
    calls += 1;
    return t;
  };
  let current = 1;
  const target = 3;
  while (current < target) {
    executeTapWith(log, 'quiz_pagination_next', { x: 0, y: 0 }, tapFn, {
      from: current,
      to: current + 1,
    });
    current += 1;
  }
  assert.equal(calls, 2);
  assert.equal(log.steps.length, 2);
});

test('view analytics uses exactly one tap before drill assertion', () => {
  let calls = 0;
  const log = { steps: [] };
  const viewControl = { x: 10, y: 20, kind: 'testId', label: 'analytics-quiz-view-479-x-open' };
  executeTapWith(log, 'view_analytics', viewControl, (t) => {
    calls += 1;
    return t;
  }, { testId: 'analytics-quiz-view-479-x-open' });
  assert.equal(calls, 1);
  assert.equal(log.steps[0].step, 'view_analytics');
});
