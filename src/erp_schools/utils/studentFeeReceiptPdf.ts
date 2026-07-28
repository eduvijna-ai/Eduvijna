/**
 * Student fee receipt PDF — HTML → expo-print → share/save.
 *
 * IMPORTANT: Do NOT call feeCollectionsApi.getById here. That staff endpoint
 * often returns 403 for students, and the mobile axios interceptor treats 403
 * as auth failure → forced logout. Build the PDF from my-receipts row fields
 * (+ optional raw) only — same data the Receipts list already shows.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { pickNumber, pickString } from './apiHelpers';

export type FeeReceiptPdfInput = {
  schoolId?: number | string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  collectionId: number;
  remarks?: string;
  studentName?: string;
  admissionNumber?: string;
  classSection?: string;
  raw?: Record<string, unknown>;
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

function paymentModeLabel(method: string): string {
  const m = (method || '').trim();
  if (!m || m === '—') return '—';
  return m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Simple INR words for receipt footer (enough for school fee amounts). */
function amountInWordsINR(amount: number): string {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`.trim();
  };

  const rupees = Math.floor(Math.abs(amount));
  if (rupees === 0) return 'Zero Rupees Only';

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = Math.floor((rupees % 1000) / 100);
  const rest = rupees % 100;

  const parts: string[] = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ones[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));

  return `${parts.join(' ')} Rupees Only`;
}

export function buildFeeReceiptHtml(input: {
  receiptNumber: string;
  paymentDate: string;
  paymentMode: string;
  amountPaid: number;
  totalAmount: number;
  balanceAmount: number;
  discount?: number;
  lateFee?: number;
  particular: string;
  termLabel?: string;
  feeStructureName?: string;
  invoiceNumber?: string;
  transactionRef?: string;
  remarks?: string;
  studentName: string;
  admissionNumber?: string;
  classSection?: string;
}): string {
  const metaRows: Array<{ label: string; value: string }> = [];
  if (input.termLabel) metaRows.push({ label: 'Fee Term', value: input.termLabel });
  if (input.feeStructureName) metaRows.push({ label: 'Fee Head', value: input.feeStructureName });
  if (input.invoiceNumber) metaRows.push({ label: 'Invoice No.', value: input.invoiceNumber });
  metaRows.push({ label: 'Payment Date', value: input.paymentDate || '—' });
  metaRows.push({ label: 'Payment Mode', value: input.paymentMode });
  if (input.transactionRef) metaRows.push({ label: 'Transaction Ref.', value: input.transactionRef });

  const metaHtml = metaRows
    .map(
      (r) =>
        `<div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0;border-bottom:1px solid #f1f5f9;">
          <span style="color:#64748b;font-size:11px;">${esc(r.label)}</span>
          <span style="color:#0f172a;font-size:11px;font-weight:600;text-align:right;">${esc(r.value)}</span>
        </div>`,
    )
    .join('');

  const discountRow =
    input.discount && input.discount > 0
      ? `<div class="sum"><span>Discount</span><span>${esc(fmtInr(input.discount))}</span></div>`
      : '';
  const lateRow =
    input.lateFee && input.lateFee > 0
      ? `<div class="sum"><span>Late Fee</span><span>${esc(fmtInr(input.lateFee))}</span></div>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fee Receipt ${esc(input.receiptNumber)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; }
    .shell { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .head { background: #1a6272; color: #fff; padding: 16px 18px; }
    .head h1 { margin: 0; font-size: 18px; }
    .head .sub { margin-top: 4px; font-size: 12px; opacity: 0.9; }
    .body { padding: 16px 18px; }
    .student { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
    .student .name { font-weight: 800; font-size: 14px; color: #1a6272; }
    .student .meta { font-size: 11px; color: #64748b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; }
    th { background: #f8fafc; text-align: left; color: #475569; }
    td.num { text-align: right; font-weight: 700; }
    .totals { max-width: 280px; margin-left: auto; margin-top: 12px; }
    .sum { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; color: #475569; }
    .sum.total { font-weight: 800; color: #1a6272; border-top: 1px solid #e2e8f0; margin-top: 4px; padding-top: 8px; }
    .words { margin-top: 14px; font-size: 11px; color: #334155; }
    .remarks { margin-top: 8px; font-size: 11px; color: #64748b; }
    .sigs { display: flex; justify-content: space-between; margin-top: 36px; gap: 24px; }
    .sig { flex: 1; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="shell">
    <div class="head">
      <h1>Payment Receipt</h1>
      <div class="sub">Receipt ${esc(input.receiptNumber)}</div>
    </div>
    <div class="body">
      <div class="student">
        <div class="name">${esc(input.studentName || 'Student')}</div>
        <div class="meta">
          ${input.admissionNumber ? `ADM #${esc(input.admissionNumber)}` : ''}
          ${input.admissionNumber && input.classSection ? ' · ' : ''}
          ${input.classSection ? esc(input.classSection) : ''}
        </div>
      </div>
      ${metaHtml}
      <table>
        <thead><tr><th>Particulars</th><th style="width:120px;text-align:right;">Amount (₹)</th></tr></thead>
        <tbody>
          <tr>
            <td>${esc(input.particular)}</td>
            <td class="num">${esc(fmtInr(input.amountPaid).replace('₹', ''))}</td>
          </tr>
        </tbody>
      </table>
      <div class="totals">
        ${discountRow}
        ${lateRow}
        <div class="sum"><span>Total Amount</span><span>${esc(fmtInr(input.totalAmount))}</span></div>
        <div class="sum total"><span>Amount Paid</span><span>${esc(fmtInr(input.amountPaid))}</span></div>
        <div class="sum"><span>Balance</span><span>${esc(fmtInr(input.balanceAmount))}</span></div>
      </div>
      <div class="words"><strong>Amount in words:</strong> ${esc(amountInWordsINR(input.amountPaid))}</div>
      ${input.remarks ? `<div class="remarks"><strong>Remarks:</strong> ${esc(input.remarks)}</div>` : ''}
      <div class="sigs">
        <div class="sig">Received By</div>
        <div class="sig">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function prepareStudentFeeReceiptHtml(
  input: FeeReceiptPdfInput,
): Promise<{ html: string; fileName: string }> {
  // Prefer fields already on the my-receipts row; enrich from raw if present.
  // Never fetch staff collections — student 403 triggers global logout on mobile.
  const raw = input.raw || {};

  const amountPaid = input.amount || pickNumber(raw.amount, raw.amount_paid);
  const discount = pickNumber(raw.discount);
  const lateFee = pickNumber(raw.fine, raw.late_fee);
  const totalDue = pickNumber(raw.amount_due, amountPaid);
  const balance = Math.max(0, totalDue - amountPaid - discount);

  const termLabel = pickString(raw.term_label);
  const feeStructureName = pickString(raw.fee_structure_name, raw.fee_head);
  const particular =
    [termLabel, feeStructureName].filter(Boolean).join(' — ') || 'Fee Payment';

  const html = buildFeeReceiptHtml({
    receiptNumber: input.receiptNumber,
    paymentDate:
      input.paymentDate ||
      pickString(raw.payment_date).slice(0, 10) ||
      '—',
    paymentMode: paymentModeLabel(
      input.paymentMethod || pickString(raw.payment_method),
    ),
    amountPaid,
    totalAmount: totalDue || amountPaid,
    balanceAmount: balance,
    discount: discount || undefined,
    lateFee: lateFee || undefined,
    particular,
    termLabel: termLabel || undefined,
    feeStructureName: feeStructureName || undefined,
    invoiceNumber: pickString(raw.invoice_number) || undefined,
    transactionRef:
      pickString(raw.transaction_ref, raw.invoice_number) || undefined,
    remarks: input.remarks || pickString(raw.remarks) || undefined,
    studentName: input.studentName || 'Student',
    admissionNumber: input.admissionNumber,
    classSection: input.classSection,
  });

  const safeName = (input.receiptNumber || 'receipt').replace(/[^\w.-]+/g, '_');
  return { html, fileName: `${safeName}.pdf` };
}

/** Share / save PDF (native Files / Drive sheet). Web opens print dialog. */
export async function shareStudentFeeReceiptPdf(
  html: string,
  fileName = 'fee-receipt.pdf',
): Promise<void> {
  try {
    const { uri } = await Print.printToFileAsync({ html });

    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: fileName,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ html });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not create receipt PDF.';
    Alert.alert('Download failed', message);
  }
}

/** Generate PDF and open the native share/save sheet (same pattern as timetable / attendance). */
export async function downloadStudentFeeReceiptPdf(input: FeeReceiptPdfInput): Promise<void> {
  try {
    const { html, fileName } = await prepareStudentFeeReceiptHtml(input);
    await shareStudentFeeReceiptPdf(html, fileName);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not create receipt PDF.';
    Alert.alert('Download failed', message);
  }
}
