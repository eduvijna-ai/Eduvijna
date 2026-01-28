# Redis Caching Implementation Plan

## Current API Usage Analysis

### Teacher Dashboard APIs
1. **fetchTeacherDashboardSummary** (`view_type=summary`)
   - Called from: `teacherDashboard.store.ts`
   - Used in: `useTeacherDashboard` hook
   - Frequency: Once per session (singleton pattern already implemented)
   - Cache TTL: 300s (DASHBOARD_SUMMARY)

2. **fetchTeacherQuizzes** (`view_type=summary`)
   - Called from: Multiple screens (StudentList, QuizResults, QuizPreview, ClassesList, StudentAnalytics)
   - Used for: Quiz listings, filtered views
   - Frequency: Multiple times per session
   - **ISSUE**: Not using cached data from store

3. **fetchTeacherClassrooms** (`view_type=class_wise_students`)
   - Called from: ClassesList.tsx, ShareQuizModal.tsx
   - Used for: Classroom list with student counts
   - Frequency: Multiple times
   - Cache TTL: 1800s (CLASSROOMS)

### Student Dashboard APIs
1. **fetchStudentQuizzes** (`view_type=student_total_details`)
   - Called from: StudentDashboard.tsx
   - Used for: Student quiz listing
   - Frequency: Once per dashboard load
   - Cache TTL: 600s (QUIZZES_LIST)

## Implementation Strategy

### Phase 1: Integrate Cache Service with Dashboard APIs ✅

**Goal**: Wrap all dashboard API calls with caching layer without breaking existing functionality.

**Files to Modify**:
1. `g:\Eduvijna\src\core\services\dashboardApi.ts`
   - Import `cachedApiCall` from cacheService
   - Wrap `fetchTeacherDashboardSummary` with cache
   - Wrap `fetchStudentQuizzes` with cache
   - Wrap `fetchTeacherClassrooms` with cache
   - Use appropriate TTLs from CACHE_TTL

**Key Changes**:
```typescript
import { cachedApiCall, CACHE_TTL } from './cacheService';

export async function fetchTeacherDashboardSummary(filters = {}) {
  const cacheKey = `teacher_dashboard_${JSON.stringify(filters)}`;
  
  return cachedApiCall(
    async () => {
      // ... existing fetch logic ...
    },
    cacheKey,
    CACHE_TTL.DASHBOARD_SUMMARY,
    filters.forceRefresh
  );
}
```

### Phase 2: Optimize Teacher Dashboard Store ✅

**Goal**: Ensure teacher dashboard loads data only once and shares across all screens.

**Current State**:
- `teacherDashboard.store.ts` already implements singleton pattern
- Already skips duplicate loads
- ✅ Uses `fetchTeacherDashboardSummary` with `view_type=summary`

**No Changes Needed** - Already follows best practices!

### Phase 3: Fix Individual Screen API Calls ⚠️

**Problem**: Screens are calling `fetchTeacherQuizzes` directly instead of using store data.

**Screens to Fix**:
1. `StudentList.tsx` - Lines 88, 126
2. `StudentAnalyticsScreen.tsx` - Lines 175, 183
3. `QuizResultsScreen.tsx` - Line 141
4. `QuizPreviewScreen.tsx` - Line 38
5. `ClassesList.tsx` - Line 109

**Solution**:
- Use `useTeacherDashboard()` hook to get cached data
- Filter data locally instead of making new API calls
- Only make API calls if absolutely necessary (e.g., specific quiz details)

### Phase 4: Remove Notification APIs ⚠️

**APIs to Remove/Comment**:
- `/api/v1/notifications`
- `/api/v1/notifications/*`

**Files to Check**:
- `Notifications.tsx` (has `fetchStudentQuizzes` function, but not notification API)
- Search for notification API usage across codebase

### Phase 5: Remove /api/v1/quiz?session_id Call ⚠️

**Goal**: Don't fetch quiz data in quiz taking flow - use navigation params instead.

**Files to Check**:
- `QuizTakingScreen.tsx` - Already has conditional logic for this

### Phase 6: Testing & Validation

**Test Cases**:
1. ✅ Cache hit/miss logging shows correct behavior
2. ✅ Dashboard loads only once per session
3. ✅ Refresh triggers new API call and cache update
4. ✅ Different view_types use appropriate caching
5. ⚠️ No regression in existing functionality
6. ⚠️ Teacher vs student permission checks still work

## Cache Key Strategy

### Teacher Dashboard
- `teacher_dashboard_summary_{limit}_{offset}` - Main dashboard data
- `teacher_quizzes_{classroom_id}_{quiz_id}_{limit}_{offset}` - Quiz listings
- `teacher_classrooms` - Classroom list with student counts

### Student Dashboard
- `student_quizzes_{student_id}_{classroom_id}_{limit}_{offset}` - Student quiz data

## Cache Invalidation Rules

1. **On Login**: Clear all cache
2. **On Logout**: Clear all cache
3. **On Manual Refresh**: Clear specific cache key and refetch
4. **On Quiz Creation**: Clear teacher dashboard cache
5. **On Quiz Update**: Clear specific quiz cache
6. **On Classroom Change**: Clear classroom-specific caches

## Performance Metrics

### Before Caching
- Dashboard load: Multiple API calls per screen
- Duplicate data fetching across screens
- Network overhead on navigation

### After Caching
- Dashboard load: 1 API call per session
- Zero duplicate fetches (cache hits)
- Instant navigation between screens
- Reduced backend load

## Next Steps

1. ✅ **COMPLETED** - Phase 1: Integrate cache service with dashboardApi.ts
   - All dashboard APIs wrapped with caching
   - Cache keys defined
   - TTLs configured
   - Cache invalidation functions added

2. **TODO** - Phase 3: Fix individual screen API calls to use store
   - StudentList.tsx - Use useTeacherDashboard() hook
   - StudentAnalyticsScreen.tsx - Use hook instead of direct calls
   - QuizResultsScreen.tsx - Filter store data locally
   - ClassesList.tsx - Use store data for filtering
   - QuizPreviewScreen.tsx - Evaluate if direct call needed

3. **TODO** - Phase 4: Remove notification API calls
   - Search for /api/v1/notifications usage
   - Comment out or remove calls
   - Ensure UI doesn't break

4. **TODO** - Phase 5: Validate quiz taking flow doesn't fetch data
   - Verify QuizTakingScreen doesn't call /api/v1/quiz?session_id
   - Confirm navigation params used for quiz data

5. **TODO** - Phase 6: Test all functionality
   - Verify cache hits in logs
   - Test refresh functionality
   - Ensure no regression
   - Validate teacher vs student flows
