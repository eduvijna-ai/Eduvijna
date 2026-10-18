import {
  assessmentClassroomScopeKey,
  canApplyAssessmentClassroomsResult,
  fetchAllAssessmentClassroomRows,
  getAssessmentClassroomsLoadGeneration,
  invalidateAssessmentClassroomsLoads,
  loadAssessmentClassrooms,
  normalizeAssessmentClassroomRows,
  resolveAuthoritativeClassroomCount,
  usesTeacherAssessmentClassroomPath,
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
      // Duplicate API row must not inflate
      { classroom_id: 'c4', classroom_name: '10A-Science', total_count: 0 },
      // Same label/subject different id stays distinct
      { classroom_id: 'c7', classroom_name: '4A-Mathematics', total_count: 3 },
    ]);
    expect(classrooms).toHaveLength(7);
    expect(classrooms.find((c) => c.classroom_id === 'c4')?.classroom_name).toBe('10A-Science');
    expect(classrooms.find((c) => c.classroom_id === 'c3')?.total_students).toBe(0);
    expect(resolveAuthoritativeClassroomCount({ uniqueClassrooms: classrooms.length })).toBe(7);
  });

  it('ignores divergent reported totals when counting', () => {
    expect(
      resolveAuthoritativeClassroomCount({
        uniqueClassrooms: 6,
        reportedTotal: 4,
        hasMore: false,
      }),
    ).toBe(6);
  });

  it('paginates until a short page and does not assume limit=1000 completeness', async () => {
    const pages: Record<number, unknown[]> = {
      0: [
        { classroom_id: 'a', classroom_name: 'A' },
        { classroom_id: 'b', classroom_name: 'B' },
      ],
      2: [{ classroom_id: 'c', classroom_name: 'C' }],
    };
    const fetchPage = jest.fn(async ({ offset }: { offset: number; limit: number }) => {
      const rows = pages[offset] || [];
      return {
        rows,
        hasMore: offset === 0,
        reportedTotal: 3,
      };
    });

    const { rows, pagesFetched } = await fetchAllAssessmentClassroomRows('class_wise_students', {
      pageSize: 2,
      fetchPage: fetchPage as any,
    });
    expect(pagesFetched).toBeGreaterThanOrEqual(2);
    expect(normalizeAssessmentClassroomRows(rows)).toHaveLength(3);
    expect(fetchPage).toHaveBeenCalled();
  });

  it('coalesces identical in-flight loads for one refresh', async () => {
    let calls = 0;
    const fetchAll = jest.fn(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 30));
      return {
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
    if (a.kind === 'ok') {
      expect(a.count).toBe(2);
      expect(a.source).toBe('class_wise_students');
    }
  });

  it('rejects stale success after account switch during a pending request', async () => {
    let resolveFetch!: (value: { rows: unknown[]; pagesFetched: number }) => void;
    const fetchAll = jest.fn(
      () =>
        new Promise<{ rows: unknown[]; pagesFetched: number }>((resolve) => {
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
      rows: [{ classroom_id: 'old', classroom_name: 'Old' }],
      pagesFetched: 1,
    });
    const first = await pending;
    expect(canApplyAssessmentClassroomsResult(first, () => live)).toBe(false);

    const second = await loadAssessmentClassrooms(live, {
      getCurrentScope: () => live,
      fetchAll: async () => ({
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

  it('preserves prior inventory on failure instead of a false zero', async () => {
    const scope = {
      apiEnv: 'dev',
      userId: '66',
      role: 'instructor',
      schoolId: 1,
    };
    await loadAssessmentClassrooms(scope, {
      getCurrentScope: () => scope,
      fetchAll: async () => ({
        rows: [
          { classroom_id: 'c1', classroom_name: '10A-Science', total_count: 0 },
          { classroom_id: 'c2', classroom_name: '4A-Math', total_count: 4 },
        ],
        pagesFetched: 1,
      }),
    });

    const failed = await loadAssessmentClassrooms(scope, {
      getCurrentScope: () => scope,
      fetchAll: async () => {
        throw new Error('network');
      },
    });
    expect(failed.kind).toBe('failed');
    if (failed.kind === 'failed') {
      expect(failed.prior).toHaveLength(2);
      expect(failed.prior?.[0].classroom_name).toBe('10A-Science');
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
          rows: [{ classroom_id: 's1', classroom_name: '4A-Telugu' }],
          pagesFetched: 1,
        };
      },
    });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.source).toBe('classes');
      expect(result.count).toBe(1);
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
    expect(merged.find((c) => c.classroom_id === 'c2')?.total_quizzes).toBe(3);
  });
});
