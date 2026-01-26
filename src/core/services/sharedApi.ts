/**
 * Shared API Service
 * Contains endpoints for quiz submissions and attempts
 */

import { apiClient } from '../api/config';

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
 * Create a quiz submission
 * POST /api/v1/dashboard/quiz-submissions
 */
export async function createQuizSubmission(data: {
  quiz_id: number | string;
  student_id: string;
  classroom_id: string; // session_id
  score: number;
  summary?: string | null;
  log_data?: Record<string, any> | null;
  submitted_at?: string | null;
}): Promise<{
  submission_id: number;
  quiz_id: number;
  student_id: string;
  classroom_id: string;
  score: number;
  summary: string | null;
  log_data: Record<string, any> | null;
  submitted_at: string;
}> {
  const response = await apiClient.post('/api/v1/dashboard/quiz-submissions', data);
  return response.data;
}

/**
 * Retrieve quiz metadata by session ID
 * GET /api/v1/quiz
 */
export async function getQuizBySessionId(
  sessionId: string,
  skipAuth: boolean = false,
  cfTurnstileToken?: string
): Promise<{
  success: boolean;
  message: string;
  quiz_data: {
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
    quiz_id: number;
  } | null;
}> {
  const queryParams = new URLSearchParams({
    session_id: sessionId,
    skip_auth: skipAuth.toString(),
  });

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
}): Promise<any> {
  const response = await apiClient.post('/api/v1/quiz/generate', data);
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
