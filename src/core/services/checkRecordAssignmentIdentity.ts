/**
 * Stable assignment identity for check-record rows (nested quiz_details + class scope).
 */

import type { CheckRecordQuiz } from './dashboardApi';

export type CheckRecordAssignableRow = {
  status?: string | null;
  classid?: string;
  class_id?: string;
  quiz_id?: number;
  session_id?: string;
  created_at?: string;
  attempt_number?: number | null;
  quiz_details?: CheckRecordQuiz['quiz_details'];
};

export function checkRecordAssignmentKey(row: CheckRecordAssignableRow): string {
  const d = row.quiz_details;
  const quizId = d?.quiz_id ?? row.quiz_id ?? 0;
  const sessionId = d?.session_id ?? row.session_id ?? '';
  const classId = row.classid ?? row.class_id ?? '';
  return `${quizId}::${sessionId}::${classId}`;
}

export function checkRecordRowEffectiveStatus(row: CheckRecordAssignableRow): string {
  if (row.status === 'completed') return 'completed';
  if (row.status === null || row.status === undefined) return 'pending';
  const nested = row.quiz_details?.status;
  if (nested === 'completed') return 'completed';
  return String(row.status ?? nested ?? 'pending');
}

export function checkRecordRowSortTime(row: CheckRecordAssignableRow): number {
  const d = row.quiz_details;
  const raw =
    row.created_at ??
    d?.created_at ??
    d?.start_time ??
    '';
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}
