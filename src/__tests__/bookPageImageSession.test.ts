import {
  BookPageImageRequestTracker,
  loadBookPageImagesPrioritized,
  makeBookPageImageKey,
  mapWithConcurrency,
} from '../core/utils/bookPageImageSession';

describe('bookPageImageSession', () => {
  it('builds canonical request keys from doc/page/size', () => {
    expect(makeBookPageImageKey('abc', 3, 'medium')).toBe('abc:3:medium');
    expect(makeBookPageImageKey('  abc  ', 1, 'mini')).toBe('abc:1:mini');
  });

  it('releases cancelled in-flight keys so retries are allowed', () => {
    const tracker = new BookPageImageRequestTracker();
    const key = makeBookPageImageKey('doc-1', 2, 'medium');
    tracker.markInFlight(key);
    expect(tracker.shouldSkip(key)).toBe(true);
    tracker.release(key);
    expect(tracker.shouldSkip(key)).toBe(false);
  });

  it('keeps succeeded keys cached across releaseAllInFlight', () => {
    const tracker = new BookPageImageRequestTracker();
    const key = makeBookPageImageKey('doc-1', 1, 'mini');
    tracker.markInFlight(key);
    tracker.markSucceeded(key);
    tracker.releaseAllInFlight();
    expect(tracker.shouldSkip(key)).toBe(true);
  });

  it('resets all state when the document changes', () => {
    const tracker = new BookPageImageRequestTracker();
    const key = makeBookPageImageKey('doc-1', 1, 'mini');
    tracker.markInFlight(key);
    tracker.markSucceeded(key);
    tracker.reset();
    expect(tracker.shouldSkip(key)).toBe(false);
  });

  it('loads focused medium before remaining thumbnails', async () => {
    const order: string[] = [];
    await loadBookPageImagesPrioritized({
      focusedPage: 3,
      totalPages: 5,
      thumbConcurrency: 2,
      load: async (page, size) => {
        order.push(`${page}:${size}`);
      },
    });
    expect(order[0]).toBe('3:medium');
    expect(order[1]).toBe('3:mini');
    expect(order.slice(2).sort()).toEqual(['1:mini', '2:mini', '4:mini', '5:mini']);
  });

  it('mapWithConcurrency respects a concurrency cap', async () => {
    let active = 0;
    let peak = 0;
    const items = [1, 2, 3, 4, 5, 6];
    await mapWithConcurrency(items, 2, async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
    });
    expect(peak).toBeLessThanOrEqual(2);
  });
});
