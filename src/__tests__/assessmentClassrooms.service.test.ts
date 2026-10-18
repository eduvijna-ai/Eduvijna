import {
  assessmentClassroomScopeKey,
  canApplyAssessmentClassroomsResult,
  fetchAllAssessmentClassroomRows,
  getAssessmentClassroomsLoadGeneration,
  interpretAssessmentClassroomPage,
  invalidateAssessmentClassroomsLoads,
  loadAssessmentClassrooms,
  normalizeAssessmentClassroomRows,
  resolveAuthoritativeClassroomCount,
  usesTeacherAssessmentClassroomPath,
  type FetchAllAssessmentClassroomsOutcome,
} from '../core/services/assessmentClassrooms.service';
import { mergeAssessmentClassroomInventoryWithMetrics } from '../core/services/assessmentClassroomAnalytics';

describe('assessmentClassrooms.service', () => {
  beforeEach(() => {
    invalidateAssessmentClassroomsLoads();
  });

  it('routes instructor and teacher to class_wise_students path', () => {
    expect(usesTeacherAssessmentClassroomPath('instructor')).toBe(true);
    expect(usesTeacherAssessmentClassroomPath('teacher')).toBe(true);
    expect(usesTeacherAssessmentClassroomPath('admin')).toBe(true);
    expect(usesTeacherAssessmentClassroomPath('student')).toBe(false);
  });

  it('normalizes five/six classrooms by classroom_id including zero-assignment and dedupes rows', () => {
    const classrooms = normalizeAssessmentClassroomRows([
      { classroom_id: 'c1', classroom_name: '4A-Mathematics', total_count: 10 },
      { classroom_id: 'c2', classroom_name: '4A-Telugu', total_count: 8 },
      { classroom_id: 'c3', classroom_name: '5A-Mathematics-Sam', total_count: 0 },
      { classroom_id: 'c4', classroom_name: '10A-Science', total_count: 0 },
      { classroom_id: 'c5', classroom_name: '10A-English-Sam', total_count: 12 },
      { classroom_id: 'c6', classroom_name: '10A-Mathematics-Sam', total_count: 7 },
      { classroom_id: 'c4', classroom_name: '10A-Science', total_count: 0 },
      { classroom_id: 'c7', classroom_name: '4A-Mathematics', total_count: 3 },
    ]);
    expect(classrooms).toHaveLength(7);
    expect(classrooms.find((c) => c.classroom_id === 'c4')?.classroom_name).toBe('10A-Science');
    expect(resolveAuthoritativeClassroomCount({ uniqueClassrooms: classrooms.length })).toBe(7);
  });

  it('always uses unique classroom identities (never unverified reported totals)', () => {
    expect(
      resolveAuthoritativeClassroomCount({
        uniqueClassrooms: 6,
        reportedTotal: 4,
        hasMore: false,
      }),
    ).toBe(6);
  });

  it('honours explicit hasMore=true on a short page as incomplete (not success)', async () => {
    const fetchPage = jest.fn(async ({ offset }: { offset: number; limit: number }) =>
      interpretAssessmentClassroomPage({
        rows: [{ classroom_id: 'a', classroom_name: 'A' }],
        offset,
        limit: 100,
        body: { pagination: { hasMore: true, total: 50 } },
      }),
    );

    const outcome = await fetchAllAssessmentClassroomRows('class_wise_students', {
      pageSize: 100,
      fetchPage: fetchPage as any,
    });
    expect(outcome.kind).toBe('incomplete');
    if (outcome.kind === 'incomplete') {
      expect(outcome.reason).toBe('hasMore_short_or_empty_page');
    }
  });

  it('continues past a duplicate-only intermediate page when hasMore and later pages add classrooms', async () => {
    const fetchPage = jest.fn(async ({ offset }: { offset: number; limit: number }) => {
      if (offset === 0) {
        return interpretAssessmentClassroomPage({
          rows: [
            { classroom_id: 'a', classroom_name: 'A' },
            { classroom_id: 'b', classroom_name: 'B' },
          ],
          offset: 0,
          limit: 2,
          body: { pagination: { hasMore: true } },
        });
      }
      if (offset === 2) {
        // Duplicate-only page (server re-sent prior ids) but still hasMore.
        return interpretAssessmentClassroomPage({
          rows: [
            { classroom_id: 'a', classroom_name: 'A' },
            { classroom_id: 'b', classroom_name: 'B' },
          ],
          offset: 2,
          limit: 2,
          body: { pagination: { hasMore: true } },
        });
      }
      return interpretAssessmentClassroomPage({
        rows: [
          { classroom_id: 'c', classroom_name: 'C' },
          { classroom_id: 'd', classroom_name: '10A-Science' },
        ],
        offset: 4,
        limit: 2,
        body: { pagination: { hasMore: false } },
      });
    });

    const outcome = await fetchAllAssessmentClassroomRows('class_wise_students', {
      pageSize: 2,
      fetchPage: fetchPage as any,
    });
    expect(outcome.kind).toBe('complete');
    if (outcome.kind === 'complete') {
      expect(normalizeAssessmentClassroomRows(outcome.rows)).toHaveLength(4);
      expect(outcome.pagesFetched).toBe(3);
    }
  });

  it('detects repeated identical pages at the same offset as incomplete', async () => {
    const fetchPage = jest.fn(async ({ offset }: { offset: number; limit: number }) =>
      interpretAssessmentClassroomPage({
        rows: [
          { classroom_id: 'a', classroom_name: 'A' },
          { classroom_id: 'b', classroom_name: 'B' },
        ],
        offset,
        limit: 2,
        // nextOffset stuck — same offset forever
        body: { pagination: { hasMore: true, next_offset: offset } },
      }),
    );

    const outcome = await fetchAllAssessmentClassroomRows('class_wise_students', {
      pageSize: 2,
      maxPages: 5,
      fetchPage: fetchPage as any,
    });
    expect(outcome.kind).toBe('incomplete');
    if (outcome.kind === 'incomplete') {
      expect(['repeated_page', 'inconsistent_pagination', 'no_progress_loop']).toContain(
        outcome.reason,
      );
    }
  });

  it('treats safety-limit exhaustion as incomplete failure', async () => {
    const fetchPage = jest.fn(async ({ offset }: { offset: number; limit: number }) =>
      interpretAssessmentClassroomPage({
        rows: [
          { classroom_id: `id-${offset}`, classroom_name: `C${offset}` },
          { classroom_id: `id-${offset}-b`, classroom_name: `C${offset}b` },
        ],
        offset,
        limit: 2,
        body: { pagination: { hasMore: true } },
      }),
    );

    const outcome = await fetchAllAssessmentClassroomRows('class_wise_students', {
      pageSize: 2,
      maxPages: 3,
      fetchPage: fetchPage as any,
    });
    expect(outcome.kind).toBe('incomplete');
    if (outcome.kind === 'incomplete') {
      expect(outcome.reason).toBe('safety_limit_exhausted');
    }
  });

  it('does not publish incomplete inventory as ok; preserves prior complete data', async () => {
    const scope = {
      apiEnv: 'dev',
      userId: '66',
      role: 'instructor',
      schoolId: 1,
    };
    await loadAssessmentClassrooms(scope, {
      getCurrentScope: () => scope,
      fetchAll: async () =>
        ({
          kind: 'complete',
          rows: [
            { classroom_id: 'c1', classroom_name: '10A-Science', total_count: 0 },
            { classroom_id: 'c2', classroom_name: '4A-Math', total_count: 4 },
          ],
          pagesFetched: 1,
        }) satisfies FetchAllAssessmentClassroomsOutcome,
    });

    const failed = await loadAssessmentClassrooms(scope, {
      getCurrentScope: () => scope,
      fetchAll: async () =>
        ({
          kind: 'incomplete',
          rows: [{ classroom_id: 'partial', classroom_name: 'Partial' }],
          pagesFetched: 2,
          reason: 'hasMore_short_or_empty_page',
        }) satisfies FetchAllAssessmentClassroomsOutcome,
    });
    expect(failed.kind).toBe('failed');
    if (failed.kind === 'failed') {
      expect(failed.error).toContain('incomplete_inventory');
      expect(failed.prior).toHaveLength(2);
      expect(failed.prior?.[0].classroom_name).toBe('10A-Science');
    }
  });

  it('coalesces identical in-flight loads for one refresh', async () => {
    let calls = 0;
    const fetchAll = jest.fn(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 30));
      return {
        kind: 'complete' as const,
        rows: [
          { classroom_id: 'c1', classroom_name: '10A-Science', total_count: 0 },
          { classroom_id: 'c2', classroom_name: '4A-Mathematics', total_count: 5 },
        ],
        pagesFetched: 1,
      };
    });

    const scope = {
      apiEnv: 'https://dev-api.eduvijna.com',
      userId: '66',
      role: 'instructor',
      schoolId: 1,
    };
    const getCurrentScope = () => scope;

    const [a, b] = await Promise.all([
      loadAssessmentClassrooms(scope, { getCurrentScope, fetchAll }),
      loadAssessmentClassrooms(scope, { getCurrentScope, fetchAll }),
    ]);
    expect(calls).toBe(1);
    expect(a.kind).toBe('ok');
    expect(b.kind).toBe('ok');
  });

  it('rejects stale success after account switch during a pending request', async () => {
    let resolveFetch!: (value: FetchAllAssessmentClassroomsOutcome) => void;
    const fetchAll = jest.fn(
      () =>
        new Promise<FetchAllAssessmentClassroomsOutcome>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    let live = {
      apiEnv: 'dev',
      userId: '66',
      role: 'instructor',
      schoolId: 1,
    };
    const pending = loadAssessmentClassrooms(live, {
      getCurrentScope: () => live,
      fetchAll,
    });

    live = { apiEnv: 'dev', userId: '99', role: 'instructor', schoolId: 2 };
    invalidateAssessmentClassroomsLoads();

    resolveFetch({
      kind: 'complete',
      rows: [{ classroom_id: 'old', classroom_name: 'Old' }],
      pagesFetched: 1,
    });
    const first = await pending;
    expect(canApplyAssessmentClassroomsResult(first, () => live)).toBe(false);

    const second = await loadAssessmentClassrooms(live, {
      getCurrentScope: () => live,
      fetchAll: async () => ({
        kind: 'complete',
        rows: [{ classroom_id: 'new', classroom_name: 'New' }],
        pagesFetched: 1,
      }),
    });
    expect(second.kind).toBe('ok');
    if (second.kind === 'ok') {
      expect(second.classrooms[0].classroom_id).toBe('new');
      expect(second.generation).toBe(getAssessmentClassroomsLoadGeneration());
    }
  });

  it('uses student classes source behind the shared abstraction', async () => {
    const scope = {
      apiEnv: 'dev',
      userId: '70',
      role: 'student',
      schoolId: 1,
    };
    const result = await loadAssessmentClassrooms(scope, {
      getCurrentScope: () => scope,
      fetchAll: async (viewType) => {
        expect(viewType).toBe('classes');
        return {
          kind: 'complete',
          rows: [{ classroom_id: 's1', classroom_name: '4A-Telugu' }],
          pagesFetched: 1,
        };
      },
    });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.source).toBe('classes');
    }
  });

  it('scopes cache keys by api env, user, role and school', () => {
    expect(
      assessmentClassroomScopeKey({
        apiEnv: 'https://dev-api.eduvijna.com',
        userId: '66',
        role: 'instructor',
        schoolId: 1,
      }),
    ).not.toEqual(
      assessmentClassroomScopeKey({
        apiEnv: 'https://dev-api.eduvijna.com',
        userId: '66',
        role: 'instructor',
        schoolId: 2,
      }),
    );
  });

  it('keeps inventory classrooms when analytics metrics omit zero-assignment ones', () => {
    const merged = mergeAssessmentClassroomInventoryWithMetrics(
      [
        { classroom_id: 'c1', classroom_name: '10A-Science', instructor: {} as any, total_students: 0 },
        { classroom_id: 'c2', classroom_name: '4A-Math', instructor: {} as any, total_students: 5 },
      ],
      [
        {
          classroom_id: 'c2',
          classroom_name: '4A-Math',
          total_quizzes: 3,
          total_students: 5,
          missed_count: 0,
          completed_count: 2,
          in_progress_count: 0,
          pending_count: 1,
          expired_count: 0,
          avg_score: 80,
          highest_score: 90,
          lowest_score: 70,
          completion_rate: 66,
        },
      ],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((c) => c.classroom_id === 'c1')?.total_quizzes).toBe(0);
  });
});
