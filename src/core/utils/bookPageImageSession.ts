/**
 * Shared book page-image request lifecycle for Document Assessment previews.
 * Separates in-flight from successfully cached keys so cancelled effects cannot
 * permanently block retries ("Page preview unavailable").
 */

export type BookPageImageSizeLabel = 'mini' | 'medium';

/** Canonical request identity: document + page + size. */
export function makeBookPageImageKey(
  canonicalDocId: string,
  page: number,
  size: BookPageImageSizeLabel,
): string {
  return `${String(canonicalDocId || '').trim()}:${page}:${size}`;
}

export class BookPageImageRequestTracker {
  private readonly succeeded = new Set<string>();
  private readonly inFlight = new Set<string>();

  /** True when another caller already owns this key or it is cached. */
  shouldSkip(key: string): boolean {
    return this.succeeded.has(key) || this.inFlight.has(key);
  }

  markInFlight(key: string): void {
    this.inFlight.add(key);
  }

  markSucceeded(key: string): void {
    this.inFlight.delete(key);
    this.succeeded.add(key);
  }

  /** Cancelled, failed, or superseded — allow a future retry. */
  release(key: string): void {
    this.inFlight.delete(key);
  }

  /** Drop all state when the active document identity changes. */
  reset(): void {
    this.succeeded.clear();
    this.inFlight.clear();
  }

  /** Release every in-flight key (effect cleanup). Succeeded keys stay cached. */
  releaseAllInFlight(): void {
    this.inFlight.clear();
  }
}

/** Run async work over items with a fixed concurrency cap. */
export async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const limit = Math.max(1, Math.floor(concurrency));
  let next = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index], index);
    }
  });

  await Promise.all(runners);
}

/**
 * Prioritize the focused page (medium + mini), then remaining thumbnails.
 * Caller supplies the actual fetch/apply implementation.
 */
export async function loadBookPageImagesPrioritized(params: {
  focusedPage: number;
  totalPages: number;
  maxThumbs?: number;
  thumbConcurrency?: number;
  load: (page: number, size: BookPageImageSizeLabel) => Promise<void>;
  isCancelled?: () => boolean;
}): Promise<void> {
  const focused = Math.max(1, Math.floor(params.focusedPage) || 1);
  const total = Math.max(1, Math.floor(params.totalPages) || 1);
  const maxThumbs = Math.min(Math.max(1, total), params.maxThumbs ?? 24);
  const concurrency = params.thumbConcurrency ?? 3;
  const cancelled = params.isCancelled || (() => false);

  if (cancelled()) return;
  await params.load(focused, 'medium');
  if (cancelled()) return;
  await params.load(focused, 'mini');
  if (cancelled()) return;

  const remaining: number[] = [];
  for (let p = 1; p <= maxThumbs; p += 1) {
    if (p !== focused) remaining.push(p);
  }

  await mapWithConcurrency(remaining, concurrency, async (page) => {
    if (cancelled()) return;
    await params.load(page, 'mini');
  });
}
