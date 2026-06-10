# DEPENDENCY_GRAPH.md — EduVijna Module Dependency Analysis

> This document maps every import chain in the codebase, identifies circular dependencies, dead code, and duplicated business logic. All dependency edges are traced from actual `import` statements.

---

## Table of Contents

1. [Layer Architecture Overview](#1-layer-architecture-overview)
2. [Import Dependency Graph](#2-import-dependency-graph)
3. [Screen → Hook → Store → API Mapping](#3-screen--hook--store--api-mapping)
4. [Circular Dependencies](#4-circular-dependencies)
5. [Dead Code Analysis](#5-dead-code-analysis)
6. [Duplicated Business Logic](#6-duplicated-business-logic)
7. [Cross-Layer Violations](#7-cross-layer-violations)
8. [Module Coupling Matrix](#8-module-coupling-matrix)
9. [Opportunities for Modularization](#9-opportunities-for-modularization)

---

## 1. Layer Architecture Overview

The intended clean architecture (enforced by `.eslintrc.js`):

```
┌──────────────────────────────────────────────────────────┐
│                     UI LAYER                              │
│  src/screens/  src/platforms/*/screens/  src/components/ │
│                  CANNOT import core/api, core/domain,    │
│                  core/store directly                      │
└───────────────────────────┬──────────────────────────────┘
                            │ (allowed)
┌───────────────────────────▼──────────────────────────────┐
│                   HOOK LAYER                              │
│               src/core/hooks/                             │
│        CAN import api, domain, store                     │
│        CANNOT import platform-specific code              │
└──────┬────────────────────┬──────────────────────────────┘
       │                    │
┌──────▼──────┐   ┌─────────▼──────────────────────────────┐
│  STORE      │   │         API / SERVICES LAYER             │
│  src/core/  │   │  src/core/api/   src/core/services/     │
│  store/     │   │  (Axios modules) (fetch-based services) │
└──────────── ┘   └─────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│                   DOMAIN LAYER                            │
│               src/core/domain/                            │
│           PURE FUNCTIONS — no imports                    │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Import Dependency Graph

### Entry & Providers

```
node_modules/expo/AppEntry.js
  └── App.tsx
        ├── src/context/ThemeContext.tsx
        │     └── src/theme/theme.ts
        │     └── @react-native-async-storage/async-storage
        ├── src/core/context/AuthContext.tsx  [LEGACY]
        │     ├── src/core/services/tokenStorage.ts
        │     │     ├── @react-native-async-storage/async-storage
        │     │     └── expo-secure-store
        │     └── src/core/api/auth.api.ts
        │           └── src/core/api/config.ts  ←── AXIOS ROOT
        │                 ├── axios
        │                 ├── expo-constants
        │                 ├── src/core/services/tokenStorage.ts
        │                 ├── src/core/store/user.store.ts
        │                 └── src/core/services/cacheService.ts
        │                       └── @react-native-async-storage/async-storage
        ├── src/context/DropdownContext.tsx
        │     ├── src/core/context/AuthContext.tsx  [LEGACY — imports wrong auth]
        │     └── src/core/services/dropdown.ts
        ├── src/core/hooks/useAuth.ts
        │     ├── src/core/store/user.store.ts
        │     ├── src/core/store/teacherDashboard.store.ts  ← store import in hook
        │     ├── src/core/api/auth.api.ts
        │     ├── src/core/api/config.ts
        │     ├── src/core/services/tokenStorage.ts
        │     └── src/core/hooks/useQuizNavItems.ts  ← another hook import
        │           ├── src/core/hooks/useAuth.ts     ← BACK REFERENCE (not circular)
        │           └── src/core/api/erp.api.ts
        ├── src/core/hooks/useNotificationPolling.ts
        ├── src/core/services/deepLinkService.ts
        ├── src/core/services/PushNotificationService.ts
        ├── src/core/services/openQuizHandler.ts
        ├── src/core/services/dashboardApi.ts
        ├── src/core/services/navigationService.ts
        └── src/core/services/cacheService.ts
```

### Zustand Store Graph

```
user.store.ts
  └── src/core/types/   [only types, no runtime deps]

teacherDashboard.store.ts
  ├── src/core/services/dashboardApi.ts   ← store imports service
  │     ├── src/core/services/tokenStorage.ts
  │     ├── src/core/services/cacheService.ts
  │     └── src/core/api/config.ts        ← imports API_BASE_URL (config, not apiClient)
  └── src/core/types/quiz.types.ts

dashboard.store.ts
  └── src/core/types/quiz.types.ts

assessment.store.ts
  └── src/core/types/

assessmentWorkspace.store.ts
  └── src/core/types/
```

### API Layer Graph

```
src/core/api/config.ts  [AXIOS ROOT]
  ├── axios
  ├── expo-constants
  ├── src/core/services/tokenStorage.ts
  ├── src/core/store/user.store.ts    ← API layer imports STORE (only for logout() call)
  └── src/core/services/cacheService.ts

src/core/api/auth.api.ts
  ├── src/core/api/config.ts
  └── src/core/services/tokenStorage.ts

src/core/api/assessment.api.ts
  ├── src/core/api/config.ts
  └── src/core/services/dashboardApi.ts  ← API layer imports SERVICE layer ⚠️ violation

src/core/api/analytics.api.ts
  └── src/core/api/config.ts

src/core/api/erp.api.ts
  └── src/core/api/config.ts

src/core/api/profile.api.ts
  └── src/core/api/config.ts

src/core/api/notifications.api.ts
  └── src/core/api/config.ts

src/core/api/device.api.ts
  └── src/core/api/config.ts
```

---

## 3. Screen → Hook → Store → API Mapping

### Teacher-Facing Screens

| Screen | Hooks Used | Stores Used | API Services | Endpoints |
|--------|-----------|-------------|--------------|-----------|
| `TeacherDashboard.tsx` | `useTeacherDashboardStore` (direct store), `useAuth`, `useTheme` | `teacherDashboard.store` | `dashboardApi.ts` | `GET /api/v1/quizzes/?view_type=summary&limit=1000` |
| `Assessments.tsx` | `useAssessments`, `useAuth`, `useTheme`, `useDropdowns` | `assessment.store`, `dashboard.store` | `dashboardApi.ts` | `GET /api/v1/quizzes/?view_type=summary`, `GET /api/v1/quizzes/student-dashboard` |
| `ClassesList.tsx` | `useAuth`, `useTheme` | `teacherDashboard.store` | `dashboardApi.ts` | `GET /api/v1/classrooms/` |
| `StudentList.tsx` | `useAuth`, `useTheme` | `teacherDashboard.store` | `dashboardApi.ts` (on-demand classroom load) | `GET /api/v1/quizzes/?view_type=class_wise_students&classroom_id=X` |
| `CreateAIQuizScreen.tsx` | `useAuth`, `useDropdowns`, `useTheme` | — | Direct API call (Axios) | `POST /api/v1/quizzes/generate` |
| `CreateDocumentQuizScreen.tsx` | `useAuth`, `useDropdowns`, `useTheme`, `useAssessmentWorkspaceStore` | `assessmentWorkspace.store` | Direct API call (Axios) | `POST /api/v1/quizzes/generate-from-document` |
| `CreateImageQuizScreen.tsx` | `useAuth`, `useDropdowns`, `useTheme` | — | Direct API call | `POST /api/v1/quizzes/generate-from-image` |
| `CreateYouTubeQuizScreen.tsx` | `useAuth`, `useDropdowns`, `useTheme` | — | Direct API call | `POST /api/v1/quizzes/generate-from-youtube` |
| `CreateWebsiteQuizScreen.tsx` | `useAuth`, `useDropdowns`, `useTheme` | — | Direct API call | `POST /api/v1/quizzes/generate-from-website` |
| `CreateHandwrittenQuizScreen.tsx` | `useAuth`, `useDropdowns`, `useTheme` | `assessmentWorkspace.store` | Direct API call | `POST /api/v1/quizzes/generate-from-handwritten` |
| `QuizPreviewScreen.tsx` | `useAuth`, `useTheme` | — | Direct API call | `GET /api/v1/quizzes/{id}` |
| `QuizStatusScreen.tsx` | `useAuth`, `useTheme` | — | Direct API call | `GET /api/v1/quizzes/{id}/status` |
| `RecentAssessmentsScreen.tsx` | `useTeacherDashboard` | `teacherDashboard.store` | `dashboardApi.ts` | (reuses loaded data) |

### Student-Facing Screens

| Screen | Hooks Used | Stores Used | API Services | Endpoints |
|--------|-----------|-------------|--------------|-----------|
| `StudentDashboard.tsx` | `useAuth`, `useTheme` | — | `dashboardApi.ts` (direct) | `GET /api/v1/quizzes/student-dashboard` |
| `QuizTakingScreen.tsx` | `useAuth`, `useTheme` | — | Direct Axios | `GET /api/v1/quiz-sessions/{id}`, `POST /api/v1/quiz-sessions/{id}/submit` |
| `QuizResultsScreen.tsx` | `useAuth`, `useTheme` | — | Direct Axios | `GET /api/v1/quiz-sessions/{id}/results` |
| `QuizLoadingScreen.tsx` | — | — | — | (routing screen, no API) |
| `StudentAnalyticsScreen.tsx` | `useAuth`, `useTheme` | — | Direct Axios | `GET /api/v1/analytics/student/{id}` |

### Shared / Utility Screens

| Screen | Hooks Used | Stores Used | API Services | Endpoints |
|--------|-----------|-------------|--------------|-----------|
| `Notifications.tsx` | `useNotifications`, `useTheme` | — | `notifications.api.ts` | **DISABLED** |
| `WorksheetScreen.tsx` | `useAuth`, `useTheme` | — | Direct Axios | `GET/POST /api/v1/worksheets/*` |
| `TestNotifications.tsx` | `useAuth` | — | `device.api.ts` | `/api/v1/notifications/devices/` |

### ERP Screens (22 total)

All ERP screens follow the same pattern:

| Screen | Hooks | Stores | API Service | Endpoints |
|--------|-------|--------|-------------|-----------|
| `ERPMainScreen.tsx` | `useErpRole`, `useTheme` | `user.store` (via `useErpRole`) | — | — |
| `AttendanceScreen.tsx` | `useErpRole`, `useTheme` | `user.store` | `erp.api.ts` | `GET /api/v1/erp/attendance/*` |
| `FeesScreen.tsx` | `useErpRole`, `useTheme` | `user.store` | `erp.api.ts` | `GET /api/v1/erp/fees/*` |
| `TimetableScreen.tsx` | `useErpRole`, `useTheme` | `user.store` | `erp.api.ts` | `GET /api/v1/erp/timetable/*` |
| `AdmissionsScreen.tsx` | `useErpRole`, `useTheme` | `user.store` | `erp.api.ts` | `GET /api/v1/erp/admissions/*` |
| *(18 more ERP screens)* | `useErpRole`, `useTheme` | `user.store` | `erp.api.ts` | `GET /api/v1/erp/{module}/*` |

### Platform-Specific Screens

| Screen | Hooks | Stores | API | Endpoints |
|--------|-------|--------|-----|-----------|
| `platforms/mobile/screens/Profile.tsx` | `useAuth`, `useTheme` | `user.store` | `profile.api.ts` | `GET/PUT /api/v1/auth/profile` |
| `platforms/web/screens/Profile.tsx` | `useAuth`, `useTheme` | `user.store` | `profile.api.ts` | `GET/PUT /api/v1/auth/profile` |
| `platforms/mobile/screens/Analytics.tsx` | `useAuth`, `useTheme` | `teacherDashboard.store` | `dashboardApi.ts` | (reuses loaded data) |
| `platforms/web/screens/Analytics.tsx` | `useAuth`, `useTheme` | `teacherDashboard.store` | `dashboardApi.ts` | (reuses loaded data) |
| `platforms/mobile/screens/Login.tsx` | `useAuth`, `useTheme` | — | (via `useAuth`) | `POST /api/v1/auth/login` |
| `platforms/web/screens/Login.tsx` | `useAuth`, `useTheme` | — | (via `useAuth`) | `POST /api/v1/auth/login` |

---

## 4. Circular Dependencies

### Confirmed Circular: NONE at runtime

There are no true circular imports (A imports B, B imports A) that would cause a `Cannot read properties of undefined` error at module load time.

### Near-Circular Patterns (Structurally Coupled)

#### Pattern 1: config.ts ↔ user.store.ts

```
src/core/api/config.ts
  └── imports: src/core/store/user.store.ts
                └── imports: src/core/types/ only (no back reference)
```
`config.ts` imports `user.store` to call `useUserStore.getState().logout()` on authentication failure. This is a **downward dependency** (API layer → Store layer) which is acceptable as long as `user.store` does not import `config.ts`.

`user.store.ts` imports only from `src/core/types/` — no back reference. **Safe.**

#### Pattern 2: useAuth.ts → teacherDashboard.store.ts → dashboardApi.ts → config.ts ← useAuth.ts

```
useAuth.ts
  └── teacherDashboard.store.ts  (calls .reset() on logout)
        └── dashboardApi.ts       (calls API on loadDashboard)
              └── config.ts        (imports API_BASE_URL)
                    └── user.store.ts (calls .logout())

useAuth.ts also imports:
  └── user.store.ts (main auth state)
  └── auth.api.ts → config.ts
```

This is a **fan-in** pattern at `config.ts` and `user.store.ts`, not a circular dependency. Both `useAuth` and `dashboardApi.ts` eventually call `config.ts`, but they don't import each other.

#### Pattern 3: assessment.api.ts → dashboardApi.ts (LAYER VIOLATION)

```
src/core/api/assessment.api.ts
  └── imports: src/core/services/dashboardApi.ts
```

This is an **API layer importing from Services layer** — a violation of the intended dependency direction. `assessment.api.ts` imports `fetchTeacherQuizzes` and `fetchStudentQuizzes` from `dashboardApi.ts`. The correct approach would be for `assessment.api.ts` to define its own fetch logic using `apiClient` from `config.ts`, not delegate to a service.

---

## 5. Dead Code Analysis

### HIGH CONFIDENCE — Dead Code

| Module | File | Evidence |
|--------|------|---------|
| `analytics.api.ts` endpoints | `src/core/api/analytics.api.ts` | Uses `/dashboard/teacher/${teacherId}` — actual backend is `/api/v1/quizzes/`. No screen imports this via `useAnalytics`. TeacherDashboard uses `teacherDashboard.store` directly. |
| `useDashboard.ts` standalone hook | `src/core/hooks/useDashboard.ts` | Provides `useTeacherDashboard()` and `useStudentDashboard()` that call `fetchTeacherDashboardStats(teacherId)` — but no active screen uses these hooks. The store (`teacherDashboard.store.ts`) serves this role. |
| `useAnalytics.ts` hook | `src/core/hooks/useAnalytics.ts` | Calls `fetchAnalytics()` from `analytics.api.ts`. No active screen found importing this hook. |
| `useTeacherDashboard.old.ts` | `src/core/hooks/useTeacherDashboard.old.ts` | Explicitly `.old.ts` — dead code, 280 lines. |
| `useStudentDashboard.old.ts` | `src/core/hooks/useStudentDashboard.old.ts` | Explicitly `.old.ts` — dead code, 296 lines. |
| `mockDashboardData.ts` | `src/core/services/mockDashboardData.ts` | Commented out in `dashboardApi.ts`: `// const USE_MOCK_DATA = false;` |
| `src/examples/` folder | `src/examples/` (6 files) | Example/demo files. Not imported by any production code. |
| `src/screens/backup_*/` | `src/screens/backup_20260127_184517/` | 5 `.bak` backup files — not imported anywhere. |
| `src/screens/StudentList.clean.tsx` | `src/screens/StudentList.clean.tsx` | "clean" variant — likely replaced by `StudentList.tsx`. |
| `src/platforms/mobile/screens/Profile.backup.tsx` | 408 lines | Backup file not imported in navigation. |

### MEDIUM CONFIDENCE — Likely Dead Code

| Module | File | Why Suspected |
|--------|------|---------------|
| `fetchPerformanceTrends()` | `analytics.api.ts:103` | Defined but no hook or screen imports it |
| `fetchClassPerformance()` | `analytics.api.ts:119` | Defined but no hook or screen imports it |
| `exportAnalytics()` | `analytics.api.ts:134` | Defined but no hook or screen imports it |
| `useAssessmentStatistics()` | `useAnalytics.ts:224` | No screen found using this hook |
| `useStudentPerformance()` | `useAnalytics.ts:168` | No screen found using this hook |
| `useTopicAnalysis()` | `useAnalytics.ts:283` | No screen found using this hook |
| Notifications fetch logic | `useNotifications.ts:26–53` | Entire body is commented out / returns early |

### LOW CONFIDENCE — Possibly Used by Unread Screens

| Module | Reason for Uncertainty |
|--------|----------------------|
| `useAssessments.ts` CRUD operations | `createAssessment`, `updateAssessment`, `deleteAssessment` — these call `assessment.api.ts` CRUD endpoints. No quiz creation screen was found using these. Quiz creation appears to use direct Axios calls. |
| `src/erp/screens/` (most of them) | Not fully read — ERP screens were indexed but not all contents verified. |

---

## 6. Duplicated Business Logic

### D-001: School ID Extraction — 4+ Copies

The same 8-field fallback chain for resolving `school_id` from a user profile is copied in:

| File | Lines |
|------|-------|
| `src/core/hooks/useAuth.ts` | `extractSchoolId()` function, lines 17–36 |
| `src/platforms/mobile/navigation/BottomTabNavigator.tsx` | Inline extraction, lines 100–116 |
| `src/erp/hooks/useErpRole.ts` | Inline extraction, lines 39–51 |
| `src/context/DropdownContext.tsx` | Inline extraction, lines 66–79 |

**Fix:** Create `src/core/utils/extractSchoolId.ts`, export a single pure function, and import it everywhere.

### D-002: `useCurrentUser()` — Defined in 3 Hook Files

```typescript
// Identical function in 3 files:
export function useCurrentUser(): UserProfile | null {
  return useUserStore((state) => state.user);
}
```

Files:
- `src/core/hooks/useAnalytics.ts:38`
- `src/core/hooks/useAssessments.ts:37`
- `src/core/hooks/useDashboard.ts:15`

**Fix:** Define once in `src/core/hooks/useAuth.ts` (it's already there as `useCurrentUser` at line 301) and remove from the other files.

### D-003: Quiz Type Mapping — 2+ Copies

The logic to map backend `quiz_type` strings to the `AssessmentType` enum is duplicated:

| File | Location |
|------|----------|
| `useAssessments.ts` | Lines 153–158 (teacher) and 178–183 (student) |
| `assessment.api.ts` | `mapTeacherQuizToAssessment()` and `mapStudentQuizToAssessment()` |

**Fix:** Create `src/core/domain/quiz.mappers.ts` with a single `mapQuizType()` function.

### D-004: Role Check Inline Logic — 5+ Copies

```typescript
// Repeated in App.tsx, BottomTabNavigator.tsx, multiple screens:
if (user?.role === 'instructor' || user?.role === 'admin') { ... }
```

Files:
- `App.tsx:467` and `App.tsx:533`
- `BottomTabNavigator.tsx:58` and `BottomTabNavigator.tsx:68`
- Multiple ERP screens inline role checks

The `permissions.logic.ts` already has `isInstructor()` — it's just not being used consistently.

**Fix:** Replace all inline role checks with `isInstructor(user)` from `src/core/domain/permissions.logic.ts`.

### D-005: Assessment-to-Quiz Mapping — 2 Implementations

Both `assessment.api.ts:mapTeacherQuizToAssessment()` and `useAssessments.ts` (inline `map()` in `useMemo`) convert `TeacherQuiz` to `Assessment`. They produce slightly different outputs (different handling of `passingMarks`, `difficulty`).

**Fix:** Single `QuizMapper` class in `src/core/domain/quiz.mappers.ts`.

### D-006: `isSuperAdmin` Detection — 3 Copies

```typescript
// Same logic in 3 files:
const isSuperAdmin = roleId === 1 || role === 'super_admin' || ...
```

Files:
- `src/core/hooks/useAuth.ts:38`
- `src/platforms/mobile/navigation/BottomTabNavigator.tsx:118`
- `src/erp/hooks/useErpRole.ts:22`

**Fix:** Add `isSuperAdmin(user)` to `src/core/domain/permissions.logic.ts`.

---

## 7. Cross-Layer Violations

| Violation | From | To | Severity |
|-----------|------|----|---------|
| API imports Service | `src/core/api/assessment.api.ts` | `src/core/services/dashboardApi.ts` | Medium |
| API imports Store | `src/core/api/config.ts` | `src/core/store/user.store.ts` | Low (acceptable for logout) |
| Hook imports another Hook | `src/core/hooks/useAuth.ts` | `src/core/hooks/useQuizNavItems.ts` | Low (for `clearQuizNavCache`) |
| Hook imports Store directly | `src/core/hooks/useAuth.ts` | `src/core/store/teacherDashboard.store.ts` | Low (for `.reset()` on logout) |
| Notification hook uses wrong auth | `src/core/hooks/useNotifications.ts` | `src/core/context/AuthContext.tsx` (legacy) | High |
| DropdownContext uses wrong auth | `src/context/DropdownContext.tsx` | `src/core/context/AuthContext.tsx` (legacy) | Medium |
| Screen imports API directly | Multiple create-quiz screens | `src/core/api/config.ts` (apiClient) | Medium — should go through a hook |

---

## 8. Module Coupling Matrix

Score: `0` = no dependency, `1` = imports from, `2` = tightly coupled (multiple imports)

| From ↓ / To → | user.store | teacherDash.store | dashboard.store | config.ts | dashboardApi | cacheService | tokenStorage | AuthContext(legacy) |
|----------------|-----------|------------------|-----------------|-----------|--------------|--------------|--------------|---------------------|
| **App.tsx** | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 1 |
| **useAuth.ts** | 2 | 1 | 0 | 1 | 0 | 0 | 1 | 0 |
| **useAssessments.ts** | 1 | 0 | 2 | 0 | 1 | 0 | 0 | 0 |
| **useAnalytics.ts** | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **useDashboard.ts** | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **useNotifications.ts** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 ⚠️ |
| **DropdownContext** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 ⚠️ |
| **config.ts** | 1 | 0 | 0 | — | 0 | 1 | 1 | 0 |
| **assessment.api.ts** | 0 | 0 | 0 | 1 | 1 ⚠️ | 0 | 0 | 0 |
| **teacherDash.store** | 0 | — | 0 | 0 | 1 | 0 | 0 | 0 |

⚠️ = architectural violation

---

## 9. Opportunities for Modularization

### M-001: Split `erp.api.ts` into Domain-Specific Files

**Current:** `src/core/api/erp.api.ts` — 925 lines, all ERP in one file.  
**Proposed:**
```
src/core/api/erp/
├── attendance.api.ts
├── fees.api.ts
├── timetable.api.ts
├── admissions.api.ts
├── hr.api.ts
├── library.api.ts
├── transport.api.ts
├── hostel.api.ts
├── inventory.api.ts
├── academic.api.ts
├── navigation.api.ts  ← quizNavItemsApi
└── index.ts           ← re-exports all
```

**Impact:** Tree-shaking, easier code ownership, smaller file sizes.

### M-002: Create `src/core/utils/userUtils.ts`

Consolidate:
- `extractSchoolId()` — currently in 4 places
- `isSuperAdmin()` — currently in 3 places
- `isInstructor()`, `isStudent()` — re-export from `permissions.logic.ts`

### M-003: Create `src/core/domain/quiz.mappers.ts`

Consolidate all `TeacherQuiz → Assessment` and `StudentQuiz → StudentAssessment` mapping logic.

### M-004: Create a `useSchool()` Hook

```typescript
// src/core/hooks/useSchool.ts
export function useSchool() {
  const { schoolId } = useUserStore();
  const { user } = useAuth();
  return {
    schoolId,
    schoolName: resolveSchoolName(user),
    isSuperAdmin: isSuperAdminUser(user),
  };
}
```

Replaces the duplicated school resolution logic in `BottomTabNavigator.tsx`, `useErpRole.ts`, `DropdownContext.tsx`, and `useAuth.ts`.

### M-005: Migrate `dashboardApi.ts` into Axios Layer

Move all `dashboardApi.ts` endpoints to use `apiClient` from `config.ts`. This eliminates the dual API client problem and ensures all requests benefit from automatic token refresh.

### M-006: Extract `QuizCreation` Feature Module

The 6 quiz creation screens (`CreateAIQuizScreen`, `CreateDocumentQuizScreen`, etc.) share:
- `useDropdowns()` context
- `useAuth()` hook
- Form pattern (formik + yup)
- Similar API call structure

Propose:
```
src/features/quiz-creation/
├── hooks/
│   ├── useQuizForm.ts        ← shared form logic
│   └── useQuizSubmit.ts      ← shared API submission
├── components/
│   └── QuizFormLayout.tsx    ← shared form wrapper
├── screens/
│   ├── CreateAIQuizScreen.tsx
│   ├── CreateDocumentQuizScreen.tsx
│   ├── CreateImageQuizScreen.tsx
│   ├── CreateYouTubeQuizScreen.tsx
│   ├── CreateWebsiteQuizScreen.tsx
│   └── CreateHandwrittenQuizScreen.tsx
└── api/
    └── quizGeneration.api.ts
```

### M-007: Centralize `useCurrentUser()` 

Remove duplicate `useCurrentUser()` definitions from `useAnalytics.ts`, `useAssessments.ts`, `useDashboard.ts`. Import from `src/core/hooks/useAuth.ts:301`.

---

*All dependency edges traced from actual `import` statements in source files.*
