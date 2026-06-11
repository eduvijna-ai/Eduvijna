/** Student mock fixtures — attendance summary, trend, recent days. */

import type {
  AttendanceBucket,
  AttendanceTrendPoint,
  AttendanceDayRecord,
} from '../../types/student';

export const attendanceBuckets: AttendanceBucket[] = [
  { key: 'present', label: 'Present', value: '88%', sublabel: '(88 Days)', icon: 'checkmark', accent: 'teal' },
  { key: 'absent', label: 'Absent', value: '8%', sublabel: '(8 Days)', icon: 'create-outline', accent: 'green' },
  { key: 'leave', label: 'Leave', value: '2%', sublabel: '(2 Days)', icon: 'create-outline', accent: 'orange' },
  { key: 'total', label: 'Total Days', value: '98', sublabel: 'Days', icon: 'calendar-outline', accent: 'blue' },
];

export const attendanceTrend: AttendanceTrendPoint[] = [
  { label: 'Nov', percent: 85 },
  { label: 'Dec', percent: 90 },
  { label: 'Jan', percent: 87 },
  { label: 'Feb', percent: 92 },
  { label: 'Mar', percent: 88 },
  { label: 'Apr', percent: 88 },
];

export const recentAttendance: AttendanceDayRecord[] = [
  { id: 'd1', day: 24, month: 'Apr', status: 'present', weekday: 'Thursday' },
  { id: 'd2', day: 23, month: 'Apr', status: 'absent', weekday: 'Wednesday', note: 'Sick leave' },
  { id: 'd3', day: 22, month: 'Apr', status: 'present', weekday: 'Tuesday' },
  { id: 'd4', day: 21, month: 'Apr', status: 'present', weekday: 'Monday' },
  { id: 'd5', day: 19, month: 'Apr', status: 'late', weekday: 'Saturday', note: 'Reported at 08:25 AM' },
  { id: 'd6', day: 18, month: 'Apr', status: 'leave', weekday: 'Friday', note: 'Family function' },
  { id: 'd7', day: 17, month: 'Apr', status: 'present', weekday: 'Thursday' },
  { id: 'd8', day: 16, month: 'Apr', status: 'present', weekday: 'Wednesday' },
];

export const attendanceOverallPercent = 88;
