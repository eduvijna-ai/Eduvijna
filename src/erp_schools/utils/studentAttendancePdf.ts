/**
 * Student attendance PDF — web StudentAttendancePanel exportPdf parity
 * (HTML → expo-print → share/save), same pattern as studentTimetablePdf.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import type { SubjectAttRow } from '../hooks/useStudentAttendance';

export type AttendancePdfInput = {
  dateFrom: string;
  dateTo: string;
  overallPct: number;
  rows: SubjectAttRow[];
  /** Optional subject-wise totals footer (web Overall row). */
  overall?: {
    total: number;
    attended: number;
    absent: number;
    late: number;
    pct: number;
  };
  studentName?: string;
  classLabel?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildStudentAttendanceHtml(input: AttendancePdfInput): string {
  const metaBits = [
    input.studentName,
    input.classLabel,
    `${input.dateFrom} to ${input.dateTo}`,
    `Overall ${input.overallPct}%`,
  ].filter(Boolean);

  const body = input.rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? 'background:#f8fafc;' : '';
      return `<tr style="${bg}">
      <td>${i + 1}</td>
      <td>${esc(r.code)}</td>
      <td style="font-weight:700;">${esc(r.name)}</td>
      <td>${r.total}</td>
      <td>${r.attended}</td>
      <td>${r.absent}</td>
      <td>${r.late}</td>
      <td>${r.pct}%</td>
      <td>${esc(r.statusLabel)}</td>
    </tr>`;
    })
    .join('');

  const overall = input.overall;
  const footer = overall
    ? `<tr style="background:#ecfeff;font-weight:800;">
        <td></td>
        <td></td>
        <td>Overall</td>
        <td>${overall.total}</td>
        <td>${overall.attended}</td>
        <td>${overall.absent}</td>
        <td>${overall.late}</td>
        <td>${overall.pct}%</td>
        <td></td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student Attendance Report</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 8px; }
    h1 { text-align: center; color: #0e7490; font-size: 18px; margin: 0 0 4px; }
    .sub { text-align: center; color: #64748b; font-size: 11px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #0e7490; color: #fff; padding: 8px 6px; text-align: left; }
    td { border: 1px solid #cbd5e1; padding: 6px; }
  </style>
</head>
<body>
  <h1>STUDENT ATTENDANCE REPORT</h1>
  <div class="sub">${esc(metaBits.join(' · '))}</div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Code</th><th>Subject</th><th>Total</th><th>Attended</th>
        <th>Absent</th><th>Late</th><th>%</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${body}${footer}</tbody>
  </table>
</body>
</html>`;
}

/** Generate PDF and open the native share/save sheet (Downloads / Files). */
export async function downloadStudentAttendancePdf(
  input: AttendancePdfInput,
): Promise<void> {
  if (input.rows.length === 0) {
    Alert.alert('Attendance', 'No subject attendance rows to export.');
    return;
  }

  const html = buildStudentAttendanceHtml(input);

  try {
    const { uri } = await Print.printToFileAsync({ html });

    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Download Attendance Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ html });
    }
  } catch (e) {
    Alert.alert(
      'Export failed',
      e instanceof Error ? e.message : 'Could not create attendance PDF.',
    );
  }
}
