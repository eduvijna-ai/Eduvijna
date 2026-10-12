/**
 * Analytics helpers — KPI tile generation (ported from Quiz-React KPIBanner)
 */
import type { QuizListItem } from '../types/quizAnalytics.types';

export type KPIColor = 'green' | 'amber' | 'red' | 'blue' | 'purple';

export interface KPITileData {
  title: string;
  value: string | number;
  subtitle?: string;
  color: KPIColor;
  icon: string;
}

function parseAttempts(quiz: QuizListItem): any[] {
  let attemptsArray = quiz.attempts;
  if (typeof quiz.attempts === 'string') {
    try {
      attemptsArray = JSON.parse(quiz.attempts);
    } catch {
      attemptsArray = [];
    }
  }
  return Array.isArray(attemptsArray) ? attemptsArray : [];
}

export function generateKPITiles(data: QuizListItem[] | null | undefined): KPITileData[] {
  const items = data ?? [];
  const totalQuizzes = items.length;

  const activeQuizzes = items.filter((q) => {
    if (!q.start_time || !q.due_date) return q.availability_status === 'active';
    const now = new Date();
    return now >= new Date(q.start_time) && now <= new Date(q.due_date);
  }).length;

  const uniqueStudents = new Set<string>();
  let totalCompletedSubmissions = 0;
  let totalScoreSum = 0;
  let totalScoreCount = 0;

  items.forEach((q) => {
    parseAttempts(q).forEach((attempt: any) => {
      uniqueStudents.add(attempt.student_id);
      if (attempt.status === 'completed' && attempt.score !== null && attempt.score !== undefined) {
        totalCompletedSubmissions += 1;
        const score = typeof attempt.score === 'number' ? attempt.score : parseFloat(attempt.score);
        if (!Number.isNaN(score)) {
          totalScoreSum += score;
          totalScoreCount += 1;
        }
      }
    });
  });

  const totalStudents = uniqueStudents.size;
  const submissionRate =
    totalStudents > 0 && totalQuizzes > 0
      ? Math.round((totalCompletedSubmissions / (totalStudents * totalQuizzes)) * 100)
      : 0;
  const avgScore = totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : 0;

  const studentScores = new Map<string, number[]>();
  items.forEach((q) => {
    parseAttempts(q).forEach((attempt: any) => {
      if (attempt.status === 'completed' && attempt.score !== null && attempt.score !== undefined) {
        const score = typeof attempt.score === 'number' ? attempt.score : parseFloat(attempt.score);
        if (Number.isNaN(score)) return;
        const scores = studentScores.get(attempt.student_id) || [];
        scores.push(score);
        studentScores.set(attempt.student_id, scores);
      }
    });
  });

  let atRiskCount = 0;
  studentScores.forEach((scores) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < 40) atRiskCount += 1;
  });

  return [
    { title: 'Active Quizzes', value: activeQuizzes, subtitle: `${totalQuizzes} total`, color: 'blue', icon: 'flash-outline' },
    { title: 'Submission Rate', value: `${submissionRate}%`, color: 'green', icon: 'checkmark-circle-outline' },
    { title: 'Avg Score', value: `${avgScore}%`, color: 'purple', icon: 'trophy-outline' },
    { title: 'At Risk', value: atRiskCount, subtitle: 'avg < 40%', color: atRiskCount > 0 ? 'red' : 'green', icon: 'alert-circle-outline' },
  ];
}

export function generateStudentKPITiles(data: QuizListItem[] | null | undefined): KPITileData[] {
  const items = data ?? [];
  const completed = items.filter((q) => {
    const score = q.best_score ?? q.latest_score ?? q.score;
    return score !== null && score !== undefined;
  });
  const pending = items.filter((q) => q.availability_status === 'active' && !q.best_score && !q.latest_score).length;
  const avgScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, q) => sum + (q.best_score ?? q.latest_score ?? q.score ?? 0), 0) / completed.length,
        )
      : 0;
  const missed = items.filter((q) => q.availability_status === 'expired' && !q.best_score).length;

  return [
    { title: 'Completed', value: completed.length, color: 'green', icon: 'checkmark-done-outline' },
    { title: 'Pending', value: pending, color: 'amber', icon: 'time-outline' },
    { title: 'Avg Score', value: `${avgScore}%`, color: 'purple', icon: 'trophy-outline' },
    { title: 'Missed', value: missed, color: missed > 0 ? 'red' : 'green', icon: 'close-circle-outline' },
  ];
}

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Default teacher analytics window: current academic year (Aug 1 → tomorrow). */
export function getDefaultDateRange() {
  const today = new Date();
  const academicYearStart =
    today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  const from = new Date(academicYearStart, 7, 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return {
    from: toLocalIsoDate(from),
    to: toLocalIsoDate(tomorrow),
  };
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function scoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return '#94a3b8';
  if (score >= 75) return '#059669';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}
