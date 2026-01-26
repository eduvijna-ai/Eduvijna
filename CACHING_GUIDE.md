# 📦 Comprehensive Caching Guide

## ⚠️ Important Notice: Redis in React Native

**Redis CANNOT be used directly in React Native/Expo apps** because:
- Redis package requires Node.js built-in modules (`node:crypto`, `node:fs`, etc.)
- React Native runtime doesn't include Node.js standard library
- This causes bundling errors: "attempted to import the Node standard library module"

## ✅ Solution: Multi-Layer Caching

Instead of Redis, we use a **React Native-compatible** multi-layer caching system:

### 🔄 Cache Architecture

```
┌─────────────────────────────────────────┐
│         API REQUEST                     │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│   L1: Memory Cache (Fast)               │
│   - Instant access                      │
│   - Lost on app restart                 │
│   - TTL-based expiration                │
└─────────────────────────────────────────┘
                ↓ (if L1 miss)
┌─────────────────────────────────────────┐
│   L2: AsyncStorage (Persistent)         │
│   - Survives app restarts               │
│   - TTL-based expiration                │
│   - Auto-promotes to L1                 │
└─────────────────────────────────────────┘
                ↓ (if L2 miss)
┌─────────────────────────────────────────┐
│   API CALL (Network)                    │
│   - Fresh data from server              │
│   - Cached in both L1 & L2              │
└─────────────────────────────────────────┘
```

## 📊 Cache TTL Configuration

```typescript
export const CACHE_TTL = {
  DASHBOARD_SUMMARY: 300,  // 5 minutes
  QUIZZES_LIST: 600,       // 10 minutes
  CLASSROOMS: 1800,        // 30 minutes
  STUDENTS_LIST: 900,      // 15 minutes
  USER_PROFILE: 3600,      // 1 hour
  QUIZ_DETAILS: 1800,      // 30 minutes
  ANALYTICS: 1800,         // 30 minutes
  DEFAULT: 300,            // 5 minutes
};
```

## 🚀 Usage Examples

### Basic Usage: Cached API Call

```typescript
import { cachedApiCall, CACHE_TTL } from '@core/services/cacheService';

// Dashboard API - cached for 5 minutes
export async function fetchDashboard(forceRefresh = false) {
  return cachedApiCall(
    async () => {
      const response = await fetch('https://api.eduvijna.com/api/v1/dashboard');
      return response.json();
    },
    'dashboard:main',              // Unique cache key
    CACHE_TTL.DASHBOARD_SUMMARY,   // 300 seconds (5 min)
    forceRefresh                   // Force fresh data
  );
}
```

### Advanced: Manual Cache Management

```typescript
import {
  getCachedData,
  setCachedData,
  clearCacheEntry,
  clearAllCache,
  CACHE_TTL
} from '@core/services/cacheService';

// Get data from cache
const cachedData = await getCachedData('user:profile:123');

// Set data in cache
await setCachedData('user:profile:123', userData, CACHE_TTL.USER_PROFILE);

// Clear specific cache entry
await clearCacheEntry('user:profile:123');

// Clear all cache (logout scenario)
await clearAllCache();
```

### Cache Statistics

```typescript
import { getCacheStatistics, logCacheStatistics } from '@core/services/cacheService';

// Get statistics programmatically
const stats = await getCacheStatistics();
console.log(`Cache hit rate: ${stats.hitRate}`);
console.log(`API calls made: ${stats.stats.apiCalls}`);

// Log formatted statistics to console
await logCacheStatistics();
```

## 📝 Comprehensive Logging

### Log Format

All cache operations produce detailed logs with timestamps:

```
✅ [2026-01-25T10:30:15.123Z] [L1 MEMORY HIT] dashboard:main | Source: Memory Cache | Age: 45s
✅ [2026-01-25T10:30:16.456Z] [L2 STORAGE HIT] quizzes:list | Source: AsyncStorage | Age: 120s | Promoted to L1
❌ [2026-01-25T10:30:17.789Z] [CACHE MISS] user:profile:123 | Will fetch from API
🌐 [2026-01-25T10:30:18.012Z] [API CALL START] user:profile:123 | Fetching fresh data...
✅ [2026-01-25T10:30:18.987Z] [API CALL SUCCESS] user:profile:123 | Duration: 975ms | Data cached for 3600s
⚡ [2026-01-25T10:30:19.123Z] [CACHE SERVED] dashboard:main | Duration: 2ms | No API call needed
```

### Log Symbols

- ✅ **Cache Hit** - Data found in cache
- ❌ **Cache Miss** - Data not in cache, will fetch from API
- 🌐 **API Call** - Making network request
- 💾 **Cache Set** - Storing data in cache
- 🗑️ **Cache Delete** - Removing cached entry
- 🧹 **Cache Cleanup** - Removing expired entries
- ⚡ **Cache Served** - Request fulfilled from cache
- ⏰ **Expired** - Cache entry has expired

## 🎯 Best Practices

### 1. Use Unique Cache Keys

```typescript
// ✅ Good - Specific keys
cachedApiCall(fetchApi, `user:${userId}:profile`, ttl);
cachedApiCall(fetchApi, `quiz:${quizId}:details`, ttl);

// ❌ Bad - Generic keys
cachedApiCall(fetchApi, 'userProfile', ttl);
cachedApiCall(fetchApi, 'quiz', ttl);
```

### 2. Include Parameters in Cache Key

```typescript
// ✅ Good - Parameters in key
const filters = { status: 'active', limit: 10 };
const cacheKey = `quizzes:${JSON.stringify(filters)}`;
cachedApiCall(fetchQuizzes, cacheKey, ttl);

// ❌ Bad - Same key for different parameters
cachedApiCall(fetchQuizzes, 'quizzes', ttl);
```

### 3. Use Appropriate TTL

```typescript
// Frequent changes - Short TTL
cachedApiCall(fetchLiveData, key, 60);           // 1 minute

// Stable data - Long TTL
cachedApiCall(fetchUserProfile, key, 3600);       // 1 hour

// Static data - Very long TTL
cachedApiCall(fetchAppConfig, key, 86400);        // 24 hours
```

### 4. Clear Cache on Mutations

```typescript
// After creating/updating/deleting data
async function updateQuiz(quizId, data) {
  await apiClient.put(`/quizzes/${quizId}`, data);
  
  // Clear related cache entries
  await clearCacheEntry(`quiz:${quizId}:details`);
  await clearCacheEntry(`quizzes:list`);
  await clearCacheEntry(`dashboard:main`);
}
```

### 5. Force Refresh on Pull-to-Refresh

```typescript
// In your screen component
const onRefresh = async () => {
  setRefreshing(true);
  await fetchDashboard(true);  // forceRefresh = true
  setRefreshing(false);
};
```

## 📈 Cache Statistics Example

```
============================================================
📊 [2026-01-25T10:35:00.000Z] CACHE STATISTICS
============================================================
L1 Memory Cache: 15 entries (24.56 KB)
L2 AsyncStorage: 23 entries
------------------------------------------------------------
Memory Hits:    45
Storage Hits:   12
API Calls:      8
Cache Misses:   8
Hit Rate:       87.7%
============================================================
```

## 🔧 Health Check

```typescript
import { cacheHealthCheck } from '@core/services/cacheService';

const health = await cacheHealthCheck();
console.log('Memory cache:', health.memory);   // Always true
console.log('AsyncStorage:', health.storage);   // true if accessible
```

## 🎨 Implementation in Components

### React Component Example

```typescript
import React, { useState, useEffect } from 'react';
import { fetchDashboard } from '@core/services/dashboardApi';
import { logCacheStatistics } from '@core/services/cacheService';

function DashboardScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Initial load - uses cache
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await fetchDashboard();
      setData(result);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh - forces fresh data
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await fetchDashboard(true); // Force refresh
      setData(result);
    } finally {
      setRefreshing(false);
    }
  };

  // Log cache stats (dev mode)
  const showCacheStats = async () => {
    await logCacheStatistics();
  };

  return (
    <View>
      {/* Your UI here */}
      <Button title="Refresh" onPress={onRefresh} />
      <Button title="Cache Stats" onPress={showCacheStats} />
    </View>
  );
}
```

## 🔄 Migration from Redis (Backend)

If you have backend services using Redis, keep Redis there! This guide is specifically for the React Native frontend.

**Backend (Node.js/Python):**
- ✅ Use Redis for server-side caching
- ✅ Redis is perfect for backend APIs
- ✅ Provides centralized cache across instances

**Frontend (React Native):**
- ✅ Use AsyncStorage + Memory caching
- ✅ Mobile-compatible caching solution
- ✅ Persists across app restarts

## 📞 Support

For issues or questions about caching:
1. Check logs for detailed cache operations
2. Use `logCacheStatistics()` to diagnose issues
3. Verify TTL values are appropriate for your use case
4. Ensure cache keys are unique and descriptive

---

**Remember**: Redis is for backend servers, AsyncStorage is for React Native apps! 🚀
