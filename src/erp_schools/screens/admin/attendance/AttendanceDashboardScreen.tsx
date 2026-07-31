/**
 * Admin Attendance — full web AttendanceTab parity (6 tabs).
 * Reuses TeacherAttendanceScreen hub with role="admin" (Staff Attendance + edit any date).
 */

import React from 'react';
import TeacherAttendanceScreen from '../../teacher/attendance/TeacherAttendanceScreen';

export default function AttendanceDashboardScreen() {
  return <TeacherAttendanceScreen role="admin" />;
}
