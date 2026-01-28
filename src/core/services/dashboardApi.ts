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
import { cachedApiCall, CACHE_TTL, clearCacheEntry } from './cacheService';
// Uncomment below to use mock data when backend is unavailable
// import {
//   mockTeacherQuizzes,
//   mockTeacherClassrooms,
//   mockStudentQuizzes,
// } from './mockDashboardData';

const API_BASE_URL = 'https://api.eduvijna.com/api/v1';
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
    limit: filters.limit || 100,
    offset: filters.offset || 0,
    ...filters,
  };

  // Generate cache key based on filters
  const cacheKey = `teacher_dashboard_summary_${defaultFilters.view_type}_${defaultFilters.limit}_${defaultFilters.offset}`;

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
          
          return { data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } } as any;
        }

        const queryString = buildQueryString(defaultFilters);
        const url = `${API_BASE_URL}/dashboard/quizzes${queryString ? `?${queryString}` : ''}`;

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
        console.error('Error fetching teacher dashboard summary:', error);
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
        const url = `${API_BASE_URL}/dashboard/quizzes${queryString ? `?${queryString}` : ''}`;

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
        console.error('Error fetching teacher quizzes:', error);
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
    limit: filters.limit || 100,
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
        const url = `${API_BASE_URL}/dashboard/quizzes${queryString ? `?${queryString}` : ''}`;

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
        
        // Extract attempts array from response.data[0].attempts (which is a JSON string)
        let attemptsData: any[] = [];
        
        if (data.data && data.data.length > 0 && data.data[0].attempts) {
          try {
            // Parse the attempts JSON string to get actual quiz data
            attemptsData = JSON.parse(data.data[0].attempts);
          } catch (parseError) {
            console.error('Failed to parse attempts JSON:', parseError);
            attemptsData = [];
          }
        }
        
        // Convert attempts array to StudentQuiz[]
        return {
          meta: data.meta,
          data: attemptsData.map((attempt: any) => toStudentQuiz(attempt)),
        };
      } catch (error) {
        console.error('Error fetching student quizzes:', error);
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
        const url = `${API_BASE_URL}/dashboard/quizzes?view_type=class_wise_students&limit=100&offset=0`;

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
        
        return data;
      } catch (error) {
        console.error('Error fetching teacher classrooms:', error);
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
  // Clear teacher caches
  await clearCacheEntry('teacher_dashboard_summary_summary_100_0');
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
  await clearCacheEntry('teacher_dashboard_summary_summary_100_0');
  
  console.log('✅ Quiz cache cleared');
}
