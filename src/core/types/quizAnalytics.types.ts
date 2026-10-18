/**
 * Analytics API Types
 * Type definitions for the quiz analytics dashboard
 */

// Quiz status types
export type QuizStatus = 'active' | 'inactive' | 'draft' | 'archived';
export type AvailabilityStatus = 'active' | 'upcoming' | 'expired' | 'not_started';
export type AttemptStatus = 'completed' | 'in_progress' | 'pending' | 'expired' | 'missed';

// View type for role-based data
export type ViewType = 'student' | 'instructor' | 'admin';

/**
 * API view_type parameter values (mandatory for /api/v1/dashboard/quizzes)
 * These values determine the data structure returned by the API
 */
export type ApiViewType = 'all' | 'summary' | 'missed' | 'attempts' | 'all_students' | 'classes' | 'class_wise_students' | 'student_total_details';

/**
 * Mapping of API view types to their purposes:
 * - 'all': Return all quizzes with complete attempt data (includes score, status, log_data per student)
 * - 'summary': Return overall statistics (completed, pending, in-progress, total counts) without attempts
 * - 'missed': Return missed/in-progress/pending quiz users (data under attempts)
 * - 'attempts': Return students who have attempted the quiz
 * - 'all_students': Return total student count and list for instructor
 * - 'classes': Return the list of classes
 * - 'class_wise_students': Return students grouped by class (uses attempts field for student list)
 * - 'student_total_details': Return student-specific quiz history
 */
export const API_VIEW_TYPES: readonly ApiViewType[] = ['all', 'summary', 'missed', 'attempts', 'all_students', 'classes', 'class_wise_students', 'student_total_details'] as const;

// Submission detail embedded in attempt
export interface SubmissionDetail {
  summary: string;
  log_data: string; // JSON string containing detailed quiz answers
  submitted_at: string; // ISO datetime
  submission_id: number;
}

// Parsed log data structure
export interface QuizAnswerLog {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: string; // A, B, C, D
  userAnswer: string | null; // A, B, C, D or null if skipped
  isCorrect: boolean;
  /** Worksheet text / short-answer rows */
  isTextAnswer?: boolean;
  correctAnswerText?: string;
}

export interface ParsedLogData {
  answers: QuizAnswerLog[];
  questionCount: number;
  time_spent_seconds: number;
  attempt_id: number;
  client?: {
    ua: string;
  };
}

// Student attempt information
export interface StudentAttempt {
  score: number;
  status: AttemptStatus;
  attempt_id: number;
  avatar_url: string | null;
  started_at: string; // ISO datetime
  student_id: string;
  submission: SubmissionDetail | null;
  completed_at: string | null; // ISO datetime
  attempt_number: number;
  student_fullname: string;
  student_username: string;
  time_spent_seconds: number | null;
  derivedStatus?: string; // Derived status based on quiz availability
  originalStatus?: AttemptStatus; // Original status from API
}

// Main quiz item structure
export interface QuizListItem {
  quiz_id: number;
  classroom_id: string;
  classroom_name: string;
  file_name: string | null;
  session_id: string;
  quiz_name: string;
  topic: string | null;
  subject: string | null;
  created_at: string; // ISO datetime
  assigned_at: string | null; // ISO datetime
  due_date: string | null; // ISO datetime
  start_time: string | null; // ISO datetime
  end_time: string | null; // ISO datetime
  duration: number; // minutes
  has_time_limit: boolean;
  question_count: number;
  total_questions: number | null;
  status: QuizStatus;
  availability: string | null;
  availability_status: AvailabilityStatus;
  attempts_allowed: number | null;
  
  // Student-specific fields (when viewing as student)
  student_attempts: number | null;
  best_score: number | null;
  latest_score: number | null;
  avg_score: number | null;
  score: number | null;
  attempt_id: number | null;
  attempt_number: number | null;
  started_at: string | null;
  completed_at: string | null;
  time_spent_seconds: number | null;
  submission_id: number | null;
  submitted_at: string | null;
  log_data: string | null;
  
  // Instructor/Admin-specific fields
  total_students: number | null;
  pending_count: number | null;
  in_progress_count: number | null;
  completed_count: number | null;
  attempts: StudentAttempt[];
}

// Response metadata
export interface QuizListMeta {
  total_count: number;
  limit: number;
  offset: number;
  view_type: ViewType;
}

// Main API response
export interface QuizListResponse {
  meta: QuizListMeta;
  data: QuizListItem[];
}

// Query parameters for API
export interface QuizListParams {
  // MANDATORY: view_type determines the data structure returned
  view_type: ApiViewType;
  
  // Conditional parameters based on view_type:
  // - For class-based data: pass classroom_id
  // - For quiz-based data: pass quiz_id
  classroom_id?: string;
  quiz_id?: number;
  
  // Optional filter parameters
  created_from?: string; // ISO datetime
  created_to?: string; // ISO datetime
  assigned_from?: string; // ISO datetime
  assigned_to?: string; // ISO datetime
  started_from?: string; // ISO datetime
  started_to?: string; // ISO datetime
  completed_from?: string; // ISO datetime
  completed_to?: string; // ISO datetime
  submission_from?: string; // ISO datetime
  submission_to?: string; // ISO datetime
  quiz_status?: QuizStatus;
  availability?: AvailabilityStatus;
  attempt_status?: AttemptStatus;
  attempt_number?: number;
  min_score?: number;
  max_score?: number;
  min_duration?: number;
  max_duration?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Analytics-specific aggregated data structures

export interface ClassOverview {
  classroom_id: string;
  classroom_name: string;
  instructor_name?: string;
  /** Distinct assignment count (quiz_id + session_id + classroom_id). */
  total_quizzes: number;
  total_students: number;
  missed_count: number;
  /** Student submission completions (cohort completed_count sum) — not availability Active. */
  completed_count: number;
  in_progress_count: number;
  /**
   * Class-card contract (web AnalyticsPage): ungated Σ pending_count across
   * assignments. Drill-down actionable Pending is gated separately in helpers.
   */
  pending_count: number;
  expired_count: number;
  /** Assignment availability buckets — separate from attempt Done/Pending. */
  active_assignment_count?: number;
  upcoming_assignment_count?: number;
  expired_assignment_count?: number;
  avg_score: number;
  highest_score: number | null;
  lowest_score: number | null;
  completion_rate: number; // percentage
}

export interface StatusSummary {
  missed: number;
  completed: number;
  pending: number;
  expired: number;
  not_started: number;
  active: number;
}

// Quiz tile for quiz grid layer (instructor/admin only)
export interface QuizTile {
  quiz_id: number;
  session_id: string;
  classroom_id: string;
  quiz_name: string;
  topic: string | null;
  subject: string | null;
  total_students: number;
  completed_count: number;
  pending_count: number;
  in_progress_count: number;
  missed_count: number;
  expired_count: number;
  avg_score: number;
  highest_score: number | null;
  lowest_score: number | null;
  at_risk_count: number;
  completion_rate: number;
  created_at: string;
  due_date: string | null;
}

export interface StudentPerformanceRow {
  student_id: string;
  student_username: string;
  student_fullname: string;
  avatar_url: string | null;
  quiz_name: string;
  quiz_id: number;
  status: AttemptStatus;
  score: number | null;
  time_spent_seconds: number | null;
  submitted_at: string | null;
  attempt_id: number | null;
  performance_level: 'low' | 'medium' | 'high' | null; // Derived from score
  log_data: string | null; // For popup details
  summary: string; // Summary of performance
}

export interface QuizPerformanceRow {
  quiz_id: number;
  quiz_name: string;
  topic: string | null;
  status: AttemptStatus;
  score: number | null;
  time_spent_seconds: number | null;
  attempts: number;
  submitted_at: string | null;
  best_score: number | null;
  log_data: string | null; // For popup details
  summary: string; // Summary of quiz performance
}

// KPI Metrics structures

export interface AcademicKPIs {
  avg_score_overall: number;
  avg_score_by_class: { className: string; avgScore: number }[];
  avg_score_by_subject: { subject: string; avgScore: number }[];
  completion_rate: number; // percentage
  missed_rate: number; // percentage
  low_score_rate: number; // percentage of students scoring below threshold
}

export interface EngagementKPIs {
  avg_time_spent: number; // seconds
  drop_off_rate: number; // percentage
  late_submission_rate: number; // percentage
  retry_frequency: number; // average attempts per quiz
}

export interface TeachingEffectivenessKPIs {
  difficulty_index: number; // derived from time vs score
  risk_topics: { topic: string; avgScore: number; attempts: number }[];
  participation_index: number; // percentage
}

export interface StudentHealthKPIs {
  at_risk_count: number;
  improving_count: number;
  consistent_count: number;
  at_risk_students: {
    student_id: string;
    student_name: string;
    missed_count: number;
    avg_score: number;
  }[];
}

export interface SchoolOverviewKPIs {
  top_classes: { className: string; avgScore: number; completionRate: number }[];
  intervention_needed: { className: string; missedRate: number; avgScore: number }[];
  instructor_load: { instructor: string; totalQuizzes: number; avgScore: number }[];
  health_status: 'green' | 'amber' | 'red';
}

// Insight/Summary types
export interface DynamicInsight {
  text: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  icon?: string;
}
