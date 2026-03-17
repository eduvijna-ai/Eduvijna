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
  class_id: string;   // Should be classroomId ("class_XXXX"), not session UUID
  started_at: string;
}): Promise<number | undefined> {
  const { quiz_id, student_id, class_id, started_at } = data;

  const fetchExisting = async (): Promise<number | undefined> => {
    try {
      const params = new URLSearchParams({
        quiz_id: quiz_id.toString(),
        student_id,
        class_id,
      });
      const response = await apiClient.get(`/api/v1/dashboard/quiz-attempts?${params.toString()}`);
      const attempts = response.data;
      if (Array.isArray(attempts) && attempts.length > 0) {
        // Prefer a 'started' (in-progress) attempt; otherwise fall back to any
        const started = attempts.find((a: any) => a.status === 'started');
        const pick = started ?? attempts[0];
        console.log('♻️ Reusing existing attempt:', { id: pick.id, status: pick.status });
        return pick.id as number;
      }
    } catch (e: any) {
      console.warn('⚠️ Could not fetch existing attempts:', e?.message);
    }
    return undefined;
  };

  // Step 1 — look for an existing attempt
  const existingId = await fetchExisting();
  if (existingId !== undefined) return existingId;

  // Step 2 — create a new attempt
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
    // Step 3 — creation failed (possibly 409 / validation); re-fetch in case it was a race
    console.warn('⚠️ Attempt creation failed, re-checking for existing:', createError?.message);
    return fetchExisting();
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
    // Don't block user on API errors - let them proceed
    return { hasAttempted: false };
  }
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
