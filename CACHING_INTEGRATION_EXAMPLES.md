# Caching Integration Examples

## Overview
This document shows how to wrap existing API calls with the caching layer to enable:
- **Call API only once**: Subsequent calls use cached data
- **Comprehensive logging**: Shows whether data came from cache or API
- **Cache statistics**: Track hit rates and performance

## Current Status

### ✅ Completed
1. **Cache Service**: Multi-layer caching system (Memory + AsyncStorage)
2. **Cache Initialization**: Added to `App.tsx`
3. **Imports**: Cache functions imported in `dashboardApi.ts`

### ⏳ Next Step: Wrap API Calls

## How to Wrap API Calls

### Pattern
```typescript
export async function yourApiFunction(params) {
  // 1. Create unique cache key based on function name + parameters
  const cacheKey = `function_name_${JSON.stringify(params)}`;

  // 2. Wrap with cachedApiCall
  return cachedApiCall(
    cacheKey,
    async () => {
      // 3. Your existing API logic goes here (unchanged)
      const response = await fetch(url, options);
      return await response.json();
    },
    CACHE_TTL.DASHBOARD // Choose appropriate TTL
  );
}
```

## Example 1: fetchTeacherDashboardSummary

### Before (Current Code)
```typescript
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
    const queryString = buildQueryString(defaultFilters);
    const url = `${API_BASE_URL}/dashboard/quizzes${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

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
```

### After (With Caching)
```typescript
export async function fetchTeacherDashboardSummary(
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  const defaultFilters: TeacherQuizFilters = {
    view_type: 'summary',
    limit: filters.limit || 100,
    offset: filters.offset || 0,
    ...filters,
  };

  // CREATE CACHE KEY - Include only stable params (not pagination for dashboard)
  const cacheKey = `teacher_dashboard_summary_${defaultFilters.view_type}`;

  // WRAP WITH CACHE
  return cachedApiCall(
    cacheKey,
    async () => {
      // EXISTING CODE GOES HERE (indented inside async function)
      try {
        const token = await TokenStorage.getAccessToken();
        const queryString = buildQueryString(defaultFilters);
        const url = `${API_BASE_URL}/dashboard/quizzes${queryString ? `?${queryString}` : ''}`;

        console.log('📊 Making API call to fetch teacher dashboard summary');

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

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
    CACHE_TTL.DASHBOARD // 600 seconds = 10 minutes
  );
}
```

## Example 2: fetchTeacherQuizzes

```typescript
export async function fetchTeacherQuizzes(
  filters: TeacherQuizFilters = {}
): Promise<DashboardApiResponse<TeacherQuiz>> {
  const defaultFilters: TeacherQuizFilters = {
    view_type: 'summary',
    limit: 10,
    offset: 0,
    ...filters,
  };

  // Include pagination in cache key for paginated lists
  const cacheKey = `teacher_quizzes_${JSON.stringify({
    view_type: defaultFilters.view_type,
    classroom_id: defaultFilters.classroom_id,
    quiz_id: defaultFilters.quiz_id,
    limit: defaultFilters.limit,
    offset: defaultFilters.offset,
  })}`;

  return cachedApiCall(
    cacheKey,
    async () => {
      try {
        const token = await TokenStorage.getAccessToken();
        const queryString = buildQueryString(defaultFilters);
        const url = `${API_BASE_URL}/dashboard/quizzes${queryString ? `?${queryString}` : ''}`;

        console.log('📋 Making API call to fetch teacher quizzes');

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        return {
          ...data,
          data: data.data.map((quiz: QuizDetails) => toTeacherQuiz(quiz)),
        };
      } catch (error) {
        console.error('Error fetching teacher quizzes:', error);
        throw error;
      }
    },
    CACHE_TTL.QUIZ_LIST // 300 seconds = 5 minutes
  );
}
```

## Example 3: fetchStudentQuizzes

```typescript
export async function fetchStudentQuizzes(
  filters: StudentQuizFilters = {}
): Promise<DashboardApiResponse<StudentQuiz>> {
  const defaultFilters: StudentQuizFilters = {
    view_type: 'student_total_quizzes',
    limit: filters.limit || 100,
    offset: filters.offset || 0,
    ...filters,
  };

  const cacheKey = `student_quizzes_${JSON.stringify({
    view_type: defaultFilters.view_type,
    limit: defaultFilters.limit,
    offset: defaultFilters.offset,
  })}`;

  return cachedApiCall(
    cacheKey,
    async () => {
      try {
        const token = await TokenStorage.getAccessToken();
        const queryString = buildQueryString(defaultFilters);
        const url = `${API_BASE_URL}/dashboard/quizzes${queryString ? `?${queryString}` : ''}`;

        console.log('📚 Making API call to fetch student quizzes');

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        return {
          ...data,
          data: data.data.map((quiz: QuizDetails) => toStudentQuiz(quiz)),
        };
      } catch (error) {
        console.error('Error fetching student quizzes:', error);
        throw error;
      }
    },
    CACHE_TTL.QUIZ_LIST
  );
}
```

## Cache TTL Constants

Available TTL values from `cacheService.ts`:

```typescript
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute - Frequently changing data
  MEDIUM: 300,         // 5 minutes - Quiz lists
  QUIZ_LIST: 300,      // 5 minutes - Quiz lists
  DASHBOARD: 600,      // 10 minutes - Dashboard summary
  LONG: 3600,          // 1 hour - Rarely changing data
  CLASSROOM: 3600,     // 1 hour - Classroom data
};
```

## Expected Console Output

### First Call (Cache Miss - API Call)
```
🔴 [2024-01-20 10:30:15] [API CALL] teacher_dashboard_summary_summary | Fetching from API...
📊 Making API call to fetch teacher dashboard summary
✅ Teacher dashboard summary fetched: { count: 15, total: 15 }
✅ [2024-01-20 10:30:16] [API CALL] teacher_dashboard_summary_summary | Stored in cache | Duration: 1.2s
```

### Second Call (Cache Hit - No API)
```
✅ [2024-01-20 10:31:00] [L1 MEMORY HIT] teacher_dashboard_summary_summary | Source: Memory Cache | Age: 45s
```

### After Memory Cache Expires (L2 Cache Hit)
```
✅ [2024-01-20 10:35:00] [L2 STORAGE HIT] teacher_dashboard_summary_summary | Source: AsyncStorage | Age: 4m 45s
```

### After TTL Expires (New API Call)
```
🔴 [2024-01-20 10:40:20] [API CALL] teacher_dashboard_summary_summary | Cache expired (age: 10m 5s) | Fetching from API...
📊 Making API call to fetch teacher dashboard summary
✅ [2024-01-20 10:40:21] [API CALL] teacher_dashboard_summary_summary | Stored in cache | Duration: 1.1s
```

## How to View Cache Statistics

Add this to any component after API calls:

```typescript
import { logCacheStatistics } from '../core/services/cacheService';

// After fetching data
await fetchTeacherDashboardSummary();
await fetchTeacherQuizzes();

// Log statistics
logCacheStatistics();
```

### Example Statistics Output
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CACHE STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Total Requests: 25
✅ Cache Hits: 20 (80.0%)
❌ Cache Misses (API Calls): 5 (20.0%)
💾 Memory (L1) Hits: 15
💿 Storage (L2) Hits: 5
⏱️  Average Duration: 0.05s (cached) vs 1.2s (API)
💰 API Calls Saved: 20
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Implementation Steps

1. **For each API function in `dashboardApi.ts`**:
   - Create a unique cache key
   - Wrap existing logic with `cachedApiCall()`
   - Choose appropriate TTL

2. **Functions to wrap**:
   - ✅ `fetchTeacherDashboardSummary()` - CACHE_TTL.DASHBOARD
   - ✅ `fetchTeacherQuizzes()` - CACHE_TTL.QUIZ_LIST
   - ✅ `fetchStudentQuizzes()` - CACHE_TTL.QUIZ_LIST
   - ⏳ `fetchTeacherClassrooms()` - CACHE_TTL.CLASSROOM
   - ⏳ `fetchQuizAttempts()` - CACHE_TTL.MEDIUM
   - ⏳ `fetchClassroomStudents()` - CACHE_TTL.CLASSROOM

3. **Test caching**:
   - Run app and navigate to dashboard
   - Check console for cache logs
   - Navigate away and back - should show cache hit
   - Call `logCacheStatistics()` to verify hit rate

## Cache Key Best Practices

### Good Cache Keys
```typescript
// Stable params only (for dashboard/summary views)
const cacheKey = `teacher_dashboard_${viewType}`;

// Include all filter params (for lists)
const cacheKey = `quizzes_${JSON.stringify({ classroom_id, status, limit, offset })}`;

// User-specific data
const cacheKey = `user_${userId}_profile`;
```

### Bad Cache Keys
```typescript
// Too specific - won't reuse cache
const cacheKey = `data_${Date.now()}`;

// Missing params - will return wrong data
const cacheKey = 'all_quizzes'; // Ignores filters!

// Too generic - conflicts
const cacheKey = 'data';
```

## Manual Cache Management

```typescript
import { clearCache, getCachedData, setCachedData } from './cacheService';

// Clear specific key
await clearCache('teacher_dashboard_summary_summary');

// Clear all cache
await clearCache();

// Manual cache set (rarely needed)
await setCachedData('custom_key', { data: 'value' }, 600);

// Manual cache get (rarely needed)
const data = await getCachedData('custom_key');
```

## Summary

The caching system will:
- **Automatically** check cache before making API calls
- **Log** every operation with timestamps and source
- **Store** data in memory (fast) and AsyncStorage (persistent)
- **Expire** data based on TTL
- **Track** statistics (hits, misses, hit rate)
- **Save** API calls and improve performance

You'll see in logs:
- 🔴 Red circle for API calls
- ✅ Green checkmark for cache hits
- Timestamps, source (L1/L2), and data age
- Cache hit percentage and API calls saved
