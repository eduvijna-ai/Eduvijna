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
  { id: 'ps-may', monthLabel: 'May 2025', paidOn: 'Paid on 31 May 2025', netSalary: 58650, status: 'paid' },
  { id: 'ps-apr', monthLabel: 'April 2025', paidOn: 'Paid on 30 Apr 2025', netSalary: 58650, status: 'paid' },
  { id: 'ps-mar', monthLabel: 'March 2025', paidOn: 'Paid on 31 Mar 2025', netSalary: 58650, status: 'paid' },
  { id: 'ps-feb', monthLabel: 'February 2025', paidOn: 'Paid on 28 Feb 2025', netSalary: 57900, status: 'paid' },
  { id: 'ps-jan', monthLabel: 'January 2025', paidOn: 'Paid on 31 Jan 2025', netSalary: 57900, status: 'paid' },
];

export const leaveBalances: LeaveBalance[] = [
  { type: 'CL', label: 'Casual Leave (CL)', daysLeft: 8, accent: 'green' },
  { type: 'ML', label: 'Medical Leave (ML)', daysLeft: 6, accent: 'blue' },
  { type: 'EL', label: 'Earned Leave (EL)', daysLeft: 12, accent: 'orange' },
  { type: 'CO', label: 'Comp Off (CO)', daysLeft: 3, accent: 'purple' },
];

export const leaveHistory: LeaveRecord[] = [
  { id: 'lv1', type: 'CL', typeLabel: 'Casual Leave', dateRange: '12 May 2025 (1 day)', days: 1, status: 'approved', decisionLabel: 'Approved on 10 May 2025' },
  { id: 'lv2', type: 'ML', typeLabel: 'Medical Leave', dateRange: '5 – 7 May 2025 (3 days)', days: 3, status: 'approved', decisionLabel: 'Approved on 03 May 2025' },
  { id: 'lv3', type: 'EL', typeLabel: 'Earned Leave', dateRange: '20 – 24 Apr 2025 (5 days)', days: 5, status: 'approved', decisionLabel: 'Approved on 15 Apr 2025' },
  { id: 'lv4', type: 'CO', typeLabel: 'Comp Off', dateRange: '28 Mar 2025 (1 day)', days: 1, status: 'approved', decisionLabel: 'Approved on 25 Mar 2025' },
];

export const leaveTypeOptions = leaveBalances.map((b) => ({ label: b.label, value: b.type }));
