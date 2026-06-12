/** Admin mock fixtures — home dashboard (KPIs, alerts, pulses, insights, events). */

import type {
  AdminMetric,
  AdminAlert,
  AttendancePulse,
  FeeCollectionSummary,
  AIInsight,
  PendingApproval,
  AdminEvent,
} from '../../types/admin';

export const dashboardKpis: AdminMetric[] = [
  { key: 'students', icon: 'school-outline', value: '2,458', label: 'Total Students', accent: 'teal', trend: { direction: 'up', label: '4.5%' } },
  { key: 'teachers', icon: 'people-outline', value: '126', label: 'Total Teachers', accent: 'blue', trend: { direction: 'up', label: '2.1%' } },
  { key: 'classes', icon: 'business-outline', value: '84', label: 'Total Classes', accent: 'purple', trend: { direction: 'up', label: '1.2%' } },
  { key: 'attendance', icon: 'stats-chart-outline', value: '93%', label: 'Attendance Today', accent: 'green', trend: { direction: 'up', label: '3.2%' } },
];

export const dashboardSecondaryKpis: AdminMetric[] = [
  { key: 'admissions', icon: 'person-add-outline', value: '+45', label: 'New Admissions', accent: 'orange' },
  { key: 'fees', icon: 'wallet-outline', value: '₹12.5L', label: 'Fees Collected', accent: 'green' },
  { key: 'assessments', icon: 'checkbox-outline', value: '1,250', label: 'Assessments Done', accent: 'blue' },
];

export const dashboardAlerts: AdminAlert[] = [
  { id: 'al1', icon: 'people-outline', accent: 'orange', count: 8, label: 'Teachers Absent' },
  { id: 'al2', icon: 'person-outline', accent: 'red', count: 23, label: 'Students Absent' },
  { id: 'al3', icon: 'cash-outline', accent: 'red', count: 12, label: 'Fee Defaulters' },
  { id: 'al4', icon: 'document-text-outline', accent: 'purple', count: 3, label: 'Pending Leave' },
];

export const attendancePulses: AttendancePulse[] = [
  { label: 'Students', percent: 93, accent: 'teal' },
  { label: 'Teachers', percent: 97, accent: 'green' },
];

export const dashboardFeeCollection: FeeCollectionSummary = {
  collected: 1250000,
  pending: 210000,
  overdue: 65000,
  totalLabel: '₹15.15L',
};

export const dashboardInsights: AIInsight[] = [
  { id: 'ai1', icon: 'trending-down-outline', accent: 'red', text: 'Class 8 performance dropped by 12%.' },
  { id: 'ai2', icon: 'book-outline', accent: 'purple', text: 'Mathematics needs intervention in 5 classes.' },
  { id: 'ai3', icon: 'trending-up-outline', accent: 'green', text: 'Attendance improving in Grade 7.' },
  { id: 'ai4', icon: 'checkmark-circle-outline', accent: 'teal', text: 'Fee collection on target this month.' },
];

export const dashboardApprovals: PendingApproval[] = [
  { id: 'ap1', icon: 'people-outline', accent: 'blue', label: 'Teacher Leave Requests', count: 3 },
  { id: 'ap2', icon: 'swap-horizontal-outline', accent: 'orange', label: 'Student Transfer Requests', count: 2 },
  { id: 'ap3', icon: 'document-text-outline', accent: 'teal', label: 'Admission Applications', count: 5 },
  { id: 'ap4', icon: 'checkmark-done-outline', accent: 'green', label: 'Content Approvals', count: 8 },
];

export const dashboardEvents: AdminEvent[] = [
  { id: 'ev1', day: '15', month: 'Jun', title: 'Parent Teacher Meeting', meta: 'Auditorium • 10:00 AM' },
  { id: 'ev2', day: '18', month: 'Jun', title: 'Unit Test - 1', meta: 'Grades 6 to 10' },
  { id: 'ev3', day: '25', month: 'Jun', title: 'Science Fair', meta: 'School Campus • 09:00 AM' },
];
