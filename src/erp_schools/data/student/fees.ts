/** Student mock fixtures — fee dashboard. */

import type { FeeInstallment, FeePayment, FeeBreakupRow } from '../../types/student';

export const feeSummary = {
  total: 48000,
  paid: 28000,
  due: 20000,
  balancePercent: 41.67,
};

export const feeInstallments: FeeInstallment[] = [
  { id: 'fi1', index: 1, label: '1st Installment', dueDate: '10 Apr 2024', amount: 12000, status: 'paid', paidDate: '08 Apr 2024' },
  { id: 'fi2', index: 2, label: '2nd Installment', dueDate: '10 Jul 2024', amount: 12000, status: 'paid', paidDate: '09 Jul 2024' },
  { id: 'fi3', index: 3, label: '3rd Installment', dueDate: '10 Oct 2024', amount: 12000, status: 'pending' },
  { id: 'fi4', index: 4, label: '4th Installment', dueDate: '10 Jan 2025', amount: 12000, status: 'pending' },
];

export const feePayments: FeePayment[] = [
  { id: 'fp1', label: '2nd Installment Payment', method: 'UPI Payment', amount: 12000, date: '09 Jul 2024' },
  { id: 'fp2', label: '1st Installment Payment', method: 'UPI Payment', amount: 12000, date: '08 Apr 2024' },
];

export const feeBreakup: FeeBreakupRow[] = [
  { id: 'fb1', label: 'Tuition Fee', icon: 'school-outline', amount: 30000 },
  { id: 'fb2', label: 'Development Fee', icon: 'business-outline', amount: 8000 },
  { id: 'fb3', label: 'Activity Fee', icon: 'color-palette-outline', amount: 4000 },
  { id: 'fb4', label: 'Other Charges', icon: 'document-outline', amount: 6000 },
];
