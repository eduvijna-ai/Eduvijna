/**
 * Paginate GET /api/v1/dashboard/quizzes for Analytics.
 * Same incomplete-failure semantics as assessment classroom inventory:
 * never treat short pages with hasMore, duplicate-only non-progress, or
 * safety-limit exhaustion as successful completion.
 */

import { getQuizAnalytics } from './quizAnalyticsApi';
import type { QuizListItem, QuizListParams } from '../types/quizAnalytics.types';

export const QUIZ_ANALYTICS_PAGE_SIZE = 100;
export const QUIZ_ANALYTICS_MAX_PAGES = 50;

export type QuizAssignmentIdentity = {
  quizId: number | string;
  sessionId: string;
  classroomId: string;
};

/** Canonical assignment identity — preserves distinct classroom/session assignments. */
export function quizAssignmentIdentityKey(
  row: Pick<QuizListItem, 'quiz_id' | 'session_id' | 'classroom_id'> | QuizAssignmentIdentity,
): string {
  if ('quizId' in row) {
    return `${row.quizId}::${row.sessionId ?? ''}::${row.classroomId ?? ''}`;
  }
  return `${row.quiz_id}::${row.session_id ?? ''}::${row.classroom_id ?? ''}`;
}

export function normalizeAvailabilityStatus(
  status: string | null | undefined,
): 'active' | 'upcoming' | 'expired' | 'unknown' {
  const a = String(status || '')
    .trim()
    .toLowerCase();
  if (a === 'active') return 'active';
  if (a === 'coming soon' || a === 'available_soon' || a === 'upcoming' || a === 'not_started') {
    return 'upcoming';
  }
  if (a === 'expired') return 'expired';
  return 'unknown';
}

export type QuizAnalyticsPageResult = {
  rows: QuizListItem[];
  hasMore: boolean;
  nextOffset: number;
  appliedLimit: number;
  reportedTotal: number | null;
};

export type FetchAllQuizAnalyticsOutcome =
  | { kind: 'complete'; rows: QuizListItem[]; pagesFetched: number }
  | {
      kind: 'incomplete';
      rows: QuizListItem[];
      pagesFetched: number;
      reason:
        | 'hasMore_short_or_empty_page'
        | 'repeated_page'
        | 'no_progress_loop'
        | 'inconsistent_pagination'
        | 'safety_limit_exhausted';
    };

function pageFingerprint(rows: QuizListItem[]): string {
  return rows.map((r) => quizAssignmentIdentityKey(r)).join('|');
}

export function interpretQuizAnalyticsPage(params: {
  rows: QuizListItem[];
  offset: number;
  limit: number;
  body?: { pagination?: Record<string, unknown>; meta?: Record<string, unknown> } | null;
}): QuizAnalyticsPageResult {
  const { rows, offset, limit, body } = params;
  const reportedRaw =
    body?.pagination?.total ?? body?.meta?.total_count ?? body?.pagination?.total_count ?? null;
  const reportedTotal = Number.isFinite(Number(reportedRaw)) ? Number(reportedRaw) : null;
  const explicitHasMore = body?.pagination?.hasMore ?? body?.pagination?.has_more;
  const nextFromServer = body?.pagination?.next_offset ?? body?.pagination?.nextOffset;
  const nextOffset =
    Number.isFinite(Number(nextFromServer)) && Number(nextFromServer) > offset
      ? Number(nextFromServer)
      : offset + limit;

  let hasMore: boolean;
  if (typeof explicitHasMore === 'boolean') {
    hasMore = explicitHasMore;
  } else if (reportedTotal != null) {
    hasMore = offset + rows.length < reportedTotal;
  } else {
    hasMore = rows.length >= limit;
  }

  return {
    rows,
    hasMore,
    reportedTotal,
    nextOffset,
    appliedLimit: limit,
  };
}

export type FetchQuizAnalyticsPageFn = (params: {
  base: Omit<QuizListParams, 'limit' | 'offset'>;
  limit: number;
  offset: number;
}) => Promise<QuizAnalyticsPageResult>;

async function defaultFetchQuizAnalyticsPage(params: {
  base: Omit<QuizListParams, 'limit' | 'offset'>;
  limit: number;
  offset: number;
}): Promise<QuizAnalyticsPageResult> {
  const res = await getQuizAnalytics({
    ...params.base,
    limit: params.limit,
    offset: params.offset,
  });
  const rows = Array.isArray(res?.data) ? res.data : [];
  return interpretQuizAnalyticsPage({
    rows,
    offset: params.offset,
    limit: params.limit,
    body: res as unknown as { pagination?: Record<string, unknown> },
  });
}

/**
 * Walk all pages for a metrics query until the API indicates completion.
 */
export async function fetchAllQuizAnalyticsRows(
  base: Omit<QuizListParams, 'limit' | 'offset'>,
  options?: {
    pageSize?: number;
    maxPages?: number;
    fetchPage?: FetchQuizAnalyticsPageFn;
  },
): Promise<FetchAllQuizAnalyticsOutcome> {
  const pageSize = options?.pageSize ?? QUIZ_ANALYTICS_PAGE_SIZE;
  const maxPages = options?.maxPages ?? QUIZ_ANALYTICS_MAX_PAGES;
  const fetchPage = options?.fetchPage ?? defaultFetchQuizAnalyticsPage;

  const byKey = new Map<string, QuizListItem>();
  let offset = 0;
  let pagesFetched = 0;
  let consecutiveNoProgress = 0;
  const seenPageKeys = new Set<string>();

  while (pagesFetched < maxPages) {
    const page = await fetchPage({ base, limit: pageSize, offset });
    pagesFetched += 1;

    const fingerprint = pageFingerprint(page.rows);
    const pageKey = `${offset}::${fingerprint}`;
    if (seenPageKeys.has(pageKey)) {
      return {
        kind: 'incomplete',
        rows: Array.from(byKey.values()),
        pagesFetched,
        reason: 'repeated_page',
      };
    }
    seenPageKeys.add(pageKey);

    const sizeBefore = byKey.size;
    for (const row of page.rows) {
      const key = quizAssignmentIdentityKey(row);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, row);
    }
    const madeProgress = byKey.size > sizeBefore;

    if (!page.hasMore) {
      return {
        kind: 'complete',
        rows: Array.from(byKey.values()),
        pagesFetched,
      };
    }

    if (page.rows.length === 0 || page.rows.length < page.appliedLimit) {
      return {
        kind: 'incomplete',
        rows: Array.from(byKey.values()),
        pagesFetched,
        reason: 'hasMore_short_or_empty_page',
      };
    }

    if (!madeProgress) {
      consecutiveNoProgress += 1;
      if (consecutiveNoProgress >= 2) {
        return {
          kind: 'incomplete',
          rows: Array.from(byKey.values()),
          pagesFetched,
          reason: 'no_progress_loop',
        };
      }
    } else {
      consecutiveNoProgress = 0;
    }

    if (!Number.isFinite(page.nextOffset) || page.nextOffset <= offset) {
      return {
        kind: 'incomplete',
        rows: Array.from(byKey.values()),
        pagesFetched,
        reason: 'inconsistent_pagination',
      };
    }
    offset = page.nextOffset;
  }

  return {
    kind: 'incomplete',
    rows: Array.from(byKey.values()),
    pagesFetched,
    reason: 'safety_limit_exhausted',
  };
}

/** In-flight coalesce keyed by stable request identity. */
const inFlightByKey = new Map<string, Promise<FetchAllQuizAnalyticsOutcome>>();

export function quizAnalyticsRequestKey(
  base: Omit<QuizListParams, 'limit' | 'offset'>,
): string {
  return [
    base.view_type,
    base.classroom_id ?? '',
    base.quiz_id ?? '',
    base.created_from ?? '',
    base.created_to ?? '',
  ].join('|');
}

export async function loadQuizAnalyticsRowsCoalesced(
  base: Omit<QuizListParams, 'limit' | 'offset'>,
  options?: Parameters<typeof fetchAllQuizAnalyticsRows>[1],
): Promise<FetchAllQuizAnalyticsOutcome> {
  const key = quizAnalyticsRequestKey(base);
  const existing = inFlightByKey.get(key);
  if (existing) return existing;
  const promise = fetchAllQuizAnalyticsRows(base, options).finally(() => {
    if (inFlightByKey.get(key) === promise) inFlightByKey.delete(key);
  });
  inFlightByKey.set(key, promise);
  return promise;
}

/** Test helper */
export function clearQuizAnalyticsInFlightForTests() {
  inFlightByKey.clear();
}
