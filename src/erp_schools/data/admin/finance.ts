/** Admin mock fixtures — finance (dashboard, fee collection, revenue, expense). */

import type {
  AdminMetric,
  ChartPoint,
  DistributionRow,
  FeeRecord,
  Transaction,
  FeeTypeRow,
} from '../../types/admin';

export const financeKpis: AdminMetric[] = [
  { key: 'collected', icon: 'cash-outline', value: '₹12.50L', label: 'Total Collected', accent: 'green', trend: { direction: 'up', label: '8.5%' } },
  { key: 'pending', icon: 'time-outline', value: '₹2.10L', label: 'Total Pending', accent: 'orange', trend: { direction: 'down', label: '3.2%' } },
  { key: 'overdue', icon: 'alert-circle-outline', value: '₹65K', label: 'Overdue Amount', accent: 'red', trend: { direction: 'down', label: '12.4%' } },
  { key: 'invoices', icon: 'document-text-outline', value: '3,248', label: 'Total Invoices', accent: 'blue' },
];

export const feeCollectionKpis: AdminMetric[] = [
  { key: 'collected', icon: 'cash-outline', value: '₹12.5L', label: 'Total Collected', accent: 'green', trend: { direction: 'up', label: '8.5%' } },
  { key: 'pending', icon: 'time-outline', value: '₹2.1L', label: 'Total Pending', accent: 'orange', trend: { direction: 'down', label: '3.2%' } },
  { key: 'overdue', icon: 'alert-circle-outline', value: '₹65K', label: 'Overdue Amount', accent: 'red', trend: { direction: 'down', label: '12.4%' } },
  { key: 'rate', icon: 'stats-chart-outline', value: '95.2%', label: 'Collection Rate', accent: 'teal', trend: { direction: 'up', label: '4.6%' } },
];

export const collectionTrend: ChartPoint[] = [
  { label: 'Jan', value: 9 },
  { label: 'Feb', value: 11 },
  { label: 'Mar', value: 8 },
  { label: 'Apr', value: 12 },
  { label: 'May', value: 13 },
  { label: 'Jun', value: 12.5 },
];

export const collectionDistribution: DistributionRow[] = [
  { id: 'col', label: 'Collected', value: '₹12.50L (82.6%)', percent: 83, color: 'success' },
  { id: 'pen', label: 'Pending', value: '₹2.10L (13.9%)', percent: 14, color: 'warning' },
  { id: 'ovd', label: 'Overdue', value: '₹0.65L (3.5%)', percent: 3, color: 'danger' },
];

export const feeTypes: FeeTypeRow[] = [
  { id: 'ft1', label: 'Tuition Fees', amountLabel: '₹10.20L', percentLabel: '67.3%', icon: 'school-outline', accent: 'teal' },
  { id: 'ft2', label: 'Transport Fees', amountLabel: '₹1.85L', percentLabel: '12.2%', icon: 'bus-outline', accent: 'blue' },
  { id: 'ft3', label: 'Hostel Fees', amountLabel: '₹1.30L', percentLabel: '8.6%', icon: 'bed-outline', accent: 'purple' },
  { id: 'ft4', label: 'Other Fees', amountLabel: '₹1.80L', percentLabel: '11.9%', icon: 'ellipsis-horizontal-outline', accent: 'orange' },
];

export const feeRecords: FeeRecord[] = [
  { id: 'fr1', studentName: 'Aarav Kumar', studentId: 'S12345', grade: '7-B', dueLabel: '10 Jun 2026 (5 days left)', amount: 12500, status: 'pending' },
  { id: 'fr2', studentName: 'Priya Singh', studentId: 'S12346', grade: '8-A', dueLabel: '10 Jun 2026 (5 days left)', amount: 12500, status: 'paid' },
  { id: 'fr3', studentName: 'Rohan Khanna', studentId: 'S12347', grade: '7-B', dueLabel: '05 Jun 2026 (Overdue)', amount: 12500, status: 'overdue' },
  { id: 'fr4', studentName: 'Ananya Nair', studentId: 'S12348', grade: '9-A', dueLabel: '10 Jun 2026 (5 days left)', amount: 13000, status: 'pending' },
  { id: 'fr5', studentName: 'Dev Verma', studentId: 'S12349', grade: '8-B', dueLabel: '10 Jun 2026 (5 days left)', amount: 12500, status: 'paid' },
  { id: 'fr6', studentName: 'Ishita Verma', studentId: 'S12350', grade: '6-B', dueLabel: '12 Jun 2026 (7 days left)', amount: 11500, status: 'pending' },
];

export const recentTransactions: Transaction[] = [
  { id: 'tx1', name: 'Priya Singh', meta: 'Class 8-A • RCP-2026-2150', method: 'UPI', amount: 12500, dateLabel: '15 Jun 2026' },
  { id: 'tx2', name: 'Aarav Kumar', meta: 'Class 7-B • RCP-2026-2149', method: 'Card', amount: 12500, dateLabel: '15 Jun 2026' },
  { id: 'tx3', name: 'Rohan Khanna', meta: 'Class 9-A • RCP-2026-2148', method: 'Net Banking', amount: 13000, dateLabel: '14 Jun 2026' },
  { id: 'tx4', name: 'Ananya Nair', meta: 'Class 6-C • RCP-2026-2147', method: 'Cash', amount: 11500, dateLabel: '14 Jun 2026' },
  { id: 'tx5', name: 'Dev Verma', meta: 'Class 10-B • RCP-2026-2146', method: 'UPI', amount: 13000, dateLabel: '13 Jun 2026' },
];

export const concessions: DistributionRow[] = [
  { id: 'c1', label: 'Merit Based', value: '₹60,000 (48%)', percent: 48, color: 'success' },
  { id: 'c2', label: 'Sibling Discount', value: '₹32,000 (26%)', percent: 26, color: 'info' },
  { id: 'c3', label: 'Staff Discount', value: '₹18,000 (14%)', percent: 14, color: 'warning' },
  { id: 'c4', label: 'Other Concessions', value: '₹15,000 (12%)', percent: 12, color: 'danger' },
];

// ── Revenue ──────────────────────────────────────────────────────────────
export const revenueKpis: AdminMetric[] = [
  { key: 'total', icon: 'trending-up-outline', value: '₹15.6L', label: 'Total Revenue', accent: 'green', trend: { direction: 'up', label: '9.2%' } },
  { key: 'tuition', icon: 'school-outline', value: '₹10.2L', label: 'Tuition Revenue', accent: 'teal' },
  { key: 'other', icon: 'cube-outline', value: '₹5.4L', label: 'Other Revenue', accent: 'blue' },
  { key: 'growth', icon: 'stats-chart-outline', value: '+12%', label: 'YoY Growth', accent: 'purple', trend: { direction: 'up', label: 'vs Last Year' } },
];

export const revenueTrend: ChartPoint[] = [
  { label: 'Jan', value: 12 },
  { label: 'Feb', value: 13 },
  { label: 'Mar', value: 11 },
  { label: 'Apr', value: 14 },
  { label: 'May', value: 15 },
  { label: 'Jun', value: 15.6 },
];

export const revenueSources: DistributionRow[] = [
  { id: 'rs1', label: 'Tuition Fees', value: '₹10.2L (65%)', percent: 65, color: 'success' },
  { id: 'rs2', label: 'Transport', value: '₹1.85L (12%)', percent: 12, color: 'info' },
  { id: 'rs3', label: 'Hostel', value: '₹1.30L (8%)', percent: 8, color: 'warning' },
  { id: 'rs4', label: 'Misc & Activities', value: '₹2.25L (15%)', percent: 15, color: 'primary' },
];

// ── Expense ──────────────────────────────────────────────────────────────
export const expenseKpis: AdminMetric[] = [
  { key: 'total', icon: 'trending-down-outline', value: '₹9.8L', label: 'Total Expense', accent: 'red', trend: { direction: 'up', label: '4.1%' } },
  { key: 'salary', icon: 'people-outline', value: '₹6.4L', label: 'Salaries', accent: 'orange' },
  { key: 'ops', icon: 'construct-outline', value: '₹2.1L', label: 'Operations', accent: 'blue' },
  { key: 'surplus', icon: 'wallet-outline', value: '₹5.8L', label: 'Net Surplus', accent: 'green', trend: { direction: 'up', label: '6.3%' } },
];

export const expenseTrend: ChartPoint[] = [
  { label: 'Jan', value: 8 },
  { label: 'Feb', value: 9 },
  { label: 'Mar', value: 8.5 },
  { label: 'Apr', value: 9.5 },
  { label: 'May', value: 10 },
  { label: 'Jun', value: 9.8 },
];

export const expenseCategories: DistributionRow[] = [
  { id: 'ec1', label: 'Salaries & Wages', value: '₹6.4L (65%)', percent: 65, color: 'danger' },
  { id: 'ec2', label: 'Operations & Maintenance', value: '₹2.1L (21%)', percent: 21, color: 'warning' },
  { id: 'ec3', label: 'Utilities', value: '₹0.8L (8%)', percent: 8, color: 'info' },
  { id: 'ec4', label: 'Miscellaneous', value: '₹0.5L (6%)', percent: 6, color: 'primary' },
];
