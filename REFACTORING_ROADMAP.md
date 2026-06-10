# REFACTORING_ROADMAP.md — EduVijna 30/60/90-Day Modernization Roadmap

> This roadmap prioritizes technical debt reduction, security hardening, team scalability, and long-term architectural health. Each item includes effort estimate, risk level, and measurable success criteria. Designed for a team of 20 developers.

---

## Table of Contents

1. [Executive Prioritization](#1-executive-prioritization)
2. [Day 1–30: Critical Fixes & Team Foundation](#2-day-130-critical-fixes--team-foundation)
3. [Day 31–60: Architecture Stabilization](#3-day-3160-architecture-stabilization)
4. [Day 61–90: Modernization & Scale](#4-day-6190-modernization--scale)
5. [Parallel Track: Security Hardening](#5-parallel-track-security-hardening)
6. [Team Assignments Suggestion](#6-team-assignments-suggestion)
7. [Risk Register](#7-risk-register)
8. [Success Metrics](#8-success-metrics)

---

## 1. Executive Prioritization

| Priority | Item | Impact | Effort | Risk |
|----------|------|--------|--------|------|
| 🔴 P0 | Remove Firebase configs from repo | Security | Low | Low |
| 🔴 P0 | Fix dual auth system (`useNotifications` wrong import) | Bug | Low | Low |
| 🔴 P0 | Unify API clients (migrate dashboardApi to Axios) | Architecture | High | Medium |
| 🟠 P1 | Dead code removal | Maintenance | Medium | Low |
| 🟠 P1 | Consolidate school_id extraction | Reliability | Low | Low |
| 🟠 P1 | Split `erp.api.ts` into domain files | Scalability | Medium | Low |
| 🟡 P2 | Add `.env`-based configuration | Security | Low | Low |
| 🟡 P2 | Expand test coverage | Quality | High | Low |
| 🟡 P2 | Web URL-based navigation | UX | High | High |
| 🟢 P3 | Feature module structure | Scale | High | Medium |
| 🟢 P3 | Component memoization | Performance | Medium | Low |
| 🟢 P3 | Pagination for quiz lists | Performance | High | Medium |

---

## 2. Day 1–30: Critical Fixes & Team Foundation

### R-001 — Remove Firebase Configs from Repository

**Priority:** 🔴 P0  
**Effort:** 2 hours  
**Risk:** Low  
**Owner:** DevOps / Team Lead

**Problem:**
`google-services.json` and `GoogleService-Info.plist` contain Firebase project credentials (API keys, project IDs, app IDs) and are committed to the repository.

**Action Steps:**

1. Add to `.gitignore`:
   ```
   google-services.json
   GoogleService-Info.plist
   ```

2. Create placeholders for local development:
   ```bash
   # google-services.example.json
   # GoogleService-Info.example.plist
   ```

3. Store real files as **EAS Secrets**:
   ```bash
   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
   eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
   ```

4. Add to `eas.json` build configuration:
   ```json
   "googleServicesFile": "$GOOGLE_SERVICES_JSON",
   "ios": { "googleServicesFile": "$GOOGLE_SERVICE_INFO_PLIST" }
   ```

5. Remove from git history:
   ```bash
   git filter-branch --index-filter 'git rm --cached --ignore-unmatch google-services.json GoogleService-Info.plist' HEAD
   ```

**Success Criteria:** `git log --all -- google-services.json` returns no commits.

---

### R-002 — Fix Wrong Auth Import in `useNotifications.ts`

**Priority:** 🔴 P0  
**Effort:** 30 minutes  
**Risk:** Low  
**Owner:** Any developer

**Problem:**
```typescript
// src/core/hooks/useNotifications.ts:14 — WRONG
import { useAuth } from '../context/AuthContext';

// Correct import:
import { useAuth } from './useAuth';
```

The legacy `AuthContext` provides `user` and `token` from React `useState` — not from Zustand. This means notifications code can't see the Zustand user's `school_id` or the fully enriched profile.

**Action Steps:**
1. Edit `src/core/hooks/useNotifications.ts` line 14
2. Change import to `import { useAuth } from './useAuth';`
3. Remove `token` from destructuring (the primary `useAuth` hook doesn't expose `token` — it's not needed since Axios handles token injection)
4. Update all callers if needed
5. Run `npm run lint && npm run type-check`

**Success Criteria:** `useNotifications.ts` imports from `./useAuth`, tests pass.

---

### R-003 — Fix Wrong Auth Import in `DropdownContext.tsx`

**Priority:** 🟠 P1 (similar to R-002)  
**Effort:** 1 hour  
**Risk:** Low  
**Owner:** Any developer

**Problem:**
```typescript
// src/context/DropdownContext.tsx:3 — WRONG
import { useAuth } from '../core/context/AuthContext';
```

The legacy `AuthContext` has its own `loadUser()` that fires on mount and reads from `TokenStorage`. This runs in parallel with the primary `checkAuth()` in `useAuth`. This can cause the dropdown to load before the Zustand user is fully enriched (no `school_id`).

**Action Steps:**
1. Change import to `import { useAuth } from '../core/hooks/useAuth';`
2. Remove `token` from destructuring (use `isAuthenticated` to gate dropdown loading)
3. Test that dropdowns still load after login

---

### R-004 — Delete Dead Code

**Priority:** 🟠 P1  
**Effort:** 2 hours  
**Risk:** Low (verify no hidden imports first)  
**Owner:** Any developer

**Files to delete:**

```bash
# High confidence dead code:
rm src/core/hooks/useTeacherDashboard.old.ts        # 280 lines
rm src/core/hooks/useStudentDashboard.old.ts        # 296 lines
rm src/screens/StudentList.clean.tsx                 # 444 lines
rm "src/screens/backup_20260127_184517/"            # 5 backup files
rm -r src/examples/                                 # 6 example files

# Verify no imports before deleting:
npx tsc --noEmit --strict
npm run lint
```

**Before deleting `analytics.api.ts` and `useDashboard.ts`:**
Run this to verify no active imports:
```bash
# Search for imports of analytics.api
rg "from.*analytics.api" src/ --include="*.ts" --include="*.tsx"

# Search for imports of useDashboard hook
rg "from.*useDashboard" src/ --include="*.ts" --include="*.tsx"
```

If no results outside the files themselves, safe to delete.

**Success Criteria:** `npm run type-check` passes, no broken imports.

---

### R-005 — Consolidate `school_id` Extraction

**Priority:** 🟠 P1  
**Effort:** 3 hours  
**Risk:** Low  
**Owner:** 1 developer

**Problem:** The 8-field fallback chain is copy-pasted in 4+ files.

**Action Steps:**

1. Create `src/core/utils/userUtils.ts`:
```typescript
import type { UserProfile } from '../types';

/**
 * Resolves school_id from any UserProfile shape.
 * The backend sends school_id in inconsistent field paths.
 */
export function extractSchoolId(user: UserProfile | null): number | null {
  if (!user) return null;
  const toNum = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const anyUser = user as any;
  return (
    toNum(anyUser.school_id) ??
    toNum(anyUser.schoolId) ??
    toNum(anyUser.school?.id) ??
    toNum(anyUser.school?.school_id) ??
    toNum(anyUser.profile?.school?.id) ??
    toNum(anyUser.profile?.school_id) ??
    toNum(anyUser.profile?.schoolId) ??
    toNum(anyUser.organization_id) ??
    toNum(anyUser.org_id) ??
    null
  );
}

/**
 * Resolves school display name from any UserProfile shape.
 */
export function resolveSchoolName(user: UserProfile | null): string {
  if (!user) return '';
  const anyUser = user as any;
  const candidates = [
    anyUser.school_name, anyUser.schoolName,
    typeof anyUser.school === 'string' ? anyUser.school : undefined,
    anyUser.school?.name, anyUser.school?.school_name,
    anyUser.profile?.school_name, anyUser.profile?.schoolName,
    anyUser.profile?.school?.name, anyUser.profile?.school?.school_name,
  ];
  return candidates.find((v): v is string => typeof v === 'string' && v.trim().length > 0)?.trim() ?? '';
}

/**
 * Detects super admin (no school affiliation).
 */
export function isSuperAdminUser(user: UserProfile | null): boolean {
  if (!user) return false;
  const anyUser = user as any;
  return (
    anyUser.role_id === 1 ||
    anyUser.role_name === 'super_admin' ||
    anyUser.role === 'super_admin' ||
    (anyUser.role === 'admin' && !extractSchoolId(user))
  );
}
```

2. Replace inline extractions in:
   - `src/core/hooks/useAuth.ts`
   - `src/platforms/mobile/navigation/BottomTabNavigator.tsx`
   - `src/erp/hooks/useErpRole.ts`
   - `src/context/DropdownContext.tsx`

3. Add to `src/core/domain/permissions.logic.ts`:
```typescript
// Re-export for domain layer use:
export { isSuperAdminUser as isSuperAdmin } from '../utils/userUtils';
```

**Success Criteria:** Only one implementation of school_id extraction exists. All 4 files import from `userUtils.ts`.

---

### R-006 — Establish Documentation Root

**Priority:** 🟡 P2  
**Effort:** 1 hour  
**Risk:** None  
**Owner:** Tech Lead

**Problem:** 79 markdown files are scattered at the project root. This makes the root directory unusable as a navigation point.

**Action Steps:**

```bash
mkdir docs/
mkdir docs/architecture/
mkdir docs/guides/
mkdir docs/decisions/

# Move architecture docs:
mv ARCHITECTURE*.md docs/architecture/
mv SKILLS.md docs/architecture/
mv DEPENDENCY_GRAPH.md docs/architecture/
mv DATABASE_AND_API_MAP.md docs/architecture/

# Move guides:
mv ONBOARDING_GUIDE.md docs/guides/
mv NAVIGATION_REFERENCE.md docs/guides/
mv DESIGN_SYSTEM.md docs/guides/

# Move decisions:
mv ARCHITECTURE_DECISIONS.md docs/decisions/
mv REFACTORING_ROADMAP.md docs/decisions/

# Leave README.md at root, pointing to docs/
```

Update `README.md` to link to `docs/guides/ONBOARDING_GUIDE.md`.

---

### R-007 — Remove `@types/redis` from Production Dependencies

**Priority:** 🟡 P2  
**Effort:** 15 minutes  
**Risk:** None

```bash
npm uninstall @types/redis
npm install --save-dev @types/redis
```

This moves type definitions to `devDependencies` where they belong.

---

### R-008 — Create a `useSchool()` Hook

**Priority:** 🟠 P1  
**Effort:** 2 hours  
**Risk:** Low

**Problem:** School name fetching in `BottomTabNavigator.tsx` (`CustomHeader`) fires on every render and every navigation event.

**Action Step:** Create `src/core/hooks/useSchool.ts`:

```typescript
import { useUserStore } from '../store/user.store';
import { resolveSchoolName, isSuperAdminUser, extractSchoolId } from '../utils/userUtils';
import { useState, useEffect } from 'react';
import { get } from '../api/config';

export function useSchool() {
  const user = useUserStore((s) => s.user);
  const storeSchoolId = useUserStore((s) => s.schoolId);
  const [fetchedSchoolName, setFetchedSchoolName] = useState('');

  const isSuperAdmin = isSuperAdminUser(user);
  const profileSchoolName = resolveSchoolName(user);

  useEffect(() => {
    if (isSuperAdmin || profileSchoolName) return;
    let active = true;
    get<any>('/api/v1/school-management/my-school')
      .then((resp) => {
        if (!active) return;
        setFetchedSchoolName(
          resp?.school_name || resp?.name || resp?.data?.school_name || ''
        );
      })
      .catch(() => active && setFetchedSchoolName(''));
    return () => { active = false; };
  }, [isSuperAdmin, profileSchoolName]);

  return {
    schoolId: storeSchoolId,
    schoolName: profileSchoolName || fetchedSchoolName,
    isSuperAdmin,
  };
}
```

Replace the 30-line school resolution block in `BottomTabNavigator.tsx:CustomHeader` with `const { schoolName, isSuperAdmin } = useSchool();`.

---

## 3. Day 31–60: Architecture Stabilization

### R-009 — Migrate `dashboardApi.ts` to Axios Client

**Priority:** 🔴 P0 (architectural)  
**Effort:** 3–5 days  
**Risk:** Medium (large change, many call sites)  
**Owner:** 2 experienced developers

**Problem:** `dashboardApi.ts` (857 lines) uses raw `fetch()` and has its own auth error handling, bypassing the Axios token refresh queue.

**Migration Strategy:**

Phase 1 — Add Axios equivalents alongside fetch functions:
```typescript
// src/core/services/dashboardApi.ts
import { get } from '../api/config';

// NEW: Axios-based equivalent
export async function fetchTeacherDashboardSummaryV2(params: TeacherQuizFilters) {
  const queryString = buildQueryString(params);
  return cachedApiCall(
    () => get<DashboardApiResponse<TeacherQuiz>>(`/api/v1/quizzes/?${queryString}`),
    `quizzes:summary:${JSON.stringify(params)}`,
    CACHE_TTL.QUIZZES_LIST
  );
}
```

Phase 2 — Migrate consumers one by one:
- `teacherDashboard.store.ts` → use V2 function
- `useAssessments.ts` → use V2 function
- Test each migration

Phase 3 — Delete old `fetch`-based functions

**Success Criteria:** No `fetch()` calls in `dashboardApi.ts`. All dashboard data goes through `apiClient`.

---

### R-010 — Split `erp.api.ts` into Domain Files

**Priority:** 🟠 P1  
**Effort:** 1 day  
**Risk:** Low  
**Owner:** 1 developer

**Action Steps:**

1. Create `src/core/api/erp/` directory
2. Create one file per ERP module (see DEPENDENCY_GRAPH.md §M-001)
3. Create `src/core/api/erp/index.ts` that re-exports all
4. Update all ERP screen imports

```typescript
// src/core/api/erp/attendance.api.ts
import { get, post, put } from '../config';
export const attendanceApi = {
  getAttendance: (schoolId: number, params: AttendanceParams) =>
    get<AttendanceRecord[]>(`/api/v1/erp/attendance?school_id=${schoolId}`, params),
  markAttendance: (schoolId: number, data: AttendanceMarkData) =>
    post<void>(`/api/v1/erp/attendance?school_id=${schoolId}`, data),
};

// src/core/api/erp/index.ts
export * from './attendance.api';
export * from './fees.api';
// ... etc
```

**Success Criteria:** `erp.api.ts` is deleted. All ERP screens import from `@core/api/erp`.

---

### R-011 — Centralize `useCurrentUser()` 

**Priority:** 🟡 P2  
**Effort:** 1 hour  
**Risk:** Low

Remove duplicate `useCurrentUser()` from:
- `src/core/hooks/useAnalytics.ts:38`
- `src/core/hooks/useAssessments.ts:37`
- `src/core/hooks/useDashboard.ts:15`

All three are identical to the one in `src/core/hooks/useAuth.ts:301`. Import from there.

---

### R-012 — Expand Test Coverage

**Priority:** 🟡 P2  
**Effort:** 2 weeks (parallel track)  
**Risk:** Low  
**Owner:** Dedicated QA/test developer

**Current Coverage:** 4 files only.

**Target Coverage by Day 60:**

```json
"collectCoverageFrom": [
  "src/core/hooks/*.ts",
  "src/core/store/*.ts",
  "src/core/domain/*.ts",
  "src/core/services/cacheService.ts",
  "src/core/services/tokenStorage.ts",
  "src/core/api/auth.api.ts",
  "src/screens/QuizTakingScreen.tsx",
  "src/screens/Assessments.tsx"
]
```

**Priority test areas:**
1. `useAuth.ts` — token expiry, refresh, login, logout
2. `cacheService.ts` — L1/L2 hit, expiry, cleanup
3. `permissions.logic.ts` — all permission functions
4. `user.store.ts` — state transitions
5. `teacherDashboard.store.ts` — singleton pattern, reset

**Target:** 60% coverage on core logic by day 60.

---

### R-013 — Fix Analytics API Layer

**Priority:** 🟡 P2  
**Effort:** 2 days  
**Risk:** Low (just deleting / replacing)

**Problem:** `analytics.api.ts` defines endpoints (`/dashboard/teacher/{id}`) that don't match the actual backend (`/api/v1/quizzes/?view_type=summary`).

**Action Steps:**

1. Verify no screen imports from `useAnalytics.ts` or `useDashboard.ts` standalone hook:
   ```bash
   rg "useAnalytics|useDashboard" src/screens/ src/platforms/
   ```

2. If confirmed dead, delete:
   ```bash
   rm src/core/api/analytics.api.ts       # Replace with correct endpoints
   rm src/core/hooks/useAnalytics.ts      # Dead hook
   rm src/core/hooks/useDashboard.ts      # Dead standalone hook
   ```

3. Create `src/core/api/analytics.api.ts` (replacement) with actual working endpoints:
   ```typescript
   // Student analytics endpoint (confirmed working)
   export async function fetchStudentAnalytics(studentId: string) {
     return get<StudentAnalyticsData>(`/api/v1/analytics/student/${studentId}`);
   }
   ```

---

### R-014 — Notifications: Resolve Rate Limiting

**Priority:** 🟡 P2  
**Effort:** 2 days (depending on backend fix)  
**Risk:** Low  
**Owner:** Backend + Frontend collaboration

**Problem:** `GET /api/v1/notifications/` and `GET /api/v1/notifications/unread-count` are disabled due to rate limiting. The bell icon shows 0 notifications.

**Options:**

Option A (Backend): Increase rate limit for these endpoints.

Option B (Frontend): Implement exponential backoff polling instead of fixed 30-second interval:
```typescript
// useNotificationPolling.ts — replace fixed interval with backoff
let pollInterval = 30000;
const MAX_INTERVAL = 300000; // 5 minutes
const poll = async () => {
  try {
    const count = await getUnreadCount();
    setUnreadCount(count);
    pollInterval = 30000; // Reset on success
  } catch {
    pollInterval = Math.min(pollInterval * 2, MAX_INTERVAL); // Back off
  }
  setTimeout(poll, pollInterval);
};
```

Option C (Architecture): Use WebSocket or SSE for real-time notifications instead of polling.

---

### R-015 — Address `assetlinks.json` Placeholder SHA256

**Priority:** 🟡 P2  
**Effort:** 1 hour  
**Risk:** Low  
**Owner:** DevOps

**Problem:** `assetlinks.json` has placeholder SHA256 fingerprints. Android App Links verification fails in production.

**Action Steps:**
1. Generate production APK signing certificate fingerprint:
   ```bash
   keytool -list -v -keystore release.keystore -alias mykey
   ```
2. Update `assetlinks.json` with real SHA256
3. Host `/.well-known/assetlinks.json` on `https://app.eduvijna.com/.well-known/assetlinks.json`
4. Verify with: `adb shell pm get-app-links com.eduvijna.app`

---

## 4. Day 61–90: Modernization & Scale

### R-016 — Implement Quiz Creation Feature Module

**Priority:** 🟢 P3  
**Effort:** 1 week  
**Risk:** Medium  
**Owner:** 2 developers

**Goal:** Move 6 quiz creation screens into a feature module:

```
src/features/quiz-creation/
├── hooks/
│   ├── useQuizForm.ts          ← Shared formik logic
│   ├── useQuizSubmit.ts        ← Shared API submission + error handling
│   └── useQuizPreview.ts       ← Preview and publish logic
├── components/
│   ├── QuizFormLayout.tsx      ← Wrapper with header, back button
│   ├── QuizSourceSelector.tsx  ← Input source selection UI
│   └── DifficultySelector.tsx  ← Shared difficulty picker
├── api/
│   └── quizGeneration.api.ts   ← All generation endpoints
├── screens/
│   ├── CreateAIQuizScreen.tsx
│   ├── CreateDocumentQuizScreen.tsx
│   ├── CreateImageQuizScreen.tsx
│   ├── CreateYouTubeQuizScreen.tsx
│   ├── CreateWebsiteQuizScreen.tsx
│   └── CreateHandwrittenQuizScreen.tsx
└── index.ts
```

**Benefits:**
- Reduces `CreateDocumentQuizScreen.tsx` from 2718 lines to <500 lines
- Shared form validation, shared error handling
- Easier to add new creation methods

---

### R-017 — Add Pagination to Teacher Dashboard

**Priority:** 🟠 P1 (performance)  
**Effort:** 3 days  
**Risk:** Medium (backend must support cursor pagination)

**Problem:** `teacherDashboard.store.ts` loads `limit=1000` quizzes at startup.

**Action Steps:**

1. Add pagination parameters to store:
```typescript
interface TeacherDashboardState {
  // ... existing
  currentPage: number;
  pageSize: number;          // Default 20
  hasMore: boolean;
  loadNextPage: () => Promise<void>;
}
```

2. Update API call to use `offset` pagination:
```typescript
const response = await fetchTeacherDashboardSummary({
  view_type: 'summary',
  limit: 20,          // Changed from 1000
  offset: 0,
});
```

3. Update `TeacherDashboard` to show "Load More" or infinite scroll.

**Success Criteria:** Initial load payload < 50KB (vs current ~2MB for 1000 quizzes).

---

### R-018 — Web URL-Based Navigation

**Priority:** 🟡 P2  
**Effort:** 2 weeks  
**Risk:** High (large structural change)  
**Owner:** Senior developer

**Problem:** Web navigation uses `activeScreen` state. URLs don't change. Browser back doesn't work. Deep links to `/assessments` not supported.

**Approach:** Introduce React Router DOM for web routing:

```typescript
// App.tsx web branch (simplified with React Router):
if (isWeb) {
  return (
    <Router>
      <WebNavigation>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assessments" element={<AssessmentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/quiz/:quizId" element={<QuizPreviewPage />} />
          <Route path="/erp/*" element={<ERPNavigatorWeb />} />
        </Routes>
      </WebNavigation>
    </Router>
  );
}
```

**Pre-conditions:** Requires backend to support `app.eduvijna.com/*` URL paths (not just API paths).

---

### R-019 — Component Memoization Audit

**Priority:** 🟡 P2  
**Effort:** 3 days  
**Risk:** Low  
**Owner:** 1 developer

**Target components** (high re-render risk):

```typescript
// Components that should be memoized:
export const AssessmentCard = React.memo(({ assessment, onPress }) => { ... });
export const TabBar = React.memo(({ activeTab, onTabPress }) => { ... });
export const NotificationsDropdown = React.memo(({ ... }) => { ... });

// Quiz questions list should use FlatList instead of map() + ScrollView:
// src/screens/QuizTakingScreen.tsx — 1501 lines
// Questions array should be rendered via FlatList with keyExtractor
```

**Action Steps:**
1. Add `React.memo()` to `AssessmentCard`, `TabBar`, `NotificationBell`, `CreateQuizButton`
2. Replace `ScrollView + .map()` in `QuizTakingScreen` with `FlatList`
3. Add `useMemo()` to expensive filter/sort operations in `Assessments.tsx`
4. Profile with React DevTools Profiler before and after

---

### R-020 — ERP API Request Batching

**Priority:** 🟢 P3  
**Effort:** 2 days  
**Risk:** Low

**Problem:** ERP screens make multiple sequential API calls on mount (one per data section). `AttendanceScreen.tsx` at 1862 lines likely has 3–5 API calls in `useEffect`.

**Action:** Audit each ERP screen and batch parallel calls:
```typescript
// Instead of:
const attendance = await attendanceApi.getToday(schoolId);
const students = await classApi.getStudents(schoolId, classId);

// Use Promise.all:
const [attendance, students] = await Promise.all([
  attendanceApi.getToday(schoolId),
  classApi.getStudents(schoolId, classId),
]);
```

---

### R-021 — Secure Web Token Storage

**Priority:** 🔴 P0 (Security)  
**Effort:** 3 days  
**Risk:** Medium (requires backend support)  
**Owner:** Full-stack developer

**Problem:** Web stores tokens in `localStorage` — XSS-accessible.

**Action Steps:**

Backend change needed: Add `/api/v1/auth/login/cookie` endpoint that sets `httpOnly` cookies.

Frontend change (`tokenStorage.ts`):
```typescript
// Web: Use httpOnly cookies (set by backend)
// Frontend only needs to send credentials: 'include' on fetch

if (isWeb) {
  // After login, backend sets httpOnly cookie
  // Token reads return null (browser handles cookies)
  // No localStorage for tokens
}
```

**Fallback if backend change not possible:** Use `sessionStorage` instead of `localStorage` — clears on tab close, reduces attack window.

---

### R-022 — Improve Cache Invalidation Strategy

**Priority:** 🟡 P2  
**Effort:** 2 days  
**Risk:** Low

**Problem:** Cache entries expire only by TTL. No event-driven invalidation.

**Action Steps:**

1. Add cache invalidation on mutations:
```typescript
// After creating a quiz:
await post('/api/v1/quizzes/generate', data);
await clearCacheEntry('quizzes:summary'); // Invalidate list
await clearCacheEntry(`classrooms:${classId}`); // Invalidate classroom data
```

2. Create cache invalidation constants:
```typescript
// src/core/services/cacheKeys.ts
export const CACHE_KEYS = {
  QUIZ_SUMMARY: 'quizzes:summary',
  STUDENT_DASHBOARD: (userId: string) => `student-dashboard:${userId}`,
  CLASSROOMS: (schoolId: number) => `classrooms:${schoolId}`,
} as const;
```

---

## 5. Parallel Track: Security Hardening

These items run concurrently with the main roadmap:

| Day | Item | Action |
|-----|------|--------|
| Day 1 | Remove Firebase configs (R-001) | EAS Secrets |
| Day 3 | Rotate Redis password mentioned in `.env.cache.example` | Backend team |
| Day 7 | Add `console.log` stripping in production builds | Babel plugin |
| Day 14 | Access token to SecureStore on mobile | `tokenStorage.ts` update |
| Day 30 | Web tokens to sessionStorage (interim) | `tokenStorage.ts` update |
| Day 60 | Web tokens to httpOnly cookies | Full-stack feature |
| Day 90 | Penetration testing | External security team |

### Add Console.log Stripping (Day 7)

```javascript
// babel.config.js — add production log removal:
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['babel-plugin-module-resolver', { ... }],
      // Add this:
      ...(process.env.NODE_ENV === 'production' ? [
        'transform-remove-console'
      ] : []),
    ],
  };
};
```

Install: `npm install --save-dev babel-plugin-transform-remove-console`

---

## 6. Team Assignments Suggestion

For a team of 20 developers:

| Squad | Size | Responsibility | Day 1–30 | Day 31–60 | Day 61–90 |
|-------|------|---------------|---------|-----------|-----------|
| Platform | 4 | App.tsx, Navigation, Auth | R-001, R-002, R-003 | R-009 (Axios migration) | R-018 (URL routing) |
| ERP | 4 | All ERP screens | R-006 (docs) | R-010 (split erp.api) | R-020 (batching) |
| Quiz | 4 | Quiz creation, taking, results | R-004 (dead code) | R-013 (fix analytics API) | R-016 (feature module) |
| Infrastructure | 3 | Cache, store, testing | R-005, R-007, R-008 | R-012 (test coverage) | R-022 (cache invalidation) |
| Security | 2 | Token storage, secrets | R-001 (immediate) | R-021 (web tokens) | External pentest |
| Platform (Mobile) | 3 | Mobile-specific, push, deep links | R-002, R-015 | R-014 (notifications) | R-019 (memoization) |

---

## 7. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| `dashboardApi.ts` migration breaks teacher dashboard | High | High | Feature flag: run both clients in parallel, compare results |
| Web URL routing breaks existing web users | Medium | Medium | Add redirects for old `activeScreen` states |
| Removing Firebase configs breaks CI | Low | High | Set up EAS Secrets before removing files |
| Dead code removal breaks hidden import | Medium | Medium | Run `npm run type-check` before deleting |
| ERP screen pagination requires backend changes | High | Medium | Coordinate with backend team for cursor pagination support |
| Token migration to SecureStore affects existing sessions | Medium | Low | Clear existing tokens on first run after update |

---

## 8. Success Metrics

### Day 30 Checkpoints

| Metric | Current | Target |
|--------|---------|--------|
| Firebase credentials in repo | Yes | No |
| Dead code files | 8+ files | 0 |
| Duplicate `school_id` extraction | 4 copies | 1 |
| Wrong auth imports | 2 | 0 |
| Test coverage (core hooks) | ~0% | 40% |
| ESLint violations | Unknown | 0 |

### Day 60 Checkpoints

| Metric | Current | Target |
|--------|---------|--------|
| API clients | 2 (Axios + fetch) | 1 (Axios) |
| `erp.api.ts` size | 925 lines (1 file) | ~60 lines per module |
| Test coverage (core) | 40% | 60% |
| Dead analytics API endpoints | 10+ | 0 |
| `console.log` in production | Yes | Stripped |

### Day 90 Checkpoints

| Metric | Current | Target |
|--------|---------|--------|
| Dashboard initial load payload | ~2MB (1000 quizzes) | <100KB (paginated) |
| `CreateDocumentQuizScreen.tsx` size | 2718 lines | <500 lines |
| Web URL deep links | Not supported | `/assessments`, `/quiz/:id` working |
| Web token storage | localStorage | sessionStorage or httpOnly cookie |
| ERP API files | 1 monolith (925 lines) | 22 domain files |
| Overall test coverage | <5% | 70% (core layers) |

---

*This roadmap was prepared based on full codebase analysis in June 2026. Priority ordering reflects risk to production stability first, team scalability second, user experience third.*
