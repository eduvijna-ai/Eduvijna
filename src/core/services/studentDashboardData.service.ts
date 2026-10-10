/**
 * Student Home / Assessments shared quiz list + stats (Quiz-React parity: full assignment set).
 */

import {
  checkRecordToQuiz,
  fetchQuizCheckRecord,
  type CheckRecordQuiz,
} from './dashboardApi';
import type { DashboardStats } from '../types';
import { isStudentQuizActive } from '../../utils/quizFilters';

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

function buildClassroomNameLookup(items: CheckRecordQuiz[]): Map<string, string> {
  const map = new Map<string, string>();
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
  const quizMap = new Map<string, StudentDashboardQuizRow>();
  for (const quiz of rows) {
    const key = `${quiz.quiz_id}_${quiz.session_id}`;
    const existing = quizMap.get(key);
    if (!existing) {
      quizMap.set(key, quiz);
      continue;
    }
    const currentDate = new Date(quiz.created_at).getTime();
    const existingDate = new Date(existing.created_at).getTime();
    const shouldReplace =
      (quiz.status === 'completed' && existing.status !== 'completed') ||
      (quiz.status === existing.status && currentDate > existingDate) ||
      ((quiz.attempt_number as number) > (existing.attempt_number as number));
    if (shouldReplace) {
      quizMap.set(key, quiz);
    }
  }
  return Array.from(quizMap.values());
}

export function computeStudentDashboardStats(
  parsed: StudentDashboardQuizRow[],
): DashboardStats {
  const completed = parsed.filter((q) => q.status === 'completed');
  const pending = parsed.filter(isStudentQuizActive);
  const missed = parsed.filter((q) => q.status === 'missed');

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

  let status = String(base.status || 'pending');
  if (status === 'pending' && base.started_at) {
    status = 'in_progress';
  }

  return {
    ...base,
    quiz_id: Number(base.quiz_id) || 0,
    class_id: String(base.classroom_id || base.class_id || ''),
    classroom_id: String(base.classroom_id || base.class_id || ''),
    classroom_name: String(base.classroom_name || 'Unknown Class'),
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
    student_status: status,
  } as StudentDashboardQuizRow;
}

/**
 * Loads pending + completed assignments (distinct check-record scopes), merges, dedupes.
 */
export async function loadStudentDashboardQuizzes(
  studentId: string,
): Promise<{ quizzes: StudentDashboardQuizRow[]; stats: DashboardStats }> {
  const [pendingRes, completedRes] = await Promise.all([
    fetchQuizCheckRecord(studentId, 'pending'),
    fetchQuizCheckRecord(studentId, 'completed'),
  ]);

  const combined = [...(pendingRes.result || []), ...(completedRes.result || [])];
  const classroomNames = buildClassroomNameLookup(combined);
  const mapped = combined.map((item) => mapCheckRecordRow(item, classroomNames));
  const parsed = dedupeStudentDashboardQuizzes(mapped);
  const stats = computeStudentDashboardStats(parsed);
  return { quizzes: parsed, stats };
}
