/**
 * Analytics Business Logic
 * Handles data transformation and calculations for analytics
 * NO API CALLS - only pure functions
 */

import type {
  WeakTopic,
  StudentPerformanceData,
  TopicAnalysis,
  AssessmentStatistics,
  TimeSeriesPoint,
} from '../types';

/**
 * Calculate average score from array of scores
 */
export function calculateAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

/**
 * Find highest score in array
 */
export function findHighestScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.max(...scores);
}

/**
 * Find lowest score in array
 */
export function findLowestScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.min(...scores);
}

/**
 * Calculate median score
 */
export function calculateMedian(scores: number[]): number {
  if (scores.length === 0) return 0;
  
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  return sorted[mid];
}

/**
 * Calculate standard deviation
 */
export function calculateStandardDeviation(scores: number[]): number {
  if (scores.length === 0) return 0;
  
  const avg = calculateAverage(scores);
  const squareDiffs = scores.map(score => Math.pow(score - avg, 2));
  const avgSquareDiff = calculateAverage(squareDiffs);
  
  return Math.sqrt(avgSquareDiff);
}

/**
 * Identify weak topics based on performance threshold
 */
export function identifyWeakTopics(
  topics: TopicAnalysis[],
  threshold: number = 60
): WeakTopic[] {
  return topics
    .filter(topic => topic.averageScore < threshold)
    .map(topic => ({
      topic: topic.topic,
      tag: topic.tag,
      averageScore: topic.averageScore,
      totalAttempts: topic.totalQuestions,
      improvementPercentage: Math.round(threshold - topic.averageScore),
    }))
    .sort((a, b) => a.averageScore - b.averageScore);
}

/**
 * Calculate improvement percentage between two periods
 */
export function calculateImprovement(
  previousScore: number,
  currentScore: number
): number {
  if (previousScore === 0) return 0;
  
  const improvement = ((currentScore - previousScore) / previousScore) * 100;
  return Math.round(improvement * 100) / 100;
}

/**
 * Get performance category based on average score
 */
export function getPerformanceCategory(averageScore: number): 'excellent' | 'good' | 'average' | 'needs-improvement' {
  if (averageScore >= 85) return 'excellent';
  if (averageScore >= 70) return 'good';
  if (averageScore >= 50) return 'average';
  return 'needs-improvement';
}

/**
 * Sort students by performance (highest first)
 */
export function sortStudentsByPerformance(
  students: StudentPerformanceData[]
): StudentPerformanceData[] {
  return [...students].sort((a, b) => b.averageScore - a.averageScore);
}

/**
 * Get top performers (top 10% or minimum 3 students)
 */
export function getTopPerformers(
  students: StudentPerformanceData[]
): StudentPerformanceData[] {
  const sorted = sortStudentsByPerformance(students);
  const topCount = Math.max(3, Math.ceil(students.length * 0.1));
  return sorted.slice(0, topCount);
}

/**
 * Get students needing attention (bottom 20%)
 */
export function getStudentsNeedingAttention(
  students: StudentPerformanceData[],
  threshold: number = 50
): StudentPerformanceData[] {
  return students
    .filter(student => student.averageScore < threshold)
    .sort((a, b) => a.averageScore - b.averageScore);
}

/**
 * Calculate pass rate for assessments
 */
export function calculatePassRate(
  totalAttempts: number,
  passedAttempts: number
): number {
  if (totalAttempts === 0) return 0;
  return Math.round((passedAttempts / totalAttempts) * 100);
}

/**
 * Group analytics data by date range
 */
export function groupByDateRange(
  data: TimeSeriesPoint[],
  range: 'daily' | 'weekly' | 'monthly'
): TimeSeriesPoint[] {
  // Implementation for grouping by date range
  const grouped: Record<string, number[]> = {};
  
  data.forEach(point => {
    const date = new Date(point.date);
    let key: string;
    
    if (range === 'daily') {
      key = date.toISOString().split('T')[0];
    } else if (range === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(point.value);
  });
  
  return Object.entries(grouped).map(([date, values]) => ({
    date,
    value: calculateAverage(values),
    label: date,
  }));
}

/**
 * Calculate topic mastery level
 */
export function calculateTopicMastery(
  averageScore: number,
  successRate: number
): 'mastered' | 'proficient' | 'developing' | 'needs-practice' {
  const combined = (averageScore + successRate) / 2;
  
  if (combined >= 85) return 'mastered';
  if (combined >= 70) return 'proficient';
  if (combined >= 50) return 'developing';
  return 'needs-practice';
}

/**
 * Get analytics summary statistics
 */
export function getAnalyticsSummary(stats: AssessmentStatistics[]): {
  totalAssessments: number;
  totalAttempts: number;
  overallAverageScore: number;
  overallPassRate: number;
} {
  if (stats.length === 0) {
    return {
      totalAssessments: 0,
      totalAttempts: 0,
      overallAverageScore: 0,
      overallPassRate: 0,
    };
  }
  
  const totalAssessments = stats.length;
  const totalAttempts = stats.reduce((sum, stat) => sum + stat.totalAttempts, 0);
  const overallAverageScore = calculateAverage(stats.map(s => s.averageScore));
  const overallPassRate = calculateAverage(stats.map(s => s.passPercentage));
  
  return {
    totalAssessments,
    totalAttempts,
    overallAverageScore,
    overallPassRate,
  };
}

/**
 * Format percentage with color coding
 */
export function getPercentageColor(percentage: number): string {
  if (percentage >= 80) return '#10B981'; // Green
  if (percentage >= 60) return '#F59E0B'; // Yellow
  if (percentage >= 40) return '#F97316'; // Orange
  return '#EF4444'; // Red
}

/**
 * Generate date range labels
 */
export function generateDateRangeLabels(
  startDate: string,
  endDate: string,
  interval: 'daily' | 'weekly' | 'monthly'
): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const labels: string[] = [];
  
  const current = new Date(start);
  
  while (current <= end) {
    if (interval === 'daily') {
      labels.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    } else if (interval === 'weekly') {
      labels.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 7);
    } else {
      labels.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
  }
  
  return labels;
}

/**
 * Calculate percentile rank
 */
export function calculatePercentileRank(score: number, allScores: number[]): number {
  if (allScores.length === 0) return 0;
  
  const lowerScores = allScores.filter(s => s < score).length;
  return Math.round((lowerScores / allScores.length) * 100);
}
