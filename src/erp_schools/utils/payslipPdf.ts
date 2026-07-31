/**
 * Admin payslip PDF — HTML → expo-print → share/save.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export type PayslipPdfInput = {
  employeeCode: string;
  staffName: string;
  designation?: string;
  department?: string;
  month: number;
  year: number;
  basic: number;
  hra: number;
  da: number;
  ta: number;
  otherAllowances: number;
  pf: number;
  tax: number;
  otherDeductions: number;
  gross: number;
  net: number;
  status: string;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildPayslipHtml(input: PayslipPdfInput): string {
  const period = `${MONTHS[Math.max(0, Math.min(11, (input.month || 1) - 1))]} ${input.year}`;
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>Payslip – ${esc(input.staffName)}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#0f172a;padding:24px}
  h1{font-size:18px;margin:0 0 4px;color:#1a3a5c}
  .sub{color:#64748b;margin-bottom:16px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left}
  th{background:#1a3a5c;color:#fff}
  .amt{text-align:right;font-weight:600}
  .total{background:#f0fdf4;font-weight:800}
  .badge{display:inline-block;padding:2px 8px;border-radius:10px;background:#e0e7ff;color:#4338ca;font-size:11px;font-weight:700}
</style></head><body>
  <h1>PAYSLIP</h1>
  <div class="sub">${esc(period)} · <span class="badge">${esc(input.status)}</span></div>
  <div class="meta">
    <div><b>Employee:</b> ${esc(input.staffName)}</div>
    <div><b>Emp ID:</b> ${esc(input.employeeCode)}</div>
    <div><b>Designation:</b> ${esc(input.designation || '—')}</div>
    <div><b>Department:</b> ${esc(input.department || '—')}</div>
  </div>
  <table>
    <thead><tr><th>Earnings</th><th class="amt">Amount</th><th>Deductions</th><th class="amt">Amount</th></tr></thead>
    <tbody>
      <tr><td>Basic</td><td class="amt">${inr(input.basic)}</td><td>PF</td><td class="amt">${inr(input.pf)}</td></tr>
      <tr><td>HRA</td><td class="amt">${inr(input.hra)}</td><td>Tax</td><td class="amt">${inr(input.tax)}</td></tr>
      <tr><td>DA</td><td class="amt">${inr(input.da)}</td><td>Other</td><td class="amt">${inr(input.otherDeductions)}</td></tr>
      <tr><td>TA</td><td class="amt">${inr(input.ta)}</td><td></td><td></td></tr>
      <tr><td>Other allowances</td><td class="amt">${inr(input.otherAllowances)}</td><td></td><td></td></tr>
      <tr class="total"><td>Gross</td><td class="amt">${inr(input.gross)}</td><td>Net Pay</td><td class="amt">${inr(input.net)}</td></tr>
    </tbody>
  </table>
</body></html>`;
}

export async function downloadPayslipPdf(input: PayslipPdfInput): Promise<void> {
  try {
    const html = buildPayslipHtml(input);
    const { uri } = await Print.printToFileAsync({ html });
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      const safe = (input.employeeCode || 'payslip').replace(/[^\w.-]+/g, '_');
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${safe}-${input.month}-${input.year}.pdf`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ html });
    }
  } catch (e) {
    Alert.alert('Download failed', e instanceof Error ? e.message : 'Could not create payslip PDF.');
  }
}
