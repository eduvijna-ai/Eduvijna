/** Admin mock fixtures — school overview (full report) sections. */

import type {
  AdminMetric,
  ChartPoint,
  DistributionRow,
  RankedRow,
  OpsListRow,
} from '../../types/admin';

export const schoolKpis: AdminMetric[] = [
  { key: 'students', icon: 'people-outline', value: '2,458', label: 'Total Students', accent: 'teal', trend: { direction: 'up', label: '4.5%' } },
  { key: 'teachers', icon: 'person-outline', value: '126', label: 'Total Teachers', accent: 'purple', trend: { direction: 'up', label: '2.1%' } },
  { key: 'classes', icon: 'business-outline', value: '84', label: 'Total Classes', accent: 'blue', trend: { direction: 'up', label: '1.2%' } },
  { key: 'attendance', icon: 'stats-chart-outline', value: '93%', label: 'Attendance', accent: 'green', trend: { direction: 'up', label: '3.2%' } },
];

export const schoolAttendanceTrend: ChartPoint[] = [
  { label: '01', value: 88 },
  { label: '05', value: 90 },
  { label: '10', value: 92 },
  { label: '15', value: 93 },
];

export const schoolAttendanceDistribution: DistributionRow[] = [
  { id: 'pres', label: 'Present', value: '93% (2,284)', percent: 93, color: 'success' },
  { id: 'abs', label: 'Absent', value: '5% (123)', percent: 5, color: 'warning' },
  { id: 'lea', label: 'Leave', value: '2% (51)', percent: 2, color: 'danger' },
];

export const schoolSubjectPerformance: DistributionRow[] = [
  { id: 'math', label: 'Mathematics', value: '78%', percent: 78, color: 'primary' },
  { id: 'sci', label: 'Science', value: '82%', percent: 82, color: 'primary' },
  { id: 'eng', label: 'English', value: '81%', percent: 81, color: 'primary' },
  { id: 'soc', label: 'Social Studies', value: '75%', percent: 75, color: 'primary' },
  { id: 'hin', label: 'Hindi', value: '76%', percent: 76, color: 'primary' },
];

export const schoolGradeMarks: ChartPoint[] = [
  { label: 'G6', value: 76 },
  { label: 'G7', value: 79 },
  { label: 'G8', value: 81 },
  { label: 'G9', value: 83 },
  { label: 'G10', value: 84 },
];

export const schoolInfrastructure: RankedRow[] = [];

export const schoolInfraItems: OpsListRow[] = [
  { id: 'bld', title: 'Buildings', subtitle: 'Academic & admin blocks', value: '12', icon: 'business-outline', accent: 'teal' },
  { id: 'rooms', title: 'Classrooms', subtitle: 'Across all blocks', value: '68', icon: 'easel-outline', accent: 'blue' },
  { id: 'labs', title: 'Laboratories', subtitle: 'Science & computer labs', value: '5', icon: 'flask-outline', accent: 'purple' },
  { id: 'lib', title: 'Library', subtitle: 'Central reference library', value: '1', icon: 'library-outline', accent: 'orange' },
  { id: 'play', title: 'Playgrounds', subtitle: 'Sports grounds', value: '2', icon: 'football-outline', accent: 'green' },
  { id: 'bus', title: 'Buses', subtitle: 'Transport fleet', value: '24', icon: 'bus-outline', accent: 'pink' },
];
