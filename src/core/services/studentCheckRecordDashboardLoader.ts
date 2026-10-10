/**
 * PR #18: pending + completed check-record loads (no Phase 2 classification helpers).
 */

import { checkRecordToQuiz, fetchQuizCheckRecord, type CheckRecordQuiz } from './dashboardApi';
import type { DashboardStats, ParsedQuiz } from '../types';

export function dedupeCheckRecordQuizzes<T extends { quiz_id: number; session_id: string; status: string; created_at: string; attempt_number?: number | null }>(
  rows: T[],
): T[] {
  const quizMap = new Map<string, T>();
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
      (quiz.attempt_number &&
        existing.attempt_number &&
        quiz.attempt_number > existing.attempt_number);
    if (shouldReplace) {
      quizMap.set(key, quiz);
    }
  }
  return Array.from(quizMap.values());
}

function mapCheckRecordToParsedQuiz(quiz: ReturnType<typeof checkRecordToQuiz>): ParsedQuiz {
  const now = new Date();
  const dueDate = quiz.due_date ? new Date(quiz.due_date) : null;
  const isOverdue = dueDate ? now > dueDate : false;
  const daysUntilDue = dueDate
    ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  return {
    quiz_id: Number(quiz.quiz_id) || 0,
    class_id: String(quiz.classroom_id || quiz.class_id || ''),
    classroom_name: String(quiz.classroom_name || 'Unknown Class'),
    quiz_name: String(quiz.quiz_name || 'Untitled Quiz'),
    status: (quiz.student_status || quiz.status || 'pending') as 'pending' | 'completed' | 'missed',
    score: typeof quiz.score === 'number' ? quiz.score : null,
    correct_answers:
      typeof quiz.score === 'number'
        ? Math.round((quiz.score / 100) * (quiz.question_count || 0))
        : 0,
    end_time: String(quiz.end_time || quiz.due_date || new Date().toISOString()),
    created_at: String(quiz.created_at || quiz.assigned_at || new Date().toISOString()),
    completed_at: quiz.completed_at ? String(quiz.completed_at) : null,
    started_at: quiz.started_at ? String(quiz.started_at) : null,
    time_spent_seconds: typeof quiz.time_spent_seconds === 'number' ? quiz.time_spent_seconds : null,
    attempt_number: typeof quiz.attempt_number === 'number' ? quiz.attempt_number : null,
    question_count: Number(quiz.question_count) || 0,
    is_overdue: isOverdue,
    days_until_due: daysUntilDue,
    session_id: String(quiz.session_id || ''),
    attempt_id: quiz.attempt_id ? String(quiz.attempt_id) : null,
    log_data: quiz.log_data,
    availability_status: quiz.availability_status || 'active',
    duration: typeof quiz.duration === 'number' ? quiz.duration : null,
    start_time: quiz.start_time || quiz.assigned_at,
    topic: String(quiz.topic || ''),
    subject: String(quiz.subject || ''),
    due_date: quiz.due_date || quiz.end_time,
    assigned_at: quiz.assigned_at || quiz.created_at,
    has_time_limit: Boolean(quiz.has_time_limit),
    attempts_allowed: typeof quiz.attempts_allowed === 'number' ? quiz.attempts_allowed : null,
  } as ParsedQuiz;
}

export function computeCheckRecordDashboardStats(parsed: ParsedQuiz[]): DashboardStats {
  const completed = parsed.filter((q) => q.status === 'completed');
  const pending = parsed.filter((q) => q.status === 'pending' || q.status === 'in_progress');
  const missed = parsed.filter((q) => q.status === 'missed');
  const scores = completed
    .filter((q) => q.score !== null && q.score !== undefined)
    .map((q) => q.score!);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const totalTime = completed.reduce((sum, q) => sum + (q.time_spent_seconds || 0), 0);
  const uniqueClasses = new Set(parsed.map((q) => q.class_id).filter((id) => id && id !== ''));

  return {
    total_quizzes: parsed.length,
    completed_count: completed.length,
    pending_count: pending.length,
    missed_count: missed.length,
    average_score: Math.round(avgScore),
    total_time_spent: totalTime,
    total_questions_attempted: parsed.reduce((sum, q) => sum + (q.question_count || 0), 0),
    total_classes: uniqueClasses.size,
  };
}

export async function loadStudentCheckRecordDashboard(studentId: string): Promise<{
  quizzes: ParsedQuiz[];
  stats: DashboardStats;
}> {
  const [pendingRes, completedRes] = await Promise.all([
    fetchQuizCheckRecord(studentId, 'pending'),
    fetchQuizCheckRecord(studentId, 'completed'),
  ]);
  const combined: CheckRecordQuiz[] = [
    ...(pendingRes.result || []),
    ...(completedRes.result || []),
  ];
  const mapped = combined.map((row) => mapCheckRecordToParsedQuiz(checkRecordToQuiz(row)));
  const parsed = dedupeCheckRecordQuizzes(mapped);
  return { quizzes: parsed, stats: computeCheckRecordDashboardStats(parsed) };
}
