/** Mock fixtures — payroll, payslips, leave balances + history. */

import type {
  PayslipSummary,
  SalaryBreakdown,
  LeaveBalance,
  LeaveRecord,
} from '../types/domain';

export const currentPayroll = {
  monthLabel: 'May 2025',
  netSalary: 58650,
  status: 'paid' as const,
  paidOn: '31 May 2025',
};

export const salaryBreakdown: SalaryBreakdown = {
  basic: 40000,
  allowances: 15000,
  deductions: 5350,
  net: 58650,
};

export const salaryHistory: PayslipSummary[] = [
  {
    id: 'ps-may',
    payslipId: 1,
    monthLabel: 'May 2025',
    month: 5,
    year: 2025,
    paidOn: 'Paid on 31 May 2025',
    netSalary: 58650,
    status: 'paid',
    earnings: { basic: 40000, hra: 9000, da: 4000, ta: 2000, otherAllowances: 0, total: 55000 },
    deductions: { pf: 3600, tax: 750, other: 1000, total: 5350 },
  },
  {
    id: 'ps-apr',
    payslipId: 2,
    monthLabel: 'April 2025',
    month: 4,
    year: 2025,
    paidOn: 'Paid on 30 Apr 2025',
    netSalary: 58650,
    status: 'paid',
  },
  {
    id: 'ps-mar',
    payslipId: 3,
    monthLabel: 'March 2025',
    month: 3,
    year: 2025,
    paidOn: 'Paid on 31 Mar 2025',
    netSalary: 58650,
    status: 'paid',
  },
  {
    id: 'ps-feb',
    payslipId: 4,
    monthLabel: 'February 2025',
    month: 2,
    year: 2025,
    paidOn: 'Paid on 28 Feb 2025',
    netSalary: 57900,
    status: 'paid',
  },
  {
    id: 'ps-jan',
    payslipId: 5,
    monthLabel: 'January 2025',
    month: 1,
    year: 2025,
    paidOn: 'Paid on 31 Jan 2025',
    netSalary: 57900,
    status: 'paid',
  },
];

export const leaveBalances: LeaveBalance[] = [
  { id: 'lt-cl', type: 'CL', label: 'Casual Leave (CL)', daysLeft: 8, accent: 'green' },
  { id: 'lt-ml', type: 'ML', label: 'Medical Leave (ML)', daysLeft: 6, accent: 'blue' },
  { id: 'lt-el', type: 'EL', label: 'Earned Leave (EL)', daysLeft: 12, accent: 'orange' },
  { id: 'lt-co', type: 'CO', label: 'Comp Off (CO)', daysLeft: 3, accent: 'purple' },
];

export const leaveHistory: LeaveRecord[] = [
  {
    id: 'lv1',
    leaveId: 1,
    type: 'CL',
    typeLabel: 'Casual Leave',
    dateRange: '12 May 2025 (1 day)',
    fromDate: '2025-05-12',
    toDate: '2025-05-12',
    days: 1,
    status: 'approved',
    decisionLabel: 'Approved on 10 May 2025',
  },
  {
    id: 'lv2',
    leaveId: 2,
    type: 'ML',
    typeLabel: 'Medical Leave',
    dateRange: '5 – 7 May 2025 (3 days)',
    fromDate: '2025-05-05',
    toDate: '2025-05-07',
    days: 3,
    status: 'approved',
    decisionLabel: 'Approved on 03 May 2025',
  },
  {
    id: 'lv3',
    leaveId: 3,
    type: 'EL',
    typeLabel: 'Earned Leave',
    dateRange: '20 – 24 Apr 2025 (5 days)',
    fromDate: '2025-04-20',
    toDate: '2025-04-24',
    days: 5,
    status: 'approved',
    decisionLabel: 'Approved on 15 Apr 2025',
  },
  {
    id: 'lv4',
    leaveId: 4,
    type: 'CO',
    typeLabel: 'Comp Off',
    dateRange: '28 Mar 2025 (1 day)',
    fromDate: '2025-03-28',
    toDate: '2025-03-28',
    days: 1,
    status: 'approved',
    decisionLabel: 'Approved on 25 Mar 2025',
  },
];

export const leaveTypeOptions = leaveBalances.map((b) => ({ label: b.label, value: b.id }));
