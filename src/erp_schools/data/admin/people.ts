/** Admin mock fixtures — people management (students, teachers, parents, staff, roles, permissions). */

import type {
  AdminMetric,
  ChartPoint,
  DistributionRow,
  CriteriaRow,
  DirectoryPerson,
  AdminRoleItem,
  PermissionGroup,
} from '../../types/admin';

// ── Students ──────────────────────────────────────────────────────────────
export const studentKpis: AdminMetric[] = [
  { key: 'total', icon: 'people-outline', value: '2,458', label: 'Total Students', accent: 'teal', trend: { direction: 'up', label: '2.1%' } },
  { key: 'present', icon: 'checkmark-circle-outline', value: '2,284', label: 'Present Today', accent: 'green', trend: { direction: 'up', label: '3.2%' } },
  { key: 'absent', icon: 'close-circle-outline', value: '123', label: 'Absent Today', accent: 'red', trend: { direction: 'down', label: '1.1%' } },
  { key: 'admissions', icon: 'person-add-outline', value: '45', label: 'New Admissions', accent: 'orange', trend: { direction: 'up', label: '12.4%' } },
];

export const studentEnrollmentTrend: ChartPoint[] = [
  { label: 'Jun', value: 2280 },
  { label: 'Aug', value: 2320 },
  { label: 'Oct', value: 2360 },
  { label: 'Dec', value: 2400 },
  { label: 'Feb', value: 2430 },
  { label: 'Apr', value: 2458 },
];

export const studentsByGrade: DistributionRow[] = [
  { id: 'g6', label: 'Grade 6', value: '420 (17.1%)', percent: 17, color: 'success' },
  { id: 'g7', label: 'Grade 7', value: '438 (17.8%)', percent: 18, color: 'info' },
  { id: 'g8', label: 'Grade 8', value: '512 (20.8%)', percent: 21, color: 'primary' },
  { id: 'g9', label: 'Grade 9', value: '538 (21.9%)', percent: 22, color: 'warning' },
  { id: 'g10', label: 'Grade 10', value: '550 (22.4%)', percent: 22, color: 'danger' },
];

export const studentsAtRisk: DirectoryPerson[] = [
  { id: 'r1', name: 'Academic Risk', subtitle: 'Low assessment scores', meta: '184 students', value: '7.5%', status: 'inactive', accent: 'orange' },
  { id: 'r2', name: 'Attendance Risk', subtitle: 'Below 75% attendance', meta: '86 students', value: '3.5%', status: 'inactive', accent: 'red' },
  { id: 'r3', name: 'Behaviour Risk', subtitle: 'Flagged by mentors', meta: '42 students', value: '1.7%', status: 'inactive', accent: 'purple' },
];

export const recentAdmissions: DirectoryPerson[] = [
  { id: 'a1', name: 'Ishita Verma', subtitle: 'Grade 6-B', meta: '14 Jun 2026', value: 'New', status: 'active', accent: 'teal' },
  { id: 'a2', name: 'Kabir Malhotra', subtitle: 'Grade 7-A', meta: '13 Jun 2026', value: 'New', status: 'active', accent: 'blue' },
  { id: 'a3', name: 'Myra Chauhan', subtitle: 'Grade 8-C', meta: '12 Jun 2026', value: 'New', status: 'active', accent: 'green' },
];

// ── Teachers ──────────────────────────────────────────────────────────────
export const teacherKpis: AdminMetric[] = [
  { key: 'total', icon: 'people-outline', value: '126', label: 'Total Teachers', accent: 'teal' },
  { key: 'present', icon: 'checkmark-circle-outline', value: '122', label: 'Present Today', accent: 'green', trend: { direction: 'up', label: '2.1%' } },
  { key: 'absent', icon: 'close-circle-outline', value: '4', label: 'Absent Today', accent: 'red', trend: { direction: 'down', label: '1.0%' } },
  { key: 'leave', icon: 'time-outline', value: '8', label: 'On Leave', accent: 'orange', trend: { direction: 'up', label: '0.8%' } },
];

export const teacherPerformanceCriteria: CriteriaRow[] = [
  { id: 'punc', label: 'Punctuality', icon: 'time-outline', percent: 92 },
  { id: 'mgmt', label: 'Classroom Management', icon: 'easel-outline', percent: 88 },
  { id: 'know', label: 'Subject Knowledge', icon: 'book-outline', percent: 90 },
  { id: 'plan', label: 'Lesson Planning', icon: 'document-text-outline', percent: 85 },
  { id: 'eng', label: 'Student Engagement', icon: 'happy-outline', percent: 87 },
];

export const teacherPerformanceDist: DistributionRow[] = [
  { id: 'exc', label: 'Excellent', value: '28 (22.2%)', percent: 22, color: 'success' },
  { id: 'good', label: 'Good', value: '56 (44.4%)', percent: 44, color: 'info' },
  { id: 'avg', label: 'Average', value: '30 (23.8%)', percent: 24, color: 'warning' },
  { id: 'imp', label: 'Needs Improvement', value: '12 (9.6%)', percent: 10, color: 'danger' },
];

export const teacherDirectory: DirectoryPerson[] = [
  { id: 't1', name: 'Mr. Rajesh Kumar', subtitle: 'Mathematics', meta: '6 Classes', value: '96%', status: 'active', accent: 'blue' },
  { id: 't2', name: 'Ms. Priya Singh', subtitle: 'Science', meta: '5 Classes', value: '98%', status: 'active', accent: 'green' },
  { id: 't3', name: 'Mr. Arvind Sharma', subtitle: 'English', meta: '6 Classes', value: '0%', status: 'absent', accent: 'orange' },
  { id: 't4', name: 'Ms. Kavita Joshi', subtitle: 'Social Studies', meta: '4 Classes', value: '0%', status: 'absent', accent: 'purple' },
  { id: 't5', name: 'Ms. Neha Patel', subtitle: 'Hindi', meta: '5 Classes', value: '94%', status: 'leave', accent: 'pink' },
];

export const teachersOnLeave: DirectoryPerson[] = [
  { id: 'l1', name: 'Ms. Priya Singh', subtitle: 'Medical Leave', meta: '10 Jun - 14 Jun', value: '5d', status: 'leave', accent: 'green' },
  { id: 'l2', name: 'Mr. Rajesh Kumar', subtitle: 'Personal Leave', meta: '11 Jun - 12 Jun', value: '2d', status: 'leave', accent: 'blue' },
  { id: 'l3', name: 'Ms. Anjali Verma', subtitle: 'Casual Leave', meta: '10 Jun - 10 Jun', value: '1d', status: 'leave', accent: 'purple' },
];

// ── Parents ──────────────────────────────────────────────────────────────
export const parentKpis: AdminMetric[] = [
  { key: 'total', icon: 'people-circle-outline', value: '2,210', label: 'Total Parents', accent: 'teal' },
  { key: 'active', icon: 'phone-portrait-outline', value: '1,985', label: 'App Active', accent: 'green', trend: { direction: 'up', label: '5.2%' } },
  { key: 'meetings', icon: 'calendar-outline', value: '48', label: 'PTM Booked', accent: 'orange' },
  { key: 'pending', icon: 'mail-unread-outline', value: '36', label: 'Unread Queries', accent: 'red' },
];

export const parentDirectory: DirectoryPerson[] = [
  { id: 'p1', name: 'Suresh Verma', subtitle: 'Parent of Ishita Verma', meta: 'Grade 6-B', value: 'Active', status: 'active', accent: 'teal' },
  { id: 'p2', name: 'Anita Malhotra', subtitle: 'Parent of Kabir Malhotra', meta: 'Grade 7-A', value: 'Active', status: 'active', accent: 'blue' },
  { id: 'p3', name: 'Deepak Chauhan', subtitle: 'Parent of Myra Chauhan', meta: 'Grade 8-C', value: 'Inactive', status: 'inactive', accent: 'orange' },
  { id: 'p4', name: 'Rekha Nair', subtitle: 'Parent of Ananya Nair', meta: 'Grade 9-A', value: 'Active', status: 'active', accent: 'green' },
];

// ── Staff ──────────────────────────────────────────────────────────────────
export const staffKpis: AdminMetric[] = [
  { key: 'total', icon: 'briefcase-outline', value: '58', label: 'Total Staff', accent: 'teal' },
  { key: 'present', icon: 'checkmark-circle-outline', value: '54', label: 'Present Today', accent: 'green' },
  { key: 'admin', icon: 'document-outline', value: '14', label: 'Admin Staff', accent: 'blue' },
  { key: 'support', icon: 'construct-outline', value: '44', label: 'Support Staff', accent: 'orange' },
];

export const staffDirectory: DirectoryPerson[] = [
  { id: 's1', name: 'Mahesh Pillai', subtitle: 'Accountant', meta: 'Finance Dept', value: 'Active', status: 'active', accent: 'blue' },
  { id: 's2', name: 'Lata Iyer', subtitle: 'Front Office', meta: 'Administration', value: 'Active', status: 'active', accent: 'teal' },
  { id: 's3', name: 'Ramesh Yadav', subtitle: 'Transport In-charge', meta: 'Operations', value: 'On Leave', status: 'leave', accent: 'orange' },
  { id: 's4', name: 'Sunita Rao', subtitle: 'Librarian', meta: 'Library', value: 'Active', status: 'active', accent: 'purple' },
];

// ── Roles & Permissions ──────────────────────────────────────────────────
export const adminRoles: AdminRoleItem[] = [
  { id: 'role-admin', name: 'Administrator', icon: 'shield-checkmark-outline', accent: 'teal', userCount: 4, description: 'Full access to all modules' },
  { id: 'role-principal', name: 'Principal', icon: 'ribbon-outline', accent: 'purple', userCount: 1, description: 'School-wide oversight & approvals' },
  { id: 'role-teacher', name: 'Teacher', icon: 'easel-outline', accent: 'blue', userCount: 126, description: 'Classes, attendance, assessments' },
  { id: 'role-accountant', name: 'Accountant', icon: 'wallet-outline', accent: 'green', userCount: 3, description: 'Fees, payments, finance reports' },
  { id: 'role-librarian', name: 'Librarian', icon: 'library-outline', accent: 'orange', userCount: 2, description: 'Library & book management' },
  { id: 'role-transport', name: 'Transport Manager', icon: 'bus-outline', accent: 'pink', userCount: 2, description: 'Vehicles & routes' },
];

export const permissionGroups: PermissionGroup[] = [
  {
    id: 'pg-academics',
    title: 'Academics',
    icon: 'school-outline',
    accent: 'blue',
    permissions: [
      { id: 'pm-1', label: 'View Classes & Exams', description: 'Read access to academic data', granted: true },
      { id: 'pm-2', label: 'Manage Timetable', description: 'Create & edit class timetables', granted: true },
      { id: 'pm-3', label: 'Publish Results', description: 'Release exam results to parents', granted: false },
    ],
  },
  {
    id: 'pg-finance',
    title: 'Finance',
    icon: 'wallet-outline',
    accent: 'green',
    permissions: [
      { id: 'pm-4', label: 'Collect Fees', description: 'Record fee payments', granted: true },
      { id: 'pm-5', label: 'Approve Concessions', description: 'Grant fee concessions', granted: false },
      { id: 'pm-6', label: 'Export Finance Reports', description: 'Download revenue/expense data', granted: true },
    ],
  },
  {
    id: 'pg-people',
    title: 'People',
    icon: 'people-outline',
    accent: 'orange',
    permissions: [
      { id: 'pm-7', label: 'Manage Staff', description: 'Add & edit staff records', granted: true },
      { id: 'pm-8', label: 'Manage Roles', description: 'Assign roles & permissions', granted: false },
    ],
  },
];
