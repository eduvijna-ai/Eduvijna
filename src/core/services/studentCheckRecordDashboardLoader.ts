/**
 * PR #18: pending + completed check-record loads (no Phase 2 classification helpers).
 */

import { checkRecordToQuiz, fetchQuizCheckRecord, type CheckRecordQuiz } from './dashboardApi';
import type { DashboardStats, ParsedQuiz } from '../types';
import {
  checkRecordAssignmentKey,
  checkRecordRowEffectiveStatus,
  checkRecordRowSortTime,
  type CheckRecordAssignableRow,
} from './checkRecordAssignmentIdentity';
import { fetchPersistedQuizResult } from './quizResultRetrieval.service';
import {
  countCorrectAnswersFromPersistedResult,
  mapWithConcurrency,
} from './completedQuizMetrics';

const HYDRATE_CONCURRENCY = 4;

export function dedupeCheckRecordQuizzes<T extends CheckRecordAssignableRow>(rows: T[]): T[] {
  const quizMap = new Map<string, T>();
  for (const quiz of rows) {
    const key = checkRecordAssignmentKey(quiz);
    const existing = quizMap.get(key);
    if (!existing) {
      quizMap.set(key, quiz);
      continue;
    }
    const status = checkRecordRowEffectiveStatus(quiz);
    const existingStatus = checkRecordRowEffectiveStatus(existing);
    const currentDate = checkRecordRowSortTime(quiz);
    const existingDate = checkRecordRowSortTime(existing);
    const shouldReplace =
      (status === 'completed' && existingStatus !== 'completed') ||
      (status === existingStatus && currentDate > existingDate) ||
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

  const status = (quiz.student_status || quiz.status || 'pending') as
    | 'pending'
    | 'completed'
    | 'missed'
    | 'in_progress';

  return {
    quiz_id: Number(quiz.quiz_id) || 0,
    class_id: String(quiz.classroom_id || quiz.class_id || ''),
    classroom_name: String(quiz.classroom_name || 'Unknown Class'),
    quiz_name: String(quiz.quiz_name || 'Untitled Quiz'),
    status,
    score: typeof quiz.score === 'number' ? quiz.score : null,
    correct_answers: typeof quiz.correct_answers === 'number' ? quiz.correct_answers : undefined,
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

function completedMetricsSatisfied(quiz: ParsedQuiz): boolean {
  if (quiz.status !== 'completed') return true;
  return typeof quiz.correct_answers === 'number';
}

export async function hydrateCompletedParsedQuizMetrics(
  studentId: string,
  quizzes: ParsedQuiz[],
): Promise<ParsedQuiz[]> {
  return mapWithConcurrency(quizzes, HYDRATE_CONCURRENCY, async (quiz) => {
    if (quiz.status !== 'completed' || completedMetricsSatisfied(quiz)) {
      return quiz;
    }
    const result = await fetchPersistedQuizResult({
      quizId: quiz.quiz_id,
      sessionId: quiz.session_id,
      studentId,
      isTeacherView: false,
    });
    if (result.status !== 'ready') {
      return quiz;
    }
    const correctCount =
      typeof quiz.correct_answers === 'number'
        ? quiz.correct_answers
        : countCorrectAnswersFromPersistedResult(result);
    return {
      ...quiz,
      score: result.score ?? quiz.score,
      time_spent_seconds: result.timeSpentSeconds ?? quiz.time_spent_seconds ?? null,
      completed_at: result.completedAt ?? quiz.completed_at,
      log_data: result.logData ?? quiz.log_data,
      correct_answers: correctCount,
    };
  });
}

export function computeCheckRecordDashboardStats(parsed: ParsedQuiz[]): DashboardStats {
  const completed = parsed.filter((q) => q.status === 'completed');
  const pending = parsed.filter((q) => q.status === 'pending' || q.status === 'in_progress');
  const missed = parsed.filter((q) => q.status === 'missed');
  const scores = completed
    .filter((q) => q.score !== null && q.score !== undefined)
    .map((q) => q.score!);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const totalTime = completed.reduce(
    (sum, q) => sum + (typeof q.time_spent_seconds === 'number' ? q.time_spent_seconds : 0),
    0,
  );
  const uniqueClasses = new Set(parsed.map((q) => q.class_id).filter((id) => id && id !== ''));

  return {
    total_quizzes: parsed.length,
    completed_count: completed.length,
    pending_count: pending.length,
    missed_count: missed.length,
    average_score: scores.length > 0 ? Math.round(avgScore) : 0,
    total_time_spent: totalTime,
    total_questions_attempted: parsed.reduce((sum, q) => sum + (q.question_count || 0), 0),
    total_classes: uniqueClasses.size,
  };
}

/** Pending + completed scopes merged and deduped (shared by Phase 1 home and Phase 2 parity loader). */
export async function fetchStudentCheckRecordRows(studentId: string): Promise<CheckRecordQuiz[]> {
  const [pendingRes, completedRes] = await Promise.all([
    fetchQuizCheckRecord(studentId, 'pending'),
    fetchQuizCheckRecord(studentId, 'completed'),
  ]);
  const combined: CheckRecordQuiz[] = [
    ...(pendingRes.result || []),
    ...(completedRes.result || []),
  ];
  return dedupeCheckRecordQuizzes(combined);
}

export async function loadStudentCheckRecordDashboard(studentId: string): Promise<{
  quizzes: ParsedQuiz[];
  stats: DashboardStats;
}> {
  const rows = await fetchStudentCheckRecordRows(studentId);
  const mapped = rows.map((row) => mapCheckRecordToParsedQuiz(checkRecordToQuiz(row)));
  const hydrated = await hydrateCompletedParsedQuizMetrics(studentId, mapped);
  return { quizzes: hydrated, stats: computeCheckRecordDashboardStats(hydrated) };
}
