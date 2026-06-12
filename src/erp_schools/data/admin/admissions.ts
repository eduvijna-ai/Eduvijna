/** Admin mock fixtures — admissions (dashboard, applications, approval workflow). */

import type {
  AdminMetric,
  ChartPoint,
  DistributionRow,
  AdmissionApplication,
  WorkflowItem,
} from '../../types/admin';

export const admissionKpis: AdminMetric[] = [
  { key: 'apps', icon: 'document-text-outline', value: '186', label: 'Applications', accent: 'teal', trend: { direction: 'up', label: '8.4%' } },
  { key: 'approved', icon: 'checkmark-circle-outline', value: '124', label: 'Approved', accent: 'green', trend: { direction: 'up', label: '5.1%' } },
  { key: 'pending', icon: 'time-outline', value: '38', label: 'Pending Review', accent: 'orange' },
  { key: 'seats', icon: 'people-outline', value: '64', label: 'Seats Left', accent: 'blue' },
];

export const admissionTrend: ChartPoint[] = [
  { label: 'Jan', value: 18 },
  { label: 'Feb', value: 24 },
  { label: 'Mar', value: 31 },
  { label: 'Apr', value: 42 },
  { label: 'May', value: 38 },
  { label: 'Jun', value: 33 },
];

export const admissionByGrade: DistributionRow[] = [
  { id: 'g6', label: 'Grade 6', value: '52 applications', percent: 28, color: 'success' },
  { id: 'g7', label: 'Grade 7', value: '44 applications', percent: 24, color: 'info' },
  { id: 'g8', label: 'Grade 8', value: '38 applications', percent: 20, color: 'primary' },
  { id: 'g9', label: 'Grade 9', value: '30 applications', percent: 16, color: 'warning' },
  { id: 'g10', label: 'Grade 10', value: '22 applications', percent: 12, color: 'danger' },
];

export const admissionApplications: AdmissionApplication[] = [
  { id: 'app1', applicantName: 'Aarav Sharma', grade: 'Grade 6', appliedOn: '14 Jun 2026', guardian: 'Vikram Sharma', status: 'new' },
  { id: 'app2', applicantName: 'Diya Patel', grade: 'Grade 7', appliedOn: '13 Jun 2026', guardian: 'Nilesh Patel', status: 'review' },
  { id: 'app3', applicantName: 'Vivaan Gupta', grade: 'Grade 6', appliedOn: '12 Jun 2026', guardian: 'Anil Gupta', status: 'approved' },
  { id: 'app4', applicantName: 'Saanvi Reddy', grade: 'Grade 9', appliedOn: '11 Jun 2026', guardian: 'Kiran Reddy', status: 'waitlist' },
  { id: 'app5', applicantName: 'Reyansh Khan', grade: 'Grade 8', appliedOn: '10 Jun 2026', guardian: 'Imran Khan', status: 'rejected' },
  { id: 'app6', applicantName: 'Anaya Singh', grade: 'Grade 7', appliedOn: '09 Jun 2026', guardian: 'Rohit Singh', status: 'review' },
];

export const approvalWorkflow: WorkflowItem[] = [
  { id: 'wf1', title: 'Teacher Leave Request', subtitle: 'Medical leave 10-14 Jun', requestedBy: 'Ms. Priya Singh', dateLabel: '2h ago', icon: 'people-outline', accent: 'blue' },
  { id: 'wf2', title: 'Student Transfer Request', subtitle: 'Grade 8-A to 8-B', requestedBy: 'Kabir Malhotra', dateLabel: '5h ago', icon: 'swap-horizontal-outline', accent: 'orange' },
  { id: 'wf3', title: 'Admission Application', subtitle: 'Grade 6 admission', requestedBy: 'Aarav Sharma', dateLabel: '1d ago', icon: 'document-text-outline', accent: 'teal' },
  { id: 'wf4', title: 'Content Approval', subtitle: 'Study material upload', requestedBy: 'Mr. Rajesh Kumar', dateLabel: '1d ago', icon: 'checkmark-done-outline', accent: 'green' },
  { id: 'wf5', title: 'Fee Concession Request', subtitle: 'Sibling discount 26%', requestedBy: 'Suresh Verma', dateLabel: '2d ago', icon: 'wallet-outline', accent: 'purple' },
];
