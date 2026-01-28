# API Caching Quick Reference

## How to Use Cached APIs

### Teacher Dashboard

**Best Practice** - Use the hook (automatically cached):
```typescript
import { useTeacherDashboard } from '@core/hooks/useTeacherDashboard';

function MyComponent() {
  const { quizzes, classrooms, stats, loading, refresh } = useTeacherDashboard();
  
  // All data is already cached - zero API calls on re-render!
  // Filter locally instead of calling API:
  const activeQuizzes = quizzes.filter(q => q.availability_status === 'active');
  const classroomQuizzes = quizzes.filter(q => q.classroom_id === selectedClassroom);
  
  return ...;
}
```

**If you need direct API call** (automatically cached):
```typescript
import { fetchTeacherQuizzes } from '@core/services/dashboardApi';

// This is now cached! Subsequent calls return cached data
const response = await fetchTeacherQuizzes({
  classroom_id: '123',
  limit: 10,
  offset: 0,
});

// Force refresh (bypass cache):
const freshData = await fetchTeacherQuizzes({
  classroom_id: '123',
  forceRefresh: true, // ← This bypasses cache
});
```

### Student Dashboard

```typescript
import { fetchStudentQuizzes } from '@core/services/dashboardApi';

// Automatically cached with 600s TTL
const response = await fetchStudentQuizzes({
  limit: 100,
  offset: 0,
});
```

### Classrooms

```typescript
import { fetchTeacherClassrooms } from '@core/services/dashboardApi';

// Automatically cached with 1800s TTL
const classrooms = await fetchTeacherClassrooms();
```

## Cache Management

### Clear Cache on Logout

```typescript
import { clearAllCache } from '@core/services/cacheService';
import { clearDashboardCache } from '@core/services/dashboardApi';

async function handleLogout() {
  await clearAllCache(); // Clear all caches
  // OR
  await clearDashboardCache(); // Clear only dashboard caches
  
  // Continue with logout...
}
```

### Clear Cache on Quiz Changes

```typescript
import { clearDashboardCache, clearQuizCache } from '@core/services/dashboardApi';

async function handleQuizUpdate(quizId, classroomId) {
  // Update quiz via API
  await updateQuiz(quizId, data);
  
  // Clear relevant caches
  await clearQuizCache(classroomId, quizId);
  // OR clear everything:
  await clearDashboardCache();
  
  // Refresh UI
  refresh();
}
```

### Force Refresh

```typescript
const { refresh } = useTeacherDashboard();

// This clears cache and refetches data
await refresh();
```

## Cache Monitoring

### View Cache Statistics

```typescript
import { logCacheStatistics } from '@core/services/cacheService';

// In console or debug screen
await logCacheStatistics();
```

Output:
```
============================================================
📊 CACHE STATISTICS
============================================================
L1 Memory Cache: 12 entries (45.23 KB)
L2 AsyncStorage: 15 entries
------------------------------------------------------------
Memory Hits:    47
Storage Hits:   12
API Calls:      8
Cache Misses:   8
Hit Rate:       87.9%
============================================================
```

### Check Cache Logs

Look for these in console:

**Cache Hit (Fast)**:
```
✅ [L1 MEMORY HIT] teacher_dashboard_summary_summary_100_0 | Age: 45s
⚡ [CACHE SERVED] teacher_quizzes_summary_all_all_10_0 | Duration: 2ms
```

**Cache Miss (API Call)**:
```
❌ [CACHE MISS] student_quizzes_current_all_100_0 | Will fetch from API
🌐 [API CALL START] student_quizzes_current_all_100_0 | Fetching fresh data...
✅ [API CALL SUCCESS] | Duration: 234ms | Data cached for 600s
```

## Common Patterns

### Pattern 1: Dashboard Load (Single Source of Truth)

```typescript
// ❌ Don't do this (multiple API calls):
const quizzes = await fetchTeacherQuizzes();
const stats = calculateStats(quizzes);
const classrooms = await fetchTeacherClassrooms();

// ✅ Do this (single source, cached):
const { quizzes, stats, classrooms } = useTeacherDashboard();
// First call: API (500ms)
// All subsequent: Cache (<5ms)
```

### Pattern 2: Filtering Data

```typescript
// ❌ Don't do this (new API call):
const classroomQuizzes = await fetchTeacherQuizzes({ 
  classroom_id: selectedClassroom 
});

// ✅ Do this (filter cached data):
const { quizzes } = useTeacherDashboard();
const classroomQuizzes = quizzes.filter(q => 
  q.classroom_id === selectedClassroom
);
// Zero API calls, instant result!
```

### Pattern 3: Searching Data

```typescript
// ❌ Don't do this (new API call):
const searchResults = await fetchTeacherQuizzes({ 
  search: searchTerm 
});

// ✅ Do this (search cached data):
const { quizzes } = useTeacherDashboard();
const searchResults = quizzes.filter(q => 
  q.quiz_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  q.topic.toLowerCase().includes(searchTerm.toLowerCase())
);
```

### Pattern 4: Pagination

```typescript
// For large datasets, pagination still needs API calls
// But they're cached per page:

const [page, setPage] = useState(0);
const pageSize = 10;

// This is cached per offset
const response = await fetchTeacherQuizzes({
  limit: pageSize,
  offset: page * pageSize,
});

// Navigating back to previous page = cache hit!
```

## Cache Keys Reference

### Teacher APIs

| API Function | Cache Key Pattern | TTL |
|--------------|-------------------|-----|
| `fetchTeacherDashboardSummary` | `teacher_dashboard_summary_{view_type}_{limit}_{offset}` | 300s |
| `fetchTeacherQuizzes` | `teacher_quizzes_{view_type}_{classroom_id}_{quiz_id}_{limit}_{offset}` | 600s |
| `fetchTeacherClassrooms` | `teacher_classrooms_class_wise_students` | 1800s |

### Student APIs

| API Function | Cache Key Pattern | TTL |
|--------------|-------------------|-----|
| `fetchStudentQuizzes` | `student_quizzes_{student_id}_{classroom_id}_{limit}_{offset}` | 600s |

## Cache TTL Values

```typescript
export const CACHE_TTL = {
  DASHBOARD_SUMMARY: 300,    // 5 minutes
  QUIZZES_LIST: 600,         // 10 minutes
  CLASSROOMS: 1800,          // 30 minutes
  STUDENTS_LIST: 900,        // 15 minutes
  USER_PROFILE: 3600,        // 1 hour
};
```

## Troubleshooting

### Data Not Updating

**Problem**: Made changes but UI shows old data

**Solution**:
```typescript
// Force refresh to bypass cache
const response = await fetchTeacherQuizzes({
  forceRefresh: true,
});

// OR use refresh from hook
const { refresh } = useTeacherDashboard();
await refresh();

// OR clear specific cache
await clearDashboardCache();
```

### Too Many API Calls

**Problem**: Seeing multiple API calls in logs

**Solution**: Use the hook instead of direct API calls
```typescript
// ❌ This causes API call every time:
useEffect(() => {
  fetchTeacherQuizzes().then(setQuizzes);
}, []);

// ✅ This uses cached data:
const { quizzes } = useTeacherDashboard();
```

### Cache Not Working

**Problem**: Every call shows "API CALL"

**Check**:
1. Cache service initialized? (should happen in App.tsx)
2. Using same cache key? (check filters)
3. Cache expired? (check TTL)
4. Using forceRefresh? (remove it)

**Debug**:
```typescript
import { getCacheStatistics } from '@core/services/cacheService';

const stats = await getCacheStatistics();
console.log('Cache stats:', stats);
// Should show memory/storage entries if working
```

## Best Practices

### ✅ DO

- Use `useTeacherDashboard()` hook for teacher screens
- Filter/search cached data locally
- Call `clearDashboardCache()` on logout
- Call `clearQuizCache()` when quiz changes
- Monitor cache hit rate (should be >80%)

### ❌ DON'T

- Make direct API calls when store data is available
- Use `forceRefresh` unless absolutely necessary
- Clear cache too frequently (defeats the purpose)
- Ignore cache statistics (they show issues)

## Performance Expectations

### Good Performance

- **Cache hit rate**: >80%
- **Dashboard load time**: <1s (first load), <5ms (subsequent)
- **Navigation**: <10ms
- **Total API calls per session**: 1-3

### Poor Performance (Needs Optimization)

- **Cache hit rate**: <50%
- **Dashboard load time**: >1s every time
- **Navigation**: >500ms
- **Total API calls per session**: >10

**If you see poor performance**: Check if screens are using the hook vs direct API calls.
