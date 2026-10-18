/**
 * Web-equivalent student analytics status classification
 * (Quiz-React StudentAnalyticsPage statusSummary / filters).
 *
 * Attempt status: student_status || quiz_status || 'pending'
 * Availability is a separate column (active / expired / upcoming / …).
 * Never infer completion from score alone — score may be null on completed rows
 * and a numeric score must not override an explicit pending/in_progress status.
 */

import type { QuizListItem } from '../types/quizAnalytics.types';

export type StudentAnalyticsAttemptStatus =
  | 'completed'
  | 'pending'
  | 'in_progress'
  | 'missed';

export type StudentAnalyticsAvailability =
  | 'active'
  | 'expired'
  | 'upcoming'
  | 'not_started'
  | 'available_soon'
  | 'unknown';

function readExplicitAttemptStatus(quiz: QuizListItem): string {
  const raw =
    (quiz as { student_status?: string | null }).student_status ??
    (quiz as { quiz_status?: string | null }).quiz_status ??
    null;
  return String(raw ?? '')
    .trim()
    .toLowerCase();
}

/** Attempt/result status for KPIs, chips, and filtered rows (web Status column). */
export function classifyStudentAnalyticsAttemptStatus(
  quiz: QuizListItem,
): StudentAnalyticsAttemptStatus {
  const status = readExplicitAttemptStatus(quiz);
  if (status === 'completed') return 'completed';
  if (status === 'missed') return 'missed';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'pending') return 'pending';
  // No explicit status: do not invent completion from score.
  return 'pending';
}

/** Availability column — independent of attempt status (web Availability). */
export function classifyStudentAnalyticsAvailability(
  quiz: QuizListItem,
): StudentAnalyticsAvailability {
  const avail = String(quiz.availability_status || '')
    .trim()
    .toLowerCase();
  if (avail === 'active') return 'active';
  if (avail === 'expired') return 'expired';
  if (avail === 'upcoming') return 'upcoming';
  if (avail === 'not_started') return 'not_started';
  if (avail === 'available_soon') return 'available_soon';
  if (quiz.end_time && new Date(quiz.end_time) < new Date()) return 'expired';
  return 'unknown';
}

export function isStudentAnalyticsCompleted(quiz: QuizListItem): boolean {
  return classifyStudentAnalyticsAttemptStatus(quiz) === 'completed';
}

export function isStudentAnalyticsMissed(quiz: QuizListItem): boolean {
  return classifyStudentAnalyticsAttemptStatus(quiz) === 'missed';
}

export function isStudentAnalyticsPendingLike(quiz: QuizListItem): boolean {
  const s = classifyStudentAnalyticsAttemptStatus(quiz);
  return s === 'pending' || s === 'in_progress';
}

/** Chip/filter key used by mobile status chips (active = availability). */
export function studentAnalyticsMatchesStatusFilter(
  quiz: QuizListItem,
  filter: string | null | undefined,
): boolean {
  if (!filter || filter === 'total') return true;
  if (filter === 'active') {
    return classifyStudentAnalyticsAvailability(quiz) === 'active';
  }
  if (filter === 'expired') {
    return classifyStudentAnalyticsAvailability(quiz) === 'expired';
  }
  if (filter === 'not_started') {
    const a = classifyStudentAnalyticsAvailability(quiz);
    return a === 'upcoming' || a === 'not_started' || a === 'available_soon';
  }
  if (filter === 'completed') return isStudentAnalyticsCompleted(quiz);
  if (filter === 'missed') return isStudentAnalyticsMissed(quiz);
  if (filter === 'pending') return isStudentAnalyticsPendingLike(quiz);
  if (filter === 'in_progress') {
    return classifyStudentAnalyticsAttemptStatus(quiz) === 'in_progress';
  }
  return classifyStudentAnalyticsAttemptStatus(quiz) === filter;
}

export function scoreForStudentAnalyticsDisplay(quiz: QuizListItem): number | null {
  const score = quiz.best_score ?? quiz.latest_score ?? quiz.score;
  if (score == null) return null;
  const n = typeof score === 'number' ? score : Number(score);
  return Number.isFinite(n) ? n : null;
}
