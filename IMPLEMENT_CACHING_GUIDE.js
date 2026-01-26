#!/usr/bin/env node
/**
 * STEP-BY-STEP GUIDE: Implementing Caching in dashboardApi.ts
 * 
 * This guide shows you EXACTLY what to change to enable caching.
 * Follow the pattern for all 8 API functions.
 */

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * STEP 1: FUNCTION - fetchTeacherDashboardSummary
 * ═══════════════════════════════════════════════════════════════════════════
 */

// FIND THIS CODE (Line ~105-175):
/*
export async function fetchTeacherDashboardSummary(
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  const defaultFilters: TeacherQuizFilters = {
    view_type: 'summary',
    limit: filters.limit || 100,
    offset: filters.offset || 0,
    ...filters,
  };

  try {
    const token = await TokenStorage.getAccessToken();
    // ... rest of the function
  } catch (error) {
    console.error('Error fetching teacher dashboard summary:', error);
    throw error;
  }
}
*/

// REPLACE WITH THIS (wrapped with cachedApiCall):
/*
export async function fetchTeacherDashboardSummary(
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  const defaultFilters: TeacherQuizFilters = {
    view_type: 'summary',
    limit: filters.limit || 100,
    offset: filters.offset || 0,
    ...filters,
  };

  // ✨ NEW: Create cache key
  const cacheKey = `teacher_dashboard_summary_${defaultFilters.view_type}`;

  // ✨ NEW: Wrap with cachedApiCall
  return cachedApiCall(
    cacheKey,
    async () => {
      // ✨ INDENT: Move existing try-catch inside here
      try {
        const token = await TokenStorage.getAccessToken();
        // ... all the existing code (NO CHANGES)
        // ... just indent it
      } catch (error) {
        console.error('Error fetching teacher dashboard summary:', error);
        throw error;
      }
    },
    CACHE_TTL.DASHBOARD // ✨ NEW: 10 minutes cache
  );
}
*/

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * STEP 2: FUNCTION - fetchTeacherQuizzes
 * ═══════════════════════════════════════════════════════════════════════════
 */

// FIND: export async function fetchTeacherQuizzes...
// ADD AFTER defaultFilters:

/*
  const cacheKey = `teacher_quizzes_${JSON.stringify({
    view_type: defaultFilters.view_type,
    classroom_id: defaultFilters.classroom_id,
    limit: defaultFilters.limit,
    offset: defaultFilters.offset,
  })}`;

  return cachedApiCall(
    cacheKey,
    async () => {
      try {
        // existing code here (indented)
      } catch (error) {
        console.error('Error fetching teacher quizzes:', error);
        throw error;
      }
    },
    CACHE_TTL.QUIZ_LIST // 5 minutes
  );
*/

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * STEP 3: FUNCTION - fetchStudentQuizzes
 * ═══════════════════════════════════════════════════════════════════════════
 */

// FIND: export async function fetchStudentQuizzes...
// ADD:

/*
  const cacheKey = `student_quizzes_${JSON.stringify({
    view_type: defaultFilters.view_type,
    limit: defaultFilters.limit,
    offset: defaultFilters.offset,
  })}`;

  return cachedApiCall(
    cacheKey,
    async () => {
      try {
        // existing code here
      } catch (error) {
        console.error('Error fetching student quizzes:', error);
        throw error;
      }
    },
    CACHE_TTL.QUIZ_LIST
  );
*/

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * STEP 4: FUNCTION - fetchTeacherClassrooms
 * ═══════════════════════════════════════════════════════════════════════════
 */

// FIND: export async function fetchTeacherClassrooms...
// ADD:

/*
  const cacheKey = 'teacher_classrooms';

  return cachedApiCall(
    cacheKey,
    async () => {
      try {
        // existing code here
      } catch (error) {
        console.error('Error fetching teacher classrooms:', error);
        throw error;
      }
    },
    CACHE_TTL.CLASSROOM // 1 hour
  );
*/

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * STEP 5: FUNCTION - fetchQuizDetails
 * ═══════════════════════════════════════════════════════════════════════════
 */

// FIND: export async function fetchQuizDetails(quizId: string)...
// ADD:

/*
  const cacheKey = `quiz_details_${quizId}`;

  return cachedApiCall(
    cacheKey,
    async () => {
      try {
        // existing code here
      } catch (error) {
        console.error(`Error fetching quiz details for ${quizId}:`, error);
        throw error;
      }
    },
    CACHE_TTL.MEDIUM // 5 minutes
  );
*/

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * STEP 6: FUNCTION - fetchClassroomQuizzes
 * ═══════════════════════════════════════════════════════════════════════════
 */

// FIND: export async function fetchClassroomQuizzes(classroomId: string)...
// ADD:

/*
  const cacheKey = `classroom_quizzes_${classroomId}`;

  return cachedApiCall(
    cacheKey,
    async () => {
      try {
        // existing code here
      } catch (error) {
        console.error(`Error fetching classroom quizzes for ${classroomId}:`, error);
        throw error;
      }
    },
    CACHE_TTL.QUIZ_LIST
  );
*/

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPLETE EXAMPLE: fetchTeacherDashboardSummary (FULL CODE)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* BEFORE:
export async function fetchTeacherDashboardSummary(
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  const defaultFilters: TeacherQuizFilters = {
    view_type: 'summary',
    limit: filters.limit || 100,
    offset: filters.offset || 0,
    ...filters,
  };

  try {
    const token = await TokenStorage.getAccessToken();
    if (!token) {
      // token error handling
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
      await handleAuthError(response.status, errorText, 'fetchTeacherDashboardSummary');
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const data = await response.json();
    return {
      ...data,
      data: data.data.map((quiz: QuizDetails) => toTeacherQuiz(quiz)),
    };
  } catch (error) {
    console.error('Error fetching teacher dashboard summary:', error);
    throw error;
  }
}
*/

/* AFTER:
export async function fetchTeacherDashboardSummary(
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  const defaultFilters: TeacherQuizFilters = {
    view_type: 'summary',
    limit: filters.limit || 100,
    offset: filters.offset || 0,
    ...filters,
  };

  // ✨ CREATE CACHE KEY
  const cacheKey = `teacher_dashboard_summary_${defaultFilters.view_type}`;

  // ✨ WRAP WITH CACHE
  return cachedApiCall(
    cacheKey,
    async () => {
      // ✨ EXISTING CODE GOES HERE (indented 2 spaces)
      try {
        const token = await TokenStorage.getAccessToken();
        if (!token) {
          // token error handling
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
          await handleAuthError(response.status, errorText, 'fetchTeacherDashboardSummary');
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const data = await response.json();
        return {
          ...data,
          data: data.data.map((quiz: QuizDetails) => toTeacherQuiz(quiz)),
        };
      } catch (error) {
        console.error('Error fetching teacher dashboard summary:', error);
        throw error;
      }
    },
    CACHE_TTL.DASHBOARD // ✨ CHOOSE TTL
  );
}
*/

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * TESTING: How to verify caching works
 * ═══════════════════════════════════════════════════════════════════════════
 */

// 1. Run the app: npm start or expo start
// 2. Login and navigate to dashboard
// 3. Check console - should see:
//    🔴 [timestamp] [API CALL] teacher_dashboard_summary_summary | Fetching from API...
//    ✅ [timestamp] [API CALL] teacher_dashboard_summary_summary | Stored in cache | Duration: 1.2s

// 4. Navigate away and back to dashboard
// 5. Check console - should see:
//    ✅ [timestamp] [L1 MEMORY HIT] teacher_dashboard_summary_summary | Source: Memory Cache | Age: 15s

// 6. Add this to any component to see statistics:
/*
import { logCacheStatistics } from './src/core/services/cacheService';

// After some API calls
useEffect(() => {
  setTimeout(() => {
    logCacheStatistics();
  }, 5000);
}, []);
*/

// Expected output:
/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CACHE STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Total Requests: 10
✅ Cache Hits: 7 (70.0%)
❌ Cache Misses (API Calls): 3 (30.0%)
💾 Memory (L1) Hits: 6
💿 Storage (L2) Hits: 1
⏱️  Average Duration: 0.05s (cached) vs 1.2s (API)
💰 API Calls Saved: 7
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 */

// The caching wrapper will:
// ✅ Check cache before making API calls
// ✅ Store responses in cache after API calls
// ✅ Log every operation with timestamps
// ✅ Show cache hits vs API calls
// ✅ Track hit rates and performance
// ✅ Automatically expire old data

// Benefits:
// ✅ API called only once per cache duration
// ✅ Subsequent calls use cached data
// ✅ Comprehensive logging showing source
// ✅ Better performance (cache = 50ms vs API = 1200ms)
// ✅ Reduced server load
// ✅ Works offline (cached data still available)

console.log('✅ Ready to implement caching! Follow the steps above.');
console.log('📚 See CACHING_INTEGRATION_EXAMPLES.md for more details.');
