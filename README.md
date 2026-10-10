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

> **Workspace setup:** [docs/development/WORKSPACE_SETUP.md](docs/development/WORKSPACE_SETUP.md) · [AGENTS.md](AGENTS.md)  
> Open `Eduvijna-MobileApps.code-workspace` — **Quiz-React Reference** is read-only.

```bash
# Install dependencies (reproducible)
npm ci

# API: set EDUVIJNA_API_ENV=development|production (see .env.example).
# npm scripts below set it explicitly — dev → dev-api.eduvijna.com, prod → eduapi.eduvijna.com.

# Development (explicit dev API + dev client)
npm run start:development
npm run web:development

# Production-profile local runs (same API as release builds)
npm run start:production
npm run web

# Local native (requires Android SDK / Xcode; dev client for start:development)
npm run android:development
npm run android
npm run ios                # macOS/Xcode only

# Validation
npm run type-check
npm run lint
npm test -- --watch=false
npm run bundle:android
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

## Performance & Caching

**Current client cache** (`src/core/services/cacheService.ts`): in-memory L1 + AsyncStorage L2.
There is **no Redis client connection** in the mobile app. Do not configure Redis/Pinecone/database credentials in Expo public env vars.

Historical Redis-oriented notes may appear in older docs; see [docs/development/REPOSITORY_BASELINE.md](docs/development/REPOSITORY_BASELINE.md) and ADR-006 in `ARCHITECTURE_DECISIONS.md`.

```typescript
// Automatic caching via cacheService helpers used by dashboard APIs
const data = await fetchStudentQuizzes({ view_type: 'student_total_details' });
const freshData = await fetchStudentQuizzes({ view_type: 'student_total_details' }, true);
clearCacheEntry('student_quizzes');
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
