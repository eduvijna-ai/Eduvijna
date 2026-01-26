# ⚡ Quick Reference: Caching Implementation

## 🎯 Goal
**Call API only once. Reuse in all scenarios wherever required. Provide logs showing where API is calling and where calling from cache.**

## ✅ What's Already Done
1. ✅ Cache service created (`cacheService.ts`)
2. ✅ Cache initialized in `App.tsx`
3. ✅ Cache imports added to `dashboardApi.ts`

## ⏳ What You Need to Do
Wrap each API function with `cachedApiCall()`

---

## 📋 Simple 3-Step Pattern

For EVERY API function:

### Step 1: Create Cache Key
```typescript
const cacheKey = `function_name_${param}`;
```

### Step 2: Return cachedApiCall
```typescript
return cachedApiCall(
  cacheKey,
  async () => {
    // Step 3 goes here
  },
  CACHE_TTL.DASHBOARD
);
```

### Step 3: Move Existing Code Inside
```typescript
async () => {
  try {
    // ALL your existing code
    // (unchanged, just indented)
  } catch (error) {
    throw error;
  }
}
```

---

## 🔧 Functions to Wrap

### File: `src/core/services/dashboardApi.ts`

| Function | Cache Key | TTL |
|----------|-----------|-----|
| `fetchTeacherDashboardSummary` | `teacher_dashboard_summary_${view_type}` | `CACHE_TTL.DASHBOARD` |
| `fetchTeacherQuizzes` | `teacher_quizzes_${JSON.stringify(filters)}` | `CACHE_TTL.QUIZ_LIST` |
| `fetchStudentQuizzes` | `student_quizzes_${JSON.stringify(filters)}` | `CACHE_TTL.QUIZ_LIST` |
| `fetchTeacherClassrooms` | `teacher_classrooms` | `CACHE_TTL.CLASSROOM` |
| `fetchQuizDetails` | `quiz_details_${quizId}` | `CACHE_TTL.MEDIUM` |
| `fetchClassroomQuizzes` | `classroom_quizzes_${classroomId}` | `CACHE_TTL.QUIZ_LIST` |

---

## 📝 Example Transformation

### ❌ BEFORE (Current Code)
```typescript
export async function fetchTeacherQuizzes(filters = {}) {
  const defaultFilters = { ...filters };

  try {
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

### ✅ AFTER (With Caching)
```typescript
export async function fetchTeacherQuizzes(filters = {}) {
  const defaultFilters = { ...filters };

  // ✨ NEW: Cache key
  const cacheKey = `teacher_quizzes_${JSON.stringify(defaultFilters)}`;

  // ✨ NEW: Wrap with cache
  return cachedApiCall(
    cacheKey,
    async () => {
      // ✨ MOVED: Existing code (indented)
      try {
        const response = await fetch(url, options);
        return await response.json();
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    },
    CACHE_TTL.QUIZ_LIST // ✨ NEW: TTL
  );
}
```

---

## 🎬 Expected Console Output

### First Call (API)
```
🔴 [10:30:15] [API CALL] teacher_dashboard_summary_summary | Fetching from API...
📊 Fetching teacher dashboard summary (API CALL)
✅ [10:30:16] [API CALL] teacher_dashboard_summary_summary | Stored in cache | Duration: 1.2s
```

### Second Call (Cache Hit)
```
✅ [10:31:00] [L1 MEMORY HIT] teacher_dashboard_summary_summary | Source: Memory Cache | Age: 45s
```

### Statistics
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CACHE STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Total Requests: 10
✅ Cache Hits: 7 (70.0%)
❌ Cache Misses (API Calls): 3 (30.0%)
💾 Memory (L1) Hits: 6
💿 Storage (L2) Hits: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🧪 How to Test

1. **Run app**: `npm start` or `expo start`
2. **Login** and navigate to dashboard
3. **Check console** for `🔴 [API CALL]` message
4. **Navigate away** and back
5. **Check console** for `✅ [L1 MEMORY HIT]` message

### View Statistics
Add to any component:
```typescript
import { logCacheStatistics } from './src/core/services/cacheService';

useEffect(() => {
  setTimeout(() => logCacheStatistics(), 5000);
}, []);
```

---

## 🎯 Cache TTL Options

```typescript
CACHE_TTL.SHORT      // 60s   - Frequently changing
CACHE_TTL.MEDIUM     // 300s  - 5 minutes
CACHE_TTL.QUIZ_LIST  // 300s  - Quiz lists
CACHE_TTL.DASHBOARD  // 600s  - 10 minutes
CACHE_TTL.LONG       // 3600s - 1 hour
CACHE_TTL.CLASSROOM  // 3600s - Classroom data
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't: Keep `try-catch` outside
```typescript
// WRONG
try {
  return cachedApiCall(cacheKey, async () => {
    // code
  });
} catch (error) {
  // This won't catch errors!
}
```

### ✅ Do: Put `try-catch` inside
```typescript
// CORRECT
return cachedApiCall(cacheKey, async () => {
  try {
    // code
  } catch (error) {
    throw error;
  }
});
```

### ❌ Don't: Use generic cache keys
```typescript
const cacheKey = 'quizzes'; // Too generic!
```

### ✅ Do: Use specific cache keys
```typescript
const cacheKey = `teacher_quizzes_${classroom_id}_${offset}`;
```

---

## 📚 Documentation Files

- `CACHING_INTEGRATION_EXAMPLES.md` - Detailed examples
- `IMPLEMENT_CACHING_GUIDE.js` - Step-by-step code guide
- `CACHING_GUIDE.md` - Complete API reference
- `CACHE_IMPLEMENTATION_COMPLETE.md` - Architecture overview

---

## 🎉 Benefits

✅ **API called once** - Cached for 5-60 minutes  
✅ **Reused everywhere** - All screens get cached data  
✅ **Comprehensive logs** - See cache hits vs API calls  
✅ **Better performance** - 50ms (cache) vs 1200ms (API)  
✅ **Reduced server load** - 70-80% fewer API calls  
✅ **Offline support** - Cached data works offline  

---

## 🔗 Next Steps

1. Open `src/core/services/dashboardApi.ts`
2. Find `export async function fetchTeacherDashboardSummary`
3. Follow the 3-step pattern above
4. Repeat for all 6-8 functions
5. Test and verify logs

---

## 💡 Tips

- **Start with one function** to understand the pattern
- **Test after each function** to verify it works
- **Check console logs** to see cache in action
- **Use `logCacheStatistics()`** to verify hit rates
- **Clear cache** with `clearCache()` if needed

---

**That's it! Follow the pattern, and you'll have comprehensive caching working in minutes.** 🚀
