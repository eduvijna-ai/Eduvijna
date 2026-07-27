/**
 * Student timetable PDF — web TimetableTab downloadTimetable parity (HTML → expo-print).
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { DAY_FULL, fmtSlotTime, type PeriodRow, type StudentTimetableSlot } from '../hooks/useStudentTimetable';

export type TimetablePdfInput = {
  weekLabel: string;
  periodRows: PeriodRow[];
  slotMap: Map<string, StudentTimetableSlot>;
  totalPeriods: number;
  scheduledDays: number;
  todayClasses: number;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildStudentTimetableHtml(input: TimetablePdfInput): string {
  const days = DAY_FULL.slice(0, 6);
  const rows = input.periodRows.length
    ? input.periodRows
    : [{ period: 1, start: '', end: '' }];

  const headerCells = days
    .map(
      (d) =>
        `<th style="background:#1a3a5c;color:#fff;padding:8px 4px;font-size:10px;text-align:center;">${esc(d.toUpperCase())}</th>`,
    )
    .join('');

  const bodyRows = rows
    .map((row) => {
      const timeCell = `<td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px;font-size:9px;width:72px;vertical-align:top;">
        <div style="font-weight:700;color:#475569;">${esc(fmtSlotTime(row.start))} – ${esc(fmtSlotTime(row.end))}</div>
        <div style="color:#64748b;">Period ${row.period}</div>
      </td>`;
      const dayCells = days
        .map((_, day) => {
          const slot = input.slotMap.get(`${day}-${row.period}`);
          if (!slot) {
            return `<td style="border:1px solid #cbd5e1;padding:8px;text-align:center;color:#94a3b8;font-size:10px;font-weight:700;">FREE</td>`;
          }
          const teacher = slot.teacherName ? esc(slot.teacherName) : '';
          const room = slot.room ? `Room: ${esc(slot.room)}` : '';
          return `<td style="border:1px solid #cbd5e1;padding:6px;vertical-align:top;font-size:9px;">
            <div style="font-weight:800;color:#1e40af;">${esc(slot.subjectName)}</div>
            ${teacher ? `<div style="color:#475569;margin-top:2px;">${teacher}</div>` : ''}
            ${room ? `<div style="color:#64748b;margin-top:2px;">${room}</div>` : ''}
          </td>`;
        })
        .join('');
      return `<tr>${timeCell}${dayCells}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student Timetable</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 8px; }
    h1 { text-align: center; color: #1a3a5c; font-size: 18px; margin: 0 0 4px; }
    .sub { text-align: center; color: #64748b; font-size: 11px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .overview { margin-top: 14px; }
    .overview h2 { color: #1a3a5c; font-size: 13px; margin: 0 0 6px; }
    .overview-row { font-size: 11px; margin: 3px 0; color: #475569; }
    .overview-row strong { color: #1a6272; margin-left: 12px; }
  </style>
</head>
<body>
  <h1>STUDENT TIMETABLE</h1>
  <div class="sub">Weekly Schedule · ${esc(input.weekLabel)}</div>
  <table>
    <thead>
      <tr>
        <th style="background:#1a3a5c;color:#fff;padding:8px 4px;font-size:10px;width:72px;">TIME</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="overview">
    <h2>Weekly Overview</h2>
    <div class="overview-row">Total periods<strong>${input.totalPeriods}</strong></div>
    <div class="overview-row">Scheduled days<strong>${input.scheduledDays}</strong></div>
    <div class="overview-row">Today's classes<strong>${input.todayClasses}</strong></div>
  </div>
</body>
</html>`;
}

/** Generate PDF and open the native share/save sheet (Downloads / Files). */
export async function downloadStudentTimetablePdf(input: TimetablePdfInput): Promise<void> {
  if (input.periodRows.length === 0 && input.slotMap.size === 0) {
    Alert.alert('Timetable', 'No timetable slots are assigned yet.');
    return;
  }

  const html = buildStudentTimetableHtml(input);

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
        dialogTitle: 'Download Timetable',
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ html });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not create timetable PDF.';
    Alert.alert('Download failed', message);
  }
}
