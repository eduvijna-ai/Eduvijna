import {
  clearQuizAnalyticsInFlightForTests,
  fetchAllQuizAnalyticsRows,
  interpretQuizAnalyticsPage,
  loadQuizAnalyticsRowsCoalesced,
  quizAssignmentIdentityKey,
} from '../core/services/quizAnalyticsPagination';
import type { QuizListItem } from '../core/types/quizAnalytics.types';
import { aggregateClassOverview } from '../core/services/quizAnalyticsApi';
import { getAttemptSummaryText } from '../core/utils/teacherAnalyticsHelpers';

function row(
  quizId: number,
  sessionId: string,
  classroomId: string,
  extras: Partial<QuizListItem> = {},
): QuizListItem {
  return {
    quiz_id: quizId,
    session_id: sessionId,
    classroom_id: classroomId,
    classroom_name: '4A-Mathematics',
    quiz_name: `Q${quizId}`,
    total_students: 10,
    completed_count: 0,
    pending_count: 0,
    in_progress_count: 0,
    availability_status: 'expired',
    ...extras,
  } as QuizListItem;
}

describe('quizAnalyticsPagination', () => {
  beforeEach(() => {
    clearQuizAnalyticsInFlightForTests();
  });

  it('keeps distinct identities when the same quiz is assigned to multiple sessions', () => {
    const a = quizAssignmentIdentityKey(row(1, 's1', 'c1'));
    const b = quizAssignmentIdentityKey(row(1, 's2', 'c1'));
    expect(a).not.toBe(b);
    const overview = aggregateClassOverview([row(1, 's1', 'c1'), row(1, 's2', 'c1')], {
      mode: 'teacher',
    });
    expect(overview[0].total_quizzes).toBe(2);
  });

  it('honours hasMore=true on a short page as incomplete', async () => {
    const outcome = await fetchAllQuizAnalyticsRows(
      { view_type: 'all' },
      {
        pageSize: 100,
        fetchPage: async () =>
          interpretQuizAnalyticsPage({
            rows: [row(1, 's1', 'c1')],
            offset: 0,
            limit: 100,
            body: { pagination: { hasMore: true, total: 50 } },
          }),
      },
    );
    expect(outcome.kind).toBe('incomplete');
    if (outcome.kind === 'incomplete') {
      expect(outcome.reason).toBe('hasMore_short_or_empty_page');
    }
  });

  it('continues past a duplicate-only intermediate page when later pages add assignments', async () => {
    let call = 0;
    const outcome = await fetchAllQuizAnalyticsRows(
      { view_type: 'all' },
      {
        pageSize: 2,
        fetchPage: async ({ offset }) => {
          call += 1;
          if (call === 1) {
            return interpretQuizAnalyticsPage({
              rows: [row(1, 's1', 'c1'), row(2, 's2', 'c1')],
              offset,
              limit: 2,
              body: { pagination: { hasMore: true } },
            });
          }
          if (call === 2) {
            // Duplicate-only intermediate page
            return interpretQuizAnalyticsPage({
              rows: [row(1, 's1', 'c1'), row(2, 's2', 'c1')],
              offset,
              limit: 2,
              body: { pagination: { hasMore: true } },
            });
          }
          return interpretQuizAnalyticsPage({
            rows: [row(3, 's3', 'c1'), row(4, 's4', 'c1')],
            offset,
            limit: 2,
            body: { pagination: { hasMore: false } },
          });
        },
      },
    );
    expect(outcome.kind).toBe('complete');
    if (outcome.kind === 'complete') {
      expect(outcome.rows).toHaveLength(4);
    }
  });

  it('detects repeated identical pages at the same offset as incomplete', async () => {
    const outcome = await fetchAllQuizAnalyticsRows(
      { view_type: 'all' },
      {
        pageSize: 2,
        fetchPage: async ({ offset }) =>
          interpretQuizAnalyticsPage({
            rows: [row(1, 's1', 'c1'), row(2, 's2', 'c1')],
            offset,
            // next_offset stuck → same offset repeated
            limit: 2,
            body: { pagination: { hasMore: true, next_offset: offset } },
          }),
      },
    );
    expect(outcome.kind).toBe('incomplete');
    if (outcome.kind === 'incomplete') {
      expect(['repeated_page', 'inconsistent_pagination', 'no_progress_loop']).toContain(
        outcome.reason,
      );
    }
  });

  it('treats safety-limit exhaustion as incomplete', async () => {
    let n = 0;
    const outcome = await fetchAllQuizAnalyticsRows(
      { view_type: 'all' },
      {
        pageSize: 1,
        maxPages: 3,
        fetchPage: async ({ offset }) => {
          n += 1;
          return interpretQuizAnalyticsPage({
            rows: [row(n, `s${n}`, 'c1')],
            offset,
            limit: 1,
            body: { pagination: { hasMore: true } },
          });
        },
      },
    );
    expect(outcome.kind).toBe('incomplete');
    if (outcome.kind === 'incomplete') {
      expect(outcome.reason).toBe('safety_limit_exhausted');
    }
  });

  it('coalesces identical in-flight loads', async () => {
    let calls = 0;
    const fetchPage = async ({ offset }: { offset: number }) => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return interpretQuizAnalyticsPage({
        rows: [row(1, 's1', 'c1')],
        offset,
        limit: 100,
        body: { pagination: { hasMore: false } },
      });
    };
    const [a, b] = await Promise.all([
      loadQuizAnalyticsRowsCoalesced({ view_type: 'all' }, { fetchPage }),
      loadQuizAnalyticsRowsCoalesced({ view_type: 'all' }, { fetchPage }),
    ]);
    expect(calls).toBe(1);
    expect(a.kind).toBe('complete');
    expect(b.kind).toBe('complete');
  });
});

describe('analytics membership reconciliation helpers', () => {
  it('class overview quiz count matches list membership for a classroom', () => {
    const rows = [
      row(1, 's1', 'c1', {
        availability_status: 'active',
        pending_count: 2,
        completed_count: 1,
        total_students: 10,
      }),
      row(2, 's2', 'c1', {
        availability_status: 'expired',
        pending_count: 4,
        completed_count: 0,
        total_students: 10,
      }),
      row(3, 's3', 'c2', {
        availability_status: 'active',
        pending_count: 1,
        completed_count: 0,
        total_students: 10,
      }),
    ];
    const overview = aggregateClassOverview(rows, { mode: 'teacher' }).find(
      (c) => c.classroom_id === 'c1',
    )!;
    const list = rows.filter((r) => r.classroom_id === 'c1');
    expect(overview.total_quizzes).toBe(list.length);
    expect(overview.active_assignment_count).toBe(1);
    expect(overview.expired_assignment_count).toBe(1);
    // Ungated submission pending (web class card): 2 + 4
    expect(overview.pending_count).toBe(6);
    expect(overview.completed_count).toBe(1);
  });

  it('preserves null score on completed attempt summary (no fabricated zero)', () => {
    const text = getAttemptSummaryText(
      {
        student_id: 'u1',
        student_username: 'a',
        student_fullname: 'A',
        status: 'completed',
        derivedStatus: 'completed',
        score: null,
        time_spent_seconds: null,
        submitted_at: null,
        log_data: null,
        logSource: null,
        attempt_id: '9',
        canViewSavedResult: true,
      },
      true,
    );
    expect(text).toContain('Score: —');
    expect(text).not.toMatch(/Score: 0%/);
  });
});
