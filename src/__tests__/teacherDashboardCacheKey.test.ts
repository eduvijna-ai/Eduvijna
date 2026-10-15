import { getAuthSessionEpoch } from '../core/api/apiRefreshCoordinator';
import { buildTeacherDashboardSummaryCacheKey } from '../core/services/teacherDashboardCacheInvalidation';

describe('buildTeacherDashboardSummaryCacheKey', () => {
  it('namespaces cache keys by auth session epoch', () => {
    const epoch = getAuthSessionEpoch();
    expect(buildTeacherDashboardSummaryCacheKey('summary', 1000, 0)).toBe(
      `teacher_dashboard_summary_e${epoch}_summary_1000_0`,
    );
  });
});
