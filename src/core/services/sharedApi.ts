/**
 * Shared API Service
 * Contains endpoints for quiz submissions and attempts
 */

import { apiClient } from '../api/config';
import type { WorksheetDataShape } from '../types/worksheet.types';
import {
  listQuizAttempts,
  selectAttemptForSubmission,
  QuizAttemptLookupError,
} from './quizAttemptApi';
import {
  buildWorksheetGeneratePayload,
  type WorksheetGenerateInput,
} from '../utils/worksheetGeneratePayload';

// ============================================================================
// QUIZ ATTEMPTS
// ============================================================================

/**
 * Create a new quiz attempt
 * POST /api/v1/dashboard/quiz-attempts
 */
export async function createQuizAttempt(data: {
  quiz_id: number | string;
  student_id: string;
  class_id: string; // session_id
  attempt_number: number;
  status?: 'started' | 'completed' | 'abandoned';
  started_at?: string;
}): Promise<{
  id: number;
  quiz_id: number;
  student_id: string;
  class_id: string;
  attempt_number: number;
  score: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number | null;
}> {
  const response = await apiClient.post('/api/v1/dashboard/quiz-attempts', data);
  return response.data;
}

/**
 * Update an existing quiz attempt
 * PUT /api/v1/dashboard/quiz-attempts/{attempt_id}
 */
export async function updateQuizAttempt(
  attemptId: number,
  data: {
    score?: number | null;
    status?: 'started' | 'completed' | 'abandoned' | null;
    completed_at?: string | null;
    time_spent_seconds?: number | null;
  }
): Promise<{
  id: number;
  quiz_id: number;
  student_id: string;
  class_id: string;
  attempt_number: number;
  score: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number | null;
}> {
  const response = await apiClient.put(`/api/v1/dashboard/quiz-attempts/${attemptId}`, data);
  return response.data;
}

/**
 * Find an existing attempt or create a new one — mirrors the web's ensureAttempt().
 * 1. GET existing attempts for this quiz/student/class combination.
 * 2. If a 'started' or any attempt is found, reuse it.
 * 3. Otherwise POST to create a new one.
 * 4. If creation fails (e.g. 409 race-condition), GET again and return whatever exists.
 * Returns the attempt ID, or undefined if every approach fails (callers should still
 * proceed with the submission in that case).
 */
export async function findOrCreateAttempt(data: {
  quiz_id: number | string;
  student_id: string;
  class_id: string; // assignment session_id (UUID), same as web OpenQuizPage
  started_at: string;
}): Promise<number | undefined> {
  const { quiz_id, student_id, class_id, started_at } = data;

  let attempts;
  try {
    attempts = await listQuizAttempts({ quiz_id, student_id, class_id });
  } catch (error) {
    if (error instanceof QuizAttemptLookupError) {
      throw error;
    }
    throw error;
  }

  const existing = selectAttemptForSubmission(attempts);
  if (existing) {
    console.log('♻️ Reusing existing attempt:', { id: existing.id, status: existing.status });
    return existing.id;
  }

  try {
    const response = await apiClient.post('/api/v1/dashboard/quiz-attempts', {
      quiz_id,
      student_id,
      class_id,
      attempt_number: 1,
      status: 'started',
      started_at,
    });
    const newId = response.data?.id as number;
    console.log('✅ New attempt created:', newId);
    return newId;
  } catch (createError: any) {
    console.warn('⚠️ Attempt creation failed, re-checking for existing:', createError?.message);
    const attemptsAfter = await listQuizAttempts({ quiz_id, student_id, class_id });
    const recovered = selectAttemptForSubmission(attemptsAfter);
    return recovered?.id;
  }
}

/**
 * Check if student has already attempted a quiz
 * Uses GET /api/v1/dashboard/quiz-attempts with filters
 */
/**
 * Check if student has already attempted this quiz
 * Uses the same approach as the React web app for consistency
 * IMPORTANT: For quiz-attempts API, class_id = sessionId
 */
export async function checkQuizAttempt(
  quizId: number | string,
  studentId: string,
  classroomId?: string
): Promise<{
  hasAttempted: boolean;
  lookupFailed?: boolean;
  attemptId?: number;
  score?: number;
  status?: string;
  completedAt?: string;
}> {
  try {
    // Build query params - always include class_id if provided (same as web app)
    const params = new URLSearchParams({
      quiz_id: quizId.toString(),
      student_id: studentId,
    });

    if (classroomId) {
      params.append('class_id', classroomId);
    }
    
    console.log('🔍 Checking quiz attempts:', {
      quiz_id: quizId,
      student_id: studentId,
      class_id: classroomId,
      url: `/api/v1/dashboard/quiz-attempts?${params.toString()}`
    });
    
    const response = await apiClient.get(`/api/v1/dashboard/quiz-attempts?${params.toString()}`);
    const attempts = response.data;
    
    console.log('📊 Quiz attempts response:', {
      attemptsCount: Array.isArray(attempts) ? attempts.length : 0,
      attempts: JSON.stringify(attempts, null, 2)
    });
    
    // Check if any completed attempts exist (same logic as web app)
    if (Array.isArray(attempts) && attempts.length > 0) {
      const completedAttempt = attempts.find((a: any) => a.status === 'completed');
      
      if (completedAttempt) {
        console.log('✅ Found completed quiz attempt:', {
          attemptId: completedAttempt.id,
          score: completedAttempt.score,
          status: completedAttempt.status,
          completedAt: completedAttempt.completed_at
        });
        
        return {
          hasAttempted: true,
          attemptId: completedAttempt.id,
          score: completedAttempt.score,
          status: completedAttempt.status,
          completedAt: completedAttempt.completed_at,
        };
      }
      
      // If no completed attempt found, check for any attempt in progress
      const latestAttempt = attempts[0];
      console.log('⚠️ Found quiz attempt (not completed):', {
        attemptId: latestAttempt.id,
        status: latestAttempt.status,
      });
      
      // Only block if status is 'completed'
      return { hasAttempted: false };
    }
    
    console.log('⚠️ No quiz attempts found for this student');
    return { hasAttempted: false };
  } catch (error) {
    console.error('❌ Error checking quiz attempt:', error);
    return { hasAttempted: false, lookupFailed: true };
  }
}

/**
 * Create a quiz submission
 * POST /api/v1/dashboard/quiz-submissions
 *
 * OpenAPI `QuizSubmissionCreateRequest` fields only: quiz_id, student_id,
 * classroom_id, score, summary, log_data, submitted_at. There is no
 * attempt_id property and no PUT/PATCH for this resource.
 */
export async function createQuizSubmission(data: {
  quiz_id: number | string;
  student_id: string;
  classroom_id: string; // session_id
  score: number;
  summary?: string | null;
  log_data?: Record<string, unknown> | null;
  submitted_at?: string | null;
}): Promise<{
  submission_id: number;
  quiz_id: number;
  student_id: string;
  classroom_id: string;
  score: number;
  summary: string | null;
  log_data: Record<string, unknown> | null;
  submitted_at: string;
}> {
  const response = await apiClient.post('/api/v1/dashboard/quiz-submissions', data);
  return response.data;
}

/**
 * Check if student is enrolled in a classroom
 * GET /api/v1/dashboard/classrooms/{classroomId}/students/{studentId}
 */
export async function checkStudentEnrollment(
  classroomId: string,
  studentId: string
): Promise<{
  isEnrolled: boolean;
  enrollment?: {
    id: number;
    student_id: string;
    classroom_id: string;
    enrolled_at: string;
    status: string;
  };
}> {
  try {
    const response = await apiClient.get(`/api/v1/dashboard/classrooms/${classroomId}/students/${studentId}`);
    
    if (response.data && response.data.enrollment) {
      return {
        isEnrolled: true,
        enrollment: response.data.enrollment,
      };
    }
    
    return { isEnrolled: false };
  } catch (error: any) {
    // If 404, student is not enrolled
    if (error.response?.status === 404) {
      return { isEnrolled: false };
    }
    
    // For other errors, assume not enrolled to be safe
    console.error('Error checking student enrollment:', error);
    return { isEnrolled: false };
  }
}
export async function getQuizBySessionId(
  sessionId: string,
  skipAuth: boolean = false,
  cfTurnstileToken?: string
): Promise<{
  success: boolean;
  message: string;
  quiz_data: {
    quiz_id: number;
    topic: string;
    summary: string;
    created_by: string;
    questions: {
      quizzes: Array<{
        quiz: {
          question: string;
          options: string[];
          answer: string;
        };
        answer: string;
      }>;
    };
    question_count: number;
    is_public: boolean;
    is_timer: boolean;
    duration: number;
    start_time: string;
    end_time: string;
    has_time_limit: boolean;
    attempts?: Array<{
      student_id?: string;
      user_id?: string;
      score?: number;
      status?: string;
    }>;
  } | null;
}> {
  const queryParams = new URLSearchParams({
    session_id: sessionId,
  });

  // Only send skip_auth when explicitly requested (web app doesn't send it by default)
  if (skipAuth) {
    queryParams.append('skip_auth', 'true');
  }

  if (cfTurnstileToken) {
    queryParams.append('cf_turnstile_token', cfTurnstileToken);
  }

  const response = await apiClient.get(`/api/v1/quiz?${queryParams.toString()}`);
  return response.data;
}

// ============================================================================
// QUIZ GENERATION
// ============================================================================

/**
 * Generate AI quiz
 * POST /api/v1/quiz/generate
 */
export async function generateAIQuiz(data: {
  class: string;
  subject: string;
  lesson: string;
  level: string;
  count: number;
  itext?: string;
  topic?: string;
  language?: string;
}): Promise<any> {
  const response = await apiClient.post('/api/v1/quiz/generate', data);
  return response.data;
}

/**
 * Generate competitive exam assessment
 * POST /api/v1/quiz/generate-exam-assessment
 */
export async function generateCompetitiveAIQuiz(data: {
  exam: string;
  count: number;
  itext?: string;
  stream: string;
  category: string;
  subject_requirement?: string;
  subject: string;
  topic: string;
  level: string;
  input_text: string;
  language?: string;
}): Promise<any> {
  const response = await apiClient.post('/api/v1/quiz/generate-exam-assessment', data);
  return response.data;
}

/**
 * Generate quiz from YouTube video
 * POST /api/v1/ytlink
 */
export async function generateYouTubeQuiz(data: {
  url: string;
  student_level?: 'elementary' | 'middle_school' | 'high' | 'college';
}): Promise<any> {
  const response = await apiClient.post('/api/v1/ytlink', data);
  return response.data;
}

/**
 * Generate quiz from image
 * POST /api/v1/analyze-image
 */
export async function generateImageQuiz(formData: FormData): Promise<any> {
  const response = await apiClient.post('/api/v1/analyze-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * Generate quiz from PDF/Document
 * POST /api/v1/upload-educational-pdf
 */
export async function generatePDFQuiz(formData: FormData): Promise<any> {
  const response = await apiClient.post('/api/v1/upload-educational-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * Generate quiz from website
 * POST /api/v1/websitesummary
 */
export async function generateWebsiteQuiz(data: {
  weblink: string;
  student_level: string;
  additional_instructions?: string;
}): Promise<any> {
  const response = await apiClient.post('/api/v1/websitesummary', data);
  return response.data;
}

/**
 * Get quiz question explanation
 * POST /api/v1/quiz/explanation
 */
export async function getQuizExplanation(data: {
  question_id: string;
  question_text: string;
  options: string[];
  selected_answer: string;
}): Promise<{
  question_id: string;
  correct_answer: string;
  explanation: {
    correct_reason: string;
    wrong_options: { [key: string]: string };
    educational_fact: string;
  };
}> {
  const response = await apiClient.post('/api/v1/quiz/explanation', data);
  return response.data;
}

// ============================================================================
// USER ASSESSMENTS (saved quiz/worksheet history)
// ============================================================================

export interface AssessmentListItem {
  id: number;
  title: string;
  subject?: string;
  class_name?: string;
  level?: string;
  lesson?: string;
  assessment_type: string;
  question_count: number;
  created_at: string;
  source?: string;
}

export interface AssessmentDetail extends AssessmentListItem {
  questions: any[];
  responses?: Record<string, string>;
}

export interface SaveAssessmentPayload {
  title: string;
  subject?: string;
  class_name?: string;
  level?: string;
  lesson?: string;
  questions: any[];
  assessment_type: string;
  school_id?: number | null;
  source?: string;
}

/**
 * List saved user assessments
 * GET /api/v1/user-assessments
 */
export async function listUserAssessments(
  assessment_type?: string,
  source?: string,
): Promise<AssessmentListItem[]> {
  try {
    const qs = new URLSearchParams();
    if (assessment_type) qs.set('assessment_type', assessment_type);
    if (source) qs.set('source', source);
    const params = qs.toString() ? `?${qs.toString()}` : '';
    const response = await apiClient.get(`/api/v1/user-assessments${params}`);
    return Array.isArray(response.data) ? response.data : (response.data?.items || []);
  } catch {
    return [];
  }
}

/**
 * Get a single saved assessment with its questions
 * GET /api/v1/user-assessments/:id
 */
export async function getUserAssessmentById(id: number): Promise<AssessmentDetail | null> {
  try {
    const response = await apiClient.get(`/api/v1/user-assessments/${id}`);
    return response.data;
  } catch {
    return null;
  }
}

/**
 * Save a new user assessment
 * POST /api/v1/user-assessments
 */
export async function saveUserAssessment(
  payload: SaveAssessmentPayload,
): Promise<AssessmentListItem | null> {
  try {
    const response = await apiClient.post('/api/v1/user-assessments', payload);
    return response.data;
  } catch (err: any) {
    console.warn('saveUserAssessment failed:', err?.message);
    return null;
  }
}

/**
 * Delete a saved assessment
 * DELETE /api/v1/user-assessments/:id
 */
export async function deleteUserAssessment(id: number): Promise<void> {
  try {
    await apiClient.delete(`/api/v1/user-assessments/${id}`);
  } catch {
    // silently ignore
  }
}

/**
 * Persist the user's in-quiz answers so they can be restored later.
 * PUT /api/v1/user-assessments/:id/responses
 * Mirrors the web's userAssessmentService.updateResponses().
 * Non-blocking: failures are swallowed so quiz-taking is never interrupted.
 */
export async function updateAssessmentResponses(
  id: number,
  responses: Record<string, string>,
): Promise<void> {
  try {
    await apiClient.put(`/api/v1/user-assessments/${id}/responses`, { responses });
  } catch (err: any) {
    console.warn('updateAssessmentResponses failed:', err?.message);
  }
}

/**
 * Update the explanation text for a single question of a saved assessment.
 * PATCH /api/v1/user-assessments/:id/questions/:idx/explanation
 * Mirrors the web's userAssessmentService.updateExplanation().
 */
export async function updateQuestionExplanation(
  assessmentId: number,
  questionIdx: number,
  explanation: string,
): Promise<void> {
  await apiClient.patch(
    `/api/v1/user-assessments/${assessmentId}/questions/${questionIdx}/explanation`,
    { explanation },
  );
}

// ============================================================================
// WORKSHEET GENERATION
// ============================================================================

/**
 * Generate a worksheet
 * POST /api/v1/worksheet/generate
 */
export interface WorksheetEvaluateResult {
  success: boolean;
  results: Array<{
    id: number;
    section: string;
    isCorrect: boolean;
    marksObtained: number;
    maxMarks: number;
    feedback?: string;
  }>;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  message: string;
  processing_time_ms?: number;
}

/**
 * Evaluate worksheet answers using LLM grading
 * POST /api/v1/worksheet/evaluate
 */
export async function evaluateWorksheet(
  worksheetData: WorksheetDataShape,
  answers: Record<string, Array<{ id: number; answer: string }>>,
): Promise<WorksheetEvaluateResult> {
  const response = await apiClient.post<WorksheetEvaluateResult>('/api/v1/worksheet/evaluate', {
    worksheetData,
    answers,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Worksheet evaluation failed');
  }

  return response.data;
}

export async function generateWorksheet(data: WorksheetGenerateInput): Promise<any> {
  const payload = buildWorksheetGeneratePayload(data);
  const response = await apiClient.post('/api/v1/worksheet/generate', payload);
  return response.data;
}

// ============================================================================
// TOPIC SUMMARY
// ============================================================================

export interface TopicSummaryResponse {
  content: string;
  format_type: string;
  title?: string;
  subject?: string;
  keywords?: string[];
}

/**
 * Generate an AI topic summary (web parity: POST /api/v1/topicSummary).
 */
export async function generateTopicSummary(userPrompt: string): Promise<TopicSummaryResponse> {
  const formData = new URLSearchParams();
  formData.append('userPrompt', userPrompt.trim());

  const response = await apiClient.post<TopicSummaryResponse>('/api/v1/topicSummary', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 120000,
  });

  if (!response.data?.content || !response.data?.format_type) {
    throw new Error('Invalid topic summary response');
  }

  return response.data;
}
