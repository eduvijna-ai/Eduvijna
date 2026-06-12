/** Admin mock fixtures — school-wide attendance analytics. */

import type {
  AdminMetric,
  ChartPoint,
  DistributionRow,
  RankedRow,
  OpsListRow,
  DirectoryPerson,
} from '../../types/admin';

export const attendanceKpis: AdminMetric[] = [
  { key: 'students', icon: 'people-outline', value: '93%', label: 'Student Present', accent: 'teal' },
  { key: 'teachers', icon: 'person-outline', value: '97%', label: 'Teacher Present', accent: 'blue' },
  { key: 'absentees', icon: 'close-circle-outline', value: '42', label: 'Overall Absentees', accent: 'orange' },
  { key: 'trend', icon: 'trending-up-outline', value: '+2.5%', label: 'Attendance Trend', accent: 'green', trend: { direction: 'up', label: 'vs Last Month' } },
];

export const attendanceTrend: ChartPoint[] = [
  { label: '09', value: 89 },
  { label: '11', value: 90 },
  { label: '13', value: 92 },
  { label: '15', value: 93 },
];

export const attendanceDistribution: DistributionRow[] = [
  { id: 'pres', label: 'Present', value: '93% (2,284)', percent: 93, color: 'success' },
  { id: 'abs', label: 'Absent', value: '5% (123)', percent: 5, color: 'warning' },
  { id: 'lea', label: 'Leave', value: '2% (51)', percent: 2, color: 'danger' },
];

export const classWiseAttendance: RankedRow[] = [
  { id: 'a1', rank: 1, label: 'Grade 10-A', value: '96%', trend: { direction: 'up', label: '3.2%' } },
  { id: 'a2', rank: 2, label: 'Grade 9-A', value: '95%', trend: { direction: 'up', label: '1.8%' } },
  { id: 'a3', rank: 3, label: 'Grade 8-B', value: '94%', trend: { direction: 'up', label: '0.5%' } },
  { id: 'a4', rank: 4, label: 'Grade 7-A', value: '87%', trend: { direction: 'down', label: '0.6%' } },
  { id: 'a5', rank: 5, label: 'Grade 6-C', value: '84%', trend: { direction: 'down', label: '1.6%' } },
];

export const attendanceAlerts: OpsListRow[] = [
  { id: 'al1', title: 'Grade 7-A attendance dropped', subtitle: 'by 8% — from 93% to 85%', value: '', icon: 'trending-down-outline', accent: 'red' },
  { id: 'al2', title: 'Grade 6-C attendance dropped', subtitle: 'by 12% — from 96% to 84%', value: '', icon: 'trending-down-outline', accent: 'orange' },
  { id: 'al3', title: '10 students below 75%', subtitle: 'Attendance shortfall flagged', value: '', icon: 'person-outline', accent: 'red' },
  { id: 'al4', title: '5 students on leave today', subtitle: 'Leave of absence', value: '', icon: 'time-outline', accent: 'purple' },
];

export const teacherAttendanceSummary: DirectoryPerson[] = [
  { id: 'ta1', name: 'Mr. Rajesh Kumar', subtitle: 'Mathematics', meta: '', value: 'Present', status: 'active', accent: 'blue' },
  { id: 'ta2', name: 'Ms. Priya Singh', subtitle: 'Science', meta: '', value: 'Present', status: 'active', accent: 'green' },
  { id: 'ta3', name: 'Mr. Arvind Sharma', subtitle: 'English', meta: '', value: 'Absent', status: 'absent', accent: 'orange' },
  { id: 'ta4', name: 'Ms. Kavita Joshi', subtitle: 'Social Studies', meta: '', value: 'On Leave', status: 'leave', accent: 'purple' },
  { id: 'ta5', name: 'Mr. Rohan Verma', subtitle: 'Physical Education', meta: '', value: 'Present', status: 'active', accent: 'pink' },
];

export const absentStudents: DirectoryPerson[] = [
  { id: 'as1', name: 'Aarav Mehta', subtitle: 'Grade 9-A', meta: 'Absent', value: '', status: 'absent', accent: 'teal' },
  { id: 'as2', name: 'Diya Sharma', subtitle: 'Grade 8-B', meta: 'Absent', value: '', status: 'absent', accent: 'blue' },
  { id: 'as3', name: 'Karan Patel', subtitle: 'Grade 7-A', meta: 'Absent', value: '', status: 'absent', accent: 'orange' },
];

export const gradeHeatmap: { grade: string; values: number[] }[] = [
  { grade: 'Grade 6', values: [86, 85, 84, 88, 87] },
  { grade: 'Grade 7', values: [89, 90, 88, 91, 90] },
  { grade: 'Grade 8', values: [92, 93, 92, 94, 93] },
  { grade: 'Grade 9', values: [94, 95, 95, 94, 95] },
  { grade: 'Grade 10', values: [96, 95, 97, 98, 96] },
];

export const heatmapDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
