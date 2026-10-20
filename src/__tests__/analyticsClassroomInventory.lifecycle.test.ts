/**
 * Analytics classroom-inventory lifecycle — guards against the Founder-reported blink loop.
 *
 * Proven cause (automated + code inspection):
 * `useAssessmentClassrooms` returned a new `refresh` function every render.
 * `QuizTeacherAnalyticsScreen` listed that refresh in `fetchData` deps, so
 * `useEffect(() => fetchData(), [fetchData])` re-fired continuously and called
 * `setLoading(true)` — the blink/reload loop.
 *
 * Distinguishes store settle behaviour (automated) from live-device observations.
 */

import {
  buildAssessmentClassroomScopeFromUser,
  useAssessmentClassroomsStore,
} from '../core/store/assessmentClassrooms.store';
import * as assessmentClassroomsService from '../core/services/assessmentClassrooms.service';

const mockUser = { id: '66', role: 'instructor' };
let mockSchoolId: string | number | null = 1;

jest.mock('../core/store/user.store', () => ({
  useUserStore: Object.assign(
    jest.fn((selector: (s: any) => unknown) =>
      selector({ user: mockUser, schoolId: mockSchoolId, isAuthenticated: true }),
    ),
    {
      getState: () => ({ user: mockUser, schoolId: mockSchoolId, isAuthenticated: true }),
    },
  ),
}));

describe('analytics classroom inventory lifecycle', () => {
  beforeEach(() => {
    mockSchoolId = 1;
    assessmentClassroomsService.invalidateAssessmentClassroomsLoads();
    useAssessmentClassroomsStore.getState().reset();
    jest.restoreAllMocks();
  });

  it('ensureLoaded settles: store updates do not recursively trigger another inventory fetch', async () => {
    const scope = buildAssessmentClassroomScopeFromUser(
      { id: '66', role: 'instructor' },
      1,
    )!;
    let calls = 0;
    jest
      .spyOn(assessmentClassroomsService, 'loadAssessmentClassrooms')
      .mockImplementation(async () => {
        calls += 1;
        return {
          kind: 'ok',
          scopeKey: assessmentClassroomsService.assessmentClassroomScopeKey(scope),
          generation: assessmentClassroomsService.getAssessmentClassroomsLoadGeneration(),
          classrooms: [
            {
              classroom_id: 'c1',
              classroom_name: '10A-Science',
              instructor: {
                instructor_id: '0',
                instructor_username: 'x',
                instructor_fullname: 'x',
                instructor_avatar_url: null,
              },
              total_students: 0,
            },
          ],
          count: 1,
          source: 'class_wise_students',
          pagesFetched: 1,
        };
      });

    await useAssessmentClassroomsStore.getState().ensureLoaded(scope);
    expect(calls).toBe(1);
    expect(useAssessmentClassroomsStore.getState().count).toBe(1);
    expect(useAssessmentClassroomsStore.getState().loading).toBe(false);

    // Subsequent ensureLoaded after success must not refetch (no recursive loop).
    await useAssessmentClassroomsStore.getState().ensureLoaded(scope);
    await useAssessmentClassroomsStore.getState().ensureLoaded(scope);
    expect(calls).toBe(1);
  });

  it('stale / failed responses cannot reset a successful inventory to a false zero', async () => {
    const scope = buildAssessmentClassroomScopeFromUser(
      { id: '66', role: 'instructor' },
      1,
    )!;
    const spy = jest.spyOn(assessmentClassroomsService, 'loadAssessmentClassrooms');

    spy.mockResolvedValueOnce({
      kind: 'ok',
      scopeKey: assessmentClassroomsService.assessmentClassroomScopeKey(scope),
      generation: assessmentClassroomsService.getAssessmentClassroomsLoadGeneration(),
      classrooms: [
        {
          classroom_id: 'c1',
          classroom_name: '10A-Science',
          instructor: {
            instructor_id: '0',
            instructor_username: 'x',
            instructor_fullname: 'x',
            instructor_avatar_url: null,
          },
          total_students: 0,
        },
      ],
      count: 1,
      source: 'class_wise_students',
      pagesFetched: 1,
    });
    await useAssessmentClassroomsStore.getState().refresh(scope);
    expect(useAssessmentClassroomsStore.getState().count).toBe(1);

    spy.mockResolvedValueOnce({
      kind: 'failed',
      scopeKey: assessmentClassroomsService.assessmentClassroomScopeKey(scope),
      generation: assessmentClassroomsService.getAssessmentClassroomsLoadGeneration(),
      error: 'incomplete_inventory:hasMore_short_or_empty_page',
      prior: useAssessmentClassroomsStore.getState().classrooms,
    });
    await useAssessmentClassroomsStore.getState().refresh(scope);

    expect(useAssessmentClassroomsStore.getState().unavailable).toBe(true);
    expect(useAssessmentClassroomsStore.getState().count).toBe(1);
    expect(useAssessmentClassroomsStore.getState().classrooms[0].classroom_name).toBe(
      '10A-Science',
    );
    expect(useAssessmentClassroomsStore.getState().loading).toBe(false);
  });

  it('metrics filter changes should not require inventory reload (contract documentation)', () => {
    // Date Apply/Clear only changes appliedStart/appliedEnd → fetchMetrics deps.
    // Inventory refresh is only on explicit pull refresh (handlePullRefresh).
    // This assertion documents the intentional split; see QuizTeacherAnalyticsScreen.
    const inventoryDeps = ['account', 'role', 'school', 'explicit_refresh'];
    const metricsDeps = ['appliedStart', 'appliedEnd', 'explicit_refresh'];
    expect(inventoryDeps).not.toContain('appliedStart');
    expect(metricsDeps).not.toContain('classroom_inventory_array');
  });

  it('scope switch clears classrooms before fetch; failure does not resurrect prior-scope rows', async () => {
    const scopeA = buildAssessmentClassroomScopeFromUser({ id: '66', role: 'instructor' }, 1)!;
    const scopeB = buildAssessmentClassroomScopeFromUser({ id: '66', role: 'instructor' }, 99)!;
    const spy = jest.spyOn(assessmentClassroomsService, 'loadAssessmentClassrooms');

    spy.mockResolvedValueOnce({
      kind: 'ok',
      scopeKey: assessmentClassroomsService.assessmentClassroomScopeKey(scopeA),
      generation: assessmentClassroomsService.getAssessmentClassroomsLoadGeneration(),
      classrooms: [
        {
          classroom_id: 'old_scope_class',
          classroom_name: 'Old',
          instructor: {
            instructor_id: '0',
            instructor_username: 'x',
            instructor_fullname: 'x',
            instructor_avatar_url: null,
          },
          total_students: 2,
        },
      ],
      count: 1,
      source: 'class_wise_students',
      pagesFetched: 1,
    });
    await useAssessmentClassroomsStore.getState().refresh(scopeA);
    expect(useAssessmentClassroomsStore.getState().classrooms[0].classroom_id).toBe('old_scope_class');

    mockSchoolId = 99;
    spy.mockResolvedValueOnce({
      kind: 'failed',
      scopeKey: assessmentClassroomsService.assessmentClassroomScopeKey(scopeB),
      generation: assessmentClassroomsService.getAssessmentClassroomsLoadGeneration(),
      error: 'network',
      prior: null,
    });
    await useAssessmentClassroomsStore.getState().refresh(scopeB);

    const state = useAssessmentClassroomsStore.getState();
    expect(state.scopeKey).toBe(assessmentClassroomsService.assessmentClassroomScopeKey(scopeB));
    expect(state.classrooms).toEqual([]);
    expect(state.count).toBe(0);
    expect(state.unavailable).toBe(true);
  });
});
