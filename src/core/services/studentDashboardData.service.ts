/**
 * Student Home / Assessments shared quiz list + stats (Quiz-React parity: full assignment set).
 */

import {
  checkRecordToQuiz,
  fetchStudentClassroomNameLookup,
  type CheckRecordQuiz,
} from './dashboardApi';
import {
  dedupeCheckRecordQuizzes,
  fetchStudentCheckRecordRows,
} from './studentCheckRecordDashboardLoader';
import { resolveClassroomDisplayName } from '../../utils/classroomDisplayName';
import type { DashboardStats } from '../types';
import {
  isStudentAssignmentCompleted,
  isStudentAssignmentMissed,
  isStudentAssignmentOngoing,
} from '../../utils/studentAssignmentClassification';

export type StudentDashboardQuizRow = Record<string, unknown> & {
  quiz_id: number;
  session_id: string;
  class_id: string;
  classroom_id: string;
  classroom_name: string;
  quiz_name: string;
  status: string;
  score: number | null;
  completed_at: string | null;
  created_at: string;
};

function mergeClassroomNameLookups(
  authorized: Map<string, string>,
  items: CheckRecordQuiz[],
): Map<string, string> {
  const map = new Map(authorized);
  for (const item of items) {
    const id = item.classid;
    const d = item.quiz_details;
    const name =
      (d as { classroom_name?: string }).classroom_name ||
      (item as { classroom_name?: string }).classroom_name;
    if (id && name && name !== id) {
      map.set(id, name);
    }
  }
  return map;
}

export function dedupeStudentDashboardQuizzes(
  rows: StudentDashboardQuizRow[],
): StudentDashboardQuizRow[] {
  return dedupeCheckRecordQuizzes(rows) as StudentDashboardQuizRow[];
}

export function computeStudentDashboardStats(
  parsed: StudentDashboardQuizRow[],
): DashboardStats {
  const completed = parsed.filter((q) => isStudentAssignmentCompleted(q));
  const pending = parsed.filter((q) => isStudentAssignmentOngoing(q));
  const missed = parsed.filter((q) => isStudentAssignmentMissed(q));

  const scores = completed
    .filter((q) => q.score !== null && q.score !== undefined)
    .map((q) => q.score as number);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const totalTime = completed.reduce(
    (sum, q) => sum + ((q.time_spent_seconds as number) || 0),
    0,
  );
  const uniqueClasses = new Set(parsed.map((q) => q.class_id).filter((id) => id && id !== ''));

  return {
    total_quizzes: parsed.length,
    completed_count: completed.length,
    pending_count: pending.length,
    missed_count: missed.length,
    average_score: Math.round(avgScore),
    total_time_spent: totalTime,
    total_questions_attempted: parsed.reduce(
      (sum, q) => sum + (Number(q.question_count) || 0),
      0,
    ),
    total_classes: uniqueClasses.size,
  };
}

function mapCheckRecordRow(
  item: CheckRecordQuiz,
  classroomNames: Map<string, string>,
): StudentDashboardQuizRow {
  const base = checkRecordToQuiz(item, { classroomNameLookup: classroomNames });
  const now = new Date();
  const dueDate = base.due_date ? new Date(base.due_date) : null;
  const isOverdue = dueDate ? now > dueDate : false;
  const daysUntilDue = dueDate
    ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  const status = String(base.status || 'pending');
  const studentStatus = String(base.student_status || status);

  return {
    ...base,
    quiz_id: Number(base.quiz_id) || 0,
    class_id: String(base.classroom_id || base.class_id || ''),
    classroom_id: String(base.classroom_id || base.class_id || ''),
    classroom_name: resolveClassroomDisplayName(String(base.classroom_id || base.class_id || ''), {
      recordName: base.classroom_name,
      lookup: classroomNames,
    }),
    quiz_name: String(base.quiz_name || 'Untitled Quiz'),
    status,
    score: typeof base.score === 'number' ? base.score : null,
    completed_at: base.completed_at ? String(base.completed_at) : null,
    started_at: base.started_at ? String(base.started_at) : null,
    created_at: String(base.created_at || base.assigned_at || new Date().toISOString()),
    question_count: Number(base.question_count) || 0,
    is_overdue: isOverdue,
    days_until_due: daysUntilDue,
    session_id: String(base.session_id || ''),
    student_status: studentStatus,
  } as StudentDashboardQuizRow;
}

/**
 * Loads pending + completed assignments (distinct check-record scopes), merges, dedupes.
 */
export async function loadStudentDashboardQuizzes(
  studentId: string,
): Promise<{ quizzes: StudentDashboardQuizRow[]; stats: DashboardStats }> {
  const [combined, classroomLookup] = await Promise.all([
    fetchStudentCheckRecordRows(studentId),
    fetchStudentClassroomNameLookup().catch(() => new Map<string, string>()),
  ]);
  const classroomNames = mergeClassroomNameLookups(classroomLookup, combined);
  const mapped = combined.map((item) => mapCheckRecordRow(item, classroomNames));
  const parsed = dedupeStudentDashboardQuizzes(mapped);
  const stats = computeStudentDashboardStats(parsed);
  return { quizzes: parsed, stats };
}
