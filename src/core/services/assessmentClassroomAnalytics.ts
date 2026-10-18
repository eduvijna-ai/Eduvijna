/**
 * Merge authorized assessment classroom inventory with analytics metric rows.
 * Date/status filters may change metrics but must not drop inventory classrooms.
 */

import type { ClassOverview } from '../types/quizAnalytics.types';
import type { AssessmentClassroom } from './assessmentClassrooms.service';

export function emptyClassOverviewForClassroom(
  classroom: Pick<AssessmentClassroom, 'classroom_id' | 'classroom_name' | 'total_students'>,
): ClassOverview {
  return {
    classroom_id: classroom.classroom_id,
    classroom_name: classroom.classroom_name,
    total_quizzes: 0,
    total_students: classroom.total_students || 0,
    missed_count: 0,
    completed_count: 0,
    in_progress_count: 0,
    pending_count: 0,
    expired_count: 0,
    active_assignment_count: 0,
    upcoming_assignment_count: 0,
    expired_assignment_count: 0,
    avg_score: 0,
    highest_score: null,
    lowest_score: null,
    completion_rate: 0,
  };
}

/**
 * Prefer inventory order/identity. Attach metric overview when present for that classroom_id.
 * Metric-only classrooms (not in inventory) are appended last — should be rare.
 */
export function mergeAssessmentClassroomInventoryWithMetrics(
  inventory: AssessmentClassroom[],
  metricOverviews: ClassOverview[],
): ClassOverview[] {
  const metricsById = new Map(
    metricOverviews.map((m) => [String(m.classroom_id), m] as const),
  );
  const merged: ClassOverview[] = inventory.map((c) => {
    const metrics = metricsById.get(String(c.classroom_id));
    if (metrics) {
      metricsById.delete(String(c.classroom_id));
      return {
        ...metrics,
        classroom_name: c.classroom_name || metrics.classroom_name,
        total_students: metrics.total_students || c.total_students || 0,
      };
    }
    return emptyClassOverviewForClassroom(c);
  });
  for (const leftover of metricsById.values()) {
    merged.push(leftover);
  }
  return merged;
}
