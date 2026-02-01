/**
 * Unified OpenQuiz Handler - SINGLE SOURCE OF TRUTH
 * ===================================================
 * ALL quiz validation, availability checking, and navigation logic is centralized here.
 * 
 * RESPONSIBILITIES:
 * 1. Authentication validation
 * 2. Fetch quiz data by sessionId
 * 3. Quiz availability checking (expired, not started, active)
 * 4. User role-based validation (student assignment, attempt status)
 * 5. Data normalization to consistent shape
 * 6. Navigation decisions based on all validation results
 * 
 * QuizTakingScreen should ONLY render quiz questions - NO validation logic.
 */

import { fetchQuizDetailsBySessionId } from './dashboardApi';

export type OpenQuizSource = 'deep_link' | 'notification' | 'post_login';

export type QuizValidationResult = {
  exists: boolean;
  isExpired: boolean;
  isScheduled: boolean;
  isAssigned: boolean;
  isAttempted: boolean;
  quizData: any | null;
  startTime: Date | null;
  endTime: Date | null;
  attemptData?: any;
};

/**
 * Normalized Quiz Structure - Consistent shape for all quiz types
 */
export interface NormalizedQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  answer?: string;
  explanation: string | null;
}

export interface NormalizedQuiz {
  quizId: string | number;
  sessionId: string | null;
  classroomId: string | null;
  type: 'SELF' | 'ASSIGNED';
  title: string;
  class?: string;
  subject?: string;
  difficulty?: string;
  lesson?: string;
  duration: number;
  has_time_limit?: boolean;
  is_public?: boolean;
  questions: NormalizedQuestion[];
  start_time?: string | null;
  end_time?: string | null;
  regenerationParams?: any;
}

interface User {
  id: string;
  role: 'instructor' | 'admin' | 'student' | string;
}

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  alert: (title: string, message: string, buttons?: any[]) => void;
}

/**
 * Check quiz availability based on start_time and end_time
 * Returns availability status with formatted time strings
 */
function checkQuizAvailability(quizData: any): {
  available: boolean;
  startTime: string;
  endTime: string;
  expired?: boolean;
} {
  // Only check for assigned quizzes (those with start_time/end_time)
  if (!quizData?.start_time || !quizData?.end_time) {
    return { available: true, startTime: '', endTime: '' };
  }

  const now = new Date();
  const startTime = new Date(quizData.start_time);
  const endTime = new Date(quizData.end_time);

  // Format dates for display
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (now < startTime) {
    // Quiz hasn't started yet
    return {
      available: false,
      startTime: formatDateTime(startTime),
      endTime: formatDateTime(endTime),
    };
  }

  if (now > endTime) {
    // Quiz has ended
    return {
      available: false,
      startTime: formatDateTime(startTime),
      endTime: formatDateTime(endTime),
      expired: true,
    };
  }

  // Quiz is currently available
  return { available: true, startTime: '', endTime: '' };
}

/**
 * Normalize quiz data to consistent structure
 * Handles both self-assessment and teacher-assigned quizzes
 */
function normalizeQuizData(quizData: any, sessionId: string): NormalizedQuiz {
  // Log session ID mismatch if backend returns different session
  if (quizData.session_id && quizData.session_id !== sessionId) {
    console.warn('⚠️ Session ID mismatch!', {
      requested: sessionId,
      received: quizData.session_id,
      quizTitle: quizData.title
    });
  }
  
  // Parse questions from various possible formats
  let questions: NormalizedQuestion[] = [];

  if (Array.isArray(quizData.questions)) {
    // Direct array of questions
    questions = quizData.questions;
  } else if (quizData.questions?.quizzes && Array.isArray(quizData.questions.quizzes)) {
    // API format: questions.quizzes array (from /api/v1/quiz endpoint)
    console.log('📋 Parsing questions from questions.quizzes structure');
    questions = quizData.questions.quizzes.map((q: any, index: number) => ({
      id: (index + 1).toString(),
      question: q.quiz?.question || q.question || '',
      options: q.quiz?.options || q.options || [],
      correctAnswer: q.quiz?.answer || q.answer || '',
      answer: q.quiz?.answer || q.answer || '',
      explanation: q.explanation || null,
    }));
  } else if (quizData.subject) {
    // Parse subject field (contains quiz questions as JSON)
    try {
      const subjectData =
        typeof quizData.subject === 'string'
          ? JSON.parse(quizData.subject)
          : quizData.subject;

      if (subjectData.quizzes && Array.isArray(subjectData.quizzes)) {
        questions = subjectData.quizzes.map((q: any, index: number) => ({
          id: (index + 1).toString(),
          question: q.quiz?.question || q.question || '',
          options: q.quiz?.options || q.options || [],
          correctAnswer: q.quiz?.answer || q.answer || '',
          answer: q.quiz?.answer || q.answer || '',
          explanation: q.explanation || null,
        }));
      }
    } catch (e) {
      console.error('❌ Error parsing subject field:', e);
    }
  }

  // Ensure questions is always an array with proper structure
  const validatedQuestions: NormalizedQuestion[] = Array.isArray(questions)
    ? questions.map((q: any, index: number) => ({
        id: q.id || `${index}-${q.question?.substring(0, 10) || 'q'}`,
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer || q.answer,
        answer: q.answer || q.correctAnswer,
        explanation: q.explanation ?? null,
      }))
    : [];

  // Determine quiz type
  const hasAssignmentInfo = Boolean(
    quizData.session_id || quizData.classroom_id || sessionId
  );
  const type: 'SELF' | 'ASSIGNED' = hasAssignmentInfo ? 'ASSIGNED' : 'SELF';

  // CRITICAL: Use requested sessionId (what user clicked) instead of backend response
  // Backend may return quiz with different session_id, but we want the specific session requested
  const normalizedSessionId = sessionId || quizData.session_id || null;

  const normalized: NormalizedQuiz = {
    quizId: quizData.quiz_id || quizData.id || 0,
    sessionId: normalizedSessionId,
    classroomId: quizData.classroom_id || null,
    type,
    title: quizData.title || quizData.topic || 'Assessment',
    class: quizData.class,
    subject: quizData.subject,
    difficulty: quizData.difficulty,
    lesson: quizData.lesson,
    duration: quizData.duration || 30,
    has_time_limit: quizData.has_time_limit ?? true,
    is_public: quizData.is_public ?? false,
    questions: validatedQuestions,
    start_time: quizData.start_time || null,
    end_time: quizData.end_time || null,
    regenerationParams: quizData.regenerationParams,
  };
  
  console.log('✅ Normalized quiz data:', {
    quizId: normalized.quizId,
    sessionId: normalized.sessionId,
    title: normalized.title,
    is_public: normalized.is_public,
    questionCount: normalized.questions.length
  });
  
  return normalized;
}

/**
 * Unified OpenQuiz Handler - SINGLE SOURCE OF TRUTH
 * 
 * This function contains ALL validation logic:
 * - Authentication
 * - Quiz existence
 * - Quiz availability (expired, not started, active)
 * - User role validation
 * - Student assignment status
 * - Student attempt status
 * - Data normalization
 * - Navigation decisions
 */
export async function handleOpenQuiz(
  sessionId: string,
  _source: OpenQuizSource,
  user: User | null,
  navigationAdapter: NavigationAdapter,
  savePendingSession?: (sessionId: string) => void
): Promise<void> {
  // ==========================================
  // 1. AUTHENTICATION CHECK
  // ==========================================
  if (!user) {
    console.log('❌ User not authenticated, saving session for post-login');
    if (savePendingSession) {
      savePendingSession(sessionId);
    }
    return;
  }

  // ==========================================
  // 2. SHOW LOADING SCREEN
  // ==========================================
  navigationAdapter.navigate('QuizLoadingScreen', {
    message: 'Validating quiz...',
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    // ==========================================
    // 3. FETCH QUIZ DATA WITH VALIDATION FLAGS
    // ==========================================
    console.log('🔍 handleOpenQuiz: Fetching quiz for session:', sessionId);
    
    const validation = await fetchQuizDetailsBySessionId(
      sessionId,
      user.id,
      0,
      user.role as 'instructor' | 'admin' | 'student'
    );
    
    console.log('📦 handleOpenQuiz: Received quiz data:', {
      exists: validation.exists,
      quizId: validation.quizData?.quiz_id,
      receivedSessionId: validation.quizData?.session_id,
      requestedSessionId: sessionId,
      title: validation.quizData?.title
    });

    // ==========================================
    // 4. QUIZ EXISTENCE CHECK
    // ==========================================
    if (!validation.exists || !validation.quizData) {
      navigationAdapter.navigate('QuizStatusScreen', {
        status: 'not_found',
        title: 'No Quiz Available',
        message: 'No quiz is available for you.',
        icon: 'alert-circle-outline',
      });
      return;
    }

    // ==========================================
    // 5. QUIZ AVAILABILITY CHECK (Time-based)
    // ==========================================
    // IMPORTANT: Match web behavior - only check availability if has_time_limit is true
    const quizData = validation.quizData;
    const hasTimeLimit = quizData.has_time_limit ?? false;
    
    console.log('⏰ Availability check:', {
      has_time_limit: hasTimeLimit,
      start_time: quizData.start_time,
      end_time: quizData.end_time
    });

    const isStudent = user.role === 'student';
    const isTeacher = user.role === 'instructor' || user.role === 'admin';

    // ==========================================
    // 6. STUDENT FLOW - Complete validation chain
    // ==========================================
    if (isStudent || quizData.is_public === true) {
      // A. Already attempted - show results
      if (validation.isAttempted) {
        navigationAdapter.navigate('QuizResultsScreen', {
          quizId: quizData.quiz_id,
          sessionId: quizData.session_id,
          attemptData: validation.attemptData,
        });
        return;
      }

      // B. Time-based validation (ONLY if has_time_limit is true)
      // Match exact web behavior from OpenQuizPage
      if (hasTimeLimit && quizData.start_time && quizData.end_time) {
        const now = new Date().getTime();
        const startTime = new Date(quizData.start_time).getTime();
        const endTime = new Date(quizData.end_time).getTime();
        
        console.log('⏰ Time validation:', {
          now: new Date(now).toISOString(),
          start: new Date(startTime).toISOString(),
          end: new Date(endTime).toISOString(),
          notStarted: now < startTime,
          expired: now > endTime
        });
        
        // Quiz not started yet
        if (now < startTime) {
          navigationAdapter.navigate('QuizStatusScreen', {
            status: 'scheduled',
            title: 'Quiz Not Yet Available',
            message: `This quiz will be available between:\n${new Date(startTime).toLocaleString()} and ${new Date(endTime).toLocaleString()}`,
            icon: 'time-outline',
            startTime: new Date(startTime).toLocaleString(),
            endTime: new Date(endTime).toLocaleString(),
          });
          return;
        }
        
        // Quiz expired
        if (now > endTime) {
          navigationAdapter.navigate('QuizStatusScreen', {
            status: 'expired',
            title: 'Quiz Expired',
            message: `This quiz was available until:\n${new Date(endTime).toLocaleString()}`,
            icon: 'close-circle-outline',
            endTime: new Date(endTime).toLocaleString(),
          });
          return;
        }
      } else {
        console.log('✅ No time limit check - quiz always available');
      }

      // C. Quiz is AVAILABLE - Normalize and navigate to QuizTakingScreen
      const normalizedQuiz = normalizeQuizData(validation.quizData, sessionId);

      console.log('🎯 Navigating to QuizTakingScreen with params:', {
        sessionId: normalizedQuiz.sessionId,
        quizId: normalizedQuiz.quizId,
        title: normalizedQuiz.title,
        questionCount: normalizedQuiz.questions.length,
        firstQuestion: normalizedQuiz.questions[0]?.question.substring(0, 50)
      });

      navigationAdapter.navigate('QuizTakingScreen', {
        quiz: normalizedQuiz,
        // Legacy params for backward compatibility (can be removed later)
        quizId: normalizedQuiz.quizId,
        sessionId: normalizedQuiz.sessionId,
        classroomId: normalizedQuiz.classroomId,
        quizData: normalizedQuiz,
        is_public: quizData.is_public,
      });
      return;
    }

    // ==========================================
    // 7. TEACHER FLOW - Preview quiz
    // ==========================================
    if (isTeacher) {
      // Normalize quiz data for teacher preview
      const normalizedQuiz = normalizeQuizData(validation.quizData, sessionId);

      navigationAdapter.navigate('QuizPreviewScreen', {
        quiz: normalizedQuiz,
        // Legacy params for backward compatibility
        quizId: normalizedQuiz.quizId,
        sessionId: normalizedQuiz.sessionId,
        quizData: normalizedQuiz,
      });
      return;
    }

    // ==========================================
    // 8. FALLBACK - Unknown role
    // ==========================================
    navigationAdapter.navigate('QuizStatusScreen', {
      status: 'error',
      title: 'Error',
      message: 'Unable to process quiz request.',
      icon: 'alert-circle-outline',
    });
  } catch (error) {
    console.error('❌ Error in handleOpenQuiz:', error);
    navigationAdapter.navigate('QuizStatusScreen', {
      status: 'error',
      title: 'Error Loading Quiz',
      message: 'Unable to load quiz details. Please try again later.',
      icon: 'cloud-offline-outline',
    });
  }
}
