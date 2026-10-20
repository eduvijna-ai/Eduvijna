/**
 * Side-effect-free journey tap logging: one physical tap per intended action.
 */

/**
 * @param {{ steps: object[] }} log
 * @param {string} step
 * @param {object|null|undefined} target
 * @param {(target: object) => object|null} tapFn
 * @param {Record<string, unknown>} [extra]
 */
export function executeTapWith(log, step, target, tapFn, extra = {}) {
  if (!target) {
    log.steps.push({ step, ...extra, tap: null, actionSucceeded: false });
    return null;
  }
  const tap = tapFn(target);
  log.steps.push({ step, ...extra, tap, actionSucceeded: true });
  return tap;
}

/**
 * Count of pagination Next taps needed to reach targetPage from startPage (inclusive bounds).
 */
export function countQuizPaginationTapsNeeded(startPage, targetPage) {
  if (targetPage < startPage) return 0;
  return targetPage - startPage;
}
