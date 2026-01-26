# 🔄 CACHING FLOW DIAGRAM

## Overview: How the Cache System Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                          YOUR APP                                    │
│                                                                       │
│  Component/Screen needs data                                         │
│  └─► Calls: fetchTeacherDashboardSummary()                          │
└────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CACHE SERVICE (Automatic)                         │
│                                                                       │
│  Step 1: Check L1 Cache (Memory)                                    │
│  ┌──────────────────────────────────────┐                          │
│  │  const cached = memoryCache.get(key) │                          │
│  └──────────────┬───────────────────────┘                          │
│                  │                                                   │
│           ┌─────FOUND?─────┐                                       │
│           │                  │                                       │
│      YES  │                  │  NO                                  │
│           ▼                  ▼                                       │
│   ✅ Return data      Step 2: Check L2 (AsyncStorage)              │
│   [L1 MEMORY HIT]     ┌──────────────────────────────┐            │
│   0.003s              │ await AsyncStorage.getItem() │            │
│                       └──────────┬───────────────────┘            │
│                                   │                                 │
│                            ┌─────FOUND?─────┐                      │
│                            │                  │                      │
│                       YES  │                  │  NO                 │
│                            ▼                  ▼                      │
│                    ✅ Return data       Step 3: Call API           │
│                    Store in L1         ┌─────────────────┐        │
│                    [L2 STORAGE HIT]    │ await fetch()   │        │
│                    0.050s              └────────┬────────┘        │
│                                                  │                  │
│                                                  ▼                  │
│                                          ✅ Store in L1 & L2       │
│                                          [API CALL]                │
│                                          1.200s                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Log Output Timeline

### Scenario 1: First Request (No Cache)

```
📱 USER ACTION: Opens Dashboard
      │
      ▼
🔴 [10:30:15.123] [API CALL] teacher_dashboard_summary_summary
├─ Checking L1 cache... ❌ Not found
├─ Checking L2 cache... ❌ Not found
└─ Fetching from API... 🌐

📊 Fetching teacher dashboard summary (API CALL)
└─ URL: https://api.eduvijna.com/api/v1/dashboard/quizzes

⏳ Waiting for API response... (1.2 seconds)

✅ [10:30:16.345] [API CALL] teacher_dashboard_summary_summary
├─ API Response received: 15 quizzes
├─ Stored in L1 (Memory)
├─ Stored in L2 (AsyncStorage)
├─ TTL: 600 seconds
└─ Duration: 1.22s

📱 USER: Sees dashboard data
```

### Scenario 2: Second Request (30 seconds later - Memory Hit)

```
📱 USER ACTION: Navigates away and back to Dashboard
      │
      ▼
✅ [10:30:45.789] [L1 MEMORY HIT] teacher_dashboard_summary_summary
├─ Checking L1 cache... ✅ Found!
├─ Age: 30 seconds
├─ TTL Remaining: 570 seconds
└─ Duration: 0.003s

📱 USER: Sees dashboard data INSTANTLY
```

### Scenario 3: After Memory Cleared (5 minutes later - Storage Hit)

```
📱 USER ACTION: App backgrounded, memory cleared, returns to Dashboard
      │
      ▼
✅ [10:35:15.456] [L2 STORAGE HIT] teacher_dashboard_summary_summary
├─ Checking L1 cache... ❌ Not found (memory was cleared)
├─ Checking L2 cache... ✅ Found in AsyncStorage!
├─ Age: 5 minutes (300 seconds)
├─ TTL Remaining: 300 seconds
├─ Restored to L1 (Memory)
└─ Duration: 0.050s

📱 USER: Sees dashboard data quickly
```

### Scenario 4: After TTL Expired (11 minutes later - New API Call)

```
📱 USER ACTION: Returns to Dashboard after 11 minutes
      │
      ▼
🔴 [10:41:15.123] [API CALL] teacher_dashboard_summary_summary
├─ Checking L1 cache... ❌ Not found
├─ Checking L2 cache... ⚠️ Found but EXPIRED (age: 11 minutes > TTL: 10 minutes)
├─ Removing expired cache...
└─ Fetching fresh data from API... 🌐

📊 Fetching teacher dashboard summary (API CALL)

⏳ Waiting for API response... (1.2 seconds)

✅ [10:41:16.456] [API CALL] teacher_dashboard_summary_summary
├─ API Response received: 15 quizzes
├─ Stored in L1 (Memory)
├─ Stored in L2 (AsyncStorage)
└─ Duration: 1.33s

📱 USER: Sees fresh dashboard data
```

---

## Performance Comparison

```
┌──────────────────┬──────────────┬──────────────┬──────────────┐
│   Data Source    │   Duration   │    Speed     │   Savings    │
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ L1 (Memory)      │   0.003s     │  ⚡⚡⚡⚡⚡  │   400x       │
│ L2 (AsyncStorage)│   0.050s     │  ⚡⚡⚡⚡    │   24x        │
│ API Call         │   1.200s     │  ⚡          │   1x         │
└──────────────────┴──────────────┴──────────────┴──────────────┘
```

---

## Statistics After 1 Hour of Usage

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CACHE STATISTICS - 1 Hour Session
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User navigated to dashboard 25 times

Request Breakdown:
📈 Total Requests:     25
✅ Cache Hits:         20  (80.0%)  ← Served from cache
❌ API Calls:           5  (20.0%)  ← Actual API calls

Cache Layer Performance:
💾 L1 (Memory) Hits:   15  (60.0%)  ← Instant (0.003s avg)
💿 L2 (Storage) Hits:   5  (20.0%)  ← Fast (0.050s avg)
🌐 API Calls:           5  (20.0%)  ← Slow (1.200s avg)

Time Analysis:
⚡ Time with cache:     (20 × 0.03s) + (5 × 1.2s) = 6.6s
🐌 Time without cache:  (25 × 1.2s) = 30.0s
💰 Time Saved:          23.4 seconds

API Load Reduction:
🎯 API Calls Saved:     20
📉 Server Load:         -80%
💵 Bandwidth Saved:     ~2 MB (assuming 100KB per response)

Cache Efficiency:
📊 Overall Hit Rate:    80.0% (Excellent ✅)
🎯 Memory Hit Rate:     75.0% (15/20 cache hits from memory)
💾 Storage Hit Rate:    25.0% (5/20 cache hits from storage)

Performance Gain:
⚡ Average Response:    0.26s (with cache)
🐌 Without Cache:      1.20s (API every time)
🚀 Speed Improvement:  4.6x faster

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Code Flow: cachedApiCall() Function

```typescript
┌─────────────────────────────────────────────────────────────────┐
│ cachedApiCall(key, apiFunction, ttl)                            │
└────┬────────────────────────────────────────────────────────────┘
     │
     ├─► START: Log start of request
     │   console.log('🔍 Checking cache for:', key)
     │
     ├─► STEP 1: Check L1 Cache (Memory)
     │   const memoryData = memoryCache.get(key)
     │   if (memoryData && !isExpired(memoryData)) {
     │       console.log('✅ [L1 MEMORY HIT]', key)
     │       return memoryData.value
     │   }
     │
     ├─► STEP 2: Check L2 Cache (AsyncStorage)
     │   const storageData = await AsyncStorage.getItem(key)
     │   if (storageData && !isExpired(storageData)) {
     │       console.log('✅ [L2 STORAGE HIT]', key)
     │       memoryCache.set(key, storageData)  // Restore to L1
     │       return storageData.value
     │   }
     │
     ├─► STEP 3: Call API
     │   console.log('🔴 [API CALL]', key)
     │   const result = await apiFunction()
     │   
     │   // Store in both layers
     │   const cacheEntry = {
     │       value: result,
     │       timestamp: Date.now(),
     │       ttl: ttl
     │   }
     │   
     │   memoryCache.set(key, cacheEntry)
     │   await AsyncStorage.setItem(key, JSON.stringify(cacheEntry))
     │   
     │   console.log('✅ Stored in cache')
     │   
     │   // Update statistics
     │   stats.apiCalls++
     │   
     └─► RETURN: Return the result
```

---

## Visual: Cache Layers & TTL

```
┌────────────────────────────────────────────────────────────┐
│                    TIME PROGRESSION                         │
└────────────────────────────────────────────────────────────┘

Request 1 (t=0s):
┌─────────────────────────────────────────────────────────┐
│ API CALL                                                 │
│ ├─ Fetch from API (1.2s)                               │
│ ├─ Store in Memory: ✅ (TTL: 600s)                     │
│ └─ Store in AsyncStorage: ✅ (TTL: 600s)               │
└─────────────────────────────────────────────────────────┘

Request 2 (t=30s):
┌─────────────────────────────────────────────────────────┐
│ L1 MEMORY HIT                                           │
│ ├─ Check Memory: ✅ Found (age: 30s < TTL: 600s)       │
│ └─ Return instantly (0.003s)                           │
└─────────────────────────────────────────────────────────┘

Request 3 (t=300s, memory cleared):
┌─────────────────────────────────────────────────────────┐
│ L2 STORAGE HIT                                          │
│ ├─ Check Memory: ❌ Not found (cleared)                │
│ ├─ Check AsyncStorage: ✅ Found (age: 300s < TTL: 600s)│
│ ├─ Restore to Memory: ✅                               │
│ └─ Return quickly (0.050s)                             │
└─────────────────────────────────────────────────────────┘

Request 4 (t=700s):
┌─────────────────────────────────────────────────────────┐
│ API CALL (EXPIRED)                                      │
│ ├─ Check Memory: ❌ Not found                          │
│ ├─ Check AsyncStorage: ⚠️ Found but expired           │
│ │  (age: 700s > TTL: 600s)                            │
│ ├─ Remove expired cache                                │
│ ├─ Fetch from API (1.2s)                              │
│ └─ Store fresh data in both layers                     │
└─────────────────────────────────────────────────────────┘
```

---

## Cache Key Structure

```
Function: fetchTeacherDashboardSummary({ view_type: 'summary' })
         │
         ├─► Cache Key: "teacher_dashboard_summary_summary"
         │              └─┬─┘                      └─┬─┘
         │                │                           └─ Parameter (view_type)
         │                └─ Function identifier
         │
         └─► Stored as:
             {
                 "teacher_dashboard_summary_summary": {
                     "value": { data: [...], meta: {...} },
                     "timestamp": 1700000000000,
                     "ttl": 600
                 }
             }

Function: fetchTeacherQuizzes({ classroom_id: '123', offset: 0 })
         │
         ├─► Cache Key: "teacher_quizzes_{"classroom_id":"123","offset":0}"
         │              └─┬─┘           └──────────┬──────────┘
         │                │                        └─ JSON stringified params
         │                └─ Function identifier
         │
         └─► Result: Each combination of parameters = separate cache entry
```

---

## Summary: What You See in Logs

| Log Message | Meaning | Duration | Source |
|------------|---------|----------|--------|
| `🔴 [API CALL]` | Fresh API request made | ~1.2s | Network |
| `✅ [L1 MEMORY HIT]` | Served from memory cache | ~0.003s | RAM |
| `✅ [L2 STORAGE HIT]` | Served from AsyncStorage | ~0.05s | Disk |
| `Age: 45s` | Data is 45 seconds old | - | - |
| `TTL Remaining: 555s` | Will expire in 555 seconds | - | - |
| `Stored in cache` | Data cached successfully | - | - |
| `Cache expired` | Data older than TTL | - | - |

---

**This diagram shows exactly how your caching system works and what logs you'll see!** 📊
