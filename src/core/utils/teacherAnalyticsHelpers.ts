/**
 * Teacher analytics helpers — ported from Quiz-React AnalyticsPage class drill-down logic.
 */
import type { QuizListItem, QuizTile } from '../types/quizAnalytics.types';
import type { KPITileData } from './analyticsUiUtils';

export interface ClassStats {
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  missedCount: number;
  notStartedCount: number;
  expiredCount: number;
}

export interface ClassInsight {
  text: string;
  type: 'success' | 'warning' | 'info' | 'danger';
}

export interface QuizSummaryRow {
  quiz_id: number;
  quiz_name: string;
  topic: string | null;
  total_students: number;
  completed: number;
  pending: number;
  not_completed: number;
  highest_score: number | null;
  avg_score: number;
  lowest_score: number | null;
  at_risk: number;
  dist_80_100: number;
  dist_60_80: number;
  dist_40_60: number;
  dist_0_40: number;
  questions: number;
  duration: number;
  completion_rate: number;
}

function parseAttempts(quiz: QuizListItem): any[] {
  let attemptsArray = quiz.attempts;
  if (typeof quiz.attempts === 'string') {
    try {
      attemptsArray = JSON.parse(quiz.attempts);
    } catch {
      return [];
    }
  }
  return Array.isArray(attemptsArray) ? attemptsArray : [];
}

export function computeClassStats(classQuizzes: QuizListItem[]): ClassStats {
  let totalCount = 0;
  let completedCount = 0;
  let pendingCount = 0;
  let missedCount = 0;
  let notStartedCount = 0;
  let expiredCount = 0;

  classQuizzes.forEach((quiz) => {
    const completed = quiz.completed_count || 0;
    const total = quiz.total_students || 0;

    totalCount += total;
    completedCount += completed;

    if (quiz.availability_status === 'expired') {
      expiredCount += total - completed;
      missedCount += quiz.pending_count || 0;
    }

    if (quiz.availability_status === 'active') {
      pendingCount += quiz.pending_count || 0;
      notStartedCount += quiz.pending_count || 0;
    }
  });

  return { totalCount, completedCount, pendingCount, missedCount, notStartedCount, expiredCount, inProgressCount: 0 } as ClassStats & { inProgressCount: number };
}

export function computeClassKPITiles(classQuizzes: QuizListItem[]): KPITileData[] {
  const now = new Date();
  let activeCount = 0;
  let totalSubmissions = 0;
  let totalExpected = 0;
  let totalScore = 0;
  let scoreCount = 0;
  let atRiskCount = 0;

  classQuizzes.forEach((quiz) => {
    const attempts = parseAttempts(quiz);
    const completedAttempts = attempts.filter((a) => a.status === 'completed');
    const totalStudents = quiz.total_students || 0;
    const startTime = quiz.start_time ? new Date(quiz.start_time) : null;
    const endTime = quiz.end_time ? new Date(quiz.end_time) : null;

    if (completedAttempts.length === totalStudents && totalStudents > 0) {
      // completed quiz
    } else if (completedAttempts.length > 0 && endTime && now < endTime) {
      // in progress
    } else if (endTime && now > endTime && completedAttempts.length !== totalStudents) {
      // missed
    } else if (startTime && now < startTime) {
      // available soon
    } else if (endTime && now > endTime) {
      // expired
    } else {
      activeCount += 1;
    }

    totalSubmissions += completedAttempts.length;
    totalExpected += totalStudents;

    completedAttempts.forEach((attempt) => {
      if (attempt.score != null) {
        const score = typeof attempt.score === 'number' ? attempt.score : parseFloat(attempt.score);
        if (!Number.isNaN(score)) {
          totalScore += score;
          scoreCount += 1;
          if (score < 40) atRiskCount += 1;
        }
      }
    });
  });

  const submissionRate = totalExpected > 0 ? (totalSubmissions / totalExpected) * 100 : 0;
  const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;

  return [
    {
      title: 'Active Quizzes',
      subtitle: `${classQuizzes.length} total`,
      value: String(activeCount),
      color: activeCount > 0 ? 'blue' : 'purple',
      icon: 'pulse-outline',
    },
    {
      title: 'Submission Rate',
      subtitle: `${totalSubmissions} submissions`,
      value: `${submissionRate.toFixed(0)}%`,
      color: submissionRate >= 80 ? 'green' : submissionRate >= 50 ? 'amber' : 'red',
      icon: 'checkmark-circle-outline',
    },
    {
      title: 'Avg Class Score',
      subtitle: `${scoreCount} attempts`,
      value: scoreCount > 0 ? `${avgScore.toFixed(0)}%` : '—',
      color: avgScore >= 80 ? 'green' : avgScore >= 60 ? 'amber' : 'red',
      icon: 'ribbon-outline',
    },
    {
      title: 'At-Risk Students',
      subtitle: 'Need attention',
      value: String(atRiskCount),
      color: atRiskCount > 0 ? 'red' : 'green',
      icon: 'warning-outline',
    },
  ];
}

export function computeClassInsights(classQuizzes: QuizListItem[], classStats: ClassStats): ClassInsight[] {
  const insights: ClassInsight[] = [];
  let totalScore = 0;
  let scoreCount = 0;

  classQuizzes.forEach((quiz) => {
    parseAttempts(quiz)
      .filter((a) => a.status === 'completed')
      .forEach((a) => {
        if (a.score != null) {
          totalScore += a.score;
          scoreCount += 1;
        }
      });
  });

  if (scoreCount > 0) {
    const avgScore = totalScore / scoreCount;
    if (avgScore >= 80) {
      insights.push({ text: `Excellent class performance! Average score is ${avgScore.toFixed(1)}%.`, type: 'success' });
    } else if (avgScore >= 60) {
      insights.push({ text: `Class average score is ${avgScore.toFixed(1)}%. Room for improvement.`, type: 'info' });
    } else {
      insights.push({ text: `Class average is ${avgScore.toFixed(1)}%. Students may need additional support.`, type: 'warning' });
    }
  }

  const completionRate =
    classStats.totalCount > 0 ? (classStats.completedCount / classStats.totalCount) * 100 : 0;
  if (completionRate < 50) {
    insights.push({
      text: `Only ${completionRate.toFixed(0)}% completion rate. Consider extending deadlines or sending reminders.`,
      type: 'warning',
    });
  } else if (completionRate >= 80) {
    insights.push({ text: `Great engagement! ${completionRate.toFixed(0)}% completion rate.`, type: 'success' });
  }

  if (classStats.missedCount > 0) {
    insights.push({
      text: `${classStats.missedCount} student${classStats.missedCount > 1 ? 's' : ''} missed quizzes in this class.`,
      type: 'danger',
    });
  }

  if (classStats.pendingCount > 0) {
    insights.push({
      text: `${classStats.pendingCount} pending attempt${classStats.pendingCount > 1 ? 's' : ''} waiting to be completed.`,
      type: 'info',
    });
  }

  return insights;
}

function getQuizStudentScores(quiz: QuizListItem) {
  const studentScores = new Map<string, { username: string; scores: number[] }>();
  parseAttempts(quiz).forEach((attempt) => {
    if (attempt.status !== 'completed' || attempt.score === null || attempt.score === undefined) return;
    const score = typeof attempt.score === 'number' ? attempt.score : parseFloat(attempt.score);
    if (Number.isNaN(score)) return;
    const username = attempt.student_username || attempt.student_fullname || 'Unknown';
    const entry = studentScores.get(attempt.student_id) || { username, scores: [] };
    entry.scores.push(score);
    studentScores.set(attempt.student_id, entry);
  });
  return studentScores;
}

function getQuizPerformanceCategories(quiz: QuizListItem) {
  const studentScores = getQuizStudentScores(quiz);
  let highCount = 0;
  let midHighCount = 0;
  let midLowCount = 0;
  let lowCount = 0;

  studentScores.forEach((student) => {
    const avgScore = student.scores.reduce((s, v) => s + v, 0) / student.scores.length;
    if (avgScore >= 80) highCount += 1;
    else if (avgScore >= 60) midHighCount += 1;
    else if (avgScore > 40) midLowCount += 1;
    else lowCount += 1;
  });

  return [
    { label: '80% - 100%', count: highCount },
    { label: '60% - 80%', count: midHighCount },
    { label: '40% - 60%', count: midLowCount },
    { label: '0% - 40%', count: lowCount },
  ];
}

export function buildQuizSummaryRows(
  quizTiles: QuizTile[],
  classQuizzes: QuizListItem[],
): QuizSummaryRow[] {
  return quizTiles.map((tile) => {
    const originalQuiz = classQuizzes.find((q) => q.quiz_id === tile.quiz_id);
    const categories = originalQuiz ? getQuizPerformanceCategories(originalQuiz) : [];
    const getDist = (label: string) => categories.find((c) => c.label === label)?.count ?? 0;

    return {
      quiz_id: tile.quiz_id,
      quiz_name: tile.quiz_name,
      topic: tile.topic,
      total_students: tile.total_students,
      completed: tile.completed_count,
      pending: tile.pending_count + (tile.in_progress_count || 0),
      not_completed: tile.missed_count,
      highest_score: tile.highest_score,
      avg_score: tile.avg_score,
      lowest_score: tile.lowest_score,
      at_risk: tile.at_risk_count,
      dist_80_100: getDist('80% - 100%'),
      dist_60_80: getDist('60% - 80%'),
      dist_40_60: getDist('40% - 60%'),
      dist_0_40: getDist('0% - 40%'),
      questions: originalQuiz?.question_count || originalQuiz?.total_questions || 0,
      duration: originalQuiz?.duration || 0,
      completion_rate: tile.completion_rate,
    };
  });
}

export function formatScoreValue(score: number | null): string {
  return score !== null ? `${score.toFixed(1)}%` : '—';
}

export interface QuizPerformanceSummary {
  totalStudents: number;
  topPerformers: Array<{ username: string; avgScore: number }>;
  bottomPerformers: Array<{ username: string; avgScore: number }>;
  improvingCount: number;
  consistentCount: number;
  categories: Array<{ label: string; count: number; percent: number }>;
}

export function getQuizPerformanceSummary(quiz: QuizListItem): QuizPerformanceSummary {
  const studentScores = getQuizStudentScores(quiz);
  const studentAverages = Array.from(studentScores.values()).map((student) => ({
    username: student.username,
    avgScore: student.scores.reduce((s, v) => s + v, 0) / student.scores.length,
    scores: student.scores,
  }));

  const totalStudents = studentAverages.length;
  const topPerformers = studentAverages
    .filter((s) => s.avgScore >= 80)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 3)
    .map((s) => ({ username: s.username, avgScore: s.avgScore }));

  const bottomPerformers = studentAverages
    .filter((s) => s.avgScore <= 40)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 3)
    .map((s) => ({ username: s.username, avgScore: s.avgScore }));

  let improvingCount = 0;
  let consistentCount = 0;
  let highCount = 0;
  let midHighCount = 0;
  let midLowCount = 0;
  let lowCount = 0;

  studentAverages.forEach((student) => {
    if (student.avgScore >= 80) highCount += 1;
    else if (student.avgScore >= 60) midHighCount += 1;
    else if (student.avgScore > 40) midLowCount += 1;
    else lowCount += 1;

    if (student.scores.length >= 3) {
      const recent = student.scores.slice(-3);
      const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
      if (recentAvg > student.avgScore + 5) improvingCount += 1;
      const variance =
        student.scores.reduce((sum, score) => sum + (score - student.avgScore) ** 2, 0) /
        student.scores.length;
      if (variance < 100) consistentCount += 1;
    }
  });

  const categories = [
    { label: '80% - 100%', count: highCount },
    { label: '60% - 80%', count: midHighCount },
    { label: '40% - 60%', count: midLowCount },
    { label: '0% - 40%', count: lowCount },
  ].map((c) => ({
    ...c,
    percent: totalStudents > 0 ? (c.count / totalStudents) * 100 : 0,
  }));

  return {
    totalStudents,
    topPerformers,
    bottomPerformers,
    improvingCount,
    consistentCount,
    categories,
  };
}

export interface QuizAttemptStats {
  total: number;
  completed: number;
  pending: number;
  missed: number;
  not_started: number;
  expired: number;
}

export function computeQuizAttemptStats(quiz: QuizListItem): QuizAttemptStats {
  const completed = quiz.completed_count || 0;
  const expired =
    quiz.availability_status === 'expired' ? (quiz.total_students || 0) - completed : 0;
  const missed =
    quiz.pending_count && quiz.availability_status === 'expired' ? quiz.pending_count : 0;
  const pending =
    quiz.pending_count && quiz.availability_status === 'active' ? quiz.pending_count : 0;
  const not_started =
    quiz.pending_count && quiz.availability_status === 'active' ? quiz.pending_count : 0;

  return {
    total: quiz.total_students || 0,
    completed,
    pending,
    missed,
    not_started,
    expired,
  };
}

export function computeQuizInsights(quiz: QuizListItem): ClassInsight[] {
  const insights: ClassInsight[] = [];
  let attemptsArray = quiz.attempts;
  if (typeof quiz.attempts === 'string') {
    try {
      attemptsArray = JSON.parse(quiz.attempts);
    } catch {
      return insights;
    }
  }
  const attempts = Array.isArray(attemptsArray) ? attemptsArray : [];
  const completedAttempts = attempts.filter((a) => a.status === 'completed');

  if (completedAttempts.length > 0) {
    const avgScore =
      completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts.length;
    if (avgScore >= 80) {
      insights.push({
        text: `Excellent performance! Average score is ${avgScore.toFixed(1)}%.`,
        type: 'success',
      });
    } else if (avgScore >= 60) {
      insights.push({
        text: `Average score is ${avgScore.toFixed(1)}%. Room for improvement.`,
        type: 'info',
      });
    } else {
      insights.push({
        text: `Average score is ${avgScore.toFixed(1)}%. Students may need additional support.`,
        type: 'warning',
      });
    }

    const times = completedAttempts.filter((a) => a.time_spent_seconds).map((a) => a.time_spent_seconds!);
    if (times.length > 0) {
      const avgTime = times.reduce((s, t) => s + t, 0) / times.length;
      insights.push({
        text: `Most students completed within ${Math.round(avgTime)} seconds.`,
        type: 'info',
      });
    }
  }

  const stats = computeQuizAttemptStats(quiz);
  if (stats.pending > 0) {
    insights.push({
      text: `${stats.pending} student${stats.pending > 1 ? 's have' : ' has'} not started yet.`,
      type: 'info',
    });
  }

  return insights;
}

function getQuizUrgency(dueDate: string | null, startTime: string | null): {
  level: 'critical' | 'warning' | 'normal' | 'expired';
  text: string;
} {
  if (!dueDate) return { level: 'normal', text: 'No due date' };
  const now = new Date();
  const due = new Date(dueDate);
  const start = startTime ? new Date(startTime) : now;

  if (now > due) return { level: 'expired', text: `Ended ${due.toLocaleDateString()}` };
  if (now < start) return { level: 'normal', text: `Opens ${start.toLocaleDateString()}` };

  const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursRemaining < 2) {
    return { level: 'critical', text: `Due in ${Math.round(hoursRemaining * 60)} minutes` };
  }
  if (hoursRemaining < 24) {
    return { level: 'warning', text: `Due in ${Math.round(hoursRemaining)} hours` };
  }
  if (hoursRemaining < 48) return { level: 'warning', text: 'Due tomorrow' };
  return { level: 'normal', text: `Due ${due.toLocaleDateString()}` };
}

export function buildQuizCardData(
  tile: QuizTile,
  originalQuiz: QuizListItem | undefined,
  classroomName: string,
): {
  tile: QuizTile;
  originalQuiz?: QuizListItem;
  classroomName: string;
  performanceSummary: QuizPerformanceSummary;
  urgency: ReturnType<typeof getQuizUrgency>;
} {
  const quiz = originalQuiz;
  return {
    tile,
    originalQuiz: quiz,
    classroomName,
    performanceSummary: quiz ? getQuizPerformanceSummary(quiz) : {
      totalStudents: 0,
      topPerformers: [],
      bottomPerformers: [],
      improvingCount: 0,
      consistentCount: 0,
      categories: [],
    },
    urgency: getQuizUrgency(tile.due_date, quiz?.start_time ?? null),
  };
}

export interface QuizAttemptViewRow {
  student_id: string;
  student_username?: string;
  student_fullname?: string;
  avatar_url?: string;
  status: string;
  derivedStatus: string;
  score: number | null;
  time_spent_seconds?: number | null;
  submitted_at: string | null;
  log_data: string | null;
  attempt_id?: string;
}

export type QuizAttemptFilterKey =
  | 'total_students'
  | 'completed'
  | 'pending'
  | 'missed'
  | 'not_started'
  | 'expired'
  | null;

export function resolveQuizInClass(
  rawData: QuizListItem[],
  quizId: number,
  classroomId: string | null,
): QuizListItem | null {
  if (classroomId) {
    const inClass = rawData.find((q) => q.quiz_id === quizId && q.classroom_id === classroomId);
    if (inClass) return inClass;
  }
  return rawData.find((q) => q.quiz_id === quizId) ?? null;
}

function parseQuizAttempts(quiz: QuizListItem) {
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

export function getQuizAttemptsForView(
  quiz: QuizListItem,
  filter: QuizAttemptFilterKey,
): QuizAttemptViewRow[] {
  const attempts = parseQuizAttempts(quiz).map((attempt) => {
    let derivedStatus = attempt.status;
    if (attempt.status === 'completed') {
      derivedStatus = 'completed';
    } else if (quiz.availability_status === 'expired') {
      derivedStatus = 'missed';
    } else if (quiz.availability_status === 'active') {
      derivedStatus = 'pending';
    }
    return { attempt, derivedStatus };
  });

  const filtered = attempts.filter(({ attempt }) => {
    if (!filter || filter === 'total_students') return true;
    if (filter === 'completed') return attempt.status === 'completed';
    if (filter === 'pending') {
      return attempt.status !== 'completed' && quiz.availability_status === 'active';
    }
    if (filter === 'missed') {
      return attempt.status !== 'completed' && quiz.availability_status === 'expired';
    }
    if (filter === 'not_started') {
      return attempt.status !== 'completed' && quiz.availability_status === 'active';
    }
    if (filter === 'expired') return quiz.availability_status === 'expired';
    return true;
  });

  return filtered.map(({ attempt, derivedStatus }) => ({
    student_id: attempt.student_id,
    student_username: attempt.student_username,
    student_fullname: attempt.student_fullname,
    avatar_url: attempt.avatar_url,
    status: attempt.status,
    derivedStatus,
    score: attempt.score ?? null,
    time_spent_seconds: attempt.time_spent_seconds ?? null,
    submitted_at: attempt.submission?.submitted_at || null,
    log_data: attempt.submission?.log_data
      ? typeof attempt.submission.log_data === 'string'
        ? attempt.submission.log_data
        : JSON.stringify(attempt.submission.log_data)
      : null,
    attempt_id: attempt.attempt_id,
  }));
}

export function getAttemptSummaryText(row: QuizAttemptViewRow, isCompleted: boolean): string {
  if (!isCompleted) {
    return row.derivedStatus === 'missed' ? 'Missed' : 'Not attempted';
  }
  if (!row.log_data) {
    return `Score: ${row.score ?? 0}% | Completed`;
  }
  try {
    const parsed = JSON.parse(row.log_data);
    const answers = Array.isArray(parsed?.answers) ? parsed.answers : [];
    const totalQuestions = parsed?.questionCount || answers.length || 0;
    const correctCount = answers.filter((a: { isCorrect?: boolean }) => a.isCorrect).length;
    const skippedCount = answers.filter((a: { userAnswer?: unknown }) => !a.userAnswer).length;
    const incorrectCount = Math.max(0, totalQuestions - correctCount - skippedCount);
    const percentScore =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : (row.score ?? 0);
    if (totalQuestions === 0) return `Score: ${row.score ?? 0}% | Completed`;
    return `Q:${totalQuestions} | Correct:${correctCount} | Incorrect:${incorrectCount} | Score:${percentScore}%`;
  } catch {
    return `Score: ${row.score ?? 0}% | Completed`;
  }
}
