/**
 * Role × page × entity status contracts (web-verified).
 *
 * Do not apply one classifier globally. Each surface picks a contract
 * by (role, page, entity). Assessment availability and student-attempt
 * status are always separate axes.
 *
 * Live web evidence (instructor Analytics, 2026-10-18):
 * GET /api/v1/dashboard/quizzes?view_type=all&limit=500&…
 * Class overview card: ungated Σ completed_count / pending_count (submission slots).
 * Class drill / quiz attempt chips: pending gated to availability_status === 'active'.
 * Assessments teacher tabs: availability_status Active / coming soon / Expired.
 */

export type StatusEntity =
  | 'assignment_availability'
  | 'student_attempt'
  | 'teacher_submission_aggregate'
  | 'teacher_actionable_pending';

export type StatusSurface =
  | 'home_kpi'
  | 'assessments_tabs'
  | 'analytics_class_card'
  | 'analytics_class_drill'
  | 'analytics_quiz_summary'
  | 'analytics_attempt_chips'
  | 'student_analytics';

export type RoleContext = 'student' | 'teacher' | 'instructor' | 'admin';

/** Teacher/instructor/admin share quiz-analytics aggregation on mobile (web same for AnalyticsPage). */
export function usesTeacherQuizAnalyticsAggregation(role: string | null | undefined): boolean {
  const r = String(role || '').toLowerCase();
  return r === 'teacher' || r === 'instructor' || r === 'admin';
}

/**
 * Class-card submission Pending (web AnalyticsPage mini-stats / aggregateClassOverview):
 * sum API pending_count across all assignments — NOT availability-gated.
 */
export const TEACHER_CLASS_CARD_PENDING = 'ungated_cohort_pending' as const;

/**
 * Class-drill / attempt-chip Pending (web AnalyticsPage classStats + attemptStats):
 * only count pending_count when availability_status === 'active'.
 */
export const TEACHER_DRILL_PENDING = 'active_availability_gated' as const;

/**
 * Assessments teacher tabs — assignment lifecycle, not submissions.
 */
export function teacherAvailabilityTabMatch(
  availabilityStatus: string | null | undefined,
  tab: 'active' | 'available_soon' | 'expired',
): boolean {
  const a = String(availabilityStatus || '').trim().toLowerCase();
  if (tab === 'active') return a === 'active';
  if (tab === 'expired') return a === 'expired';
  // Web/API often emit "coming soon"; mobile Assessments filters that string.
  return a === 'coming soon' || a === 'available_soon' || a === 'upcoming';
}

export function describeTeacherClassCardMetrics(): string {
  return (
    'total_quizzes=assignment rows; ' +
    'Active/Upcoming/Expired=assignment availability counts; ' +
    'Done/Pending=Σ student submission completed_count/pending_count (ungated, web class card)'
  );
}
