/**
 * UNIFIED DASHBOARD TYPE DEFINITIONS
 * ====================================
 * Single source of truth for all quiz, student, classroom, and attempt data structures.
 * 
 * ARCHITECTURE PRINCIPLES:
 * ========================
 * 
 * 🔹 MASTER INTERFACES (Source of Truth)
 * ---------------------------------------
 * These are authoritative domain models - NEVER duplicate:
 * 
 *   • UserProfile      - All user data (students, instructors, admins)
 *   • QuizDetails      - Core quiz data (shared across all roles)
 *   • ClassroomDetails - Complete classroom information
 *   • QuizAttempt      - Student quiz attempt tracking
 * 
 * 🔹 ROLE-SPECIFIC VIEWS (Derived Extensions)
 * -------------------------------------------
 * These extend master interfaces with role-specific computed fields:
 * 
 *   • TeacherQuiz extends QuizDetails
 *     - Adds: total_students, pending_count, completed_count, attempts[]
 *     - Use for: Teacher dashboards, student tracking, analytics
 * 
 *   • StudentQuiz extends QuizDetails
 *     - Adds: student_status, attempt_id, score, started_at, completed_at
 *     - Use for: Student dashboards, quiz taking, results display
 * 
 * 🔹 FILTERS & STATS (Query/Analytics Models)
 * -------------------------------------------
 * Separate interfaces for querying and aggregation:
 * 
 *   • TeacherQuizFilters - Query params for teacher API
 *   • StudentQuizFilters - Query params for student API
 *   • DashboardStats     - Aggregated statistics
 * 
 * CRITICAL RULES:
 * ===============
 * ❌ Do NOT create new quiz interfaces with duplicated fields
 * ❌ Do NOT redefine QuizAvailabilityStatus or AttemptStatus
 * ❌ Do NOT maintain parallel teacher/student quiz models
 * ✅ ALWAYS derive from master interfaces using 'extends'
 * ✅ Use utility functions for transformations (toTeacherQuiz, toStudentQuiz)
 * ✅ Keep role-specific fields ONLY in role-specific extensions
 * 
 * IMPORT GUIDELINES:
 * ==================
 * Always import from this file when working with dashboard data.
 * DO NOT create duplicate interfaces in component files.
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/** Quiz availability statuses across the application */
export type QuizAvailabilityStatus = 'active' | 'expired' | 'available_soon';

/** Student attempt statuses - universal for all views */
export type AttemptStatus = 'pending' | 'in_progress' | 'completed' | 'missed';

/** Quiz status for admin/teacher filtering */
export type QuizFilterStatus = 'active' | 'inactive' | 'draft';

/** API view types for different dashboard contexts */
export type DashboardViewType = 
  | 'summary'              // Teacher: all quizzes with counts
  | 'all'                  // Teacher: quizzes with all student statuses
  | 'class_wise_students'  // Teacher: classrooms with student lists
  | 'student_details'      // Student: student dashboard quizzes
  | 'student_total_details'; // Student: total quizzes view

// ============================================================================
// CORE ENTITIES - Shared across all views
// ============================================================================

/**
 * USER PROFILE - Master interface for all user-related data
 * ============================================================
 * SINGLE SOURCE OF TRUTH for user information across the entire application.
 * Used for:
 * - Logged-in user profile
 * - Student lists (teacher view)
 * - Instructor/Admin lists
 * - User detail pages
 * - Profile screens
 * - Analytics & activity tracking
 * - Any API response containing user information
 * 
 * CRITICAL: Use this interface instead of creating role-specific user types.
 * Use optional fields for role-specific data.
 */
export interface UserProfile {
  // ========== Core Identity ==========
  /** Unique user identifier (string for compatibility with auth systems) */
  id: string;
  
  /** Unique username */
  username: string;
  
  /** User's email address */
  email: string;
  
  /** User's role in the system */
  role: 'student' | 'instructor' | 'admin';
  
  // ========== Personal Information ==========
  /** Full name of the user */
  full_name: string | null;
  
  /** Display name (computed from full_name or username) */
  name?: string;
  
  /** User biography/description */
  bio?: string | null;
  
  /** Phone number */
  phone?: string | null;
  
  /** Physical address */
  address?: string | null;
  
  /** Profile avatar URL */
  avatar_url?: string | null;
  
  /** Date of birth (ISO 8601 format) */
  date_of_birth?: string | null;
  
  // ========== Educational/Institutional ==========
  /** School identifier used by ERP APIs */
  school_id?: number | null;

  /** School/Institution name */
  school?: string | null;

  /** Role identifier from backend auth profile */
  role_id?: number | null;
  
  /** Board ID (for students - e.g., CBSE, ICSE) */
  board_id?: number | null;
  
  /** Grade/Class ID (for students) */
  grade_id?: number | null;
  
  // ========== Account Status ==========
  /** Whether account is active */
  is_active: boolean;
  
  /** Whether email is verified */
  is_verified: boolean;
  
  /** Account suspension status (0 = not suspended, 1+ = suspended) */
  suspended?: number;
  
  /** User's current status (active, inactive, etc.) */
  status?: string;
  
  // ========== Timestamps ==========
  /** Account creation timestamp */
  created_at: string;
  
  /** Last account update timestamp */
  updated_at?: string | null;
  
  /** Last login timestamp */
  last_login?: string | null;
  
  // ========== System/Admin Fields ==========
  /** Daily message limit for the user */
  daily_message_limit?: number;
  
  /** Custom user metadata (JSON object) */
  metadata?: Record<string, any>;
}

/**
 * QUIZ DETAILS - Master interface for core quiz information
 * ============================================================
 * SINGLE SOURCE OF TRUTH for quiz data across the entire application.
 * 
 * This contains ONLY shared quiz fields that are common to all roles.
 * Role-specific views (TeacherQuiz, StudentQuiz) extend this interface.
 * 
 * Used for:
 * - Quiz creation/editing
 * - Quiz metadata storage
 * - API response base structure
 * - Quiz analytics and reporting
 * 
 * CRITICAL: Do NOT add role-specific fields here.
 * Use TeacherQuiz or StudentQuiz for role-specific data.
 */
export interface QuizDetails {
  // ========== Core Quiz Identity ==========
  /** Unique quiz identifier */
  quiz_id: number;
  
  /** Session identifier for quiz instance */
  session_id: string;
  
  /** Quiz name/title */
  quiz_name: string;
  
  /** Subject topic */
  topic: string;
  
  // ========== Classroom & Assignment ==========
  /** Associated classroom ID */
  classroom_id: string;
  
  /** Classroom name */
  classroom_name: string;
  
  /** Subject (may be JSON string from API) */
  subject: string;
  
  /** Instructor information (JSON string from API, parse to Instructor) */
  instructor?: string | null;
  
  // ========== Quiz Status & Availability ==========
  /** Quiz availability for students */
  availability_status: QuizAvailabilityStatus;
  
  /** Quiz status for filtering (active/inactive/draft) */
  quiz_status: string;
  
  // ========== Quiz Configuration ==========
  /** Number of questions in quiz */
  question_count: number;
  
  /** Whether quiz has a time limit */
  has_time_limit: boolean;
  
  /** Duration in minutes (null if no time limit) */
  duration: number | null;
  
  /** Number of attempts allowed */
  attempts_allowed?: number | null;
  
  // ========== Timing & Scheduling ==========
  /** Quiz creation timestamp */
  created_at: string;
  
  /** Quiz start time */
  start_time: string;
  
  /** Quiz end time */
  end_time: string;
  
  /** When quiz was assigned to students */
  assigned_at: string;
  
  /** Due date for completion */
  due_date: string;
  
  // ========== Optional Source Info ==========
  /** Source file name (if quiz from uploaded file) */
  file_name?: string | null;
  
  // ========== API Metadata ==========
  /** View type from API response */
  view_type?: DashboardViewType;
  
  /** Total count from API response */
  total_count?: number;

  quiz_type?: string;
  questions?: QuizQuestionsData;
}

/**
 * TEACHER QUIZ - Teacher-facing view of quiz with student tracking
 * ================================================================
 * Extends QuizDetails with teacher-specific fields for monitoring student progress.
 * 
 * Used for:
 * - Teacher dashboard quiz lists
 * - Student progress tracking
 * - Quiz analytics (teacher view)
 * - Classroom management
 * 
 * CRITICAL: Only add teacher-specific computed/aggregate fields.
 * Do NOT duplicate core quiz fields from QuizDetails.
 */
export interface TeacherQuiz extends QuizDetails {
  // ========== Student Tracking (Teacher-Only) ==========
  /** Total number of students assigned */
  total_students: number;
  
  /** Count of students who haven't started */
  pending_count: number;
  
  /** Count of students currently taking quiz */
  in_progress_count: number;
  
  /** Count of students who completed quiz */
  completed_count: number;
  
  /** All student attempts (JSON string from API, parse to QuizAttempt[]) */
  attempts?: string | null;
  
  /** Parsed attempts array (computed from attempts JSON) */
  parsed_attempts?: QuizAttempt[];
}

/**
 * STUDENT QUIZ - Student-facing view of quiz with attempt data
 * ===========================================================
 * Extends QuizDetails with student-specific attempt and scoring information.
 * 
 * Used for:
 * - Student dashboard quiz lists
 * - Student quiz taking
 * - Student performance tracking
 * - Quiz results display
 * 
 * CRITICAL: Only add student-specific attempt/score fields.
 * Do NOT duplicate core quiz fields from QuizDetails.
 */
export interface StudentQuiz extends QuizDetails {
  // ========== Student Attempt Status ==========
  /** Student's current status for this quiz */
  student_status: AttemptStatus;
  
  // ========== Student Attempt Data ==========
  /** Current attempt ID */
  attempt_id?: string | null;
  
  /** Current attempt number */
  attempt_number?: number | null;
  
  /** Total number of attempts made by student */
  student_attempts?: number | null;
  
  // ========== Student Scoring ==========
  /** Current/latest attempt score */
  score?: number | null;
  
  /** Student's best score across all attempts */
  best_score?: number | null;
  
  /** Student's latest score */
  latest_score?: number | null;
  
  /** Student's average score across attempts */
  avg_score?: number | null;
  
  // ========== Current Attempt Timing ==========
  /** When current attempt was started */
  started_at?: string | null;
  
  /** When current attempt was completed */
  completed_at?: string | null;
  
  /** Time spent on current attempt (seconds) */
  time_spent_seconds?: number | null;
  
  // ========== Submission Data ==========
  /** Submission ID for current attempt */
  submission_id?: string | null;
  
  /** When current attempt was submitted */
  submitted_at?: string | null;
  
  /** Detailed submission data (JSON from API) */
  log_data?: any;
}

/**
 * CLASSROOM DETAILS - Master interface for complete classroom information
 * =====================================================================
 * SINGLE SOURCE OF TRUTH for classroom data across the entire application.
 * Used for:
 * - Classroom management pages
 * - Student lists
 * - Quiz assignment
 * - Classroom analytics
 * - Any API response containing classroom information
 */
export interface ClassroomDetails {
  // ========== Core Classroom Identity ==========
  /** Unique classroom identifier */
  classroom_id: string;
  
  /** Classroom name */
  classroom_name: string;
  
  // ========== Instructor Information ==========
  /** Instructor who created/manages this classroom */
  instructor: Instructor;
  
  // ========== Student Information ==========
  /** Total number of students in classroom */
  total_students: number;
  
  /** List of students in classroom (when fetched with student details) */
  students?: StudentProfile[];
  
  // ========== Classroom Metadata ==========
  /** Subject/topic of the classroom */
  subject?: string;
  
  /** Grade/class level */
  grade?: string;
  
  /** School year/term */
  academic_year?: string;
  
  /** Classroom description */
  description?: string;
  
  // ========== Statistics ==========
  /** Number of quizzes in this classroom */
  total_quizzes?: number;
  
  /** Number of active quizzes */
  active_quizzes?: number;
  
  /** Average student performance */
  average_score?: number;
  
  // ========== Timestamps ==========
  /** When classroom was created */
  created_at?: string;
  
  /** Last update timestamp */
  updated_at?: string;
  
  // ========== Status ==========
  /** Whether classroom is active */
  is_active?: boolean;
  
  /** Classroom status */
  status?: string;
}

/**
 * QUIZ QUESTION - Universal structure
 * Same structure whether in teacher quiz creation or student quiz taking
 */
export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

/**
 * QUIZ QUESTIONS WRAPPER - Matches API response structure
 */
export interface QuizQuestionsData {
  quizzes: Array<{
    quiz: QuizQuestion;
    answer?: string; // Student's answer if attempted
  }>;
}

/**
 * INSTRUCTOR - Teacher/instructor information
 * Extends UserProfile with instructor-specific fields
 * Same structure in all contexts (class list, quiz details, etc.)
 */
export interface Instructor {
  /** Unique instructor identifier */
  instructor_id: string;
  
  /** Instructor's full name */
  instructor_fullname: string;
  
  /** Instructor's username */
  instructor_username: string;
  
  /** Instructor's avatar URL */
  instructor_avatar_url: string | null;
  
  /** Optional: Full UserProfile if detailed info needed */
  profile?: UserProfile;
}

/**
 * STUDENT PROFILE - Student-specific view of UserProfile
 * Same structure whether viewing in class list, quiz attempts, or dashboard
 * 
 * NOTE: This is a specialized interface for API responses that return student data
 * in a specific format. For general user data, use UserProfile directly.
 */
export interface StudentProfile {
  /** Student ID (number for backward compatibility with existing APIs) */
  student_id: number;
  
  /** Student's full name */
  student_fullname: string;
  
  /** Student's username */
  student_username: string;
  
  /** Student's email */
  email: string;
  
  /** Student's phone number */
  phone: string;
  
  /** Student's avatar URL */
  avatar_url: string | null;
  
  /** User role (always 'student' for this interface) */
  role: string;
  
  /** Account status */
  status: string;
  
  /** Date of birth */
  dob: string | null;
  
  /** Last login timestamp */
  last_login: string;
  
  /** Optional: Full UserProfile for detailed information */
  profile?: UserProfile;
}

/**
 * LEGACY: Student alias for backward compatibility
 * @deprecated Use StudentProfile or UserProfile instead
 */
export type Student = StudentProfile;

/**
 * CLASSROOM - Classroom/class information
 * Same structure in all views (teacher dashboard, student dashboard, class lists)
 */
export interface Classroom {
  classroom_id: string;
  classroom_name: string;
  instructor: Instructor;
  total_students: number;
}

/**
 * QUIZ SUBMISSION - Student submission details
 * Consistent structure for submission tracking
 */
export interface QuizSubmission {
  summary: string | null;
  log_data: string | null; // JSON string containing detailed answers
  submitted_at: string | null;
  submission_id: number | null;
}

/**
 * QUIZ ATTEMPT - Universal attempt structure
 * Used in both teacher view (for student tracking) and student view (for own attempts)
 * This is the SINGLE SOURCE OF TRUTH for attempt data
 */
export interface QuizAttempt {
  // Student identification
  student_id: number;
  student_fullname?: string;
  student_username?: string;
  email?: string;
  avatar_url?: string | null;
  
  // Attempt details
  attempt_id: number | null;
  attempt_number: number | null;
  score: number | null;
  status: AttemptStatus;
  
  // Quiz reference
  quiz_id: number;
  class_id: string;
  
  // Timing
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  end_time: string; // Deadline
  time_spent_seconds: number | null;
  
  // Question data
  questions: QuizQuestionsData;
  
  // Submission
  submission?: QuizSubmission;
}

/**
 * PARSED QUIZ - Enriched quiz data with calculated fields
 * Use this for display in lists, cards, and dashboards
 * Extends raw quiz data with computed properties
 */
export interface ParsedQuiz {
  // Core quiz info
  quiz_id: number;
  class_id: string;
  classroom_name: string;
  quiz_name?: string;
  
  // Status & scoring
  status: AttemptStatus;
  score: number | null;
  
  // Dates
  end_time: string;
  created_at: string;
  completed_at: string | null;
  started_at: string | null;
  
  // Timing
  time_spent_seconds: number | null;
  attempt_number: number | null;
  
  // Computed fields - calculated from raw data
  question_count: number;
  correct_answers?: number;
  is_overdue: boolean;
  days_until_due?: number;
}

// ============================================================================
// TYPE ALIASES - For backward compatibility
// ============================================================================

/**
 * LEGACY: BaseQuiz alias for backward compatibility
 * @deprecated Use QuizDetails, TeacherQuiz, or StudentQuiz based on context
 */
export type BaseQuiz = QuizDetails;

// Note: TeacherQuiz and StudentQuiz are now proper extensions, not aliases

/**
 * LEGACY: Use ClassroomDetails for new code
 * @deprecated Use ClassroomDetails instead
 */
export type Classroom_Legacy = Classroom;

// ============================================================================
// STATISTICS - Different views share same stat structure
// ============================================================================

/**
 * DASHBOARD STATISTICS - Universal stat structure
 * Use appropriate fields based on context (teacher vs student)
 */
export interface DashboardStats {
  // Quiz counts (used by both)
  total_quizzes: number;
  completed_count: number;
  pending_count: number;
  missed_count: number;
  
  // Performance metrics (primarily student, but teachers can use for class averages)
  average_score: number;
  total_time_spent: number;
  total_questions_attempted: number;
  
  // Teacher-specific (optional - null for students)
  total_students?: number;
  total_classes?: number;
  active_assessments?: number;
  pending_reviews?: number;
  
  // Student-specific (optional - null for teachers)
  upcoming_assessments?: number;
  total_practice_time?: number;
}

/**
 * WEAK STUDENT - For teacher analytics
 * Identifies students needing attention
 */
export interface WeakStudent {
  student_id: number;
  student_fullname: string;
  student_username: string;
  avatar_url: string | null;
  average_score: number;
  completed_quizzes: number;
  weak_topics: string[];
}

/**
 * WEAK TOPIC - For student analytics
 * Identifies topics needing practice
 */
export interface WeakTopic {
  topic: string;
  quiz_count: number;
  average_score: number;
  last_attempt: string;
}

// ============================================================================
// API RESPONSE WRAPPERS
// ============================================================================

/**
 * DASHBOARD API RESPONSE - Generic wrapper for all dashboard API calls
 */
export interface DashboardApiResponse<T> {
  meta: {
    total_count: number;
    limit: number;
    offset: number;
    view_type: DashboardViewType;
  };
  data: T[];
}

/**
 * PAGINATION METADATA - For paginated API responses
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================================================
// FILTER INTERFACES
// ============================================================================

/**
 * BASE FILTER - Common filter fields
 */
export interface BaseQuizFilters {
  quiz_id?: number;
  classroom_id?: string;
  start_date?: string;
  end_date?: string;
  availability?: QuizAvailabilityStatus;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  view_type?: DashboardViewType;
  forceRefresh?: boolean;
}

/**
 * TEACHER QUIZ FILTERS - Extends base with teacher-specific options
 */
export interface TeacherQuizFilters extends BaseQuizFilters {
  classroom_id?: string;
  quiz_status?: QuizFilterStatus;
}

/**
 * STUDENT QUIZ FILTERS - Extends base with student-specific options
 */
export interface StudentQuizFilters extends BaseQuizFilters {
  attempt_status?: AttemptStatus;
}

// ============================================================================
// TYPE GUARDS & UTILITIES
// ============================================================================

/**
 * USER PROFILE UTILITIES
 */

/**
 * Type guard to check if user is a student
 */
export function isStudent(user: UserProfile): boolean {
  return user.role === 'student';
}

/**
 * Type guard to check if user is an instructor
 */
export function isInstructor(user: UserProfile): boolean {
  return user.role === 'instructor';
}

/**
 * Type guard to check if user is an admin
 */
export function isAdmin(user: UserProfile): boolean {
  return user.role === 'admin';
}

/**
 * Get display name from user profile
 */
export function getDisplayName(user: UserProfile): string {
  return user.full_name || user.username;
}

/**
 * Check if user account is active and verified
 */
export function isActiveUser(user: UserProfile): boolean {
  return user.is_active && user.is_verified && (user.suspended ?? 0) === 0;
}

/**
 * Convert UserProfile to StudentProfile format (for API compatibility)
 */
export function toStudentProfile(user: UserProfile): StudentProfile {
  return {
    student_id: parseInt(user.id),
    student_fullname: user.full_name || user.username,
    student_username: user.username,
    email: user.email,
    phone: user.phone || '',
    avatar_url: user.avatar_url || null,
    role: user.role,
    status: user.status || (user.is_active ? 'active' : 'inactive'),
    dob: user.date_of_birth || null,
    last_login: user.last_login || '',
    profile: user,
  };
}

/**
 * Convert StudentProfile to UserProfile format
 */
export function fromStudentProfile(student: StudentProfile): UserProfile {
  return {
    id: student.student_id.toString(),
    username: student.student_username,
    email: student.email,
    role: 'student',
    full_name: student.student_fullname,
    phone: student.phone || null,
    avatar_url: student.avatar_url,
    date_of_birth: student.dob,
    last_login: student.last_login || null,
    is_active: student.status === 'active',
    is_verified: true,
    created_at: new Date().toISOString(),
    name: student.student_fullname,
  };
}

/**
 * QUIZ ATTEMPT UTILITIES
 */

/**
 * Type guard to check if attempt is completed
 */
export function isCompletedAttempt(attempt: QuizAttempt): boolean {
  return attempt.status === 'completed';
}

/**
 * Type guard to check if quiz is overdue
 */
export function isQuizOverdue(endTime: string, status: AttemptStatus): boolean {
  return new Date() > new Date(endTime) && status === 'pending';
}

/**
 * Calculate question count from questions data
 */
export function getQuestionCount(questions: QuizQuestionsData): number {
  return questions?.quizzes?.length || 0;
}

/**
 * Parse correct answers from submission log data
 */
export function getCorrectAnswersCount(submission?: QuizSubmission): number {
  if (!submission?.log_data) return 0;
  try {
    const logData = JSON.parse(submission.log_data);
    return logData.answers?.filter((a: any) => a.isCorrect).length || 0;
  } catch {
    return 0;
  }
}

/**
 * Calculate days until due
 */
export function getDaysUntilDue(endTime: string): number {
  const now = new Date();
  const end = new Date(endTime);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Transform QuizAttempt to ParsedQuiz with all computed fields
 */
export function parseQuizAttempt(
  attempt: QuizAttempt, 
  classroomName: string = 'Unknown Class',
  quizName?: string
): ParsedQuiz {
  const questionCount = getQuestionCount(attempt.questions);
  const isOverdue = isQuizOverdue(attempt.end_time, attempt.status);
  const daysUntilDue = getDaysUntilDue(attempt.end_time);
  const correctAnswers = getCorrectAnswersCount(attempt.submission);
  
  return {
    quiz_id: attempt.quiz_id,
    class_id: attempt.class_id,
    classroom_name: classroomName,
    quiz_name: quizName,
    status: attempt.status,
    score: attempt.score,
    end_time: attempt.end_time,
    created_at: attempt.created_at,
    completed_at: attempt.completed_at,
    started_at: attempt.started_at,
    time_spent_seconds: attempt.time_spent_seconds,
    attempt_number: attempt.attempt_number,
    question_count: questionCount,
    correct_answers: correctAnswers > 0 ? correctAnswers : undefined,
    is_overdue: isOverdue,
    days_until_due: daysUntilDue > 0 ? daysUntilDue : undefined,
  };
}

// ============================================================================
// QUIZ DETAILS UTILITIES
// ============================================================================

/**
 * Type guard to check if quiz is a teacher quiz (has teacher-specific fields)
 */
export function isTeacherQuiz(quiz: QuizDetails | TeacherQuiz | StudentQuiz): quiz is TeacherQuiz {
  return 'total_students' in quiz && quiz.total_students !== undefined;
}

/**
 * Type guard to check if quiz is a student quiz (has student-specific fields)
 */
export function isStudentQuiz(quiz: QuizDetails | TeacherQuiz | StudentQuiz): quiz is StudentQuiz {
  return 'student_status' in quiz && quiz.student_status !== undefined;
}

/**
 * Get quiz availability for students
 */
export function getQuizAvailability(quiz: QuizDetails): QuizAvailabilityStatus {
  return quiz.availability_status;
}

/**
 * Check if quiz is currently available
 */
export function isQuizAvailable(quiz: QuizDetails): boolean {
  return quiz.availability_status === 'active';
}

/**
 * Check if quiz has expired
 */
export function isQuizExpired(quiz: QuizDetails): boolean {
  return quiz.availability_status === 'expired' || new Date() > new Date(quiz.end_time);
}

/**
 * Check if quiz is coming soon
 */
export function isQuizComingSoon(quiz: QuizDetails): boolean {
  return quiz.availability_status === 'available_soon' || new Date() < new Date(quiz.start_time);
}

/**
 * Get student completion percentage for a quiz (teacher view)
 */
export function getCompletionPercentage(quiz: TeacherQuiz): number {
  if (!quiz.total_students || quiz.total_students === 0) return 0;
  const completed = quiz.completed_count || 0;
  return Math.round((completed / quiz.total_students) * 100);
}

/**
 * Parse instructor JSON string to Instructor object
 */
export function parseInstructor(instructorJson: string | null | undefined): Instructor | null {
  if (!instructorJson) return null;
  try {
    return JSON.parse(instructorJson) as Instructor;
  } catch {
    return null;
  }
}

/**
 * Parse attempts JSON string to QuizAttempt array
 */
export function parseAttempts(attemptsJson: string | null | undefined): QuizAttempt[] {
  if (!attemptsJson) return [];
  try {
    return JSON.parse(attemptsJson) as QuizAttempt[];
  } catch {
    return [];
  }
}

/**
 * Enrich TeacherQuiz with parsed attempts
 */
export function enrichTeacherQuiz(quiz: TeacherQuiz): TeacherQuiz {
  return {
    ...quiz,
    parsed_attempts: parseAttempts(quiz.attempts),
  };
}

/**
 * Transform QuizDetails to ParsedQuiz for lightweight display
 */
export function parseQuizDetails(quiz: QuizDetails | StudentQuiz, classroomName?: string): ParsedQuiz {
  const studentQuiz = quiz as StudentQuiz;
  const status = studentQuiz.student_status || 'pending';
  const isOverdue = isQuizExpired(quiz) && status === 'pending';
  const daysUntilDue = getDaysUntilDue(quiz.end_time);
  
  return {
    quiz_id: quiz.quiz_id,
    class_id: quiz.classroom_id,
    classroom_name: classroomName || quiz.classroom_name,
    status,
    score: studentQuiz.score || studentQuiz.best_score || null,
    end_time: quiz.end_time,
    created_at: quiz.created_at,
    completed_at: studentQuiz.completed_at || null,
    started_at: studentQuiz.started_at || null,
    time_spent_seconds: studentQuiz.time_spent_seconds || null,
    attempt_number: studentQuiz.attempt_number || null,
    question_count: quiz.question_count,
    correct_answers: undefined,
    is_overdue: isOverdue,
    days_until_due: daysUntilDue > 0 ? daysUntilDue : undefined,
  };
}

/**
 * Convert API response to TeacherQuiz with enriched data
 */
export function toTeacherQuiz(apiData: any): TeacherQuiz {
  const quiz: TeacherQuiz = {
    ...apiData,
    total_students: apiData.total_students ?? 0,
    pending_count: apiData.pending_count ?? 0,
    in_progress_count: apiData.in_progress_count ?? 0,
    completed_count: apiData.completed_count ?? 0,
  };
  
  return enrichTeacherQuiz(quiz);
}

/**
 * Convert API response to StudentQuiz
 * Handles individual attempt objects from student_details view
 * 
 * IMPORTANT: Now receives INDIVIDUAL attempt objects from the attempts array
 * Quiz-level fields (session_id, class_id, etc.) are NOT in attempt objects
 * They come from the parent quiz response and must be passed separately
 * 
 * @param attemptData - Individual attempt object from attempts array
 * @param quizLevelData - Quiz-level fields from parent quiz object (session_id, class_id, classroom_name, instructor, etc.)
 */
export function toStudentQuiz(attemptData: any, quizLevelData?: any): StudentQuiz {
  // This is now a SINGLE attempt object, not a wrapper with attempts array
  
  // DEBUG: Log what we receive
  if (!quizLevelData?.session_id) {
    console.log('⚠️ toStudentQuiz: Missing session_id in quizLevelData', {
      quizLevelData,
      attemptQuizId: attemptData.quiz_id
    });
  }
  
  // Parse questions to get count
  let questionCount = 0;
  let actualSubject = '';
  
  // Try to get question count from multiple sources
  if (quizLevelData?.question_count && quizLevelData.question_count > 0) {
    questionCount = quizLevelData.question_count;
  } else if (attemptData.question_count && attemptData.question_count > 0) {
    questionCount = attemptData.question_count;
  } else {
    // Try parsing from questions or subject field
    try {
      // Check if questions field exists
      const questionsField = attemptData.questions || quizLevelData?.questions;
      
      // Check if subject field contains quiz JSON
      const subjectField = attemptData.subject || quizLevelData?.subject;
      
      let questionsData = null;
      
      if (questionsField) {
        questionsData = typeof questionsField === 'string' 
          ? JSON.parse(questionsField) 
          : questionsField;
      } else if (subjectField && typeof subjectField === 'string' && subjectField.includes('quizzes')) {
        // Subject field contains the quiz JSON - parse carefully
        try {
          questionsData = JSON.parse(subjectField);
        } catch (parseError) {
          console.error('Failed to parse subject field for questions:', parseError);
          // Subject might be a plain text subject name, not JSON
          questionsData = null;
        }
      }
      
      if (questionsData?.quizzes && Array.isArray(questionsData.quizzes)) {
        questionCount = questionsData.quizzes.length;
        console.log('✅ Parsed question count from JSON:', questionCount);
      }
    } catch (e) {
      console.error('Failed to parse questions (outer):', e);
    }
  }
  
  // Handle subject field - KEEP ORIGINAL subject with questions JSON
  // Don't transform it - QuizTakingScreen needs the questions JSON
  const subjectField = quizLevelData?.subject || attemptData.subject || '';

  // Determine student status
  const studentStatus: AttemptStatus = attemptData.status || quizLevelData?.status || 'pending';

  // Generate a unique quiz_id if none exists or is 0 - use session_id hash or timestamp
  let uniqueQuizId = attemptData.quiz_id || quizLevelData?.quiz_id;
  // Check for both null/undefined AND 0 (which is invalid)
  if (!uniqueQuizId || uniqueQuizId === 0) {
    // Generate a unique ID from session_id
    const sessionId = quizLevelData?.session_id || attemptData.session_id || '';
    if (sessionId) {
      // Simple hash function to convert session_id to a number
      uniqueQuizId = Math.abs(sessionId.split('').reduce((acc: number, char: string) => {
        return ((acc << 5) - acc) + char.charCodeAt(0);
      }, 0));
    } else {
      // Last resort: use timestamp + random
      uniqueQuizId = Date.now() + Math.floor(Math.random() * 10000);
    }
    console.warn('⚠️ Quiz missing quiz_id (was: ' + (attemptData.quiz_id || quizLevelData?.quiz_id) + '), generated:', uniqueQuizId, 'from session:', sessionId);
  }

  return {
    // Core quiz fields - prioritize quizLevelData for consistency
    quiz_id: uniqueQuizId,
    
    // Quiz-level fields from parent quiz object (not in attempt)
    // Use fallback chain: quizLevelData -> attemptData -> default
    session_id: quizLevelData?.session_id || attemptData.session_id || '',
    classroom_id: quizLevelData?.class_id || quizLevelData?.classroom_id || attemptData.classroom_id || '',
    //class_id: quizLevelData?.class_id || quizLevelData?.classroom_id || attemptData.classroom_id || '', // Alias for backward compatibility
    classroom_name: quizLevelData?.classroom_name || attemptData.classroom_name || 'Unknown Classroom',
    instructor: quizLevelData?.instructor || attemptData.instructor || null,
    
    // Attempt-level fields with quiz-level fallbacks
    quiz_name: quizLevelData?.quiz_name || attemptData.quiz_name || 'Untitled Quiz',
    topic: quizLevelData?.topic || attemptData.topic || '',
    subject: subjectField,
    //questions: quizLevelData?.questions || attemptData.questions || null,
    question_count: questionCount,
    quiz_type: quizLevelData?.quiz_type || attemptData.quiz_type,
    duration: quizLevelData?.duration || attemptData.duration || null,
    created_at: quizLevelData?.created_at || attemptData.created_at || new Date().toISOString(),
    start_time: quizLevelData?.start_time || attemptData.start_time || null,
    end_time: quizLevelData?.end_time || attemptData.end_time || null,
    assigned_at: attemptData.assigned_at || quizLevelData?.assigned_at || quizLevelData?.created_at || attemptData.created_at || new Date().toISOString(),
    due_date: attemptData.due_date || quizLevelData?.due_date || quizLevelData?.end_time || attemptData.end_time || null,
    file_name: attemptData.file_name,
    availability_status: quizLevelData?.availability_status || attemptData.availability_status || 'active',
    quiz_status: attemptData.quiz_status || 'active',
    has_time_limit: attemptData.has_time_limit ?? (quizLevelData?.duration ? true : false),
    
    // Student-specific fields from this attempt
    student_status: studentStatus,
    attempt_id: attemptData.attempt_id?.toString() || null,
    attempt_number: attemptData.attempt_number || (attemptData.attempt_id ? 1 : null),
    student_attempts: attemptData.student_attempts || (attemptData.attempt_id ? 1 : 0),
    score: attemptData.score !== undefined ? attemptData.score : null,
    best_score: attemptData.score !== undefined ? attemptData.score : null,
    latest_score: attemptData.score !== undefined ? attemptData.score : null,
    avg_score: attemptData.score !== undefined ? attemptData.score : null,
    started_at: attemptData.started_at || null,
    completed_at: attemptData.completed_at || null,
    time_spent_seconds: attemptData.time_spent_seconds || null,
    submission_id: attemptData.submission?.submission_id?.toString() || null,
    submitted_at: attemptData.submission?.submitted_at || null,
    log_data: attemptData.submission?.log_data || null,
    
    // Optional fields
    attempts_allowed: attemptData.attempts_allowed,
    view_type: attemptData.view_type,
    total_count: attemptData.total_count,
  };
}

// ============================================================================
// CLASSROOM DETAILS UTILITIES
// ============================================================================

/**
 * Get classroom display name
 */
export function getClassroomDisplayName(classroom: ClassroomDetails): string {
  return classroom.classroom_name;
}

/**
 * Check if classroom has students
 */
export function hasStudents(classroom: ClassroomDetails): boolean {
  return classroom.total_students > 0;
}

/**
 * Get classroom instructor name
 */
export function getClassroomInstructorName(classroom: ClassroomDetails): string {
  return classroom.instructor.instructor_fullname || classroom.instructor.instructor_username;
}

// ============================================================================
// STUDENT DASHBOARD FILTERING & PARSING
// ============================================================================

/**
 * STUDENT DASHBOARD FILTERS - Client-side filtering for student views
 * Use with existing API view_type=student_details
 */
export interface StudentDashboardFilters {
  /** Filter by classroom ('ALL' shows all classrooms) */
  classroomId?: string | 'ALL';
  
  /** Filter by specific quiz */
  quizId?: number;
  
  /** Filter by attempt status */
  status?: 'pending' | 'completed' | 'missed' | 'in_progress' | 'all';
  
  /** Minimum score filter */
  minScore?: number;
  
  /** Maximum score filter */
  maxScore?: number;
  
  /** Date range filter */
  dateRange?: {
    start: string;
    end: string;
  };
  
  /** Sort field */
  sortBy?: 'assigned_at' | 'completed_at' | 'score' | 'due_date';
  
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * STUDENT DASHBOARD QUIZ - Simplified view-specific structure
 * Derived from attempts array, used for UI display
 * Does NOT extend QuizDetails - this is a presentation model
 */
export interface StudentDashboardQuiz {
  // ========== Core Identity ==========
  quiz_id: number;
  quiz_name?: string;
  topic?: string;
  
  // ========== Classroom Info ==========
  classroom_id: string;
  classroom_name: string;
  
  // ========== Derived Status ==========
  /** Derived from attempt state (pending/in_progress/completed/missed) */
  status: 'pending' | 'completed' | 'missed' | 'in_progress';
  
  // ========== Scoring ==========
  score?: number;
  best_score?: number;
  
  // ========== Attempt Info ==========
  attempt_id?: number;
  attempt_number?: number;
  
  // ========== Timing ==========
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  due_date?: string;
  time_spent_seconds?: number;
}

/**
 * Derive attempt status based on timing and completion state
 * Rules:
 * - completed_at exists → 'completed'
 * - started_at exists but no completed_at → 'in_progress'
 * - current date > end_time → 'missed'
 * - else → 'pending'
 */
export function deriveAttemptStatus(
  attempt: any,
  currentDate: Date = new Date()
): 'pending' | 'completed' | 'missed' | 'in_progress' {
  // Already completed
  if (attempt.completed_at) {
    return 'completed';
  }
  
  // Started but not completed
  if (attempt.started_at) {
    return 'in_progress';
  }
  
  // Missed deadline
  if (attempt.end_time && new Date(attempt.end_time) < currentDate) {
    return 'missed';
  }
  
  // Not started, still available
  return 'pending';
}

/**
 * Parse student dashboard quizzes from API attempts array
 * Applies client-side filtering and sorting
 * Use with view_type=student_details API response
 * 
 * @param attempts - Raw attempts array from API response
 * @param filters - Client-side filters to apply
 * @returns Structured quiz list for student dashboard/assessments
 */
export function parseStudentDashboardQuizzes(
  attempts: any[],
  filters: StudentDashboardFilters = {}
): StudentDashboardQuiz[] {
  if (!Array.isArray(attempts) || attempts.length === 0) {
    return [];
  }

  const currentDate = new Date();
  
  // Step 1: Transform raw attempts to structured quizzes
  let quizzes: StudentDashboardQuiz[] = attempts.map((attempt) => {
    const status = deriveAttemptStatus(attempt, currentDate);
    
    return {
      quiz_id: attempt.quiz_id,
      quiz_name: attempt.quiz_name,
      topic: attempt.topic,
      classroom_id: attempt.class_id || attempt.classroom_id,
      classroom_name: attempt.classroom_name,
      status,
      score: attempt.score ?? undefined,
      best_score: attempt.best_score ?? undefined,
      attempt_id: attempt.attempt_id ?? undefined,
      attempt_number: attempt.attempt_number ?? undefined,
      assigned_at: attempt.assigned_at || attempt.created_at,
      started_at: attempt.started_at ?? undefined,
      completed_at: attempt.completed_at ?? undefined,
      due_date: attempt.due_date || attempt.end_time,
      time_spent_seconds: attempt.time_spent_seconds ?? undefined,
    };
  });

  // Step 2: Apply filters
  quizzes = quizzes.filter((quiz) => {
    // Filter by classroom
    if (filters.classroomId && filters.classroomId !== 'ALL') {
      if (quiz.classroom_id !== filters.classroomId) {
        return false;
      }
    }

    // Filter by quiz ID
    if (filters.quizId !== undefined) {
      if (quiz.quiz_id !== filters.quizId) {
        return false;
      }
    }

    // Filter by status
    if (filters.status && filters.status !== 'all') {
      if (quiz.status !== filters.status) {
        return false;
      }
    }

    // Filter by score range
    if (filters.minScore !== undefined && quiz.score !== undefined) {
      if (quiz.score < filters.minScore) {
        return false;
      }
    }
    if (filters.maxScore !== undefined && quiz.score !== undefined) {
      if (quiz.score > filters.maxScore) {
        return false;
      }
    }

    // Filter by date range
    if (filters.dateRange) {
      const assignedDate = quiz.assigned_at ? new Date(quiz.assigned_at) : null;
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      if (assignedDate) {
        if (assignedDate < startDate || assignedDate > endDate) {
          return false;
        }
      }
    }

    return true;
  });

  // Step 3: Sort results
  if (filters.sortBy) {
    quizzes.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'assigned_at':
          aValue = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
          bValue = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
          break;
        case 'completed_at':
          aValue = a.completed_at ? new Date(a.completed_at).getTime() : 0;
          bValue = b.completed_at ? new Date(b.completed_at).getTime() : 0;
          break;
        case 'score':
          aValue = a.score ?? 0;
          bValue = b.score ?? 0;
          break;
        case 'due_date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        default:
          return 0;
      }

      const order = filters.sortOrder === 'desc' ? -1 : 1;
      return (aValue - bValue) * order;
    });
  }

  return quizzes;
}

/**
 * Calculate student dashboard statistics from parsed quizzes
 * Use this instead of fetching separate stats from API
 */
export function calculateStudentDashboardStats(
  quizzes: StudentDashboardQuiz[]
): {
  total_quizzes: number;
  completed_count: number;
  pending_count: number;
  missed_count: number;
  in_progress_count: number;
  average_score: number;
} {
  const total_quizzes = quizzes.length;
  const completed_count = quizzes.filter(q => q.status === 'completed').length;
  const pending_count = quizzes.filter(q => q.status === 'pending').length;
  const missed_count = quizzes.filter(q => q.status === 'missed').length;
  const in_progress_count = quizzes.filter(q => q.status === 'in_progress').length;
  
  const scores = quizzes
    .filter(q => q.score !== undefined)
    .map(q => q.score!);
  
  const average_score = scores.length > 0
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;

  return {
    total_quizzes,
    completed_count,
    pending_count,
    missed_count,
    in_progress_count,
    average_score: Math.round(average_score),
  };
}

/**
 * Convert basic Classroom to ClassroomDetails
 */
export function toClassroomDetails(classroom: Classroom): ClassroomDetails {
  return {
    classroom_id: classroom.classroom_id,
    classroom_name: classroom.classroom_name,
    instructor: classroom.instructor,
    total_students: classroom.total_students,
  };
}

