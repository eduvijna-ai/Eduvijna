import * as TokenStorage from './tokenStorage';
import {
  QuizDetails,
  TeacherQuiz,
  StudentQuiz,
  ClassroomDetails,
  DashboardApiResponse,
  TeacherQuizFilters,
  StudentQuizFilters,
  toTeacherQuiz,
  toStudentQuiz,
} from '../types/quiz.types';
import { cachedApiCall, CACHE_TTL, clearCacheEntry, isTransientNetworkError } from './cacheService';
import {
  buildTeacherDashboardSummaryCacheKey,
  invalidateTeacherDashboardCaches,
} from './teacherDashboardCacheInvalidation';
import { API_BASE_URL } from '../api/config';
import {
  coerceQuizAttemptsListResponse,
  pickCompletedAttemptForScopedList,
} from './openQuizAttemptResolution';
import { classifyStudentAssignmentRow } from '../../utils/studentAssignmentClassification';
import { resolveClassroomDisplayName } from '../../utils/classroomDisplayName';
// Uncomment below to use mock data when backend is unavailable
// import {
//   mockTeacherQuizzes,
//   mockTeacherClassrooms,
//   mockStudentQuizzes,
// } from './mockDashboardData';

const DASHBOARD_API_URL = `${API_BASE_URL}/api/v1`;

export class TeacherDashboardAuthenticationError extends Error {
  readonly code = 'TEACHER_DASHBOARD_AUTHENTICATION_REQUIRED';

  constructor() {
    super('Teacher dashboard requires authentication');
    this.name = 'TeacherDashboardAuthenticationError';
  }
}
// const USE_MOCK_DATA = false; // Set to true to use mock data

// Helper to build query string from filters
function buildQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  
  return params.toString();
}

/**
 * Custom error class for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(message: string, public status: number, public endpoint?: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Global navigation callback for redirecting to login
 * Set this from your app's navigation context
 */
let authErrorNavigationCallback: (() => void) | null = null;

export function setAuthErrorNavigationCallback(callback: () => void) {
  authErrorNavigationCallback = callback;
}

/**
 * Handle authentication errors - clears tokens and redirects to login
 * Checks both status codes (401, 403) and response body for authentication failures
 */
async function handleAuthError(status: number, errorText: string, endpoint?: string): Promise<void> {
  // Check if it's an authentication error by status code OR by error message
  const isAuthError = 
    status === 401 || 
    status === 403 || 
    errorText.toLowerCase().includes('authentication failed') ||
    errorText.toLowerCase().includes('invalid or missing jwt token') ||
    errorText.toLowerCase().includes('user id not available');
  
  if (isAuthError) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`🔒 AUTHENTICATION FAILED (Status: ${status})`);
    console.error(`📍 Endpoint: ${endpoint || 'Unknown'}`);
    console.error(`⚠️ Error: ${errorText}`);
    console.error('🔄 Action: Clearing tokens and redirecting to login...');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Clear stored tokens
    await TokenStorage.clearAuthData();
    
    // Redirect to login - handle both web and React Native
    if (authErrorNavigationCallback) {
      // Use custom navigation callback if set
      authErrorNavigationCallback();
    } else if (typeof window !== 'undefined' && window.location) {
      // Web fallback
      window.location.href = '/login';
    }
    
    // Throw error so calling code can also handle it
    throw new AuthenticationError(errorText, status, endpoint);
  }
}

/**
 * TEACHER API: Fetch dashboard summary
 * view_type = summary
 * This includes: quizzes, classes, counts, statuses - everything except quiz attempts and student lists
 * This should be called ONCE on app load for teacher dashboard & analytics
 * 
 * ✅ CACHED: Uses Redis-based caching with 300s TTL
 */
export async function fetchTeacherDashboardSummary(
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  // Apply default filters for dashboard analytics
  const defaultFilters: TeacherQuizFilters = {
    view_type: 'summary',
    limit: filters.limit || 1000,
    offset: filters.offset || 0,
    ...filters,
  };

  const cacheKey = buildTeacherDashboardSummaryCacheKey(
    String(defaultFilters.view_type),
    defaultFilters.limit ?? 1000,
    defaultFilters.offset ?? 0,
  );

  // Use cached API call wrapper
  return cachedApiCall(
    async () => {
      try {
        const token = await TokenStorage.getAccessToken();
        if (!token) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('🔒 NO AUTHENTICATION TOKEN');
          console.error('📍 Endpoint: fetchTeacherDashboardSummary');
          console.error('🔄 Action: Clearing tokens and redirecting to login...');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          await TokenStorage.clearAuthData();
          
          if (authErrorNavigationCallback) {
            authErrorNavigationCallback();
          } else if (typeof window !== 'undefined' && window.location) {
            window.location.href = '/login';
          }
          
          throw new TeacherDashboardAuthenticationError();
        }

        const queryString = buildQueryString(defaultFilters);
        const url = `${DASHBOARD_API_URL}/dashboard/quizzes${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Teacher dashboard summary fetch failed:', response.status, errorText);
          
          await handleAuthError(response.status, errorText, 'fetchTeacherDashboardSummary');
          
          throw new Error(`Failed to fetch teacher dashboard summary: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Convert QuizDetails[] to TeacherQuiz[]
        return {
          ...data,
          data: data.data.map((quiz: QuizDetails) => toTeacherQuiz(quiz)),
        };
      } catch (error) {
        if (!isTransientNetworkError(error)) {
          console.error('Error fetching teacher dashboard summary:', error);
        }
        throw error;
      }
    },
    cacheKey,
    CACHE_TTL.DASHBOARD_SUMMARY,
    filters.forceRefresh
  );
}

/**
 * TEACHER API: Fetch teacher quizzes with pagination
 * view_type = summary (for quizzes list)
 * Can filter by classroom_id for class-specific quizzes
 * 
 * ✅ CACHED: Uses Redis-based caching with 600s TTL
 */
export async function fetchTeacherQuizzes(
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  // Apply default filters
  const defaultFilters: TeacherQuizFilters = {
    view_type: 'summary',
    limit: 10,
    offset: 0,
    ...filters,
  };

  // Generate cache key based on filters
  const cacheKey = `teacher_quizzes_${defaultFilters.view_type}_${defaultFilters.classroom_id || 'all'}_${defaultFilters.quiz_id || 'all'}_${defaultFilters.limit}_${defaultFilters.offset}`;

  // Use cached API call wrapper
  return cachedApiCall(
    async () => {
      try {
        const token = await TokenStorage.getAccessToken();
        if (!token) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('🔒 NO AUTHENTICATION TOKEN');
          console.error('📍 Endpoint: fetchTeacherQuizzes');
          console.error('🔄 Action: Clearing tokens and redirecting to login...');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          await TokenStorage.clearAuthData();
          
          if (authErrorNavigationCallback) {
            authErrorNavigationCallback();
          } else if (typeof window !== 'undefined' && window.location) {
            window.location.href = '/login';
          }
          
          return { data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } } as any;
        }

        const queryString = buildQueryString(defaultFilters);
        const url = `${DASHBOARD_API_URL}/dashboard/quizzes${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Teacher quizzes fetch failed:', response.status, errorText);
          
          await handleAuthError(response.status, errorText, 'fetchTeacherQuizzes');
          
          throw new Error(`Failed to fetch teacher quizzes: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Convert QuizDetails[] to TeacherQuiz[]
        return {
          ...data,
          data: data.data.map((quiz: QuizDetails) => toTeacherQuiz(quiz)),
        };
      } catch (error) {
        if (!isTransientNetworkError(error)) {
          console.error('Error fetching teacher quizzes:', error);
        }
        throw error;
      }
    },
    cacheKey,
    CACHE_TTL.QUIZZES_LIST,
    filters.forceRefresh
  );
}

/**
 * STUDENT API: Fetch student dashboard quizzes with pagination
 * view_type = student_total_details
 * 
 * ✅ CACHED: Uses Redis-based caching with 600s TTL
 */
export async function fetchStudentQuizzes(
  filters: StudentQuizFilters = {}
): Promise<DashboardApiResponse<StudentQuiz>> {
  // Apply default filters
  const defaultFilters: StudentQuizFilters = {
    view_type: 'student_total_details',
    limit: filters.limit || 1000,
    offset: filters.offset || 0,
    ...filters,
  };

  // Generate cache key based on filters
  const cacheKey = `student_quizzes_${defaultFilters.classroom_id || 'all'}_${defaultFilters.limit}_${defaultFilters.offset}`;

  // Use cached API call wrapper
  return cachedApiCall(
    async () => {
      try {
        const token = await TokenStorage.getAccessToken();
        if (!token) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('🔒 NO AUTHENTICATION TOKEN');
          console.error('📍 Endpoint: fetchStudentQuizzes');
          console.error('🔄 Action: Clearing tokens and redirecting to login...');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          await TokenStorage.clearAuthData();
          
          if (authErrorNavigationCallback) {
            authErrorNavigationCallback();
          } else if (typeof window !== 'undefined' && window.location) {
            window.location.href = '/login';
          }
          
          return { data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } } as any;
        }

        const queryString = buildQueryString(defaultFilters);
        const url = `${DASHBOARD_API_URL}/dashboard/quizzes${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Student quizzes fetch failed:', response.status, errorText);
          
          // Handle authentication errors
          await handleAuthError(response.status, errorText, 'fetchStudentQuizzes');
          
          throw new Error(`Failed to fetch student quizzes: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // API returns multiple quiz sessions in data.data array
        // Each element has quiz-level fields AND an attempts array
        let allStudentQuizzes: any[] = [];
        
        if (data.data && Array.isArray(data.data)) {
          // Loop through each quiz session
          data.data.forEach((quizSession: any, index: number) => {
            // Extract attempts array from this quiz session (JSON string)
            let attemptsData: any[] = [];
            
            if (quizSession.attempts) {
              try {
                // Parse the attempts JSON string to get actual quiz data
                attemptsData = JSON.parse(quizSession.attempts);
              } catch (parseError) {
                console.error(`Failed to parse attempts for quiz session ${index}:`, parseError);
                attemptsData = [];
              }
            }
            
            // Extract quiz-level fields from this quiz session
            // Include all possible fields that might be at quiz level
            
            // DEBUG: Log raw quiz session data to see what fields are available
            if (index === 0) {
              console.log('🔍 Raw Quiz Session Sample:', {
                quiz_id: quizSession.quiz_id,
                session_id: quizSession.session_id,
                allFields: Object.keys(quizSession),
              });
            }
            
            const quizLevelData = {
              quiz_id: quizSession.quiz_id,
              session_id: quizSession.session_id,
              class_id: quizSession.class_id,
              classroom_id: quizSession.classroom_id,
              classroom_name: quizSession.classroom_name,
              instructor: quizSession.instructor,
              quiz_name: quizSession.quiz_name,
              topic: quizSession.topic,
              quiz_type: quizSession.quiz_type,
              subject: quizSession.subject,
              questions: quizSession.questions, // Add questions field
              created_at: quizSession.created_at,
              start_time: quizSession.start_time,
              end_time: quizSession.end_time,
              duration: quizSession.duration,
              question_count: quizSession.question_count,
              availability_status: quizSession.availability_status,
            };
            
            // If there are attempts, convert them to StudentQuiz objects
            if (attemptsData && attemptsData.length > 0) {
              const quizzesFromSession = attemptsData.map((attempt: any) => 
                toStudentQuiz(attempt, quizLevelData)
              );
              allStudentQuizzes = allStudentQuizzes.concat(quizzesFromSession);
            } else {
              // No attempts yet - create a quiz record from quiz-level data only
              // This represents an assigned but not-yet-attempted quiz
              const pendingQuiz = toStudentQuiz({}, quizLevelData);
              allStudentQuizzes.push(pendingQuiz);
            }
          });
          
          // DEBUG: Log summary of processing
          console.log('🔍 API Processing Summary:', {
            totalQuizSessions: data.data.length,
            totalStudentQuizzes: allStudentQuizzes.length,
            sampleQuizLevelData: data.data[0] ? {
              session_id: data.data[0].session_id,
              class_id: data.data[0].class_id,
              classroom_name: data.data[0].classroom_name,
              quiz_name: data.data[0].quiz_name,
            } : 'No data',
            sampleAttempt: allStudentQuizzes[0] ? {
              quiz_id: allStudentQuizzes[0].quiz_id,
              quiz_name: allStudentQuizzes[0].quiz_name,
              classroom_name: allStudentQuizzes[0].classroom_name,
            } : 'No quizzes'
          });
        }
        
        // Return all student quizzes from all sessions
        return {
          meta: data.meta,
          data: allStudentQuizzes,
        };
      } catch (error) {
        if (!isTransientNetworkError(error)) {
          console.error('Error fetching student quizzes:', error);
        }
        throw error;
      }
    },
    cacheKey,
    CACHE_TTL.QUIZZES_LIST,
    filters.forceRefresh
  );
}

/**
 * TEACHER API: Fetch classrooms with student counts
 * view_type = class_wise_students
 * Returns classrooms with student lists and counts
 * 
 * ✅ CACHED: Uses Redis-based caching with 1800s TTL
 */
export async function fetchTeacherClassrooms(): Promise<DashboardApiResponse<ClassroomDetails>> {
  const cacheKey = 'teacher_classrooms_class_wise_students';
  
  // Use cached API call wrapper
  return cachedApiCall(
    async () => {
      try {
        const token = await TokenStorage.getAccessToken();
        if (!token) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('🔒 NO AUTHENTICATION TOKEN');
          console.error('📍 Endpoint: fetchTeacherClassrooms');
          console.error('🔄 Action: Clearing tokens and redirecting to login...');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          await TokenStorage.clearAuthData();
          
          if (authErrorNavigationCallback) {
            authErrorNavigationCallback();
          } else if (typeof window !== 'undefined' && window.location) {
            window.location.href = '/login';
          }
          
          return { data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } } as any;
        }

        // Use class_wise_students to get classroom list with student counts
        const url = `${DASHBOARD_API_URL}/dashboard/quizzes?view_type=class_wise_students&limit=1000&offset=0`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Teacher classrooms fetch failed:', response.status, errorText);
          
          await handleAuthError(response.status, errorText, 'fetchTeacherClassrooms');
          
          throw new Error(`Failed to fetch classrooms: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Parse the attempts field which contains student data as JSON string
        if (data.data && Array.isArray(data.data)) {
          data.data = data.data.map((classroom: any) => {
            let students: any[] = [];
            
            // Parse attempts JSON string to get student list
            if (classroom.attempts) {
              try {
                const parsedAttempts = typeof classroom.attempts === 'string' 
                  ? JSON.parse(classroom.attempts) 
                  : classroom.attempts;
                
                // Map student data to consistent format
                students = parsedAttempts.map((student: any) => ({
                  id: student.student_id, // Use student_id as id
                  user_id: student.student_id,
                  student_id: student.student_id,
                  fullname: student.student_fullname,
                  username: student.student_username,
                  email: student.email,
                  phone: student.phone,
                  status: student.status,
                  role: student.role,
                  avatar_url: student.avatar_url,
                  last_login: student.last_login,
                  dob: student.dob,
                }));
              } catch (parseError) {
                console.error('Failed to parse classroom students:', parseError);
                students = [];
              }
            }
            
            return {
              ...classroom,
              students: students,
              student_count: classroom.total_count || students.length,
            };
          });
        }
        
        return data;
      } catch (error) {
        if (!isTransientNetworkError(error)) {
          console.error('Error fetching teacher classrooms:', error);
        }
        throw error;
      }
    },
    cacheKey,
    CACHE_TTL.CLASSROOMS
  );
}

/**
 * TEACHER API: Fetch quizzes with all student statuses (completed, pending, missed)
 * view_type = all
 * Use this to get detailed student status breakdown
 */
export async function fetchQuizzesWithAllStatuses(
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  return fetchTeacherQuizzes({
    ...filters,
    view_type: 'all',
  });
}

/**
 * TEACHER API: Fetch specific quiz details
 * view_type = summary with classroom_id and quiz_id
 */
export async function fetchQuizDetails(
  classroomId: string,
  quizId: number,
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  return fetchTeacherQuizzes({
    ...filters,
    view_type: 'summary',
    classroom_id: classroomId,
    quiz_id: quizId,
  });
}

/**
 * TEACHER API: Fetch class-specific quizzes
 * view_type = summary with classroom_id
 */
export async function fetchClassroomQuizzes(
  classroomId: string,
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  return fetchTeacherQuizzes({
    ...filters,
    view_type: 'summary',
    classroom_id: classroomId,
  });
}

/**
 * TEACHER API: Fetch class-specific quizzes with all student statuses
 * view_type = all with classroom_id
 */
export async function fetchClassroomQuizzesWithAllStatuses(
  classroomId: string,
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  return fetchTeacherQuizzes({
    ...filters,
    view_type: 'all',
    classroom_id: classroomId,
  });
}

/**
 * Clear dashboard API cache
 * Call this on logout, or when quiz data changes (create, update, delete)
 */
export async function clearDashboardCache(): Promise<void> {
  await invalidateTeacherDashboardCaches();
  await clearCacheEntry('teacher_classrooms_class_wise_students');
  
  // Note: Individual quiz caches will be cleared by clearAllCache()
  // or by cache expiry (TTL)
}

/**
 * Clear specific quiz cache
 * Call this when a quiz is updated or deleted
 */
export async function clearQuizCache(classroomId?: string, quizId?: number): Promise<void> {
  const cachePattern = `teacher_quizzes_summary_${classroomId || 'all'}_${quizId || 'all'}`;
  console.log(`🧹 Clearing quiz cache: ${cachePattern}`);
  
  // Since we can't wildcard pattern match easily, clear all quiz-related caches
  // This is safer and ensures consistency
  await invalidateTeacherDashboardCaches();
  
  console.log('✅ Quiz cache cleared');
}

function quizIdMatchesUntrustedHint(serverQuizId: unknown, hintedQuizId: number): boolean {
  if (!hintedQuizId || hintedQuizId <= 0) return true;
  const serverId = Number(serverQuizId);
  return Number.isFinite(serverId) && serverId === hintedQuizId;
}

async function fetchCompletedStudentQuizAttemptForSession(
  studentId: string,
  quizId: number,
  sessionId: string,
): Promise<Record<string, unknown> | null> {
  const token = await TokenStorage.getAccessToken();
  if (!token) return null;
  const attemptsUrl = `${DASHBOARD_API_URL}/dashboard/quiz-attempts?student_id=${encodeURIComponent(
    studentId,
  )}&quiz_id=${encodeURIComponent(String(quizId))}&class_id=${encodeURIComponent(sessionId)}`;
  const attemptsResponse = await fetch(attemptsUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!attemptsResponse.ok) return null;
  const attempts = await attemptsResponse.json();
  const picked = pickCompletedAttemptForScopedList(
    coerceQuizAttemptsListResponse(attempts),
    sessionId,
  );
  if (picked.kind !== 'found') {
    if (picked.kind === 'session_mismatch') {
      console.warn('quiz-attempts rows contradict requested session scope');
    }
    return null;
  }
  return picked.attempt as Record<string, unknown>;
}

async function buildValidationFromCheckRecord(
  userId: string,
  sessionId: string,
): Promise<{
  exists: boolean;
  isExpired: boolean;
  isScheduled: boolean;
  isAssigned: boolean;
  isAttempted: boolean;
  quizData: any | null;
  startTime: Date | null;
  endTime: Date | null;
  attemptData?: any;
} | null> {
  const record = await fetchQuizCheckRecordForSession(String(userId), sessionId);
  if (!record?.quiz_details) return null;

  if (record.student_id != null && String(record.student_id) !== String(userId)) {
    console.warn('check-record student_id does not match authenticated user');
    return null;
  }

  const details = record.quiz_details;
  const recordSessionId = (details.session_id || sessionId).trim();
  if (details.session_id && details.session_id.trim() !== sessionId.trim()) {
    console.warn('check-record session_id does not match requested session');
    return null;
  }
  const classId = record.classid || '';
  const quizData = {
    ...details,
    quiz_id: details.quiz_id,
    session_id: details.session_id || sessionId,
    classroom_id: classId,
    class_id: classId,
    topic: details.topic,
    title: details.topic,
    has_time_limit: details.has_time_limit,
    is_public: details.is_public,
    start_time: details.start_time,
    end_time: details.end_time,
  };

  const attemptData =
    record.status === 'completed' && quizData.quiz_id
      ? await fetchCompletedStudentQuizAttemptForSession(
          String(userId),
          Number(quizData.quiz_id),
          recordSessionId,
        )
      : null;
  const isAttempted = record.status === 'completed' && attemptData != null;

  const now = new Date();
  const startTime = quizData.start_time ? new Date(quizData.start_time) : null;
  const endTime = quizData.end_time ? new Date(quizData.end_time) : null;

  return {
    exists: true,
    isExpired: endTime ? now > endTime : false,
    isScheduled: startTime ? now < startTime : false,
    isAssigned: true,
    isAttempted,
    quizData,
    startTime,
    endTime,
    attemptData,
  };
}

/**
 * Fetch full quiz details by session_id
 * Uses /api/v1/quiz?session_id={sessionId} endpoint (same as OpenQuiz page)
 * Then checks quiz-attempts to validate if student already attempted
 */
export async function fetchQuizDetailsBySessionId(
  sessionId: string,
  userId: any,
  quizId: number,
  userRole: 'student' | 'instructor' | 'admin'
): Promise<{
  exists: boolean;
  isExpired: boolean;
  isScheduled: boolean;
  isAssigned: boolean;
  isAttempted: boolean;
  quizData: any | null;
  startTime: Date | null;
  endTime: Date | null;
  attemptData?: any;
  fetchFailure?: { httpStatus: number; retryable: boolean };
}> {
  const defaultResult = {
    exists: false,
    isExpired: false,
    isScheduled: false,
    isAssigned: false,
    isAttempted: false,
    quizData: null,
    startTime: null,
    endTime: null,
  };

  try {
    const token = await TokenStorage.getAccessToken();
    if (!token) {
      console.error('No authentication token available');
      return defaultResult;
    }

    // CRITICAL: Sanitize session ID - remove any emojis, special characters
    // Only allow: alphanumeric, hyphens, underscores
    const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9\-_]/g, '').trim();
    
    if (sanitizedSessionId !== sessionId) {
      console.warn('⚠️ Session ID sanitized:', {
        original: sessionId,
        sanitized: sanitizedSessionId
      });
    }

    const hintedQuizId = Number.isFinite(Number(quizId)) && Number(quizId) > 0 ? Number(quizId) : 0;

    // STEP 1: Fetch quiz data using the same endpoint as OpenQuiz page
    console.log('🔍 Fetching quiz by session_id:', sanitizedSessionId);
    const quizUrl = `${DASHBOARD_API_URL}/quiz?session_id=${sanitizedSessionId}&skip_auth=true`;
    
    const quizResponse = await fetch(quizUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!quizResponse.ok) {
      const errorText = await quizResponse.text();
      console.error('Quiz fetch failed:', quizResponse.status, errorText);
      await handleAuthError(quizResponse.status, errorText, 'fetchQuizDetailsBySessionId');
      const transient = quizResponse.status === 429 || quizResponse.status >= 500;
      if (userRole === 'student' && !transient) {
        const fromRecord = await buildValidationFromCheckRecord(userId, sanitizedSessionId);
        if (
          fromRecord &&
          quizIdMatchesUntrustedHint(fromRecord.quizData?.quiz_id, hintedQuizId)
        ) {
          return fromRecord;
        }
      }
      if (transient) {
        return {
          ...defaultResult,
          fetchFailure: { httpStatus: quizResponse.status, retryable: true },
        };
      }
      return defaultResult;
    }

    const quizDataResponse = await quizResponse.json();
    
    console.log('📦 Raw API response:', JSON.stringify(quizDataResponse).substring(0, 200));
    
    if (!quizDataResponse.quiz_data) {
      if (userRole === 'student') {
        const fromRecord = await buildValidationFromCheckRecord(userId, sanitizedSessionId);
        if (
          fromRecord &&
          quizIdMatchesUntrustedHint(fromRecord.quizData?.quiz_id, hintedQuizId)
        ) {
          console.log('✅ Recovered quiz context from check-record for session:', sanitizedSessionId);
          return fromRecord;
        }
      }
      console.log('❌ No quiz found for session:', sessionId);
      return defaultResult;
    }

    const quizData = quizDataResponse.quiz_data;
    
    // IMPORTANT: API doesn't return session_id in quiz_data, so we use the sanitized sessionId
    if (!quizData.session_id) {
      quizData.session_id = sanitizedSessionId;
    }

    if (!quizIdMatchesUntrustedHint(quizData.quiz_id, hintedQuizId)) {
      console.warn('Untrusted quiz_id hint does not match server quiz for session');
      return defaultResult;
    }
    
    console.log('✅ Quiz data fetched:', {
      quiz_id: quizData.quiz_id,
      session_id: quizData.session_id,
      title: quizData.title || quizData.topic,
      start_time: quizData.start_time,
      end_time: quizData.end_time,
      has_time_limit: quizData.has_time_limit,
      is_public: quizData.is_public
    });

    const now = new Date();
    const startTime = quizData.start_time ? new Date(quizData.start_time) : null;
    const endTime = quizData.end_time ? new Date(quizData.end_time) : null;

    // Validate quiz status
    const isScheduled = startTime ? now < startTime : false;
    const isExpired = endTime ? now > endTime : false;
    
    // STEP 2: For students, check if they already attempted using quiz-attempts API
    let isAttempted = false;
    let attemptData = null;
    let isAssigned = true; // Default to assigned
    if (quizData.is_public === true) {
      isAssigned = true;
    }

    if (userRole === 'student' && quizData.quiz_id) {
      console.log('🔍 Checking quiz attempts for student:', userId);
      try {
        const completedAttempt = await fetchCompletedStudentQuizAttemptForSession(
          String(userId),
          Number(quizData.quiz_id),
          sanitizedSessionId,
        );
        if (completedAttempt) {
          isAttempted = true;
          attemptData = completedAttempt;
          console.log('✅ Student already completed this quiz for session:', completedAttempt);
        }
        if (!isAttempted) {
          const recordStatus = await fetchQuizCheckRecordStatus(String(userId), sanitizedSessionId);
          if (recordStatus) {
            const fromRecord = await buildValidationFromCheckRecord(userId, sanitizedSessionId);
            if (fromRecord?.isAttempted) {
              isAttempted = true;
              attemptData = fromRecord.attemptData ?? attemptData;
            }
            isAssigned = true;
          }
        }
      } catch (attemptsError) {
        console.error('Error checking quiz attempts:', attemptsError);
      }
    }

    return {
      exists: true,
      isExpired,
      isScheduled,
      isAssigned,
      isAttempted,
      quizData: quizData,
      startTime,
      endTime,
      attemptData,
    };
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    return defaultResult;
  }
}

// ============================================================================
// CHECK-RECORD API  (POST /api/v1/quiz/check-record)
// status: null → pending   |   status: "completed" → completed
// ============================================================================

export interface CheckRecordQuiz {
  status: null | 'completed';
  classid: string;
  student_id: string;
  quiz_details: {
    quiz_id: number;
    topic: string;
    summary: string;
    session_id: string;
    start_time: string;
    end_time: string;
    duration: number;
    has_time_limit: boolean;
    question_count: number;
    questions: { quizzes: any[] };
    status: string;
    is_active: boolean;
    is_public: boolean;
    tags?: { subject?: string; difficulty?: string };
    type?: string;
    created_at?: string;
    created_by?: string;
    student_level?: string;
    [key: string]: unknown;
  };
}

export interface CheckRecordResponse {
  success: boolean;
  result: CheckRecordQuiz[];
  check_type: string;
  message: string;
}

/**
 * Fetch student quizzes using the check-record endpoint.
 * status === null  → pending quiz (not yet attempted)
 * status === "completed" → completed quiz
 *
 * POST /api/v1/quiz/check-record
 */
async function postQuizCheckRecord(body: {
  p_student_id: string;
  p_session_id: string;
  p_check_type?: string | null;
}): Promise<CheckRecordResponse> {
  const token = await TokenStorage.getAccessToken();
  if (!token) {
    await TokenStorage.clearAuthData();
    if (authErrorNavigationCallback) authErrorNavigationCallback();
    return {
      success: false,
      result: [],
      check_type: body.p_check_type ?? '',
      message: 'No token',
    } as CheckRecordResponse;
  }

  const url = `${DASHBOARD_API_URL}/quiz/check-record`;
  const payload: Record<string, string | null> = {
    p_student_id: body.p_student_id,
    p_session_id: body.p_session_id,
  };
  if (body.p_check_type !== undefined) {
    payload.p_check_type = body.p_check_type;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    await handleAuthError(response.status, errorText, 'fetchQuizCheckRecord');
    throw new Error(`fetchQuizCheckRecord failed: ${response.status}`);
  }

  return response.json() as Promise<CheckRecordResponse>;
}

/** Documented status mode — record exists for session + student. */
export async function fetchQuizCheckRecordStatus(
  studentId: string,
  sessionId: string,
): Promise<boolean> {
  const res = await postQuizCheckRecord({
    p_student_id: studentId,
    p_session_id: sessionId,
    p_check_type: 'status',
  });
  const statusResult = (res as { result?: unknown }).result;
  return statusResult === true;
}

/** Documented record fetch — omit p_check_type. */
export async function fetchQuizCheckRecordForSession(
  studentId: string,
  sessionId: string,
): Promise<CheckRecordQuiz | null> {
  const res = await postQuizCheckRecord({
    p_student_id: studentId,
    p_session_id: sessionId,
  });
  const rows = Array.isArray(res.result) ? res.result : [];
  return rows[0] ?? null;
}

/**
 * Legacy list scopes used by student dashboard loader (dev-api bulk pending/completed).
 * Per-session access should use fetchQuizCheckRecordStatus / fetchQuizCheckRecordForSession.
 */
export async function fetchQuizCheckRecord(
  studentId: string,
  checkType: 'pending' | 'completed' = 'pending',
  sessionId: string = '',
): Promise<CheckRecordResponse> {
  return postQuizCheckRecord({
    p_check_type: checkType,
    p_session_id: sessionId,
    p_student_id: studentId,
  });
}

/**
 * Authorized classroom labels for the signed-in student (view_type=classes).
 * Used so check-record rows never fall back to raw `class_*` ids in UI.
 */
export async function fetchStudentClassroomNameLookup(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const token = await TokenStorage.getAccessToken();
  if (!token) {
    return map;
  }

  const url = `${DASHBOARD_API_URL}/dashboard/quizzes?view_type=classes&limit=200&offset=0`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return map;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return map;
  }
  const rows = Array.isArray(data?.data) ? data.data : [];
  for (const row of rows) {
    const name = row.classroom_name || row.name;
    if (!name) continue;
    const nameStr = String(name);
    const ids = [row.classroom_id, row.class_id, row.classid].filter(Boolean).map(String);
    for (const id of ids) {
      if (nameStr !== id) {
        map.set(id, nameStr);
      }
    }
  }
  return map;
}

/**
 * Convert a CheckRecordQuiz item to a ParsedQuiz-compatible object used
 * by StudentDashboard and Notifications screens.
 * status: null → 'pending'   |   status: "completed" → 'completed'
 */
export function checkRecordToQuiz(
  item: CheckRecordQuiz,
  options?: { classroomNameLookup?: Map<string, string> },
): any {
  const d = item.quiz_details;
  const now = new Date();
  const endDate = d.end_time ? new Date(d.end_time) : null;
  const classId = item.classid;
  const classroomName = resolveClassroomDisplayName(String(classId || ''), {
    recordName:
      (d as { classroom_name?: string }).classroom_name ||
      (item as { classroom_name?: string }).classroom_name,
    lookup: options?.classroomNameLookup,
  });
  const completedScore =
    typeof (d as { score?: number }).score === 'number'
      ? (d as { score?: number }).score
      : typeof (item as { score?: number }).score === 'number'
        ? (item as { score?: number }).score
        : null;

  const recordStatus = item.status === null ? 'pending' : item.status;
  const classified = classifyStudentAssignmentRow({
    recordStatus,
    started_at: (d as { started_at?: string }).started_at || null,
    start_time: d.start_time,
    end_time: d.end_time,
    has_time_limit: d.has_time_limit,
    is_active: d.is_active,
    now,
  });

  return {
    quiz_id: d.quiz_id,
    quiz_name: d.topic,
    topic: d.topic,
    session_id: d.session_id,
    class_id: classId,
    classroom_id: classId,
    classroom_name: classroomName,
    student_id: item.student_id,
    status: classified.status,
    student_status: classified.student_status,
    score: item.status === 'completed' ? completedScore : null,
    correct_answers: undefined,
    question_count: d.question_count,
    time_spent_seconds: null,
    attempt_number: null,
    completed_at:
      item.status === 'completed'
        ? (d as { completed_at?: string }).completed_at ||
          (item as { completed_at?: string }).completed_at ||
          null
        : null,
    started_at: (d as { started_at?: string }).started_at || null,
    start_time: d.start_time,
    end_time: d.end_time,
    due_date: d.end_time,
    created_at: d.created_at || d.start_time,
    assigned_at: d.created_at || d.start_time,
    availability_status: classified.availability_status,
    duration: d.duration,
    has_time_limit: d.has_time_limit,
    is_active: d.is_active,
    is_overdue: endDate ? now > endDate : false,
    days_until_due: endDate
      ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : undefined,
    subject: d.tags?.subject || '',
    // Keep the raw questions for launching the quiz without a second API call
    _rawQuestions: d.questions,
  };
}
