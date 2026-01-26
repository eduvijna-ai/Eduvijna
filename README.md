# EduVijna - Cross-Platform Educational Application

## Architecture Overview

This application follows a **strict Clean Architecture** pattern with complete separation between business logic and UI.

### Core Principles

1. **Single Source of Truth**: All business logic and API calls live in `src/core/`
2. **Platform-Specific UI Only**: `src/platforms/mobile/` and `src/platforms/web/` contain ONLY presentation code
3. **Zero Duplication**: Backend changes automatically reflect across all platforms
4. **ESLint Enforced**: Architecture violations will cause build failures

## Folder Structure

```
src/
├── core/                    # ✅ Platform-agnostic business logic
│   ├── api/                # HTTP calls to backend
│   ├── domain/             # Business logic & data transformation
│   ├── hooks/              # React hooks (bridge between UI and core)
│   ├── store/              # Global state (Zustand)
│   └── types/              # TypeScript interfaces
│
├── platforms/
│   ├── mobile/             # 📱 Mobile UI (Android + iOS)
│   │   ├── navigation/
│   │   ├── screens/
│   │   └── components/
│   │
│   └── web/                # 🌐 Web UI
│       ├── navigation/
│       ├── screens/
│       └── components/
```

## Layer Responsibilities

### 🔵 API Layer (`core/api/`)
- **CAN**: Make HTTP calls, handle errors, return raw data
- **CANNOT**: Transform data, contain business logic, import React

### 🟢 Domain Layer (`core/domain/`)
- **CAN**: Transform data, validate, apply business rules
- **CANNOT**: Make HTTP calls, import React, import UI code

### 🟡 Hooks Layer (`core/hooks/`)
- **CAN**: Call domain logic, call API, manage loading states
- **CANNOT**: Import platform-specific UI code

### 🟠 Store Layer (`core/store/`)
- **CAN**: Store backend data, provide global state
- **CANNOT**: Store UI state (use local state instead)

### 🔴 UI Layer (`platforms/*/screens/` & `platforms/*/components/`)
- **CAN**: Call hooks, render UI, manage local UI state
- **CANNOT**: Import API, import domain logic, make HTTP calls

## ESLint Rules

The project enforces architecture through ESLint:

- ❌ Screens importing from `core/api/` → **ERROR**
- ❌ Screens importing from `core/domain/` → **ERROR**
- ❌ Components making HTTP calls → **ERROR**
- ❌ Domain logic importing React → **ERROR**
- ❌ Hooks importing platform code → **ERROR**

## Development Workflow

### Adding a New Feature

1. Define types in `core/types/`
2. Create API calls in `core/api/`
3. Add business logic in `core/domain/`
4. Create hook in `core/hooks/`
5. Build mobile UI in `platforms/mobile/`
6. Build web UI in `platforms/web/`

### Example: Adding "Announcements" Feature

```typescript
// ✅ CORRECT
// 1. core/api/announcements.api.ts
export const fetchAnnouncements = () => apiClient.get('/announcements');

// 2. core/domain/announcements.logic.ts
export const sortAnnouncementsByDate = (announcements) => { ... };

// 3. core/hooks/useAnnouncements.ts
export const useAnnouncements = () => {
  const data = await fetchAnnouncements();
  return sortAnnouncementsByDate(data);
};

// 4. platforms/mobile/screens/Announcements.tsx
const { announcements } = useAnnouncements(); // ✅

// ❌ WRONG
// platforms/mobile/screens/Announcements.tsx
import { fetchAnnouncements } from '@core/api/announcements.api'; // ❌ ESLint error!
```

## Running the Application

```bash
# Install dependencies
npm install

# Mobile
npm run android
npm run ios

# Web
npm run web

# Lint
npm run lint
```

## OTA Updates (Expo)

Over-the-air updates allow you to push changes without rebuilding:

- ✅ **Can update OTA**: JS code, UI changes, business logic
- ❌ **Cannot update OTA**: Native code changes, new native dependencies

## TypeScript Configuration

Strict mode is enabled to catch errors early:
- Strict null checks
- No implicit any
- Unused variables detection
- Exhaustive type checking

## State Management

Using Zustand for global state:
- Store only backend data
- UI state stays local to components
- Hooks provide computed/derived state

---

## 🚀 Performance & Caching

### Redis Fast-Path Caching

The application implements a **dual-layer caching strategy** for optimal performance:

#### Features
- **Redis Cache**: Fast-path caching with configurable TTL
- **Memory Cache**: Fallback in-memory cache for instant access
- **Circuit Breaker**: Automatic failover when Redis is unavailable
- **Comprehensive Logging**: Track cache hits, misses, and API calls

#### Configuration
```bash
# Redis Configuration (.env)
EXPO_PUBLIC_REDIS_HOST=redis-prod.eduvijna.com
EXPO_PUBLIC_REDIS_PORT=6379
EXPO_PUBLIC_REDIS_PASSWORD=eduvijnaprod@cache
EXPO_PUBLIC_REDIS_URL=redis://:eduvijnaprod@cache@redis-prod.eduvijna.com:6379/0
EXPO_PUBLIC_REDIS_ENABLED=true
EXPO_PUBLIC_REDIS_FAST_PATH_ENABLED=true
EXPO_PUBLIC_REDIS_CIRCUIT_BREAKER_THRESHOLD=5
EXPO_PUBLIC_REDIS_CIRCUIT_BREAKER_TIMEOUT=30
```

#### Cache TTL Settings
- **Dashboard Summary**: 5 minutes
- **Quiz Lists**: 10 minutes  
- **Classrooms**: 30 minutes
- **Students**: 15 minutes
- **User Profile**: 1 hour
- **Quiz Details**: 30 minutes

#### Usage in Code
```typescript
// Automatic caching - just call the API function
const data = await fetchStudentQuizzes({ view_type: 'student_total_details' });

// Force refresh (bypass cache)
const freshData = await fetchStudentQuizzes({ view_type: 'student_total_details' }, true);

// Clear specific cache
clearCacheEntry('student_quizzes');

// Clear all cache
clearApiCache();
```

#### Cache Logging
The application logs all cache operations:
- `🔴 REDIS HIT`: Data served from Redis
- `💾 MEMORY HIT`: Data served from memory cache  
- `❌ CACHE MISS`: Cache miss, API call made
- `🌐 API CALL`: API request initiated
- `💾 MEMORY SET`: Data cached in memory
- `🔴 REDIS SET`: Data cached in Redis

#### Testing Cache
```bash
# Run cache functionality test
node test-cache.js
```

---

## 🔔 Push Notifications

The app includes a complete push notification system for quiz events.

### Features
- **Bell Icon:** Unread count badge in header
- **Dropdown:** Rich notification panel with type-specific icons
- **Auto-Polling:** Updates every 30 seconds
- **Optimistic Updates:** Instant mark-as-read
- **Quiz Creation:** Automatic refresh after quiz generation
- **Theme Support:** Light/dark mode compatible

### Documentation
- [Full Implementation Guide](./PUSH_NOTIFICATIONS_COMPLETE.md)
- [Quick Reference](./NOTIFICATIONS_QUICK_REF.md)
- [Final Summary](./PUSH_NOTIFICATIONS_FINAL_SUMMARY.md)

### Usage
```typescript
import useNotifications from '@core/hooks/useNotifications';

const { notifications, unreadCount, markNotificationRead } = useNotifications();
```

---

**Remember**: If ESLint complains, your architecture is wrong. Fix the architecture, don't disable the rule.
