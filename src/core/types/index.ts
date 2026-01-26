/**
 * Core Types and Interfaces
 * Shared across all platforms
 */

// ============================================================
// Dashboard & Quiz Types - UNIFIED SYSTEM
// ============================================================

// Export all dashboard types from the centralized dashboard.types.ts
export * from './dashboard.types';

// Re-export quiz types for backward compatibility
export * from './quiz.types';

// Re-export for backward compatibility
export type { UserProfile as User } from './dashboard.types';
export type { QuizDetails as Quiz } from './dashboard.types';
export type { ClassroomDetails } from './dashboard.types';
export type { QuizAttempt as AttemptDetails } from './dashboard.types';

// ============================================================
// User & Authentication Types
// ============================================================

export type UserRole = 'student' | 'instructor' | 'admin';

// Import UserProfile for type references
import type { UserProfile } from './dashboard.types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
}

// ============================================================
// Assessment Types
// ============================================================

export type AssessmentStatus = 'active' | 'expired' | 'available_soon';
export type AssessmentType = 'quiz' | 'exam' | 'assignment' | 'practice';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Assessment {
  id: string;
  title: string;
  description: string;
  type: AssessmentType;
  status: AssessmentStatus;
  difficulty: DifficultyLevel;
  totalQuestions: number;
  duration: number; // in minutes
  totalMarks: number;
  passingMarks: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  // Additional quiz-related fields
  instructorId?: string;
  instructorName?: string;
  classroomId?: string;
  classroomName?: string;
  subject?: string;
  totalStudents?: number;
  pendingCount?: number;
  inProgressCount?: number;
  completedCount?: number;
}

export interface Question {
  id: string;
  assessmentId: string;
  questionText: string;
  questionType: 'mcq' | 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  options?: string[];
  correctAnswer?: string | string[];
  marks: number;
  order: number;
  explanation?: string;
}

export interface StudentAssessment extends Assessment {
  isAttempted: boolean;
  score?: number;
  percentage?: number;
  attemptedAt?: string;
  submittedAt?: string;
  timeSpent?: number; // in seconds
  attemptsAllowed?: number;
  attemptsUsed?: number;
  dueDate?: string;
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  studentId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  isPassed: boolean;
  startedAt: string;
  submittedAt: string;
  timeSpent: number;
  answers: StudentAnswer[];
}

export interface StudentAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
  marksObtained: number;
}

// ============================================================
// Analytics Types
// ============================================================

export interface DashboardStats {
  teacher: TeacherDashboardStats;
  student: StudentDashboardStats;
}

export interface TeacherDashboardStats {
  totalStudents: number;
  totalClasses: number;
  totalAssessments: number;
  activeAssessments: number;
  averageScore: number;
  recentActivity: RecentActivity[];
}

export interface StudentDashboardStats {
  scheduledAssessments: number;
  completedAssessments: number;
  averageScore: number;
  weakTopics: WeakTopic[];
  recentAssessments: StudentAssessment[];
  upcomingAssessments: Assessment[];
}

export interface RecentActivity {
  id: string;
  type: 'assessment_created' | 'assessment_completed' | 'student_joined';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface WeakTopic {
  topic: string;
  tag: string;
  averageScore: number;
  totalAttempts: number;
  improvementPercentage: number;
}

export interface AnalyticsData {
  studentPerformance: StudentPerformanceData[];
  assessmentStats: AssessmentStatistics[];
  topicAnalysis: TopicAnalysis[];
  timeSeriesData: TimeSeriesPoint[];
}

export interface StudentPerformanceData {
  studentId: string;
  studentName: string;
  totalAssessments: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface AssessmentStatistics {
  assessmentId: string;
  assessmentTitle: string;
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passPercentage: number;
}

export interface TopicAnalysis {
  topic: string;
  tag: string;
  totalQuestions: number;
  averageScore: number;
  successRate: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  label: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================
// Filter & Query Types
// ============================================================

export interface AssessmentFilters {
  status?: AssessmentStatus[];
  availabilityStatus?: string[]; // For instructor filtering by quiz availability_status
  type?: AssessmentType[];
  difficulty?: DifficultyLevel[];
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface AnalyticsFilters {
  dateFrom: string;
  dateTo: string;
  studentIds?: string[];
  assessmentIds?: string[];
  tags?: string[];
}

// ============================================================
// UI State Types (for hooks)
// ============================================================

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface DataState<T> extends LoadingState {
  data: T | null;
}

export interface ListState<T> extends LoadingState {
  items: T[];
  hasMore: boolean;
}
