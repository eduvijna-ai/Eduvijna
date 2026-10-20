import { getAuthSessionEpoch } from '../api/apiRefreshCoordinator';
import { clearCacheEntriesWithPrefix } from './cacheService';

export const TEACHER_DASHBOARD_SUMMARY_CACHE_PREFIX = 'teacher_dashboard_summary_';

export function buildTeacherDashboardSummaryCacheKey(
  viewType: string,
  limit: number,
  offset: number,
): string {
  const epoch = getAuthSessionEpoch();
  return `${TEACHER_DASHBOARD_SUMMARY_CACHE_PREFIX}e${epoch}_${viewType}_${limit}_${offset}`;
}

export async function invalidateTeacherDashboardCaches(): Promise<void> {
  await clearCacheEntriesWithPrefix(TEACHER_DASHBOARD_SUMMARY_CACHE_PREFIX);
}
