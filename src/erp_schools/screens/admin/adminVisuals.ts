/**
 * Admin-local view helpers (not UI components) — map the data layer's semantic
 * color names to the active theme palette and build donut segments. Kept module-
 * local so screens stay DRY without polluting the shared component barrel.
 */

import type { TeacherPalette } from '../../theme/tokens';
import type { DistributionRow, ApplicationStatus, FeeRecordStatus } from '../../types/admin';
import type { DonutSegment } from '../../components';
import type { AccentKey } from '../../theme/accents';

export type DistributionColor = DistributionRow['color'];

export function distributionColor(colors: TeacherPalette, key: DistributionColor): string {
  switch (key) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'info':
      return colors.info;
    case 'primary':
    default:
      return colors.primary;
  }
}

/** Build donut segments from distribution rows using their percent + semantic color. */
export function toDonutSegments(colors: TeacherPalette, rows: DistributionRow[]): DonutSegment[] {
  return rows.map((row) => ({ value: row.percent, color: distributionColor(colors, row.color) }));
}

const ADMISSION_STATUS_META: Record<ApplicationStatus, { label: string; accent: AccentKey }> = {
  new: { label: 'New', accent: 'blue' },
  review: { label: 'In Review', accent: 'orange' },
  approved: { label: 'Approved', accent: 'green' },
  rejected: { label: 'Rejected', accent: 'red' },
  waitlist: { label: 'Waitlisted', accent: 'purple' },
};

/** Label + accent for an admission application status. */
export function admissionStatusMeta(status: ApplicationStatus): { label: string; accent: AccentKey } {
  return ADMISSION_STATUS_META[status];
}

const FEE_STATUS_META: Record<FeeRecordStatus, { label: string; accent: AccentKey }> = {
  paid: { label: 'Paid', accent: 'green' },
  pending: { label: 'Pending', accent: 'orange' },
  overdue: { label: 'Overdue', accent: 'red' },
};

/** Label + accent for a fee record status. */
export function feeStatusMeta(status: FeeRecordStatus): { label: string; accent: AccentKey } {
  return FEE_STATUS_META[status];
}
