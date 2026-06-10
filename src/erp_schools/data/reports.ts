/** Mock fixtures — reports dashboard + analytics. */

import type { ScoreBucket, Trend } from '../types/domain';

export const reportOverview: Array<{
  key: string;
  label: string;
  value: string;
  trend?: Trend;
  accent: 'green' | 'blue' | 'purple' | 'orange';
  iconName: string;
}> = [
  { key: 'students', label: 'Total Students', value: '32', accent: 'green', iconName: 'people-outline' },
  { key: 'attendance', label: 'Average Attendance', value: '92%', trend: { direction: 'up', label: '5% vs Apr 2025' }, accent: 'blue', iconName: 'calendar-outline' },
  { key: 'assignment', label: 'Avg Assignment Submission', value: '85%', trend: { direction: 'up', label: '8% vs Apr 2025' }, accent: 'purple', iconName: 'clipboard-outline' },
  { key: 'assessment', label: 'Avg Assessment Score', value: '78%', trend: { direction: 'down', label: '2% vs Apr 2025' }, accent: 'orange', iconName: 'ribbon-outline' },
];

export const assignmentBreakdown = {
  submitted: { count: 27, percent: 84 },
  pending: { count: 4, percent: 13 },
  notSubmitted: { count: 1, percent: 3 },
};

export const assessmentScoreBuckets: ScoreBucket[] = [
  { range: '90-100', count: 8 },
  { range: '80-89', count: 10 },
  { range: '70-79', count: 7 },
  { range: '60-69', count: 4 },
  { range: 'Below 60', count: 3 },
];

export const assessmentSummary = {
  averageScore: 78,
  classGrade: 'B',
};

export const reportCenter = [
  { key: 'progress', title: 'Student Progress Report', subtitle: 'Overall academic progress', iconName: 'trending-up-outline', route: 'StudentProgressAnalytics' as const },
  { key: 'attendance', title: 'Attendance Report', subtitle: 'Detailed attendance analysis', iconName: 'calendar-outline', route: 'AttendanceAnalytics' as const },
  { key: 'assignment', title: 'Assignment Report', subtitle: 'Submission and performance', iconName: 'clipboard-outline', route: 'AssignmentAnalytics' as const },
  { key: 'assessment', title: 'Assessment Report', subtitle: 'Test and exam performance', iconName: 'ribbon-outline', route: 'AssessmentAnalytics' as const },
];
