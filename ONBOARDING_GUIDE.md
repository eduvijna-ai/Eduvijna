# ONBOARDING_GUIDE.md — EduVijna Developer Onboarding

> This guide takes a developer from zero knowledge to productive contribution in 10 working days. It covers environment setup, mental model, architecture walkthrough, and a day-by-day learning plan.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Mental Model: How the App Works](#3-mental-model-how-the-app-works)
4. [Repository Orientation](#4-repository-orientation)
5. [Day-by-Day Learning Plan (10 Days)](#5-day-by-day-learning-plan-10-days)
6. [How to Add a New Screen](#6-how-to-add-a-new-screen)
7. [How to Add a New API Endpoint](#7-how-to-add-a-new-api-endpoint)
8. [How to Add a New ERP Module](#8-how-to-add-a-new-erp-module)
9. [Common Gotchas & Pitfalls](#9-common-gotchas--pitfalls)
10. [Testing Guide](#10-testing-guide)
11. [Debugging Cheatsheet](#11-debugging-cheatsheet)
12. [Team Conventions & Code Standards](#12-team-conventions--code-standards)

---

## 1. Prerequisites

### Required Knowledge

| Skill | Level | Why |
|-------|-------|-----|
| React | Intermediate | Component model, hooks, useEffect |
| TypeScript | Intermediate | Strict mode, generics, type narrowing |
| React Native | Beginner–Intermediate | Platform components, Pressable, StyleSheet |
| Expo SDK | Beginner | Expo modules, expo-constants, expo-notifications |
| React Navigation 6 | Beginner | Stack navigator, tab navigator, navigation props |
| Zustand | Beginner | Store creation, `create()`, `useStore()` |
| Axios | Beginner | Interceptors, request config |
| REST APIs | Intermediate | JWT auth, Bearer tokens, refresh flow |

### Required Tools

```bash
# Node.js (v18+)
node --version  # Minimum: v18.x

# npm (v9+)
npm --version

# Optional global CLIs (ad-hoc terminal use)
npm install -g @expo/cli
npm install -g eas-cli

# Repo scripts resolve Expo/EAS via `node` + local entries (`npm ci` installs eas-cli).
# See docs/development/API_ENVIRONMENT.md — wrapper uses stdio inherit on Windows.

# Android Studio (for Android emulator) OR
# Xcode (for iOS simulator, macOS only)

# Expo Go app on physical device (optional)
```

### Access Needed

- [ ] Git repository access
- [ ] `google-services.json` (Firebase config for Android)
- [ ] `GoogleService-Info.plist` (Firebase config for iOS)
- [ ] Backend API URL (`https://eduapi.eduvijna.com`) — already in `app.json`
- [ ] EAS account (for builds)

---

## 2. Environment Setup

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd Eduvijna

npm install
# postinstall automatically runs patch-package
```

### Step 2: Environment File

```bash
# Create .env from example
cp .env.example .env
# .env contains:
# EXPO_PUBLIC_API_URL=https://eduapi.eduvijna.com/api/v1
```

**Note:** The API URL is also configured in `app.json:extra.API_BASE_URL`. The `.env` variable is secondary — the app reads from `Constants.expoConfig.extra.API_BASE_URL` via `expo-constants`.

### Step 3: Start Development

```bash
# Start Expo Metro bundler
npm start

# OR target a specific platform:
npm run android    # Android emulator/device
npm run ios        # iOS simulator (macOS only)
npm run web        # Web browser
```

### Step 4: Verify Setup

After starting, you should see:
1. Metro bundler starts at `http://localhost:8081`
2. QR code for Expo Go
3. Press `a` for Android, `i` for iOS, `w` for web

### Troubleshooting Common Setup Issues

| Issue | Fix |
|-------|-----|
| `Cannot read property 'extra' of null` | `expo-constants` cannot read `app.json`. Run `npx expo start` not bare `node`. |
| `zustand` crash on web | `metro.config.js` has a CJS redirect. Ensure metro config is not modified. |
| `axios` ESM error on web | `metro.config.js` forces browser build. Same — don't modify metro config. |
| Push notification errors on simulator | Normal — simulators don't support push. Physical device required. |
| `patch-package` warning | Run `npm install` again. Patches in `patches/` dir are applied automatically. |

---

## 3. Mental Model: How the App Works

### The Five Things You Need to Understand

#### 1. Platform Detection Happens Once at the Top

```typescript
// App.tsx:85
const isMobile = Platform.OS === 'android' || Platform.OS === 'ios';
const isWeb = Platform.OS === 'web';

// Result:
// Mobile → NavigationContainer → MobileNavigation (React Navigation)
// Web    → WebNavigation sidebar + activeScreen state machine
```

If you're adding a feature and it needs to work on both platforms, you'll touch both the mobile navigator and the web state machine.

#### 2. Authentication is Zustand-First

```typescript
// The CORRECT way to get user:
import { useAuth } from '@core/hooks/useAuth';
const { user, isAuthenticated, login, logout } = useAuth();

// The WRONG way (legacy — used by DropdownContext only):
import { useAuth } from '@core/context/AuthContext';  // ← DON'T use this
```

The `user` object comes from Zustand's `user.store`. `isAuthenticated` is also from the store. Auth state lives globally, not in React state.

#### 3. Dashboard Data is Loaded Once Per Session

```typescript
// Teacher dashboard data:
const store = useTeacherDashboardStore();
store.loadDashboard(); // Loads once — subsequent calls are no-ops if isInitialized=true
store.allQuizzes;      // Your data
store.stats;           // Computed stats
store.refresh();       // Force reload (use for pull-to-refresh)
```

Do NOT make your own API call to `/api/v1/quizzes/` — use the store. This prevents duplicate requests.

#### 4. API Calls Go Through Two Different Clients

```typescript
// Standard API calls: use Axios wrappers from config.ts
import { get, post, put, del } from '@core/api/config';
const data = await get<MyType>('/api/v1/my-endpoint');

// Dashboard-specific (legacy): dashboardApi.ts uses fetch directly
// For new features, always use the Axios client from config.ts
```

#### 5. Cache is Automatic When Using dashboardApi.ts

```typescript
// This already handles L1 + L2 cache:
import { cachedApiCall, CACHE_TTL } from '@core/services/cacheService';
const data = await cachedApiCall(
  () => get<MyType>('/api/v1/my-endpoint'),
  'my-cache-key',
  CACHE_TTL.DEFAULT  // 300 seconds
);
```

---

## 4. Repository Orientation

### File You'll Touch Most Often

| File | Purpose | When to Touch |
|------|---------|---------------|
| `src/screens/` | Shared screens | Adding a shared screen |
| `src/platforms/mobile/navigation/BottomTabNavigator.tsx` | Mobile nav | Adding mobile screen/tab |
| `App.tsx` | Web nav + providers | Adding web screen |
| `src/core/api/` | API modules | Adding new endpoint |
| `src/core/store/` | Global state | Adding new global state |
| `src/core/hooks/` | Business logic hooks | Adding hook for a screen |
| `src/erp/screens/` | ERP screens | Adding/modifying ERP features |
| `src/context/DropdownContext.tsx` | Quiz form dropdowns | Modifying dropdown data |

### Path Aliases (from tsconfig.json)

```typescript
@core/*    → src/core/*
@screens/* → src/screens/*
@platforms/* → src/platforms/*
@mobile/*  → src/platforms/mobile/*
@web/*     → src/platforms/web/*
@context/* → src/context/*
@theme/*   → src/theme/*
@components/* → src/components/*
```

Use these instead of relative paths:
```typescript
// Good:
import { useAuth } from '@core/hooks/useAuth';
import TeacherDashboard from '@screens/TeacherDashboard';

// Avoid:
import { useAuth } from '../../../core/hooks/useAuth';
```

---

## 5. Day-by-Day Learning Plan (10 Days)

### Week 1: Understanding

#### Day 1 — Architecture & Entry

**Goal:** Understand how the app boots and renders.

Read in order:
1. `SKILLS.md` — Executive Summary and Architecture Overview sections
2. `App.tsx` — the entire file (573 lines)
3. `src/core/hooks/useAuth.ts` — focus on `checkAuth()` and `login()`
4. `src/core/api/config.ts` — focus on interceptors

**Questions to answer:**
- How does the app decide to show `TeacherDashboard` vs `StudentDashboard`?
- What happens when a JWT expires during an API call?
- What providers wrap `AppContent`?

---

#### Day 2 — Navigation

**Goal:** Understand all navigation paths.

Read in order:
1. `src/platforms/mobile/navigation/BottomTabNavigator.tsx` (first 100 lines)
2. `SKILLS.md` — Navigation Architecture section
3. `DEPENDENCY_GRAPH.md` — Screen → Hook → Store → API Mapping

**Exercise:** Draw the navigation tree on paper. Include:
- All 4 bottom tabs
- All stack screens
- ERP sub-stack

---

#### Day 3 — State Management

**Goal:** Understand Zustand stores and Context.

Read in order:
1. `src/core/store/user.store.ts`
2. `src/core/store/teacherDashboard.store.ts`
3. `src/core/store/dashboard.store.ts`
4. `src/context/ThemeContext.tsx`
5. `src/context/DropdownContext.tsx`

**Questions to answer:**
- Why does `teacherDashboard.store` check `isInitialized` before fetching?
- What data lives in `user.store` vs `teacherDashboard.store`?
- How does `DropdownContext` know when to load dropdown data?

---

#### Day 4 — API & Cache Layer

**Goal:** Understand the full data path from screen to backend.

Read in order:
1. `src/core/api/auth.api.ts`
2. `src/core/services/tokenStorage.ts`
3. `src/core/services/cacheService.ts`
4. `src/core/services/dashboardApi.ts` (first 100 lines, read the `buildQueryString` and auth logic)
5. `DATABASE_AND_API_MAP.md`

**Exercise:** Trace the data path for `GET /api/v1/quizzes/?view_type=summary` from `TeacherDashboard.tsx` all the way through.

---

#### Day 5 — Domain Layer & Permissions

**Goal:** Understand business rules.

Read in order:
1. `src/core/domain/permissions.logic.ts`
2. `src/core/domain/assessment.logic.ts`
3. `src/core/domain/analytics.logic.ts`
4. `src/core/hooks/useAssessments.ts`

**Questions:**
- What permission check runs before a teacher can create an assessment?
- Can a student call `deleteAssessment()`? Where is this enforced?

---

### Week 2: Applying Knowledge

#### Day 6 — Authentication Deep Dive

**Goal:** Understand all auth edge cases.

Read in order:
1. `ARCHITECTURE_DECISIONS.md` — ADR-004 (Dual Auth Systems)
2. `src/core/context/AuthContext.tsx` (legacy)
3. `src/core/hooks/useNotifications.ts` — notice the wrong import

**Exercise:** Find every place in the codebase that calls `useAuth`. Verify each one imports from the correct file (`@core/hooks/useAuth`, not `@core/context/AuthContext`).

---

#### Day 7 — Push Notifications & Deep Links

**Goal:** Understand notification and deep link flow.

Read in order:
1. `src/core/services/PushNotificationService.ts` (first 100 lines)
2. `src/core/services/openQuizHandler.ts` (first 80 lines)
3. `src/core/services/deepLinkService.ts`
4. `App.tsx` — lines 117–370 (notification + deep link handlers)
5. `ANDROID_APP_LINKS_SETUP.md` (root documentation file)

---

#### Day 8 — ERP Module

**Goal:** Understand the ERP submodule.

Read in order:
1. `src/erp/navigation/ERPNavigator.tsx`
2. `src/erp/hooks/useErpRole.ts`
3. `src/erp/contexts/AcademicYearContext.tsx`
4. `src/erp/screens/ERPMainScreen.tsx` (or any one ERP screen)
5. `src/core/api/erp.api.ts` (first 100 lines to understand pattern)

---

#### Day 9 — Quiz Creation Flow

**Goal:** Understand the quiz creation product flow end-to-end.

Read in order:
1. `src/screens/CreateAIQuizScreen.tsx` (first 150 lines for structure)
2. `src/core/hooks/useQuizNavItems.ts`
3. `src/components/QuizFormFields.tsx` (first 100 lines)
4. `DATABASE_AND_API_MAP.md` — Quiz & Assessment Endpoints section

---

#### Day 10 — Running Tests + First Change

**Goal:** Run tests, understand coverage, make a small change.

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type check
npm run type-check

# Lint
npm run lint
```

**Exercise:** Fix one dead code item from `DEPENDENCY_GRAPH.md` Section 5:
- Remove `useTeacherDashboard.old.ts` or `useStudentDashboard.old.ts`
- Verify no import errors
- Run tests

---

## 6. How to Add a New Screen

### Step 1: Create the Screen File

```typescript
// src/screens/MyNewScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@core/hooks/useAuth';
import { useTheme } from '@context/ThemeContext';

interface Props {
  navigation?: any;
  route?: any;
}

export default function MyNewScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={{ color: theme.colors.text }}>My New Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
```

### Step 2: Register in Mobile Navigation

```typescript
// src/platforms/mobile/navigation/BottomTabNavigator.tsx
// Add to imports:
import MyNewScreen from '@screens/MyNewScreen';

// Add to Stack.Navigator (inside MainStack or outer stack):
<Stack.Screen name="MyNewScreen" component={MyNewScreen} />
```

### Step 3: Register in Web Navigation

```typescript
// App.tsx — Step 3a: Add to union type
const [activeScreen, setActiveScreen] = useState<
  | 'dashboard'
  | 'MyNewScreen'   // ← Add here
  | ...
>('dashboard');

// App.tsx — Step 3b: Add to renderScreen()
case 'MyNewScreen':
  return <MyNewScreen
    navigation={createWebNavigation('dashboard')}
    route={{ params: navigationParams }}
  />;
```

### Step 4: Add to Deep Linking (if needed)

```typescript
// App.tsx — in linking.config.screens:
MyNewScreen: 'my-new-screen',
```

### Step 5: Import screen in App.tsx (web only)

```typescript
// App.tsx — add import at top:
import MyNewScreen from './src/screens/MyNewScreen';
```

---

## 7. How to Add a New API Endpoint

### Option A: Add to Existing API Module

```typescript
// src/core/api/assessment.api.ts — add new function
export async function getQuizLeaderboard(quizId: string): Promise<LeaderboardEntry[]> {
  return get<LeaderboardEntry[]>(`/api/v1/quizzes/${quizId}/leaderboard`);
}
```

### Option B: Create a New API Module

```typescript
// src/core/api/leaderboard.api.ts
import { get } from './config';
import type { LeaderboardEntry } from '../types';

export async function getQuizLeaderboard(quizId: string): Promise<LeaderboardEntry[]> {
  return get<LeaderboardEntry[]>(`/api/v1/quizzes/${quizId}/leaderboard`);
}
```

### Option C: Add Cached API Call via dashboardApi Pattern

```typescript
// src/core/services/dashboardApi.ts — add to existing file
export async function fetchLeaderboard(quizId: string): Promise<LeaderboardEntry[]> {
  return cachedApiCall(
    async () => {
      const token = await TokenStorage.getAccessToken();
      const response = await fetch(
        `${DASHBOARD_API_URL}/quizzes/${quizId}/leaderboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      const json = await response.json();
      return json.data;
    },
    `leaderboard:${quizId}`,
    CACHE_TTL.DEFAULT
  );
}
```

**Recommendation:** Use Option A or B (Axios). Only use Option C if you need caching and the data comes from the dashboard's fetch client.

### Add the Type

```typescript
// src/core/types/index.ts or a new file:
export interface LeaderboardEntry {
  student_id: number;
  student_name: string;
  score: number;
  rank: number;
}
```

### Call from a Hook (following architecture rules)

```typescript
// src/core/hooks/useLeaderboard.ts
import { useState, useEffect } from 'react';
import { getQuizLeaderboard } from '../api/leaderboard.api';
import type { LeaderboardEntry } from '../types';

export function useLeaderboard(quizId: string) {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getQuizLeaderboard(quizId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [quizId]);

  return { data, loading, error };
}
```

---

## 8. How to Add a New ERP Module

### Step 1: Add API Functions to erp.api.ts

```typescript
// src/core/api/erp.api.ts — add at end
export const canteenApi = {
  getMenu: (schoolId: number, date: string) =>
    get<CanteenMenuItem[]>(`/api/v1/erp/canteen/menu?school_id=${schoolId}&date=${date}`),
  
  placeOrder: (schoolId: number, data: CanteenOrderData) =>
    post<CanteenOrder>(`/api/v1/erp/canteen/orders?school_id=${schoolId}`, data),
};
```

### Step 2: Create the Screen

```typescript
// src/erp/screens/CanteenScreen.tsx
import React from 'react';
import { useErpRole } from '../hooks/useErpRole';
import { canteenApi } from '@core/api/erp.api';
// ... screen implementation
```

### Step 3: Register in ERPNavigator

```typescript
// src/erp/navigation/ERPNavigator.tsx

// Add to type:
export type ERPStackParamList = {
  // ... existing
  ERPCanteen: undefined;
};

// Add to Stack.Navigator:
import CanteenScreen from '../screens/CanteenScreen';
<Stack.Screen name="ERPCanteen" component={CanteenScreen} />
```

### Step 4: Add to ERPMainScreen Menu

```typescript
// src/erp/screens/ERPMainScreen.tsx
// Add to the module list that renders navigation cards
{ key: 'ERPCanteen', label: 'Canteen', icon: 'fast-food-outline' }
```

---

## 9. Common Gotchas & Pitfalls

### Gotcha 1: Two `useAuth` Imports

```typescript
// ✅ CORRECT — primary auth
import { useAuth } from '@core/hooks/useAuth';

// ❌ WRONG — legacy, missing Zustand state
import { useAuth } from '@core/context/AuthContext';
```

The wrong import gives you `user` and `token` from React state, NOT from Zustand. These can be stale or missing `school_id`.

---

### Gotcha 2: School ID Resolution

`user.school_id` is not reliably set on the top-level `user` object — it may be nested in `user.school.id`, `user.profile.school_id`, etc. Always use the resolved value from the Zustand store:

```typescript
// ✅ CORRECT
const { schoolId } = useUserStore();

// OR via useErpRole:
const { schoolId } = useErpRole();

// ❌ FRAGILE — may be undefined
const schoolId = user?.school_id;
```

---

### Gotcha 3: Dashboard Data is Already Loaded

Don't call the quiz API directly in new teacher screens:

```typescript
// ❌ WRONG — creates duplicate API call
const [quizzes, setQuizzes] = useState([]);
useEffect(() => {
  fetchTeacherQuizzes({ view_type: 'summary', limit: 1000 })
    .then(r => setQuizzes(r.data));
}, []);

// ✅ CORRECT — reuses already-loaded data
const { allQuizzes, stats } = useTeacherDashboardStore();
```

---

### Gotcha 4: Web Screens Need a Navigation Compatibility Object

Web screens don't have React Navigation. When passing navigation to a screen in `App.tsx:renderScreen()`:

```typescript
// ✅ CORRECT
case 'MyNewScreen':
  return <MyNewScreen navigation={createWebNavigation('dashboard')} />;

// ❌ CRASH — navigation is undefined on web
case 'MyNewScreen':
  return <MyNewScreen />;
```

---

### Gotcha 5: Instructor JSON Field in Quiz Response

The `instructor` field in `TeacherQuiz` is a **JSON string**, not an object:

```typescript
// ❌ CRASH
const name = quiz.instructor.instructor_fullname;

// ✅ CORRECT
const instructor = typeof quiz.instructor === 'string'
  ? JSON.parse(quiz.instructor)
  : quiz.instructor;
const name = instructor?.instructor_fullname;
```

Same applies to the `attempts` field.

---

### Gotcha 6: ERP Screens Need schoolId

All ERP API calls require `schoolId`. Don't forget to include it:

```typescript
// ✅ CORRECT
const { schoolId } = useErpRole();
const data = await canteenApi.getMenu(schoolId!, date);

// ❌ WRONG — will get 403 or wrong data
const data = await canteenApi.getMenu(undefined!, date);
```

Super admins (`isSuperAdmin=true`) have no `schoolId`. Handle this case.

---

### Gotcha 7: Cache Keys Must Be Unique

When using `cachedApiCall`, ensure your cache key is unique:

```typescript
// ✅ CORRECT — includes ID in key
cachedApiCall(fn, `leaderboard:${quizId}`, TTL)

// ❌ COLLIDES — same key for different quiz IDs
cachedApiCall(fn, 'leaderboard', TTL)
```

---

### Gotcha 8: Don't Add ESLint-Violating Imports

The `.eslintrc.js` prohibits screens from importing `@core/api`, `@core/store`, or `@core/domain`. If your code does this, CI will fail.

```typescript
// In a screen file — ❌ ESLint ERROR
import { fetchTeacherQuizzes } from '@core/services/dashboardApi';
import { useTeacherDashboardStore } from '@core/store/teacherDashboard.store';

// ✅ CORRECT — go through a hook
import { useTeacherDashboard } from '@core/hooks/useTeacherDashboard';
```

---

## 10. Testing Guide

### Test Files Location

```
src/__tests__/
├── setup.ts          ← Jest setup (mocks for AsyncStorage, etc.)
├── auth.test.ts      ← Auth hook tests
├── cache.test.ts     ← Cache service tests
└── ...
```

### Running Tests

```bash
npm test                    # Run all tests once
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report
```

### Coverage Targets

Currently configured in `package.json`:
```json
"collectCoverageFrom": [
  "src/screens/CreateDocumentQuizScreen.tsx",
  "src/screens/CreateHandwrittenQuizScreen.tsx",
  "src/core/store/assessmentWorkspace.store.ts",
  "src/core/services/sharedApi.ts"
]
```

Only 4 files have coverage collection. The team goal should be to expand this.

### Writing Tests for a New Feature

```typescript
// src/__tests__/myFeature.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useMyFeatureHook } from '../core/hooks/useMyFeatureHook';

// Mock dependencies
jest.mock('../core/api/config', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('useMyFeatureHook', () => {
  it('loads data on mount', async () => {
    const { get } = require('../core/api/config');
    (get as jest.Mock).mockResolvedValue([{ id: 1, name: 'Test' }]);

    const { result } = renderHook(() => useMyFeatureHook());

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });
});
```

---

## 11. Debugging Cheatsheet

### View Cache State

```typescript
// Add temporarily in any component:
import { getCacheStatistics, logCacheStatistics } from '@core/services/cacheService';
const stats = await getCacheStatistics();
console.log(stats);
// { memory: { entries, size }, storage: { entries }, stats, hitRate }
```

### Check Auth State

```typescript
// In any component or hook:
import { useUserStore } from '@core/store/user.store';
const state = useUserStore.getState();
console.log(state.user, state.isAuthenticated, state.schoolId);
```

### Force Refresh Dashboard

```typescript
import { useTeacherDashboardStore } from '@core/store/teacherDashboard.store';
useTeacherDashboardStore.getState().refresh(); // Clears and reloads
```

### Clear All Cache

```typescript
import { clearAllCache } from '@core/services/cacheService';
await clearAllCache();
```

### Simulate Token Expiry

```typescript
import * as TokenStorage from '@core/services/tokenStorage';
// Force expiry by setting past timestamp:
await TokenStorage.storeTokenExpiry(-1000); // Expired 1 second ago
```

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `'Authentication failed'` | JWT invalid/expired on backend | Check token storage, call `useAuth().checkAuth()` |
| `'Network connection failed'` | No internet / backend unreachable | Check wifi / VPN |
| `'Session expired'` | Refresh token failed | User must re-login |
| `'Permission denied - only teachers can create assessments'` | Student calling instructor-only hook | Check role before calling |
| `Cannot read property 'school_id'` | `user` is null during loading | Add `if (!user) return` guard |
| `undefined is not an object (evaluating 'quiz.instructor.instructor_fullname')` | JSON string not parsed | See Gotcha 5 above |

---

## 12. Team Conventions & Code Standards

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Screens | PascalCase.tsx | `CreateAIQuizScreen.tsx` |
| Hooks | camelCase.ts | `useTeacherDashboard.ts` |
| Stores | camelCase.store.ts | `user.store.ts` |
| API modules | camelCase.api.ts | `assessment.api.ts` |
| Types | camelCase.types.ts | `dashboard.types.ts` |
| Services | camelCase.ts | `cacheService.ts` |
| Domain | camelCase.logic.ts | `permissions.logic.ts` |

### Import Order Convention

```typescript
// 1. React/React Native
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

// 2. Navigation
import { useNavigation } from '@react-navigation/native';

// 3. External packages
import { Ionicons } from '@expo/vector-icons';

// 4. Alias imports
import { useAuth } from '@core/hooks/useAuth';
import { useTheme } from '@context/ThemeContext';

// 5. Relative imports
import MyComponent from '../components/MyComponent';
```

### State Management Decision Tree

```
Question: Where should this state live?

Affects only one component?
  → useState() in that component

Shared across 2–3 sibling components?
  → Lift state to parent, or useContext

Shared across entire feature (quiz creation steps)?
  → Zustand store (assessmentWorkspace.store pattern)

Global auth, user, school data?
  → user.store.ts (already exists)

Dashboard data (quiz lists)?
  → teacherDashboard.store.ts (already exists, don't duplicate)

Server-fetched data with caching?
  → Custom hook + cachedApiCall from cacheService
```

### PR Checklist

- [ ] Types added for new data shapes in `src/core/types/`
- [ ] New screen registered in both `BottomTabNavigator.tsx` (mobile) and `App.tsx:renderScreen()` (web)
- [ ] API functions in `@core/api/` not imported directly from screens (use hooks)
- [ ] No duplicate `useCurrentUser()` definitions added
- [ ] School ID resolved from `useUserStore().schoolId` not from `user.school_id`
- [ ] `instructor` and `attempts` JSON fields parsed before use
- [ ] ESLint passes: `npm run lint`
- [ ] TypeScript passes: `npm run type-check`
- [ ] Tests pass: `npm test`

---

*This guide should be read alongside `SKILLS.md` (architecture overview), `DEPENDENCY_GRAPH.md` (module structure), and `DATABASE_AND_API_MAP.md` (endpoint reference).*
