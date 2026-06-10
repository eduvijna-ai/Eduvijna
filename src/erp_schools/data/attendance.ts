/** Mock fixtures — class attendance summary + self attendance calendar. */

import type {
  AttendanceSummaryBucket,
  CalendarDayMark,
} from '../types/domain';

export const classAttendanceSummary = {
  total: 32,
  present: 28,
  absent: 2,
  late: 1,
  leave: 1,
};

export const attendanceReportBuckets: AttendanceSummaryBucket[] = [
  { status: 'present', label: 'Present', count: 29, percent: 91 },
  { status: 'late', label: 'Late', count: 2, percent: 6 },
  { status: 'absent', label: 'Absent', count: 1, percent: 3 },
];

/** Self check-in/out month overview. */
export const selfMonthOverview = {
  present: 18,
  absent: 1,
  late: 2,
  halfDay: 1,
  lastCheckIn: 'Yesterday, 11 May 2025 at 08:55 AM',
};

/** Self attendance calendar marks for May 2025. */
export const selfCalendarMarks: CalendarDayMark[] = [
  { date: '2025-05-05', status: 'present' },
  { date: '2025-05-06', status: 'present' },
  { date: '2025-05-07', status: 'present' },
  { date: '2025-05-08', status: 'present' },
  { date: '2025-05-09', status: 'present' },
  { date: '2025-05-10', status: 'present' },
  { date: '2025-05-12', status: 'present' },
  { date: '2025-05-13', status: 'late' },
  { date: '2025-05-14', status: 'absent' },
  { date: '2025-05-15', status: 'late' },
  { date: '2025-05-16', status: 'half_day' },
];
