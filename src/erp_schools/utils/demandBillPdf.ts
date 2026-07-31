/**
 * Demand bill PDF — HTML → expo-print → share/save (web Print slips parity).
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export type DemandSlipPdfItem = {
  studentName: string;
  fatherName?: string;
  admissionNo?: string;
  mobile?: string;
  className?: string;
  termLabel: string;
  termAmount: number;
  previousDues: number;
  totalAmount: number;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtInr(n: number): string {
  return `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function slipHtml(item: DemandSlipPdfItem, monthLabel: string, displayDate: string): string {
  return `
    <div class="slip">
      <div class="slip-header">
        <div class="slip-title">DEMAND SLIP</div>
        <div class="slip-subtitle">School Finance Department</div>
      </div>
      <div class="meta-row">
        <span><b>Month:</b> ${esc(monthLabel)}</span>
        <span><b>Date:</b> ${esc(displayDate)}</span>
        <span><b>Class:</b> ${esc(item.className || '—')}</span>
      </div>
      <div class="student-info">
        <div class="info-row"><span class="lbl">Name:</span><span class="bold">${esc(item.studentName)}</span></div>
        <div class="info-row"><span class="lbl">F. Name:</span><span>${esc(item.fatherName || '—')}</span></div>
        <div class="info-row sb">
          <span><span class="lbl">ADM #:</span> <b>${esc(item.admissionNo || '—')}</b></span>
          <span><span class="lbl">Mobile:</span> ${esc(item.mobile || '—')}</span>
        </div>
      </div>
      <table class="fee-table">
        <thead><tr><th style="width:36px">SL</th><th>FEE HEAD</th><th>AMOUNT</th></tr></thead>
        <tbody>
          <tr>
            <td class="grey">1</td>
            <td>${esc(item.termLabel)}</td>
            <td class="amt blue">${fmtInr(item.termAmount)}</td>
          </tr>
          ${
            item.previousDues > 0
              ? `<tr>
            <td class="grey"></td>
            <td class="orange italic">Previous Dues</td>
            <td class="amt orange">${fmtInr(item.previousDues)}</td>
          </tr>`
              : ''
          }
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2" class="total-lbl">TOTAL</td>
            <td class="total-amt">${fmtInr(item.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
      <div class="slip-footer">PLEASE PAY BEFORE 30TH OF EVERY MONTH TO AVOID LATE FINE.</div>
    </div>`;
}

export function buildDemandBillHtml(
  items: DemandSlipPdfItem[],
  monthLabel: string,
): string {
  const displayDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Demand Bill – ${esc(monthLabel)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;background:#fff;padding:8px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .slip{border:1px solid #000;border-radius:3px;overflow:hidden;page-break-inside:avoid}
    .slip-header{background:#1a3a5c;color:#fff;padding:8px 12px;text-align:center}
    .slip-title{font-weight:800;font-size:14px;letter-spacing:1px;margin-bottom:2px}
    .slip-subtitle{font-size:11px;opacity:.85}
    .meta-row{display:flex;justify-content:space-between;padding:5px 12px;border-bottom:1px solid #ccc;background:#f8f8f8;font-size:11px;gap:6px;flex-wrap:wrap}
    .student-info{padding:8px 12px;border-bottom:1px solid #e2e8f0}
    .info-row{display:flex;gap:8px;margin-bottom:3px}
    .info-row.sb{justify-content:space-between}
    .lbl{min-width:65px;color:#666;font-size:12px}
    .bold{font-weight:700}
    .fee-table{width:100%;border-collapse:collapse;font-size:13px}
    .fee-table thead tr{background:#1a3a5c;color:#fff}
    .fee-table th{padding:5px 10px;text-align:left;font-weight:700}
    .fee-table th:last-child{text-align:right}
    .fee-table td{padding:5px 10px;border-bottom:1px solid #e2e8f0}
    .amt{text-align:right;font-weight:600}
    .grey{color:#666}
    .blue{color:#0369a1}
    .orange{color:#d97706}
    .italic{font-style:italic}
    .total-row{background:#f0fdf4}
    .total-lbl{padding:6px 10px;font-weight:800;text-align:right;color:#15803d}
    .total-amt{padding:6px 10px;text-align:right;font-weight:800;font-size:15px;color:#15803d}
    .slip-footer{background:#fef9c3;padding:6px 12px;font-size:11px;color:#854d0e;text-align:center;border-top:1px solid #fde68a;font-weight:600}
  </style>
</head>
<body>
  <div class="grid">
    ${items.map((item) => slipHtml(item, monthLabel, displayDate)).join('\n')}
  </div>
</body>
</html>`;
}

export async function downloadDemandBillPdf(
  items: DemandSlipPdfItem[],
  monthLabel: string,
): Promise<void> {
  if (items.length === 0) {
    Alert.alert('Nothing to print', 'Generate a demand bill first.');
    return;
  }
  try {
    const html = buildDemandBillHtml(items, monthLabel || 'Demand Bill');
    const { uri } = await Print.printToFileAsync({ html });
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `demand-bill-${monthLabel || 'slips'}.pdf`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ html });
    }
  } catch (e) {
    Alert.alert('Download failed', e instanceof Error ? e.message : 'Could not create PDF.');
  }
}
