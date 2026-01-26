/**
 * Assessment Business Logic
 * Handles data transformation and business rules for assessments
 * NO API CALLS - only pure functions
 */

import type {
  Assessment,
  StudentAssessment,
  AssessmentResult,
  AssessmentStatus,
  DifficultyLevel,
} from '../types';

/**
 * Calculate assessment score percentage
 */
export function calculatePercentage(score: number, totalMarks: number): number {
  if (totalMarks === 0) return 0;
  return Math.round((score / totalMarks) * 100);
}

/**
 * Determine if assessment is passed
 */
export function isAssessmentPassed(score: number, passingMarks: number): boolean {
  return score >= passingMarks;
}

/**
 * Calculate grade based on percentage
 */
export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

/**
 * Get assessment status badge color
 */
export function getAssessmentStatusColor(status: AssessmentStatus): string {
  const colorMap: Record<AssessmentStatus, string> = {
    available_soon: '#3B82F6',
    active: '#10B981',
    expired: '#6B7280',
  };
  return colorMap[status];
}

/**
 * Get difficulty badge color
 */
export function getDifficultyColor(difficulty: DifficultyLevel): string {
  const colorMap: Record<DifficultyLevel, string> = {
    easy: '#10B981',
    medium: '#F59E0B',
    hard: '#EF4444',
  };
  return colorMap[difficulty];
}

/**
 * Check if assessment can be started
 */
export function canStartAssessment(assessment: Assessment): boolean {
  const now = new Date();
  
  // Expired assessments cannot be started
  if (assessment.status === 'expired') {
    return false;
  }
  
  // Check if scheduled time has arrived
  if (assessment.scheduledAt) {
    const scheduledTime = new Date(assessment.scheduledAt);
    if (now < scheduledTime) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if assessment is expired (for students who haven't attempted)
 */
export function isAssessmentExpired(assessment: Assessment): boolean {
  if (!assessment.completedAt) {
    return false;
  }
  
  const completedTime = new Date(assessment.completedAt);
  const now = new Date();
  
  return now > completedTime;
}

/**
 * Sort assessments by scheduled date (upcoming first)
 */
export function sortAssessmentsBySchedule(assessments: Assessment[]): Assessment[] {
  return [...assessments].sort((a, b) => {
    const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    return dateA - dateB;
  });
}

/**
 * Sort assessments by creation date (newest first)
 */
export function sortAssessmentsByDate(assessments: Assessment[]): Assessment[] {
  return [...assessments].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Filter assessments by status
 */
export function filterAssessmentsByStatus(
  assessments: Assessment[],
  statuses: AssessmentStatus[]
): Assessment[] {
  return assessments.filter((assessment) => statuses.includes(assessment.status));
}

/**
 * Group assessments by status
 */
export function groupAssessmentsByStatus(
  assessments: Assessment[]
): Record<AssessmentStatus, Assessment[]> {
  return assessments.reduce((groups, assessment) => {
    const status = assessment.status;
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(assessment);
    return groups;
  }, {} as Record<AssessmentStatus, Assessment[]>);
}

/**
 * Calculate time remaining for assessment (in minutes)
 */
export function calculateTimeRemaining(
  startedAt: string,
  duration: number
): number {
  const started = new Date(startedAt);
  const now = new Date();
  const elapsedMinutes = Math.floor((now.getTime() - started.getTime()) / 60000);
  const remaining = duration - elapsedMinutes;
  return Math.max(0, remaining);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Validate student assessment attempt
 */
export function validateAssessmentAttempt(
  assessment: StudentAssessment
): {
  isValid: boolean;
  reason?: string;
} {
  if (assessment.isAttempted) {
    return { isValid: false, reason: 'Assessment already attempted' };
  }
  
  if (!canStartAssessment(assessment)) {
    return { isValid: false, reason: 'Assessment cannot be started yet' };
  }
  
  if (isAssessmentExpired(assessment)) {
    return { isValid: false, reason: 'Assessment has expired' };
  }
  
  return { isValid: true };
}

/**
 * Calculate assessment completion rate
 */
export function calculateCompletionRate(
  totalStudents: number,
  completedStudents: number
): number {
  if (totalStudents === 0) return 0;
  return Math.round((completedStudents / totalStudents) * 100);
}

/**
 * Get performance trend indicator
 */
export function getPerformanceTrend(results: AssessmentResult[]): 'improving' | 'declining' | 'stable' {
  if (results.length < 2) return 'stable';
  
  // Sort by date
  const sorted = [...results].sort((a, b) => 
    new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );
  
  // Calculate average of first half vs second half
  const midPoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midPoint);
  const secondHalf = sorted.slice(midPoint);
  
  const avgFirst = firstHalf.reduce((sum, r) => sum + r.percentage, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, r) => sum + r.percentage, 0) / secondHalf.length;
  
  const difference = avgSecond - avgFirst;
  
  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'stable';
}

/**
 * Format assessment result summary
 */
export function formatResultSummary(result: AssessmentResult): string {
  const percentage = result.percentage;
  const grade = calculateGrade(percentage);
  const status = result.isPassed ? 'Passed' : 'Failed';
  
  return `${status} - ${percentage}% (${grade})`;
}
