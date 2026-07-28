/**
 * Student exam schedule PDF — web ExamSchedulePanel downloadSchedulePdf parity.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import type { StudentExamRow } from '../hooks/useStudentExams';
import { formatExamDateLabel } from './examMeta';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAmPm(start?: string): string {
  if (!start) return '—';
  const raw = start.slice(0, 5);
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return start;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export async function downloadStudentExamSchedulePdf(input: {
  rows: StudentExamRow[];
  studentName?: string;
  classLabel?: string;
}): Promise<void> {
  if (input.rows.length === 0) {
    Alert.alert('Exam Schedule', 'No exam papers to export.');
    return;
  }

  const meta = [input.studentName, input.classLabel, `${input.rows.length} papers`]
    .filter(Boolean)
    .join(' · ');

  const body = input.rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? 'background:#f8fafc;' : '';
      const duration = r.durationMins ? `${r.durationMins} min` : '—';
      return `<tr style="${bg}">
      <td>${esc(formatExamDateLabel(r.examDate).split(',')[0] || r.examDate)}</td>
      <td>${esc(new Date(`${r.examDate}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }))}</td>
      <td>${esc(timeAmPm(r.startTime))}</td>
      <td style="font-weight:700;">${esc(r.subjectName)}</td>
      <td>${esc(r.examName)}${r.examGroupName ? `<div style="color:#64748b;font-size:9px;">${esc(r.examGroupName)}</div>` : ''}</td>
      <td>${esc(r.className || '—')}</td>
      <td>${esc(r.roomNo || '—')}</td>
      <td>${esc(duration)}</td>
      <td>${r.maxMarks || '—'}</td>
    </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Exam Schedule</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 8px; }
    h1 { text-align: center; color: #1a3a5c; font-size: 18px; margin: 0 0 4px; }
    .sub { text-align: center; color: #64748b; font-size: 11px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #1a3a5c; color: #fff; padding: 8px 6px; text-align: left; }
    td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; }
  </style>
</head>
<body>
  <h1>EXAM SCHEDULE</h1>
  <div class="sub">${esc(meta)} · Generated ${esc(new Date().toLocaleDateString('en-IN'))}</div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Day</th><th>Time</th><th>Subject</th><th>Exam</th>
        <th>Class</th><th>Venue</th><th>Duration</th><th>Max</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return;
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Download Exam Schedule',
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ html });
    }
  } catch (e) {
    Alert.alert(
      'Export failed',
      e instanceof Error ? e.message : 'Could not create exam schedule PDF.',
    );
  }
}

