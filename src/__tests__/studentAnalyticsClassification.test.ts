import {
  classifyStudentAnalyticsAttemptStatus,
  classifyStudentAnalyticsAvailability,
  isStudentAnalyticsCompleted,
  isStudentAnalyticsPendingLike,
  scoreForStudentAnalyticsDisplay,
  studentAnalyticsMatchesStatusFilter,
} from '../core/utils/studentAnalyticsClassification';
import type { QuizListItem } from '../core/types/quizAnalytics.types';

describe('studentAnalyticsClassification (web-equivalent)', () => {
  it('treats completed with null score as completed (not pending)', () => {
    const quiz = {
      student_status: 'completed',
      best_score: null,
      availability_status: 'expired',
    } as unknown as QuizListItem;
    expect(classifyStudentAnalyticsAttemptStatus(quiz)).toBe('completed');
    expect(isStudentAnalyticsCompleted(quiz)).toBe(true);
    expect(scoreForStudentAnalyticsDisplay(quiz)).toBeNull();
    expect(studentAnalyticsMatchesStatusFilter(quiz, 'completed')).toBe(true);
  });

  it('does not promote pending/in_progress to completed when a numeric score exists', () => {
    const pending = {
      student_status: 'pending',
      best_score: 88,
      availability_status: 'active',
    } as unknown as QuizListItem;
    const inProgress = {
      student_status: 'in_progress',
      latest_score: 40,
      availability_status: 'active',
    } as unknown as QuizListItem;
    expect(classifyStudentAnalyticsAttemptStatus(pending)).toBe('pending');
    expect(isStudentAnalyticsCompleted(pending)).toBe(false);
    expect(isStudentAnalyticsPendingLike(pending)).toBe(true);
    expect(classifyStudentAnalyticsAttemptStatus(inProgress)).toBe('in_progress');
    expect(studentAnalyticsMatchesStatusFilter(inProgress, 'pending')).toBe(true);
  });

  it('keeps completed after expiry via availability as a separate concept', () => {
    const quiz = {
      student_status: 'completed',
      best_score: 72,
      availability_status: 'expired',
      end_time: '2020-01-01T00:00:00Z',
    } as unknown as QuizListItem;
    expect(classifyStudentAnalyticsAttemptStatus(quiz)).toBe('completed');
    expect(classifyStudentAnalyticsAvailability(quiz)).toBe('expired');
    expect(studentAnalyticsMatchesStatusFilter(quiz, 'expired')).toBe(true);
    expect(studentAnalyticsMatchesStatusFilter(quiz, 'completed')).toBe(true);
  });

  it('falls back to quiz_status when student_status is absent', () => {
    const quiz = {
      quiz_status: 'completed',
      best_score: null,
    } as unknown as QuizListItem;
    expect(classifyStudentAnalyticsAttemptStatus(quiz)).toBe('completed');
  });

  it('does not invent completion from score alone when status is missing', () => {
    const quiz = {
      best_score: 95,
      availability_status: 'active',
    } as unknown as QuizListItem;
    expect(classifyStudentAnalyticsAttemptStatus(quiz)).toBe('pending');
    expect(isStudentAnalyticsCompleted(quiz)).toBe(false);
  });
});
