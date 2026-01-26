/**
 * Analytics API
 * Handles all analytics and dashboard-related API calls
 */

import { get } from './config';
import type {
  TeacherDashboardStats,
  StudentDashboardStats,
  AnalyticsData,
  StudentPerformanceData,
  AssessmentStatistics,
  TopicAnalysis,
  WeakTopic,
  AnalyticsFilters,
} from '../types';

/**
 * Fetch dashboard statistics based on user role
 */
export async function fetchDashboardStats(userId: string, role: 'teacher' | 'student'): Promise<
  TeacherDashboardStats | StudentDashboardStats
> {
  return get<TeacherDashboardStats | StudentDashboardStats>(
    `/dashboard/${role}/${userId}`
  );
}

/**
 * Fetch teacher dashboard stats
 */
export async function fetchTeacherDashboardStats(
  teacherId: string
): Promise<TeacherDashboardStats> {
  return get<TeacherDashboardStats>(`/dashboard/teacher/${teacherId}`);
}

/**
 * Fetch student dashboard stats
 */
export async function fetchStudentDashboardStats(
  studentId: string
): Promise<StudentDashboardStats> {
  return get<StudentDashboardStats>(`/dashboard/student/${studentId}`);
}

/**
 * Fetch comprehensive analytics data
 */
export async function fetchAnalytics(
  userId: string,
  filters: AnalyticsFilters
): Promise<AnalyticsData> {
  return get<AnalyticsData>(`/analytics/${userId}`, filters);
}

/**
 * Fetch student performance analytics
 */
export async function fetchStudentPerformance(
  teacherId: string,
  filters?: AnalyticsFilters
): Promise<StudentPerformanceData[]> {
  return get<StudentPerformanceData[]>(
    `/analytics/teacher/${teacherId}/student-performance`,
    filters
  );
}

/**
 * Fetch assessment statistics
 */
export async function fetchAssessmentStatistics(
  teacherId: string,
  filters?: AnalyticsFilters
): Promise<AssessmentStatistics[]> {
  return get<AssessmentStatistics[]>(
    `/analytics/teacher/${teacherId}/assessment-stats`,
    filters
  );
}

/**
 * Fetch topic-wise analysis
 */
export async function fetchTopicAnalysis(
  userId: string,
  filters?: AnalyticsFilters
): Promise<TopicAnalysis[]> {
  return get<TopicAnalysis[]>(`/analytics/${userId}/topic-analysis`, filters);
}

/**
 * Fetch weak topics for a student
 */
export async function fetchWeakTopics(studentId: string): Promise<WeakTopic[]> {
  return get<WeakTopic[]>(`/analytics/student/${studentId}/weak-topics`);
}

/**
 * Fetch performance trends over time
 */
export async function fetchPerformanceTrends(
  userId: string,
  filters: AnalyticsFilters
): Promise<{
  dates: string[];
  scores: number[];
}> {
  return get<{ dates: string[]; scores: number[] }>(
    `/analytics/${userId}/trends`,
    filters
  );
}

/**
 * Fetch class-wise performance comparison
 */
export async function fetchClassPerformance(
  teacherId: string,
  classId: string
): Promise<{
  className: string;
  averageScore: number;
  topPerformers: Array<{ studentId: string; name: string; score: number }>;
  needsAttention: Array<{ studentId: string; name: string; score: number }>;
}> {
  return get(`/analytics/teacher/${teacherId}/classes/${classId}/performance`);
}

/**
 * Export analytics data as CSV
 */
export async function exportAnalytics(
  userId: string,
  filters: AnalyticsFilters,
  format: 'csv' | 'xlsx' | 'pdf'
): Promise<Blob> {
  const response = await get<Blob>(`/analytics/${userId}/export`, {
    ...filters,
    format,
  });
  return response;
}
