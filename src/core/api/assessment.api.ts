/**
 * Assessment API
 * Handles all assessment-related API calls using quiz endpoints
 */

import { get, post, put, del } from './config';
import {
  fetchTeacherQuizzes,
  fetchStudentQuizzes,
} from '../services/dashboardApi';
import type { AssessmentStatus } from '../types';
import type {
  Assessment,
  StudentAssessment,
  AssessmentResult,
  Question,
  PaginatedResponse,
  PaginationParams,
  AssessmentFilters,
} from '../types';
import type { TeacherQuiz, StudentQuiz, TeacherQuizFilters, StudentQuizFilters } from '../types/quiz.types';

/**
 * Map teacher quiz to Assessment type
 */
function mapTeacherQuizToAssessment(quiz: TeacherQuiz): Assessment {
  let instructor = null;
  try {
    instructor = quiz.instructor ? JSON.parse(quiz.instructor) : null;
  } catch (e) {
    console.error('Failed to parse instructor:', e);
  }

  return {
    id: quiz.quiz_id.toString(),
    title: quiz.quiz_name,
    description: quiz.topic || '',
    type: quiz.quiz_status || 'quiz',
    status: mapQuizStatusToAssessmentStatus(quiz.availability_status, quiz.quiz_status),
    difficulty: 'medium', // Default as quiz doesn't have difficulty
    totalQuestions: quiz.question_count,
    totalMarks: quiz.question_count * 10, // Estimate
    passingMarks: quiz.question_count * 6, // 60% estimate
    duration: quiz.duration || 30,
    scheduledAt: quiz.start_time,
    createdAt: quiz.created_at,
    updatedAt: quiz.created_at,
    instructorId: instructor?.instructor_id || '',
    instructorName: instructor?.instructor_fullname || 'Unknown',
    classroomId: quiz.classroom_id,
    classroomName: quiz.classroom_name,
    subject: quiz.subject,
    // Teacher specific
    totalStudents: quiz.total_students || 0,
    pendingCount: quiz.pending_count || 0,
    inProgressCount: quiz.in_progress_count || 0,
    completedCount: quiz.completed_count || 0,
  };
}

/**
 * Map student quiz to StudentAssessment type
 */
function mapStudentQuizToAssessment(quiz: StudentQuiz): StudentAssessment {
  const isAttempted = quiz.student_attempts && quiz.student_attempts > 0;
  
  return {
    id: quiz.quiz_id.toString(),
    title: quiz.quiz_name,
    description: quiz.topic || '',
    type: quiz.quiz_status || 'quiz',
    status: mapQuizStatusToAssessmentStatus(quiz.availability_status, quiz.student_status),
    difficulty: 'medium',
    totalQuestions: quiz.total_questions || quiz.question_count,
    totalMarks: (quiz.total_questions || quiz.question_count) * 10,
    passingMarks: (quiz.total_questions || quiz.question_count) * 6,
    duration: quiz.duration || 30,
    scheduledAt: quiz.start_time,
    createdAt: quiz.created_at,
    updatedAt: quiz.created_at,
    classroomId: quiz.classroom_id,
    classroomName: quiz.classroom_name,
    subject: quiz.subject,
    // Student specific
    isAttempted,
    attemptsAllowed: quiz.attempts_allowed || 1,
    attemptsUsed: quiz.student_attempts || 0,
    score: quiz.best_score || quiz.latest_score,
    percentage: quiz.best_score ? (quiz.best_score / (quiz.total_questions || quiz.question_count) / 10) * 100 : undefined,
    submittedAt: isAttempted ? quiz.assigned_at : undefined,
    dueDate: quiz.due_date,
  };
}

/**
 * Map quiz status to assessment status
 */
function mapQuizStatusToAssessmentStatus(availabilityStatus: string, quizStatus: string): AssessmentStatus {
  if (availabilityStatus === 'active') return 'active';
  if (availabilityStatus === 'expired') return 'expired';
  if (availabilityStatus === 'available_soon') return 'available_soon';
  return 'available_soon';
}

/**
 * Fetch assessments with pagination and filters
 */
export async function fetchAssessments(
  params: PaginationParams & AssessmentFilters
): Promise<PaginatedResponse<Assessment>> {
  const filters: TeacherQuizFilters = {
    view_type: 'summary',
    limit: params.pageSize || 20,
    offset: ((params.page || 1) - 1) * (params.pageSize || 20),
  };

  // Map status filter
  if (params.status && params.status.length > 0) {
    // Filter will be applied client-side for now
  }

  const response = await fetchTeacherQuizzes(filters);
  const assessments = response.data.map(mapTeacherQuizToAssessment);
  
  // Apply status filter client-side
  let filtered = assessments;
  if (params.status && params.status.length > 0) {
    filtered = assessments.filter(a => params.status!.includes(a.status));
  }

  return {
    data: filtered,
    pagination: {
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      total: response.meta.total_count,
      hasNext: (params.page || 1) * (params.pageSize || 20) < response.meta.total_count,
    },
  };
}

/**
 * Fetch student assessments (includes attempt status)
 */
export async function fetchStudentAssessments(
  studentId: string,
  params: PaginationParams & AssessmentFilters
): Promise<PaginatedResponse<StudentAssessment>> {
  const filters: StudentQuizFilters = {
    view_type: 'summary',
    limit: params.pageSize || 20,
    offset: ((params.page || 1) - 1) * (params.pageSize || 20),
  };

  const response = await fetchStudentQuizzes(filters);
  const assessments = response.data.map(mapStudentQuizToAssessment);
  
  // Apply status filter client-side
  let filtered = assessments;
  if (params.status && params.status.length > 0) {
    filtered = assessments.filter(a => params.status!.includes(a.status as any));
  }

  return {
    data: filtered,
    pagination: {
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      total: response.meta.total_count,
      hasNext: (params.page || 1) * (params.pageSize || 20) < response.meta.total_count,
    },
  };
}

/**
 * Fetch single assessment by ID
 */
export async function fetchAssessmentById(assessmentId: string): Promise<Assessment> {
  return get<Assessment>(`/assessments/${assessmentId}`);
}

/**
 * Create new assessment
 */
export async function createAssessment(
  data: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Assessment> {
  return post<Assessment>('/assessments', data);
}

/**
 * Update existing assessment
 */
export async function updateAssessment(
  assessmentId: string,
  data: Partial<Assessment>
): Promise<Assessment> {
  return put<Assessment>(`/assessments/${assessmentId}`, data);
}

/**
 * Delete assessment
 */
export async function deleteAssessment(assessmentId: string): Promise<void> {
  await del<void>(`/assessments/${assessmentId}`);
}

/**
 * Fetch questions for an assessment
 */
export async function fetchAssessmentQuestions(assessmentId: string): Promise<Question[]> {
  return get<Question[]>(`/assessments/${assessmentId}/questions`);
}

/**
 * Start an assessment attempt
 */
export async function startAssessment(assessmentId: string): Promise<{
  attemptId: string;
  startedAt: string;
}> {
  return post<{ attemptId: string; startedAt: string }>(
    `/assessments/${assessmentId}/start`
  );
}

/**
 * Submit assessment answers
 */
export async function submitAssessment(
  assessmentId: string,
  attemptId: string,
  answers: Record<string, string | string[]>
): Promise<AssessmentResult> {
  return post<AssessmentResult>(`/assessments/${assessmentId}/submit`, {
    attemptId,
    answers,
  });
}

/**
 * Fetch assessment result
 */
export async function fetchAssessmentResult(
  assessmentId: string,
  attemptId: string
): Promise<AssessmentResult> {
  return get<AssessmentResult>(`/assessments/${assessmentId}/results/${attemptId}`);
}

/**
 * Fetch all results for a student
 */
export async function fetchStudentResults(
  studentId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<AssessmentResult>> {
  return get<PaginatedResponse<AssessmentResult>>(
    `/students/${studentId}/results`,
    params
  );
}

/**
 * Fetch upcoming assessments for a student
 */
export async function fetchUpcomingAssessments(studentId: string): Promise<Assessment[]> {
  return get<Assessment[]>(`/students/${studentId}/assessments/upcoming`);
}

/**
 * Fetch scheduled assessments for a student
 */
export async function fetchScheduledAssessments(studentId: string): Promise<Assessment[]> {
  return get<Assessment[]>(`/students/${studentId}/assessments/scheduled`);
}
