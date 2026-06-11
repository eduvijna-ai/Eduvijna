# ARCHITECTURE_DECISIONS.md — EduVijna Architectural Decision Records

> This document records every major architectural decision in the codebase with rationale, consequences, alternatives considered, and current status. Each ADR is traced to actual source code evidence.

---

## Table of Contents

1. [ADR-001: React Navigation over Expo Router](#adr-001-react-navigation-over-expo-router)
2. [ADR-002: Zustand over Redux Toolkit](#adr-002-zustand-over-redux-toolkit)
3. [ADR-003: Dual API Client Architecture](#adr-003-dual-api-client-architecture)
4. [ADR-004: Dual Authentication Systems](#adr-004-dual-authentication-systems)
5. [ADR-005: Web Navigation as State Machine](#adr-005-web-navigation-as-state-machine)
6. [ADR-006: Two-Layer Cache (Memory + AsyncStorage)](#adr-006-two-layer-cache-memory--asyncstorage)
7. [ADR-007: Token Storage Split by Platform and Sensitivity](#adr-007-token-storage-split-by-platform-and-sensitivity)
8. [ADR-008: Clean Architecture with ESLint Enforcement](#adr-008-clean-architecture-with-eslint-enforcement)
9. [ADR-009: ERP as Self-Contained Submodule](#adr-009-erp-as-self-contained-submodule)
10. [ADR-010: Singleton Dashboard Store Pattern](#adr-010-singleton-dashboard-store-pattern)
11. [ADR-011: Platform-Divergent Screen Duplication](#adr-011-platform-divergent-screen-duplication)
12. [ADR-012: Role-Based Navigation Resolution via Backend API](#adr-012-role-based-navigation-resolution-via-backend-api)
13. [ADR-013: Analytics API Layer Decoupled from Actual Backend Shape](#adr-013-analytics-api-layer-decoupled-from-actual-backend-shape)
14. [ADR-014: Firebase Push Notifications via Expo Notifications](#adr-014-firebase-push-notifications-via-expo-notifications)
15. [ADR-015: Module-Level Caching in useQuizNavItems](#adr-015-module-level-caching-in-usequiznavitems)

---

## ADR-001: React Navigation over Expo Router

**Status:** Active  
**Date:** Established before June 2026  
**Files:** `App.tsx`, `src/platforms/mobile/navigation/BottomTabNavigator.tsx`, `src/erp/navigation/ERPNavigator.tsx`

### Context

The app runs on Android, iOS, and Web. A routing strategy must handle:
- Complex nested navigation (tabs → stack → ERP sub-stack)
- Deep linking with custom schemes (`eduvijna://`) and HTTPS App Links
- Push notification tap routing
- Web sidebar navigation that doesn't fit any file-system URL model

### Decision

Use **React Navigation 6** with explicit navigator definitions. Do not use Expo Router.

Evidence: `app.json` has no `experiments.typedRoutes` flag. There is no `app/` directory. All routing is defined imperatively in TypeScript files.

### Rationale

1. **ERP has 22 sub-screens** that require a dedicated nested stack with its own context (`AcademicYearProvider`). File-system routing makes nested context injection awkward.
2. **Web uses a state machine** for navigation, not URL-based routing. Web "screens" are React components rendered based on `activeScreen` state in `App.tsx` rather than URL segments. This pattern is fundamentally incompatible with Expo Router.
3. **Deep link routing requires manual session handling** (`openQuizHandler.ts`). The `session_id` from a notification is not a navigable URL — it requires API calls before navigation. This logic is easier to implement imperatively.
4. Expo Router was not mature for complex cases when this app was built.

### Consequences

- **Positive:** Full control over navigation logic. Works well for complex ERP submodule isolation.
- **Negative:** Web URLs are not shareable — navigating to `/assessments` refreshes to dashboard. No browser back-button support on web. New screens require two registrations (mobile stack + web `renderScreen()` switch).
- **Negative:** Adding a new route requires editing 3 files: `BottomTabNavigator.tsx`, `App.tsx` linking config, `App.tsx` renderScreen switch.

### Alternatives Considered

- **Expo Router:** Would enforce URL-based navigation, enabling web deep links. Rejected due to complexity of ERP sub-module nesting and web state machine incompatibility.
- **React Navigation with URL routing on web:** Possible but would require significant refactoring of the web sidebar.

### Recommendation

Consider migrating the web navigation to URL-based routing (hash router or Expo Router web) in a future sprint. The mobile side can stay as-is.

---

## ADR-002: Zustand over Redux Toolkit

**Status:** Active  
**Files:** `src/core/store/` (5 stores), `metro.config.js` (CJS redirect)

### Context

Global state is needed for: authenticated user, auth loading state, teacher dashboard data, assessment list, workspace UI state, and school ID.

### Decision

Use **Zustand 4.5** for all global state. No Redux, no Redux Toolkit.

Evidence: `package.json` has `zustand: ^4.5.0`. No `@reduxjs/toolkit` or `redux` dependency.

### Rationale

1. **Zero boilerplate:** Zustand stores are defined in a single `create()` call. Teacher dashboard store definition takes ~100 lines. An equivalent Redux slice would be 3x longer.
2. **No Provider requirement:** Zustand stores are module singletons — components subscribe via hooks without needing a `<Provider>`.
3. **Bundle size:** Zustand is ~1KB gzipped. Redux Toolkit is ~10KB.
4. **Metro web compatibility:** Metro requires a CJS redirect for Zustand on web. This is handled in `metro.config.js`.

### Metro Config Evidence

```javascript
// metro.config.js — Zustand CJS redirect on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'zustand') {
    return { type: 'sourceFile', filePath: require.resolve('zustand/index.js') };
  }
  ...
}
```

### Consequences

- **Positive:** Simple, readable store definitions. No action/reducer ceremony.
- **Positive:** Direct store access via `useTeacherDashboardStore.getState()` works outside React (used in logout flow).
- **Negative:** No built-in devtools (Redux DevTools don't work). Debugging state changes requires `console.log`.
- **Negative:** No serialization/persistence middleware (like Redux Persist). Cache persistence is handled manually via AsyncStorage in `cacheService.ts`.
- **Negative:** No structured action history for debugging.

### Alternatives Considered

- **Redux Toolkit:** More ecosystem tooling, time-travel debugging. Rejected due to boilerplate overhead for a 5-store state shape.
- **MobX:** Reactive, less boilerplate than Redux. Rejected — not as well-supported in Expo ecosystem at time of decision.
- **TanStack Query (server state):** Installed (`@tanstack/react-query: ^4.42.0`) but not the primary state manager. Zustand dominates. See ADR-013.

---

## ADR-003: Dual API Client Architecture

**Status:** Active — **Technical Debt**  
**Files:** `src/core/api/config.ts` (Axios), `src/core/services/dashboardApi.ts` (fetch)

### Context

API calls are made using two completely different mechanisms in the same codebase.

### Decision (Historical)

Two separate API clients were built at different points in development:
1. **`config.ts` (Axios):** Implements JWT refresh queue, standard interceptors. Used by `auth.api.ts`, `erp.api.ts`, `profile.api.ts`, `assessment.api.ts`.
2. **`dashboardApi.ts` (raw fetch):** 857 lines, implements its own auth error detection, uses `cachedApiCall()` from `cacheService.ts`. Used by `teacherDashboard.store.ts` and `useAssessments.ts`.

### Why This Exists

`dashboardApi.ts` appears to have been written first as a standalone dashboard service, before the Axios layer in `config.ts` was standardized. When the Axios interceptor was added for automatic token refresh, `dashboardApi.ts` was not refactored to use it.

### Evidence of Divergence

```typescript
// dashboardApi.ts — manual auth header
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};
const accessToken = await TokenStorage.getAccessToken();
if (accessToken) {
  headers['Authorization'] = `Bearer ${accessToken}`;
}
const response = await fetch(url, { method: 'GET', headers });
```

```typescript
// config.ts — Axios handles this automatically via interceptor
apiClient.interceptors.request.use(async (config) => {
  const token = await TokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Consequences

- **Negative:** Token refresh is only implemented in `config.ts`. Calls made via `dashboardApi.ts` will return 401 without automatic retry — they have their own logout trigger instead.
- **Negative:** Two different error handling strategies. `dashboardApi.ts` has `AuthenticationError` class; `config.ts` has `handleApiError()`.
- **Negative:** `dashboardApi.ts` imports `setAuthErrorNavigationCallback` pattern — requires `App.tsx` to register a callback, creating indirect coupling.
- **Negative:** If the Axios instance gains new features (rate limiting, request IDs), they won't apply to dashboard calls.

### Recommendation

Migrate `dashboardApi.ts` to use `apiClient` from `config.ts`. This is a high-priority refactoring task. See REFACTORING_ROADMAP.md.

---

## ADR-004: Dual Authentication Systems

**Status:** Active — **Technical Debt**  
**Files:** `src/core/hooks/useAuth.ts` (primary), `src/core/context/AuthContext.tsx` (legacy)

### Context

Authentication state is managed in two separate systems that don't share data:

| System | File | State | Used By |
|--------|------|-------|---------|
| Primary | `src/core/hooks/useAuth.ts` | Zustand `user.store` | `App.tsx`, all screens via `BottomTabNavigator` |
| Legacy | `src/core/context/AuthContext.tsx` | React `useState` | `DropdownContext.tsx`, `useNotifications.ts` |

### Why This Exists

The legacy `AuthContext` was the original auth system. When Zustand was introduced, the primary auth was migrated to `useAuth` + `user.store`, but `DropdownContext` and `useNotifications` were not updated to consume the new system.

### Critical Consequence

**The legacy `AuthContext` runs a separate user load on mount** (`loadUser()` in `AuthContext.tsx:37`). This means:
- Two auth state reads on startup
- `DropdownContext` triggers dropdown fetches based on legacy `user` state, not the Zustand user
- If the Zustand store is updated (e.g., school_id resolved), the legacy context doesn't see it

The `useNotifications` hook imports from the wrong file:
```typescript
// src/core/hooks/useNotifications.ts:14 — WRONG import
import { useAuth } from '../context/AuthContext';

// Should be:
import { useAuth } from '../hooks/useAuth';
```

### Consequences

- **Negative:** Two auth states can get out of sync.
- **Negative:** Dropout of user data in components using legacy context.
- **Negative:** Confusing for new developers — which `useAuth` do I use?

### Recommendation

Replace legacy `AuthContext` with a thin bridge that reads from Zustand's `user.store`. `DropdownContext` and `useNotifications` should be updated to import from `src/core/hooks/useAuth.ts`. This is a one-day refactoring task.

---

## ADR-005: Web Navigation as State Machine

**Status:** Active  
**Files:** `App.tsx:59–543`, `src/platforms/web/navigation/WebNavigation.tsx`

### Context

The web platform uses a sidebar layout. Screens must switch without page reload. The app was built before React Navigation web support was stable enough for a sidebar layout.

### Decision

Implement web navigation as a **React `useState` state machine** in `App.tsx`. The `activeScreen` state determines which screen component is rendered. A `createWebNavigation()` factory provides a compatibility navigation object to screens.

```typescript
// App.tsx:59
const [activeScreen, setActiveScreen] = useState<
  'dashboard' | 'assessments' | 'analytics' | ...
>('dashboard');
```

### Consequences

- **Positive:** Simple, predictable. No URL changes on the web — avoids CORS/redirect issues with an API server.
- **Positive:** Screen components don't need to know they're on web — they receive a compatible `navigation` object.
- **Negative:** No URL-based deep linking on web. Cannot bookmark `/assessments`.
- **Negative:** Browser back button does nothing on web.
- **Negative:** Every new screen requires: 1) adding to the union type, 2) adding a `case` in `renderScreen()`.
- **Negative:** ERP on web opens an `independent` `NavigationContainer` (line 527), which is a workaround and not a real solution.

---

## ADR-006: Two-Layer Cache (Memory + AsyncStorage)

**Status:** Active  
**Files:** `src/core/services/cacheService.ts`, `.env.cache.example`

### Context

The app makes repeated API calls for dashboard data, quizzes, and classrooms. Redis (the standard server-side cache) cannot be used in React Native because it requires Node.js built-in modules (`node:crypto`).

Evidence from `.env.cache.example`:
> "React Native CANNOT use Redis directly because it requires Node.js built-in modules"

### Decision

Implement a two-layer cache:
- **L1:** In-process JavaScript `Map` (fast, lost on app kill)
- **L2:** AsyncStorage (persistent across restarts, survives app backgrounding)

### Cache Key Pattern

All keys are prefixed: `eduvijna:{key}`. This namespaces cache from other AsyncStorage users (theme, tokens).

### Consequences

- **Positive:** L1 hit = zero I/O. Dashboard data served in microseconds on navigation.
- **Positive:** L2 hit = app restart shows cached data immediately before API refresh.
- **Negative:** No distributed cache — each device has its own cache. If teacher publishes a quiz, other devices won't see it until TTL expires or manual refresh.
- **Negative:** Cache stats are only in-memory — reset on app restart.
- **Negative:** AsyncStorage is limited to 6MB on some Android versions. Large quiz lists could approach this.

### Recommendation

Consider adding a `forceRefresh` UI affordance (pull-to-refresh) that explicitly calls `cachedApiCall(..., true)` for user-triggered refreshes.

---

## ADR-007: Token Storage Split by Platform and Sensitivity

**Status:** Active  
**Files:** `src/core/services/tokenStorage.ts`

### Decision

| Token | Mobile | Web | Reason |
|-------|--------|-----|--------|
| Access Token | AsyncStorage | localStorage | Fast, non-sensitive (short-lived) |
| Refresh Token | **SecureStore** (encrypted) | localStorage | Long-lived, must be protected |
| Token Expiry | AsyncStorage | localStorage | Non-sensitive timestamp |
| User Data | AsyncStorage | localStorage | Convenience cache |

### Rationale

- `SecureStore` encrypts data using the device's hardware-backed keystore (Android Keystore / iOS Secure Enclave). Appropriate for the long-lived refresh token.
- `AsyncStorage` is faster than `SecureStore` and sufficient for the access token (30-minute to 1-hour lifespan).
- Web has no equivalent of SecureStore. `localStorage` is used with the acknowledgment in the comment: `// in production, consider httpOnly cookies`.

### Open Issue

The web platform stores refresh tokens in `localStorage`, which is vulnerable to XSS. This is a known, documented decision with a recommended future migration to `httpOnly` cookies.

---

## ADR-008: Clean Architecture with ESLint Enforcement

**Status:** Active  
**File:** `.eslintrc.js` (200 lines)

### Decision

Enforce Clean Architecture layering via ESLint rules. The four layers are:

```
screens/components → hooks → services/api → domain (pure logic)
```

ESLint rules prohibit:
- Screens importing from `@core/api`
- Screens importing from `@core/domain`  
- Screens importing from `@core/store`
- Hooks importing platform-specific code
- Domain files importing anything non-pure

### Rationale

With 20+ screens and a growing team, without enforcement, developers will shortcut the layer boundary (importing Axios directly in a screen). The ESLint rule makes this a build-time error.

### Consequences

- **Positive:** Architecture is self-documenting. Violations are caught in CI.
- **Positive:** Domain logic remains testable — pure functions with no React/RN imports.
- **Negative:** `assessment.api.ts` imports from `dashboardApi.ts` (services layer). This violates the intended boundary (API layer should not import from services layer). This violation is not caught by current ESLint rules and represents existing technical debt.
- **Negative:** `useNotifications.ts` imports from the legacy `AuthContext` instead of the standard hook — a violation that slipped through.

---

## ADR-009: ERP as Self-Contained Submodule

**Status:** Active  
**Files:** `src/erp/` (navigation, screens, components, hooks, contexts)

### Decision

The ERP feature lives in `src/erp/` as a self-contained module with its own:
- Navigator (`ERPNavigator.tsx`)
- Context (`AcademicYearContext.tsx`)
- Hook (`useErpRole.ts`)
- Error boundary (`ERPErrorBoundary.tsx`)
- 22 screens

The ERP API (`erp.api.ts`, 925 lines) lives in `src/core/api/` because it is shared infrastructure.

### Rationale

ERP is a large, independent feature domain. Separating it prevents quiz/assessment logic from bleeding into ERP and vice versa. The error boundary ensures ERP crashes don't bring down the entire app.

### Consequences

- **Positive:** New ERP screens can be added without touching quiz code.
- **Positive:** ERP can be feature-flagged or removed without affecting the quiz domain.
- **Negative:** `erp.api.ts` at 925 lines is not modular — it's one file for all 22 ERP modules. Should be split into domain-specific files (`attendance.api.ts`, `fees.api.ts`, etc.).

---

## ADR-010: Singleton Dashboard Store Pattern

**Status:** Active  
**File:** `src/core/store/teacherDashboard.store.ts`

### Decision

The teacher dashboard store loads data exactly **once per session** using an `isInitialized` flag:

```typescript
loadDashboard: async () => {
  const state = get();
  if (state.isInitialized && state.allQuizzes.length > 0) {
    return; // Skip - already loaded
  }
  ...
}
```

### Rationale

Teachers navigate between Dashboard, Assessments, Analytics, and back frequently. Without a singleton, each tab mount triggers a `POST /api/v1/quizzes/?view_type=summary&limit=1000` — a large, slow request.

### Consequences

- **Positive:** Zero network overhead on tab navigation.
- **Negative:** Stale data risk. If a teacher publishes a quiz on another device, the dashboard won't refresh until they call `store.refresh()`.
- **Negative:** `reset()` must be called on logout to prevent stale data showing after re-login with a different account.
- **Consequence note:** `reset()` IS called in `useAuth.logout()`: `useTeacherDashboardStore.getState().reset()`.

---

## ADR-011: Platform-Divergent Screen Duplication

**Status:** Active — Partial Technical Debt  
**Files:** `src/platforms/mobile/screens/`, `src/platforms/web/screens/`

### Decision

Some screens exist in two versions:
- `src/platforms/mobile/screens/Profile.tsx` (996 lines)
- `src/platforms/web/screens/Profile.tsx` (902 lines)
- `src/platforms/mobile/screens/Analytics.tsx` (546 lines)
- `src/platforms/web/screens/Analytics.tsx` (506 lines)
- etc.

### Rationale

Mobile and web UX for Profile and Analytics differ significantly (different layouts, sidebar navigation vs stack navigation, different component availability). Shared screens use `src/screens/` and receive a platform-agnostic navigation prop.

### Consequences

- **Negative:** Business logic changes must be made in two files.
- **Negative:** Bugs in one platform's version may not be replicated in the other.

### Recommendation

Extract shared business logic into hooks. Platform screens become thin UI shells. Example:
```
useProfileData() → shared hook
├── src/platforms/mobile/screens/Profile.tsx → mobile UI
└── src/platforms/web/screens/Profile.tsx → web UI
```

---

## ADR-012: Role-Based Navigation Resolution via Backend API

**Status:** Active  
**File:** `src/core/hooks/useQuizNavItems.ts`, `src/core/api/erp.api.ts` (`quizNavItemsApi`)

### Decision

The quiz creation tab grid ("AI Assessment", "Document", "YouTube", etc.) is not hardcoded. It fetches from `GET /api/v1/quiz-navigation-items` and resolves backend items to React Native screen names.

### Rationale

Different schools or user tiers may be licensed for different quiz creation methods. The backend controls which tiles appear, enabling feature gating without app updates.

### Consequence: Module-Level Cache

Since the navigation items are fetched once and shared across Dashboard and other screens, `useQuizNavItems.ts` implements a module-level (not Zustand) cache:

```typescript
let cachedItems: QuizNavItem[] | null = null;
let cachedRole: string | null = null;
let fetchPromise: Promise<QuizNavItem[]> | null = null;
```

This is an in-process singleton outside the Zustand store system. It is cleared on logout via `clearQuizNavCache()`.

### Consequences

- **Positive:** Single API call per session for navigation items.
- **Negative:** Module-level state is not visible in React DevTools.
- **Negative:** If the backend grants new permissions mid-session, the app won't show the new tile until restart or manual `refetch()`.

---

## ADR-013: Analytics API Layer Decoupled from Actual Backend Shape

**Status:** Active — **Dead Code Risk**  
**Files:** `src/core/api/analytics.api.ts`, `src/core/hooks/useAnalytics.ts`, `src/core/hooks/useDashboard.ts`

### Context

`analytics.api.ts` defines endpoints like:
- `GET /dashboard/teacher/${teacherId}`
- `GET /analytics/${userId}`
- `GET /analytics/teacher/${teacherId}/student-performance`

But the actual backend API uses:
- `GET /api/v1/quizzes/?view_type=summary` (via `dashboardApi.ts`)
- `GET /api/v1/quizzes/student-dashboard`

### Discovery

The `TeacherDashboard` screen uses `useTeacherDashboardStore`, which calls `fetchTeacherDashboardSummary()` from `dashboardApi.ts`. It does **not** use `useAnalytics()`, `useDashboard()`, or any function from `analytics.api.ts`.

The `useAnalytics()` hook and `analytics.api.ts` appear to be aspirational/designed API contracts that were never connected to the actual backend response format.

### Consequence

`useAnalytics.ts`, `useDashboard.ts` (the standalone hook, not the store), and most of `analytics.api.ts` are likely **dead code** — they compile but are not used by any active screen. If any screen does call them, the requests will hit incorrect endpoints.

### Recommendation

Audit whether any screen imports these hooks. If not, remove `useAnalytics.ts`, standalone `useDashboard.ts`, and replace `analytics.api.ts` with endpoints that match the actual backend (`/api/v1/quizzes/` pattern).

---

## ADR-014: Firebase Push Notifications via Expo Notifications

**Status:** Active  
**Files:** `src/core/services/PushNotificationService.ts`, `src/core/api/device.api.ts`, `google-services.json`

### Decision

Use Expo Notifications SDK (`expo-notifications`) as the abstraction layer over Firebase Cloud Messaging (FCM) for Android and APNs for iOS.

### Rationale

- Expo Notifications handles token generation, foreground notification display, and tap response in a unified cross-platform API.
- The backend receives the Expo push token (not raw FCM token) via `/api/v1/notifications/devices/`.

### Notification Flow

```
App launch → PushNotificationService.initializeOnAppLaunch()
           → Expo generates token → registers with backend
           ↓
Push from backend → FCM/APNs → expo-notifications
           → App.tsx listener → handleOpenQuiz(sessionId)
```

### Consequences

- **Positive:** Single API for Android and iOS. No separate FCM and APNs code paths.
- **Negative:** Firebase config files (`google-services.json`, `GoogleService-Info.plist`) are committed to the repo — a security concern.
- **Negative:** Notification history fetch is currently disabled: `getNotifications()` returns immediately to avoid rate limiting. This means the bell icon shows no historical notifications.

---

## ADR-015: Module-Level Caching in useQuizNavItems

**Status:** Active  
**File:** `src/core/hooks/useQuizNavItems.ts:19–21`

### Decision

Navigation items are cached in module scope (not React state, not Zustand):

```typescript
let cachedItems: QuizNavItem[] | null = null;
let cachedRole: string | null = null;
let fetchPromise: Promise<QuizNavItem[]> | null = null;
```

### Rationale

Multiple components on the dashboard page mount simultaneously and would each trigger an API call. The in-flight deduplication via `fetchPromise` prevents this.

### Consequences

- **Risk:** If a component calls `clearQuizNavCache()` while another is reading `cachedItems`, there is a race condition. In practice, `clearQuizNavCache()` is only called during logout when no components are reading the cache.
- **Risk:** Module-level state persists across hot-reloads in development, potentially showing stale cached data during development.

---

*All ADRs traced from actual source code. Evidence file paths reference the `E:\Eduvijna\Eduvijna\` project root.*
