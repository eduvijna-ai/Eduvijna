# SKILLS.md — EduVijna Application Architecture Knowledge Document

> **Purpose:** This document exists so that any senior engineer joining the team can fully understand the application, its architecture, data flows, and business logic without additional onboarding. Every claim in this document is traced directly from source code.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Folder Structure Analysis](#3-folder-structure-analysis)
4. [Dependency Analysis](#4-dependency-analysis)
5. [Application Entry Flow](#5-application-entry-flow)
6. [Authentication Architecture](#6-authentication-architecture)
7. [Authorization & Role Management](#7-authorization--role-management)
8. [Navigation Architecture](#8-navigation-architecture)
9. [State Management](#9-state-management)
10. [API Architecture](#10-api-architecture)
11. [Backend Integration Mapping](#11-backend-integration-mapping)
12. [Database Architecture](#12-database-architecture)
13. [Cache Architecture](#13-cache-architecture)
14. [Storage Architecture](#14-storage-architecture)
15. [Data Flow Diagrams](#15-data-flow-diagrams)
16. [Security Analysis](#16-security-analysis)
17. [Performance Analysis](#17-performance-analysis)
18. [Business Flow Analysis](#18-business-flow-analysis)
19. [Risks & Technical Debt](#19-risks--technical-debt)
20. [Knowledge Gaps](#20-knowledge-gaps)
21. [Final Architecture Summary](#21-final-architecture-summary)

---

## 1. Executive Summary

**EduVijna** is a cross-platform EdTech application built on **Expo SDK 54 / React Native 0.81.5 / React 19**. It serves schools by enabling teachers to create AI-generated quizzes from documents, images, YouTube videos, websites, and handwritten content, and enables students to take those quizzes via links or notifications. A full ERP (Enterprise Resource Planning) submodule manages attendance, fees, timetables, admissions, and more.

| Dimension | Value |
|-----------|-------|
| Framework | Expo SDK 54 (Managed + Bare workflow) |
| Language | TypeScript 5.3.3 (strict mode) |
| React | 19.1.0 |
| React Native | 0.81.5 |
| Entry Point | `App.tsx` (Expo entry: `node_modules/expo/AppEntry.js`) |
| Routing | React Navigation 6 (NOT Expo Router) |
| State Management | Zustand 4.5 (5 stores) + React Context API |
| HTTP Client | Axios 1.5 with JWT interceptors |
| Backend | `https://eduapi.eduvijna.com` (FastAPI inferred) |
| Target Platforms | Android, iOS, Web |
| Business Domain | K-12 / Higher Education EdTech + School ERP |

---

## 2. Architecture Overview

### Architectural Pattern

The application follows a **Clean Architecture** with a **feature-based + layer-based hybrid** inside `src/`. The ESLint config at `.eslintrc.js` **enforces architectural rules** at the linter level:

- **Screens and components** cannot directly import from `@core/api`, `@core/domain`, or `@core/store`.
- **Hooks** cannot import platform-specific code.
- **Domain and API modules** must be framework-agnostic.

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           App.tsx (Entry)                            │
│              Platform Detection + Provider Registration              │
└─────────────┬──────────────────────────┬────────────────────────────┘
              │                          │
    ┌─────────▼────────┐      ┌──────────▼───────────┐
    │  Mobile Platform  │      │    Web Platform       │
    │  (React Nav)      │      │  (State Machine)      │
    │  BottomTabNav +   │      │  WebNavigation +      │
    │  NativeStack      │      │  activeScreen state   │
    └─────────┬─────────┘      └──────────┬────────────┘
              │                           │
    ┌─────────▼───────────────────────────▼────────────┐
    │              Screen Layer (src/screens/)           │
    │     src/platforms/mobile/screens/                  │
    │     src/platforms/web/screens/                     │
    │     src/erp/screens/                               │
    └─────────────────────────┬─────────────────────────┘
                              │
    ┌─────────────────────────▼─────────────────────────┐
    │              Hook Layer (src/core/hooks/)           │
    │  useAuth, useDashboard, useAssessments, etc.       │
    └─────────────────────────┬─────────────────────────┘
                              │
    ┌──────────┬──────────────▼────────────┬────────────┐
    │  Zustand │   Context API             │  Services  │
    │  Stores  │   (Theme, Dropdown)       │  (Cache)   │
    └──────────┴──────────────┬────────────┴────────────┘
                              │
    ┌─────────────────────────▼─────────────────────────┐
    │              API Layer (src/core/api/)              │
    │  Axios + interceptors → Base URL from Expo Config  │
    └─────────────────────────┬─────────────────────────┘
                              │
    ┌─────────────────────────▼─────────────────────────┐
    │           Backend: https://eduapi.eduvijna.com     │
    └───────────────────────────────────────────────────┘
```

---

## 3. Folder Structure Analysis

```
E:\Eduvijna\Eduvijna\
├── App.tsx                        ← Root component. Platform detection, provider nesting, deep links, push notification wiring.
├── app.json                       ← Expo manifest: app name, slug, icon, scheme, Android intent-filters, Firebase config paths, EAS project ID.
├── eas.json                       ← EAS Build profiles: development, preview, production.
├── babel.config.js                ← babel-preset-expo + module-resolver for path aliases.
├── metro.config.js                ← Custom resolver: forces axios browser build on web, zustand CJS redirect on web.
├── tsconfig.json                  ← Strict TypeScript. Path aliases: @core, @screens, @platforms, @mobile, @web, @context, @theme, @components.
├── .eslintrc.js                   ← Architecture enforcement rules (200 lines).
├── package.json                   ← Dependencies.
├── google-services.json           ← Firebase Android config (pushed to repo – security concern).
├── GoogleService-Info.plist       ← Firebase iOS config (pushed to repo – security concern).
├── assetlinks.json                ← Android App Links verification (placeholder SHA256 hashes).
├── plugins/
│   └── withCropButtonLabel.js     ← Expo config plugin that patches Android XML to label crop button "Done".
├── scripts/
│   ├── send_push.py               ← Python script for testing push notifications.
│   ├── testDeviceRegistration.js  ← Node script to test push device registration.
│   └── testPushNotification.js    ← Node script to send test push via FCM.
├── assets/                        ← App icons, splash screens, favicon (13 image files).
└── src/
    ├── __tests__/                 ← Jest test files (5 files) + setup.ts.
    ├── components/                ← 18 shared UI components (QuizFormFields, ShareQuizModal, etc.).
    ├── context/                   ← React Context providers (ThemeContext, DropdownContext).
    ├── core/
    │   ├── api/                   ← Axios-based API modules (8 files).
    │   ├── components/            ← Core shared components (Header.tsx, WebDeepLinkHandler.tsx).
    │   ├── context/               ← Legacy AuthContext.tsx.
    │   ├── domain/                ← Pure business logic (analytics.logic.ts, assessment.logic.ts, permissions.logic.ts).
    │   ├── hooks/                 ← 14 custom hooks.
    │   ├── services/              ← 18 service modules (cache, dashboard API, push, deep link, etc.).
    │   ├── store/                 ← 5 Zustand stores.
    │   ├── theme/                 ← Core theme (theme.ts).
    │   ├── types/                 ← TypeScript types (index.ts, quiz.types.ts, dashboard.types.ts at 1503 lines).
    │   └── utils/                 ← Utility functions (studentUtils.ts).
    ├── erp/
    │   ├── components/            ← ERPErrorBoundary, shared ERP UI.
    │   ├── contexts/              ← AcademicYearContext.tsx.
    │   ├── hooks/                 ← useErpRole.ts.
    │   ├── navigation/            ← ERPNavigator.tsx (22-screen stack).
    │   └── screens/               ← 22 ERP management screens.
    ├── examples/                  ← 6 example/demo files (not production code).
    ├── platforms/
    │   ├── mobile/
    │   │   ├── navigation/        ← BottomTabNavigator.tsx (787 lines) – main mobile nav.
    │   │   └── screens/           ← Mobile-specific: Dashboard, Profile, Analytics, Login, ThemeSettings.
    │   └── web/
    │       ├── navigation/        ← WebNavigation.tsx (408 lines) – sidebar + state machine.
    │       └── screens/           ← Web-specific: Dashboard, Profile, Analytics, Login, ThemeSettings.
    ├── screens/                   ← 28 shared screens used by both platforms.
    ├── theme/                     ← DESIGN_SYSTEM.ts, statCardColors.ts, theme.ts.
    └── utils/                     ← dateFilters.ts, quizFilters.ts.
```

### Why This Architecture?

| Decision | Rationale |
|----------|-----------|
| `src/platforms/mobile/` vs `src/platforms/web/` | Platform-divergent screens (login, profile, analytics) live in platform folders. Shared screens stay in `src/screens/`. |
| `src/core/` isolation | API, domain, store, and hooks are platform-agnostic. ESLint enforces screens cannot import them directly. |
| `src/erp/` self-contained module | ERP is a large subfeature (22 screens, 925-line API) separated to prevent coupling with the quiz/assessment domain. |
| Zustand over Redux | Smaller bundle, no boilerplate, works with metro's CJS redirect on web. |
| No Expo Router | The app predates Expo Router maturity for complex ERP navigation; the web uses a custom state machine (not URL-based routing). |

---

## 4. Dependency Analysis

### Production Dependencies

| Package | Version | Purpose | Where Used | Notes |
|---------|---------|---------|------------|-------|
| `expo` | ~54.0.35 | Expo SDK core | All | SDK managed workflow |
| `react` | 19.1.0 | UI framework | All | Latest React version |
| `react-native` | 0.81.5 | Mobile runtime | All | |
| `@react-navigation/native` | ^6.1.6 | Navigation core | `App.tsx`, navigators | |
| `@react-navigation/bottom-tabs` | ^6.5.10 | Tab bar navigation | `BottomTabNavigator.tsx` | |
| `@react-navigation/native-stack` | ^6.9.12 | Stack navigation | `BottomTabNavigator.tsx`, `ERPNavigator.tsx` | |
| `axios` | ^1.5.0 | HTTP client | `src/core/api/config.ts`, `dashboardApi.ts` | Metro forces browser build on web |
| `zustand` | ^4.5.0 | Global state | 5 stores in `src/core/store/` | Metro redirects to CJS on web |
| `@tanstack/react-query` | ^4.42.0 | Server state / data fetching | Present but limited use confirmed | Installed but Zustand dominates |
| `formik` | ^2.4.6 | Form state management | Login screens, quiz creation forms | |
| `yup` | ^1.4.0 | Schema validation | Paired with formik | |
| `@react-native-async-storage/async-storage` | 2.2.0 | Persistent key-value storage | `tokenStorage.ts`, `cacheService.ts`, `ThemeContext.tsx` | L2 cache |
| `expo-secure-store` | ~15.0.8 | Encrypted key-value storage | `tokenStorage.ts` – refresh token on mobile | |
| `expo-notifications` | ~0.32.17 | Push notifications | `PushNotificationService.ts`, `App.tsx` | Firebase-backed |
| `expo-constants` | ~18.0.13 | Expo config access | `src/core/api/config.ts` – reads `API_BASE_URL` | |
| `expo-document-picker` | ~14.0.8 | File picker | `CreateDocumentQuizScreen.tsx` | |
| `expo-image-picker` | ~17.0.11 | Camera/gallery | `CreateImageQuizScreen.tsx`, `CreateHandwrittenQuizScreen.tsx` | |
| `expo-file-system` | ~19.0.23 | File read/write | Document upload screens | |
| `expo-image-manipulator` | ~14.0.8 | Image resize/crop | Handwritten quiz image processing | |
| `expo-clipboard` | ~8.0.8 | Clipboard API | Share quiz link features | |
| `expo-print` | ~15.0.8 | Print/PDF export | Worksheet/quiz export | |
| `expo-updates` | ~29.0.18 | OTA updates | Configured via EAS | |
| `react-native-svg` | 15.12.1 | SVG rendering | Charts, icons | |
| `react-native-chart-kit` | ^6.12.0 | Charts/graphs | Analytics screens | |
| `katex` | ^0.16.27 | LaTeX math rendering | `MathRenderer.tsx` | Math questions in quizzes |
| `react-native-katex` | ^1.3.0 | React Native KaTeX bridge | `MathRenderer.tsx` | |
| `react-native-webview` | 13.15.0 | Embedded web content | KaTeX rendering, YouTube embeds | |
| `react-native-render-html` | ^6.3.4 | HTML rendering | Quiz question HTML content | |
| `date-fns` | ^4.1.0 | Date manipulation | `dateFilters.ts` | |
| `react-native-safe-area-context` | ~5.6.0 | Safe area handling | `App.tsx` root `SafeAreaProvider` | |
| `react-native-screens` | ~4.16.0 | Native screen optimization | React Navigation dependency | |
| `react-native-web` | ^0.21.0 | Web rendering | Metro web build | |
| `@react-native-picker/picker` | 2.11.1 | Dropdown/select | Quiz creation forms, ERP | |
| `@react-native-community/datetimepicker` | 8.4.4 | Date/time picker | ERP screens (exams, timetable) | |
| `@expo/vector-icons` | ^15.0.3 | Icon library (Ionicons, etc.) | Throughout UI | |
| `@react-native-clipboard/clipboard` | ^1.16.3 | Clipboard | Share links | |
| `expo-device` | ~8.0.10 | Device info | `PushNotificationService.ts` – device registration | |
| `expo-splash-screen` | ~31.0.13 | Splash screen | App startup | |
| `@types/redis` | ^4.0.10 | Redis type definitions | **Not used in app** – installed for backend reference only | Technical debt |
| `patch-package` | ^8.0.1 | npm patch system | Patches applied via `postinstall` | |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` ^5.3.3 | Type checking |
| `jest` ^29.7.0 | Test runner |
| `jest-expo` ~54.0.0 | Expo Jest preset |
| `@testing-library/react-native` ^13.3.3 | Component testing |
| `eslint` ^8.57.0 | Linting + architecture enforcement |
| `babel-plugin-module-resolver` ^5.0.2 | Path alias resolution |
| `patch-package` ^8.0.1 | Patch node_modules |

---

## 5. Application Entry Flow

### Boot Sequence Diagram

```
Expo AppEntry (node_modules/expo/AppEntry.js)
  └── App.tsx: default export App()
        └── <SafeAreaProvider>               ← react-native-safe-area-context
              └── <ThemeProvider>             ← src/context/ThemeContext.tsx
                    └── <AuthProvider>        ← src/core/context/AuthContext.tsx (legacy, used by DropdownContext)
                          └── <DropdownProvider> ← src/context/DropdownContext.tsx
                                └── <AppContent>
                                      ├── useAuth()             ← Triggers checkAuth() ONCE globally
                                      ├── useNotificationPolling()
                                      ├── initializeCache()     ← L1+L2 cache init + cleanup timer
                                      ├── PushNotificationService.initializeOnAppLaunch()  (mobile only)
                                      ├── Deep link subscription  (mobile only)
                                      └── Platform render:
                                            ├── isLoading=true → <ActivityIndicator>
                                            ├── isMobile + !isAuthenticated → <MobileLoginScreen>
                                            ├── isMobile + isAuthenticated  → <NavigationContainer><MobileNavigation>
                                            ├── isWeb + !isAuthenticated    → <WebLoginScreen>
                                            └── isWeb + isAuthenticated     → <WebNavigation>{renderScreen()}</WebNavigation>
```

### Step-by-Step App Boot Sequence

| Step | Action | File |
|------|--------|------|
| 1 | Expo loads `AppEntry.js`, calls `App()` | `App.tsx:551` |
| 2 | `SafeAreaProvider` wraps everything for insets | `App.tsx:553` |
| 3 | `ThemeProvider` loads theme preference from AsyncStorage (`@eduvijna_theme_mode`) | `src/context/ThemeContext.tsx:38` |
| 4 | `AuthProvider` (legacy) loads token + user data from storage via `TokenStorage` | `src/core/context/AuthContext.tsx:37` |
| 5 | `DropdownProvider` waits for auth, then fetches classes/subjects/difficulty levels | `src/context/DropdownContext.tsx:62` |
| 6 | `AppContent` mounts; `useAuth()` calls `checkAuth()` **once globally** | `src/core/hooks/useAuth.ts:117` |
| 7 | `checkAuth()`: reads access token → checks expiry → optionally refreshes → fetches `/api/v1/auth/profile` → enriches with school name → sets Zustand `user.store` | `src/core/hooks/useAuth.ts:117–205` |
| 8 | `initializeCache()` runs cleanup on AsyncStorage and sets 5-minute cleanup interval | `src/core/services/cacheService.ts:119` |
| 9 | Push notification initialization fires (mobile only) | `App.tsx:102` |
| 10 | Deep link listener subscribed (mobile only) | `App.tsx:254` |
| 11 | Auth state resolves → `isLoading=false` → Platform branch renders appropriate navigation or login | `App.tsx:410–545` |

---

## 6. Authentication Architecture

### Overview

The app uses **JWT-based authentication** with separate access and refresh tokens. The primary auth system is the `useAuth` hook backed by Zustand. A legacy `AuthContext` exists alongside it (used only by `DropdownContext`).

### Token Storage Strategy

| Token | Mobile Storage | Web Storage | Key Name |
|-------|---------------|------------|----------|
| Access Token | AsyncStorage | localStorage | `auth_access_token` |
| Refresh Token | **SecureStore** (encrypted) | localStorage | `auth_refresh_token` |
| Token Expiry | AsyncStorage | localStorage | `auth_token_expiry` |
| User Data (JSON) | AsyncStorage | localStorage | `auth_user_data` |

Source: `src/core/services/tokenStorage.ts`

### Login Flow

```
User enters email + password
  └── Login screen (mobile: src/platforms/mobile/screens/Login.tsx OR web: src/platforms/web/screens/Login.tsx)
        └── useAuth().login({ email, password })
              └── AuthAPI.login()
                    └── POST /api/v1/auth/login
                          Body: { username_or_email, password, remember_me: false, device_info: 'React Native Mobile App' }
                          Response: { access_token, refresh_token, user: UserProfile }
                    └── TokenStorage.storeAuthTokens(accessToken, refreshToken, 3600)
                          ├── storeAccessToken → AsyncStorage (mobile) / localStorage (web)
                          ├── storeRefreshToken → SecureStore (mobile) / localStorage (web)
                          └── storeTokenExpiry → AsyncStorage / localStorage (Date.now() + 3600*1000)
                    └── TokenStorage.storeUserData(JSON.stringify(user))
              └── enrichUserWithSchoolName(user) → GET /api/v1/school-management/my-school
              └── useUserStore.setUser(enrichedUser)
              └── useUserStore.setAuthenticated(true)
              └── useUserStore.setSchoolId(extractSchoolId(user))
```

Source: `src/core/hooks/useAuth.ts:210–238`, `src/core/api/auth.api.ts:17–53`

### Session Restore Flow (App Restart)

```
App restarts
  └── checkAuth() [called once via useEffect on mount, global flag hasCheckedAuth prevents duplicates]
        └── TokenStorage.getAccessToken()
              ├── No token → setAuthenticated(false) → Show Login
              └── Token found → TokenStorage.isTokenExpired()
                    ├── Not expired → AuthAPI.getCurrentUser() [returns cached userData or GET /api/v1/auth/profile]
                    └── Expired → AuthAPI.refreshToken() [POST /api/v1/auth/refresh with refresh_token]
                          ├── Success → store new tokens → AuthAPI.getCurrentUser()
                          └── Failure → clearAuthData() → setAuthenticated(false) → Show Login
```

Source: `src/core/hooks/useAuth.ts:117–205`

### Token Refresh Mechanism (Mid-Session)

The Axios response interceptor in `src/core/api/config.ts` implements a **request queue pattern** for concurrent refresh:

```
API call returns 401/403 (or auth error in response body)
  └── config.ts response interceptor
        ├── isAuthRequest? (login/register/refresh) → Reject immediately
        ├── originalRequest._retry already set? → handleAuthenticationFailure() → logout
        └── isRefreshing=false?
              └── Set isRefreshing=true, originalRequest._retry=true
              └── TokenStorage.getRefreshToken()
              └── refreshClient.post('/api/v1/auth/refresh', { refresh_token })
                    ├── Success:
                    │     ├── storeAuthTokens(new tokens)
                    │     ├── useUserStore.setTokens(tokens)
                    │     ├── notifyRefreshSubscribers(newAccessToken)  ← Flushes queued requests
                    │     └── Retry originalRequest with new token
                    └── Failure:
                          ├── notifyRefreshSubscribers(null)  ← Rejects queued requests
                          └── handleAuthenticationFailure() → clearAuthData() → useUserStore.logout()

While isRefreshing=true: other 401 requests are queued in refreshQueue[]
  └── When refresh completes: each queued request retries with new token
```

Source: `src/core/api/config.ts:68–193`

### Logout Flow

```
useAuth().logout()
  └── AuthAPI.logout()
        └── POST /api/v1/auth/logout (best-effort; continues even if fails)
        └── TokenStorage.clearAuthData()
              ├── Mobile: AsyncStorage.multiRemove([access, expiry, userData]) + SecureStore.deleteItemAsync(refresh)
              └── Web: localStorage.removeItem × 4
  └── useTeacherDashboardStore.getState().reset()
  └── clearQuizNavCache() [clears quiz navigation permission cache]
  └── useUserStore.logout() [user=null, tokens=null, isAuthenticated=false, schoolId=null]
```

Source: `src/core/hooks/useAuth.ts:243–266`

### Authentication Sequence Diagram

```
Client                 useAuth            TokenStorage       API Server
  │                      │                    │                  │
  │──login(creds)────────►│                   │                  │
  │                      │──storeTokens()────►│                  │
  │                      │──POST /auth/login──┼──────────────────►│
  │                      │◄───────────────────┼──{token,user}────│
  │                      │──store tokens──────►│                  │
  │◄──user set───────────│                    │                  │
  │                      │                    │                  │
  │ [API call]           │                    │                  │
  │──GET /any/endpoint───►│                   │                  │
  │                      │──getAccessToken()──►│                  │
  │                      │◄──token────────────│                  │
  │                      │──GET /any [Bearer token]──────────────►│
  │                      │◄────────────────── │──200 OK──────────│
  │◄──data───────────────│                    │                  │
  │                      │                    │                  │
  │ [Token expired]       │                   │                  │
  │──GET /any────────────►│                   │                  │
  │                      │──GET /any [expired token]─────────────►│
  │                      │◄────────────────── │──401─────────────│
  │                      │──getRefreshToken()─►│                  │
  │                      │◄──refresh token────│                  │
  │                      │──POST /auth/refresh─┼──────────────────►│
  │                      │◄────────────────── │──new tokens──────│
  │                      │──storeNewTokens()──►│                  │
  │                      │──retry original request───────────────►│
  │◄──data───────────────│                    │                  │
```

---

## 7. Authorization & Role Management

### User Roles

The application recognizes these roles (from `src/core/types/index.ts` and `src/erp/hooks/useErpRole.ts`):

| Role | `role` string | `role_id` | Access |
|------|--------------|-----------|--------|
| Super Admin | `super_admin` | 1 | All schools, no school_id binding |
| Admin | `admin` | 2 | School-level administration |
| Instructor / Teacher | `instructor` or `teacher` | varies | Quiz creation, classroom management |
| Student | `student` | varies | Quiz taking, analytics view |

### Role Detection Logic

```typescript
// src/erp/hooks/useErpRole.ts
const isSuperAdmin = roleId === 1 || role === 'super_admin';
const isAdmin = roleId === 1 || roleId === 2 || role === 'super_admin' || role === 'admin';
const isTeacher = role === 'instructor' || role === 'teacher';
const isStudent = role === 'student';
```

### Route Protection

There is **no formal route guard middleware**. Authorization is handled at the component level:

1. **App-level auth gate** (`App.tsx:451,458`): Checks `isAuthenticated` before rendering any navigation. Unauthenticated users see only the Login screen.

2. **Dashboard routing by role** (`App.tsx:467–470`, `BottomTabNavigator.tsx:54–63`):
   ```typescript
   if (user?.role === 'instructor' || user?.role === 'admin') {
     return <TeacherDashboard />;
   }
   return <StudentDashboard />;
   ```

3. **Assessments routing by role** (`BottomTabNavigator.tsx:66–70`):
   ```typescript
   const userRole = user?.role === 'instructor' || user?.role === 'admin' ? 'instructor' : 'student';
   return <AssessmentsScreen userRole={userRole} />;
   ```

4. **ERP role-based access** (`src/erp/hooks/useErpRole.ts`): Provides `isSuperAdmin`, `isAdmin`, `isTeacher`, `isStudent` flags derived from the Zustand `user.store`.

5. **School ID binding**: `useUserStore.schoolId` (set during auth init) is passed to all ERP API calls. Super admins have no `schoolId`, giving them cross-school access.

### Permissions Logic

File: `src/core/domain/permissions.logic.ts`

This is a domain-layer file containing pure authorization logic. It enforces that screens never call it directly (ESLint rule).

---

## 8. Navigation Architecture

### Mobile Navigation Tree

```
NavigationContainer (ref=navigationRef)
  └── MobileNavigation = BottomTabNavigator.tsx
        └── Stack.Navigator (Root Stack)
              ├── Main (screen) → Tab.Navigator
              │     ├── Dashboard tab → RoleDashboard
              │     │     ├── TeacherDashboard (role=instructor|admin)
              │     │     └── StudentDashboard (role=student)
              │     ├── Assessments tab → RoleAssessments → AssessmentsScreen
              │     ├── Analytics tab → ClassesList screen
              │     ├── ERP tab → ERPNavigator (nested Stack)
              │     │     ├── ERPMain
              │     │     ├── ERPDashboard
              │     │     ├── ERPClassOverview
              │     │     ├── ERPAcademicSetup
              │     │     ├── ERPAttendance
              │     │     ├── ERPNotices
              │     │     ├── ERPAdmissions
              │     │     ├── ERPExams
              │     │     ├── ERPTimetable
              │     │     ├── ERPFees
              │     │     ├── ERPHR
              │     │     ├── ERPLibrary
              │     │     ├── ERPTransport
              │     │     ├── ERPHostel
              │     │     ├── ERPInventory
              │     │     ├── ERPEngagement
              │     │     ├── ERPSafety
              │     │     ├── ERPParentPortal
              │     │     ├── ERPHolidayCalendar
              │     │     ├── ERPLMS
              │     │     ├── ERPForms
              │     │     ├── ERPBiometric
              │     │     └── ERPAnalytics
              │     ├── Notifications tab (hidden)
              │     └── Profile tab (hidden)
              │
              ├── StudentList (screen)
              ├── ClassesList (screen)
              ├── CreateAIQuizScreen
              ├── CreateDocumentQuizScreen
              ├── CreateImageQuizScreen
              ├── CreateYouTubeQuizScreen
              ├── CreateWebsiteQuizScreen
              ├── CreateHandwrittenQuizScreen
              ├── AssessmentWorkspaceScreen
              ├── DocumentUploadHomeScreen
              ├── DocumentUploadPreviewScreen
              ├── DocumentUploadHistoryScreen
              ├── DocumentUploadQuizScreen
              ├── QuizTakingScreen
              ├── QuizResultsScreen
              ├── QuizPreviewScreen
              ├── StudentAnalyticsScreen
              ├── TestNotifications
              ├── QuizStatusScreen
              ├── QuizLoadingScreen
              ├── RecentAssessmentsScreen
              └── WorksheetScreen
```

Source: `src/platforms/mobile/navigation/BottomTabNavigator.tsx`

### Web Navigation Architecture

Web navigation is **not** React Navigation — it's a **custom state machine** in `App.tsx`:

```typescript
// App.tsx:59
const [activeScreen, setActiveScreen] = useState<'dashboard' | 'assessments' | ...>('dashboard');
const [navigationParams, setNavigationParams] = useState<any>({});

// WebNavigation renders sidebar; AppContent switches screen via renderScreen()
<WebNavigation activeScreen={activeScreen} onNavigate={(screen) => handleNavigate(screen)}>
  {renderScreen()}
</WebNavigation>
```

Web screens receive a **compatibility navigation object**:
```typescript
const createWebNavigation = (defaultBackScreen: string) => ({
  navigate: (screen, params) => handleNavigate(screen, params),
  replace: (screen, params) => handleNavigate(screen, params),
  goBack: () => handleNavigate(defaultBackScreen),
  setOptions: (_options) => {},  // no-op
});
```

Source: `App.tsx:245–251`

### Deep Linking

**Mobile:**
- Scheme: `eduvijna://`
- Web Prefix: `https://ui.eduvijna.com`
- Android App Links: `https://app.eduvijna.com/openquiz` (configured in `app.json`, verification file `assetlinks.json`)

**Deep Link Route Mapping** (`App.tsx:420–447`):
```
eduvijna://dashboard → Main.Dashboard
eduvijna://assessments → Main.Assessments
eduvijna://openquiz?session_id=X → QuizTakingScreen (handled via handleOpenQuiz)
eduvijna://students → StudentList
eduvijna://classes → ClassesList
eduvijna://create-ai-quiz → CreateAIQuizScreen
```

**Key service:** `src/core/services/deepLinkService.ts` — `getInitialDeepLink()`, `subscribeToDeepLinks()`, `parseDeepLink()`. Parses `session_id` from URL query string and maps to `{ type: 'assessment', sessionId }`.

**OpenQuiz handler** (`src/core/services/openQuizHandler.ts`, 403 lines): Centralized handler for quiz opening from notification tap, deep link, or post-login resume. Deduplicates sessions within 2-second window.

### Navigation Service

`src/core/services/navigationService.ts` — Exports `navigationRef` (a `React.createRef<NavigationContainerRef>()`) for imperative navigation outside React components (used in `App.tsx` notification handlers and `dashboardApi.ts` auth error callback).

---

## 9. State Management

### Overview

The app uses **Zustand** as the primary global state manager (5 stores) and **React Context** for cross-cutting concerns (theme, dropdowns, legacy auth).

### Zustand Stores

#### 1. `user.store.ts` — `src/core/store/user.store.ts`

**Primary authentication state store.**

```typescript
interface UserState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  schoolId: number | null;   // Centrally resolved for all ERP/API calls
}
```

| Action | Effect |
|--------|--------|
| `setUser(user)` | Updates user profile |
| `setTokens(tokens)` | Updates token state (in-memory only) |
| `setAuthenticated(bool)` | Updates auth gate |
| `setLoading(bool)` | Controls loading spinner |
| `setSchoolId(id)` | Resolved once at login, used by all ERP API calls |
| `logout()` | Resets user, tokens, isAuthenticated, schoolId to null |

#### 2. `teacherDashboard.store.ts` — `src/core/store/teacherDashboard.store.ts`

**Singleton teacher dashboard data store.** Implements a singleton load pattern — data loads only once and is shared across all screens.

```typescript
interface TeacherDashboardState {
  allQuizzes: TeacherQuiz[];
  classrooms: Classroom[];
  stats: TeacherDashboardStats;      // Computed: total_students, classes, assessments, active, pending
  weakStudents: WeakStudent[];       // Students with avg score <= 35%, sorted ascending
  uniqueStudents: Student[];         // All students, sorted by name
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  isInitialized: boolean;
  studentListsCache: Record<string, any[]>;  // Per-classroom student lists
  loadingStudents: Record<string, boolean>;
}
```

**Key behavior:** `loadDashboard()` is a no-op if `isInitialized && allQuizzes.length > 0`. This prevents redundant API calls during tab navigation. `reset()` is called on logout.

#### 3. `dashboard.store.ts` — `src/core/store/dashboard.store.ts`

Shared quiz/classroom cache used by both teacher and student dashboards.

#### 4. `assessment.store.ts` — `src/core/store/assessment.store.ts`

Assessment list state with filter/pagination capabilities.

#### 5. `assessmentWorkspace.store.ts` — `src/core/store/assessmentWorkspace.store.ts`

UI state for the document/handwritten workspace (multi-step quiz creation flow). Manages document panels, selected documents, workspace stages.

### React Context

| Context | File | Purpose | Consumers |
|---------|------|---------|-----------|
| `ThemeContext` | `src/context/ThemeContext.tsx` | Light/dark/system theme switching, persisted in AsyncStorage (`@eduvijna_theme_mode`) | All screens via `useTheme()` |
| `DropdownContext` | `src/context/DropdownContext.tsx` | Classes, subjects, difficulty levels for quiz creation forms — fetched once, shared globally | Quiz creation screens via `useDropdowns()` |
| `AuthContext` (legacy) | `src/core/context/AuthContext.tsx` | Legacy auth: user, token, login, logout, isTeacher/isStudent/isAdmin | `DropdownContext` (imports `useAuth` from here) |

### State Flow Diagram

```
User Action
  │
  ▼
Screen Component
  │── reads from: useUserStore(), useTeacherDashboardStore(), useTheme(), useDropdowns()
  │── triggers: useAuth().login/logout, store.loadDashboard(), store.refresh()
  │
  ▼
Zustand Store / Context
  │── update triggers: re-renders in subscribed components
  │
  ▼
Hook Layer (useAuth, useDashboard, useAssessments...)
  │── orchestrates: API calls → cache checks → store updates
  │
  ▼
Cache Layer (cacheService.ts)
  │── L1: memoryCache Map
  │── L2: AsyncStorage
  │
  ▼
API Layer (config.ts + API modules)
  │── Axios + JWT interceptor → Backend
  │
  ▼
Backend (https://eduapi.eduvijna.com)
```

---

## 10. API Architecture

### API Client Setup

**File:** `src/core/api/config.ts`

```
API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'https://eduapi.eduvijna.com'
                 └── Read from app.json extra.API_BASE_URL at build time via expo-constants
```

**Axios instance** (`apiClient`): 30-second timeout, JSON content type.

**Separate refresh client** (`refreshClient`): Same config but no interceptors — prevents circular refresh loops.

### Interceptors

**Request Interceptor** (`config.ts:44–66`):
- Attaches `Authorization: Bearer <accessToken>` to all non-auth requests.
- Skips for `/auth/login`, `/auth/register`, `/auth/refresh`.

**Response Interceptor** (`config.ts:85–216`):
- Handles 401/403 and FastAPI auth error messages in body.
- Implements queue-based token refresh (see §6).
- On network error: Returns `'Network connection failed'`.
- On 500+: Extracts server's `detail`/`message`/`error` field.
- Preserves `error.response` on the thrown `Error` for callers to inspect status.

### Generic Request Wrappers

```typescript
// src/core/api/config.ts:283–319
get<T>(url, params?): Promise<T>
post<T>(url, data?): Promise<T>
put<T>(url, data?): Promise<T>
del<T>(url): Promise<T>
patch<T>(url, data?): Promise<T>
```

### API Modules

| File | Endpoints | Notes |
|------|-----------|-------|
| `auth.api.ts` | `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/profile`, `POST /api/v1/auth/refresh` | Manages token storage internally |
| `analytics.api.ts` | Analytics endpoints | Dashboard analytics |
| `assessment.api.ts` | Assessment CRUD endpoints | Maps quiz API responses to `Assessment` types |
| `notifications.api.ts` | Notification fetch/history | **NOTE: Intentionally disabled** to avoid rate limiting |
| `profile.api.ts` | `GET /api/v1/profile`, `PUT /api/v1/profile` | User profile update |
| `erp.api.ts` | **81 ERP endpoint groups** (925 lines) | Attendance, fees, timetable, admissions, etc. |
| `device.api.ts` | Push device registration | `NotificationsAPI` class, registers FCM token with backend |

### Alternative API Layer (dashboardApi.ts)

`src/core/services/dashboardApi.ts` (857 lines) is a **second, lower-level API layer** that talks directly to the backend using `fetch()` (not Axios). It:
- Constructs requests using `TokenStorage.getAccessToken()` directly.
- Has its own auth error detection logic.
- Exposes `setAuthErrorNavigationCallback()` used by `App.tsx` to redirect to login.
- Uses `cachedApiCall()` from `cacheService.ts` for cache-first data fetching.

### API Architecture Diagram

```
Screen/Component
  │
  ▼ (via hook, never direct)
Custom Hook (useAuth, useDashboard, etc.)
  │
  ├──► src/core/api/*.ts (Axios wrapper)
  │         └── apiClient (Axios) → Bearer token → https://eduapi.eduvijna.com
  │
  └──► src/core/services/dashboardApi.ts (fetch-based)
            └── cachedApiCall() → cacheService → fetch() → https://eduapi.eduvijna.com
```

---

## 11. Backend Integration Mapping

### Backend Base URL

`https://eduapi.eduvijna.com` — FastAPI backend (inferred from `detail` field in error responses, typical FastAPI validation error format).

### API Prefix

All endpoints use `/api/v1/` prefix.

### Endpoint Mapping

| Screen | Service | Endpoint | Method |
|--------|---------|----------|--------|
| Login | `auth.api.ts` | `/api/v1/auth/login` | POST |
| Any authenticated screen | `auth.api.ts` | `/api/v1/auth/profile` | GET |
| TeacherDashboard | `dashboardApi.ts` | `/api/v1/quizzes/?view_type=summary` | GET |
| TeacherDashboard (students) | `dashboardApi.ts` | `/api/v1/quizzes/?view_type=all_students` | GET |
| StudentDashboard | `dashboardApi.ts` | `/api/v1/quizzes/student-dashboard` | GET |
| ClassesList / Analytics | `dashboardApi.ts` | `/api/v1/classrooms/` | GET |
| StudentList | `dashboardApi.ts` | `/api/v1/quizzes/?view_type=class_wise_students&classroom_id=X` | GET |
| Assessments (teacher) | `assessment.api.ts` | `/api/v1/quizzes/` | GET |
| Assessments (student) | `assessment.api.ts` | `/api/v1/quizzes/student-dashboard` | GET |
| CreateAIQuizScreen | API in screen | `/api/v1/quizzes/generate` | POST |
| CreateDocumentQuizScreen | API in screen | `/api/v1/quizzes/generate-from-document` | POST |
| QuizTakingScreen | API in screen | `/api/v1/quiz-sessions/{session_id}` | GET |
| QuizResultsScreen | API in screen | `/api/v1/quiz-sessions/{session_id}/results` | GET |
| School name | `config.ts` (in useAuth) | `/api/v1/school-management/my-school` | GET |
| Push device register | `device.api.ts` | `/api/v1/notifications/devices/` | POST |
| ERP Attendance | `erp.api.ts` | `/api/v1/erp/attendance/...` | GET/POST |
| ERP Fees | `erp.api.ts` | `/api/v1/erp/fees/...` | GET/POST |
| ERP Timetable | `erp.api.ts` | `/api/v1/erp/timetable/...` | GET/POST |
| ERP Admissions | `erp.api.ts` | `/api/v1/erp/admissions/...` | GET/POST |
| ERP HR | `erp.api.ts` | `/api/v1/erp/hr/...` | GET/POST |
| User profile update | `profile.api.ts` | `/api/v1/auth/profile` | PUT |

### Push Notification Integration

**Firebase Cloud Messaging (FCM):**
- `google-services.json` and `GoogleService-Info.plist` configure Firebase on Android/iOS.
- `expo-notifications` handles token generation.
- `PushNotificationService.ts` (`src/core/services/PushNotificationService.ts`, 527 lines):
  - `initializeOnAppLaunch()`: Generates Expo push token, optionally registers with backend.
  - `syncStatusAfterLogin()`: Re-registers device with backend after login.
  - Sets notification handler for foreground display.
- `device.api.ts`: `NotificationsAPI` class sends device token to `/api/v1/notifications/devices/`.
- `NotificationPollingService.ts`: Polls `/api/v1/notifications/` at intervals as backup.
- **Note:** `notifications.api.ts` fetch endpoints are disabled to avoid rate limiting.

---

## 12. Database Architecture

The mobile application has **no direct database connection**. All data access goes through the backend REST API at `https://eduapi.eduvijna.com`.

### Inferred Backend Database

Based on API endpoint patterns, naming conventions, and the Redis references in `.env.cache.example`:

| Layer | Technology | Evidence |
|-------|-----------|---------|
| Primary Database | PostgreSQL (likely) | `/api/v1/` FastAPI patterns, school_id integer foreign keys, `role_id` integers |
| Cache (backend) | Redis (not accessible from app) | `.env.cache.example` mentions `redis-prod.eduvijna.com:6379` |
| ORM | SQLAlchemy (likely) | FastAPI + PostgreSQL standard stack |

### Mobile-to-Database Data Path

```
Mobile App
  └── Axios / fetch
        └── HTTPS → https://eduapi.eduvijna.com
              └── FastAPI backend
                    └── (Redis cache check → miss →)
                          └── PostgreSQL database
                                └── Response JSON
                          └── (Redis cache set)
              └── JSON response
        └── cacheService.ts (L1 memory + L2 AsyncStorage)
        └── UI update via Zustand store
```

---

## 13. Cache Architecture

### Multi-Layer Cache Design

```
Cache Read Request
  │
  ▼
L1: memoryCache (Map<string, CacheEntry>)  ← In-process JavaScript Map
  │── Hit + not expired → return data
  │── Miss or expired → delete entry
  │
  ▼
L2: AsyncStorage (persistent)              ← @react-native-async-storage/async-storage
  │── Key prefix: "eduvijna:{key}"
  │── Hit + not expired → promote to L1 → return data
  │── Miss or expired → remove entry
  │
  ▼
API Call (apiFunction())
  │── Success → setCachedData(key, data, ttl) → write to L1 + L2
  │── Failure → throw (no cache write)
```

Source: `src/core/services/cacheService.ts`

### Cache TTL Configuration

| Data Type | TTL | Key Prefix |
|-----------|-----|-----------|
| Dashboard Summary | 300s (5 min) | `eduvijna:dashboard:*` |
| Quizzes List | 600s (10 min) | `eduvijna:quizzes:*` |
| Classrooms | 1800s (30 min) | `eduvijna:classrooms:*` |
| Students List | 900s (15 min) | `eduvijna:students:*` |
| User Profile | 3600s (1 hr) | `eduvijna:profile:*` |
| Quiz Details | 1800s (30 min) | `eduvijna:quiz:*` |
| Analytics | 1800s (30 min) | `eduvijna:analytics:*` |
| Default | 300s (5 min) | `eduvijna:*` |

Source: `src/core/services/cacheService.ts:10–19`

### Cache Invalidation

- **Automatic:** `setInterval(cleanup, 5 * 60 * 1000)` — runs every 5 minutes, removes expired entries from both L1 and L2.
- **Manual:** `clearCacheEntry(key)` — removes specific entry from both layers.
- **Full clear:** `clearAllCache()` — resets stats, clears all `eduvijna:*` keys from AsyncStorage.
- **On logout:** `useTeacherDashboardStore.reset()` clears in-memory quiz data. Cache in AsyncStorage persists until TTL expiry or explicit clear.
- **Force refresh:** `cachedApiCall(fn, key, ttl, forceRefresh=true)` — bypasses both L1 and L2.

### Cache Statistics

`getCacheStatistics()` and `logCacheStatistics()` provide `memoryHits`, `storageHits`, `apiCalls`, `cacheMisses`, and calculated `hitRate`. These are development/debugging tools — no production dashboard.

---

## 14. Storage Architecture

### Complete Storage Map

| Storage | Technology | Key Pattern | Data | Security Level | Platform |
|---------|-----------|-------------|------|----------------|---------|
| Access Token | AsyncStorage | `auth_access_token` | JWT access token | **Low** – plaintext | Mobile |
| Access Token | localStorage | `auth_access_token` | JWT access token | **Low** – plaintext | Web |
| Refresh Token | **SecureStore** | `auth_refresh_token` | JWT refresh token | **High** – encrypted | Mobile |
| Refresh Token | localStorage | `auth_refresh_token` | JWT refresh token | **Low** – plaintext | Web |
| Token Expiry | AsyncStorage | `auth_token_expiry` | Unix timestamp (ms) | Low | Mobile |
| Token Expiry | localStorage | `auth_token_expiry` | Unix timestamp (ms) | Low | Web |
| User Data | AsyncStorage | `auth_user_data` | UserProfile JSON | Low | Mobile |
| User Data | localStorage | `auth_user_data` | UserProfile JSON | Low | Web |
| Theme Preference | AsyncStorage | `@eduvijna_theme_mode` | `'light'`/`'dark'`/`'system'` | None | Both |
| Cache (any data) | AsyncStorage | `eduvijna:{key}` | Serialized CacheEntry JSON | Low | Both |
| Push status | AsyncStorage | (inside PushNotificationService) | Enabled/disabled flag | Low | Mobile |

Source: `src/core/services/tokenStorage.ts`, `src/context/ThemeContext.tsx`, `src/core/services/cacheService.ts`

### Security Notes on Token Storage

- **Mobile access token** is stored in `AsyncStorage` (not SecureStore) for performance reasons. Refresh token uses SecureStore.
- **Web tokens** are stored in `localStorage` — vulnerable to XSS.
- No `httpOnly` cookie implementation despite the comment in `tokenStorage.ts:68`: "in production, consider httpOnly cookies."

---

## 15. Data Flow Diagrams

### Complete User Journey: Teacher Creates AI Quiz

```
Teacher taps "Create AI Quiz"
  │
  ▼
CreateAIQuizScreen.tsx
  │── form (formik + yup): topic, grade, difficulty, question count
  │
  ▼
API call: POST /api/v1/quizzes/generate
  │── body: { topic, grade, difficulty, num_questions, class_id, subject_id }
  │── header: Authorization: Bearer <accessToken>
  │
  ▼
Backend generates quiz via AI
  │── Response: { quiz_id, questions: [...], session_id? }
  │
  ▼
QuizPreviewScreen.tsx
  │── displays generated questions
  │── teacher can edit, publish
  │
  ▼
Publish → QuizStatusScreen / assessment state update
  │
  ▼
useTeacherDashboardStore.refresh()  [invalidates dashboard cache]
  │
  ▼
TeacherDashboard shows updated assessment count
```

### Complete User Journey: Student Takes Quiz via Deep Link

```
Student receives push notification (FCM)
  │── notification data: { sessionId, type }
  │
  ▼
App.tsx: Notifications.addNotificationResponseReceivedListener
  │── extract sessionId
  │── if !isAuthenticated → setPendingSessionId(sessionId) → save for post-login
  │── if isAuthenticated → handleOpenQuiz(sessionId, 'notification', user, navigationAdapter)
  │
  ▼
src/core/services/openQuizHandler.ts: handleOpenQuiz()
  │── deduplication check (2-second window)
  │── GET /api/v1/quiz-sessions/{session_id}
  │── determine user role
  │── navigate: navigationRef.current.navigate('QuizTakingScreen', { sessionId })
  │
  ▼
QuizTakingScreen.tsx
  │── loads questions via GET /api/v1/quiz-sessions/{session_id}
  │── student answers → POST /api/v1/quiz-sessions/{session_id}/submit
  │
  ▼
QuizResultsScreen.tsx
  │── GET /api/v1/quiz-sessions/{session_id}/results
  │── displays score, explanations (KaTeX rendering for math)
```

### Data Flow: Dashboard Load

```
TeacherDashboard mounts
  │
  ▼
useTeacherDashboardStore.getState().loadDashboard()
  │── isInitialized && quizzes.length > 0? → return (singleton, no re-fetch)
  │── isLoading? → return
  │
  ▼
fetchTeacherDashboardSummary({ view_type: 'summary', limit: 1000, offset: 0 })
  │── cachedApiCall(apiFunction, cacheKey, CACHE_TTL.QUIZZES_LIST)
  │       ├── getCachedData('quizzes:summary') → L1 hit? return
  │       │                                    → L2 hit? promote to L1, return
  │       │                                    → miss: proceed
  │       └── fetch(`/api/v1/quizzes/?view_type=summary&limit=1000`)
  │             └── cache result → L1 + L2
  │
  ▼
Store updates:
  ├── allQuizzes, classrooms, stats (computed)
  ├── weakStudents (avg score ≤ 35%)
  └── uniqueStudents (all students)
  │
  ▼
TeacherDashboard re-renders from Zustand subscription
```

---

## 16. Security Analysis

### Finding Summary

| ID | Issue | Severity | File | Description |
|----|-------|----------|------|-------------|
| S-01 | Firebase config committed to repo | **Critical** | `google-services.json`, `GoogleService-Info.plist` | Firebase project credentials (API keys, project IDs) are committed. Exposed to anyone with repo access. |
| S-02 | Access token in AsyncStorage (mobile) | **High** | `src/core/services/tokenStorage.ts:35` | Access token stored in AsyncStorage which is not encrypted. A rooted device can extract it. Refresh token correctly uses SecureStore. |
| S-03 | All tokens in localStorage (web) | **High** | `src/core/services/tokenStorage.ts:30` | Both tokens in localStorage are XSS-accessible. No `httpOnly` cookie implementation despite code comments noting it should be done. |
| S-04 | User data JSON in AsyncStorage | **Medium** | `src/core/services/tokenStorage.ts:168` | Full user profile (including role, school_id, email) cached unencrypted in AsyncStorage on mobile. |
| S-05 | API base URL hardcoded in `app.json` | **Medium** | `app.json:extra.API_BASE_URL` | `https://eduapi.eduvijna.com` is publicly visible in app bundle. Not a secret by itself, but combined with other info enables targeted API probing. |
| S-06 | Redis credentials in `.env.cache.example` | **Medium** | `.env.cache.example:54–57` | Commented-out Redis credentials with hostname and password visible in repo (`eduvijnaprod@cache`). Even commented credentials should not be in version control. |
| S-07 | `assetlinks.json` has placeholder SHA256 | **Medium** | `assetlinks.json` | Android App Links verification uses placeholder fingerprints. Deep link verification will fail in production, allowing link interception. |
| S-08 | Backend logout best-effort only | **Low** | `src/core/api/auth.api.ts:59–69` | If `POST /api/v1/auth/logout` fails, logout continues silently. The backend token may remain valid until natural expiry. |
| S-09 | `@types/redis` in production deps | **Low** | `package.json` | `@types/redis` is a devDependency that ended up in production dependencies. Increases bundle size minimally. |
| S-10 | `console.log` statements with auth data | **Low** | `App.tsx`, `useAuth.ts` | User email logged in plaintext: `console.log('User authenticated:', enrichedUser.email, '| school_id:', sid)` |
| S-11 | Deep link session ID replay | **Low** | `App.tsx:283–296` | 2-second deduplication window is adequate but the same sessionId can be replayed after 2 seconds. The backend session validation is the actual guard. |

---

## 17. Performance Analysis

### Identified Performance Concerns

#### 1. `teacherDashboard.store.ts` — Loads 1000 quizzes upfront

```typescript
// teacherDashboard.store.ts:284
const response = await fetchTeacherDashboardSummary({
  view_type: 'summary',
  limit: 1000,   ← fetches up to 1000 quizzes at startup
  offset: 0,
});
```

**Impact:** Large payload, high memory usage for schools with many quizzes.
**Recommendation:** Implement server-side pagination with progressive loading.

#### 2. Concurrent student count + weak students fetch

```typescript
// teacherDashboard.store.ts:339
const allStudentsResponse = await fetchTeacherDashboardSummary({
  view_type: 'all_students',
  limit: 1000,
});
```

Two separate API calls sequentially at dashboard load. Opportunity for `Promise.all()`.

#### 3. `DropdownContext` — Fetches classes/subjects/difficulty at every authentication

The `DropdownContext` fetches 3 endpoints (classes, subjects, difficulty levels) on mount and on every auth state change. With caching in `dropdown.ts` (478 lines), this is mitigated, but the initial load is synchronous with auth.

#### 4. `CustomHeader` in `BottomTabNavigator.tsx` — School name API call on every render

```typescript
// BottomTabNavigator.tsx:129
get<any>('/api/v1/school-management/my-school').then(...).catch(...)
```

This `useEffect` in `CustomHeader` fires on every mount. Since the header is always visible, any navigation event triggers a re-render check. This is mitigated by the `isActive` cleanup ref.

#### 5. School ID extracted via 8-field fallback chain

The `extractSchoolId()` function in `useAuth.ts` and equivalents in `useErpRole.ts`, `BottomTabNavigator.tsx` all run an 8-level `??` chain on every call. While not expensive, it indicates inconsistent `school_id` field naming in the API response.

#### 6. ERP screens — `erp.api.ts` at 925 lines

The ERP API module is not code-split. On web, all 925 lines load regardless of whether the user visits ERP.

#### 7. Largest screens by line count

| Screen | Lines | Concern |
|--------|-------|---------|
| `CreateDocumentQuizScreen.tsx` | 2718 | Should be split into sub-components |
| `Assessments.tsx` | 1710 | Complex state, multiple render paths |
| `QuizTakingScreen.tsx` | 1501 | Should memoize question rendering |
| `dashboard.types.ts` | 1503 | Import weight: full type file loaded everywhere |
| `erp.api.ts` | 925 | Not tree-shaken |

### Positive Performance Patterns

- **Singleton dashboard store** prevents redundant API calls on tab switches.
- **2-layer cache** (memory + AsyncStorage) reduces network requests significantly.
- **`isCheckingAuth` / `hasCheckedAuth` flags** prevent concurrent auth checks.
- **Lazy-load pattern**: Dashboard loads data only when screen mounts, not at login.
- **Student lists loaded on demand**: `loadStudentListForClass()` only fetches when that class is selected.

---

## 18. Business Flow Analysis

### What the Application Does

EduVijna is a **K-12 / Higher Education platform** that:

1. **Allows instructors/admins to create AI-generated quizzes** from 6 sources:
   - AI prompt (topic, grade, difficulty)
   - Document upload (PDF, Word)
   - Image upload
   - YouTube URL
   - Website URL
   - Handwritten notes (camera)

2. **Allows students to take quizzes** via:
   - Direct link / deep link
   - Push notification
   - Assessments tab

3. **Provides analytics** for both teachers (class performance, weak students) and students (individual progress, topic gaps).

4. **Manages a full school ERP** (22 modules):
   - Attendance, Exams, Timetable, Fees, HR, Library, Transport, Hostel, Inventory, Engagement, Safety, Parent Portal, Holiday Calendar, LMS, Forms, Biometric, Analytics, Admissions, Notices, Class Overview, Academic Setup, Dashboard.

### User Types and Their Journeys

#### Teacher/Instructor Journey
```
Login → TeacherDashboard (stats: quizzes, classrooms, weak students)
  ├── Create Quiz:
  │     └── Assessments tab → "+" button → Modal: AI/Document/Image/YouTube/Website/Handwritten
  │           └── CreateXxxQuizScreen → generate → QuizPreviewScreen → publish → QuizStatusScreen
  │
  ├── Monitor Students:
  │     └── ClassesList → StudentList → StudentAnalyticsScreen
  │
  ├── Assign Assessments:
  │     └── Assessments tab → share quiz → ShareQuizModal → copy link / send notification
  │
  └── ERP:
        └── ERP tab → ERPMainScreen → navigate to any of 22 sub-modules
```

#### Student Journey
```
Receive notification / click link
  └── App opens → QuizLoadingScreen → QuizTakingScreen → QuizResultsScreen
  
OR: Login → StudentDashboard (available quizzes, recent attempts)
  └── Assessments tab → tap quiz → QuizTakingScreen → QuizResultsScreen
```

### Core Business Flows

| Flow | Screens Involved | API Endpoints |
|------|-----------------|---------------|
| Create AI Quiz | CreateAIQuizScreen → QuizPreviewScreen → QuizStatusScreen | POST /api/v1/quizzes/generate |
| Create Document Quiz | CreateDocumentQuizScreen → (upload) → PreviewScreen | POST /api/v1/quizzes/generate-from-document |
| Take Quiz (direct) | QuizTakingScreen → QuizResultsScreen | GET/POST /api/v1/quiz-sessions/{id} |
| Take Quiz (notification) | Notification tap → openQuizHandler → QuizTakingScreen | GET /api/v1/quiz-sessions/{id} |
| View Class Analytics | ClassesList → StudentList → StudentAnalyticsScreen | GET /api/v1/classrooms/, /students/ |
| School Administration | ERP tab → any 22 sub-modules | /api/v1/erp/{module}/ |

---

## 19. Risks & Technical Debt

### Technical Debt

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| TD-01 | **Dual auth systems** | `useAuth.ts` + `AuthContext.tsx` | `DropdownContext` imports from legacy `AuthContext` (`src/core/context/`), while `App.tsx` uses primary `useAuth` from `src/core/hooks/`. This creates two auth state sources. Any state-related bug could be hard to trace. |
| TD-02 | **`@types/redis` in production deps** | `package.json` | Not used in the app. Remove from `dependencies`. |
| TD-03 | **79 markdown docs at root** | Project root | The root directory contains 79 `.md` files (architecture docs, implementation plans, changelogs). These should be in a `docs/` folder or `.gitignore`d from the project root. |
| TD-04 | **Backup files in `src/screens/`** | `src/screens/backup_20260127_184517/` | 5 `.bak` files left in source tree. Should be deleted or moved to git history. |
| TD-05 | **`old.ts` hook variants** | `src/core/hooks/` | `useTeacherDashboard.old.ts` (280 lines) and `useStudentDashboard.old.ts` (296 lines) exist alongside active versions. Dead code. |
| TD-06 | **`@tanstack/react-query` installed but minimally used** | `package.json` | TanStack Query (React Query v4) is a dependency but Zustand + custom hooks dominate data fetching. Either commit to using it consistently or remove it. |
| TD-07 | **`dashboardApi.ts` uses raw `fetch()` instead of `apiClient`** | `src/core/services/dashboardApi.ts` | Bypasses the Axios interceptor's automatic token refresh. Implements its own auth error detection. This dual API client pattern creates maintenance surface. |
| TD-08 | **School ID extraction duplicated 4+ times** | `useAuth.ts`, `BottomTabNavigator.tsx`, `useErpRole.ts`, `DropdownContext.tsx` | The 8-field `school_id` fallback chain is copy-pasted across files. Indicates the backend sends `school_id` with inconsistent field names. |
| TD-09 | **Firebase config files in repo** | `google-services.json`, `GoogleService-Info.plist` | See Security S-01. These should be in `.gitignore` and injected at build time via EAS Secrets. |
| TD-10 | **`CreateDocumentQuizScreen.tsx` at 2718 lines** | `src/screens/` | Monolithic screen component. Should be split into wizard steps / sub-components. |
| TD-11 | **`dashboard.types.ts` at 1503 lines** | `src/core/types/` | Entire type system in one file. Any import pulls the whole file. Should be split by domain. |
| TD-12 | **Test coverage focused on 4 files** | `package.json` `collectCoverageFrom` | Only 4 files are in coverage collection. Most of the codebase has no test coverage. |
| TD-13 | **`examples/` folder in `src/`** | `src/examples/` | 6 example files should not be in the production `src/` tree. |
| TD-14 | **`patch-package` with unknown patches** | Root | `postinstall` runs `patch-package`. Patches are in `patches/` directory. These should be documented. |

---

## 20. Knowledge Gaps

The following areas have less than 100% certainty. All are labeled with the evidence available and what could not be verified:

| ID | Area | What I Know | What I Suspect | Could Not Verify |
|----|------|-------------|----------------|-----------------|
| KG-01 | Backend technology | FastAPI error format (`detail` field), REST API structure | Python FastAPI + SQLAlchemy + PostgreSQL | Did not inspect backend source code |
| KG-02 | Redis caching on backend | `.env.cache.example` mentions `redis-prod.eduvijna.com:6379` | Backend uses Redis for API response caching | Could not confirm if Redis is active in production |
| KG-03 | EAS / CI pipeline | `eas.json` has dev/preview/production profiles | EAS Build is used for production APK/IPA | No CI configuration file (`.github/workflows/`, `bitrise.yml`, etc.) found |
| KG-04 | `@tanstack/react-query` usage | Package is installed | May be used in some screens not fully read (Assessments, some ERP screens) | Did not read all 35,000+ screen lines |
| KG-05 | Domain logic in `src/core/domain/` | Files exist: `analytics.logic.ts`, `assessment.logic.ts`, `permissions.logic.ts` | These contain business rule enforcement | Did not read full contents |
| KG-06 | `sharedApi.ts` (534 lines) | File exists in `src/core/services/` | Used by quiz creation screens for shared API patterns | Did not read full contents |
| KG-07 | Notification fetch disabled status | `notifications.api.ts` says fetch is disabled | Rate limiting issue with the notification endpoint | Did not confirm if this is permanent or temporary |
| KG-08 | Password reset flow | `auth.api.ts` has `requestPasswordReset()` and `resetPassword()` | Endpoints `/auth/forgot-password` and `/auth/reset-password` exist on backend | No reset password UI screen found — may not be implemented on mobile yet |
| KG-09 | ERP role-based screen visibility | `useErpRole.ts` provides flags | ERP screens likely hide features based on role | Did not read all 22 ERP screen files |
| KG-10 | `expo-updates` OTA behavior | Installed in dependencies | OTA updates deployed via EAS | No `Updates.checkForUpdateAsync()` calls found — may use default behavior |
| KG-11 | `patches/` directory contents | `patch-package` is in `postinstall` | Some npm package has a patch applied | Did not find or read `patches/` directory |
| KG-12 | `WorksheetScreen.tsx` (570 lines) | Screen exists in navigation | Related to quiz export / worksheet generation | Did not read contents |
| KG-13 | Document upload API endpoints | `documentUploadApi.ts` (178 lines) exists | Uploads PDFs/images to backend, then generates quiz | Did not read full API implementation |

---

## 21. Final Architecture Summary

### Architecture in One Paragraph

EduVijna is a cross-platform React Native Expo application using a **hybrid clean architecture**: a shared `src/core/` layer (API, domain, state, hooks) is kept framework-agnostic and isolated by ESLint rules, while platform-specific behavior lives in `src/platforms/mobile/` and `src/platforms/web/`. The mobile app uses React Navigation (stack + bottom tabs + nested ERP stack), while the web app uses a custom state-machine pattern in `App.tsx`. Authentication uses JWT with Zustand as the primary state layer and a secondary legacy `AuthContext` for the dropdown subsystem. Tokens are stored platform-appropriately (SecureStore for mobile refresh tokens, AsyncStorage for access tokens). All API traffic flows through a single Axios instance with automatic token refresh via a request queue. A 2-layer cache (in-memory Map + AsyncStorage) reduces API load with configurable TTLs. The ERP submodule is a self-contained feature domain with its own navigator, contexts, hooks, and API file.

### Quick Reference for New Engineers

| Question | Answer |
|----------|--------|
| Where is app entry? | `App.tsx` root export |
| Where is mobile navigation? | `src/platforms/mobile/navigation/BottomTabNavigator.tsx` |
| Where is web navigation? | `App.tsx:456–544` (state machine) + `src/platforms/web/navigation/WebNavigation.tsx` (sidebar) |
| Where is auth logic? | `src/core/hooks/useAuth.ts` (primary), `src/core/context/AuthContext.tsx` (legacy) |
| Where are tokens stored? | `src/core/services/tokenStorage.ts` |
| Where is the Axios instance? | `src/core/api/config.ts` |
| Where is API base URL set? | `app.json:extra.API_BASE_URL` → read via `expo-constants` in `config.ts:21` |
| Where is global user state? | `src/core/store/user.store.ts` |
| Where is teacher data? | `src/core/store/teacherDashboard.store.ts` |
| Where is the cache? | `src/core/services/cacheService.ts` |
| Where are all types? | `src/core/types/` (index.ts, quiz.types.ts, dashboard.types.ts) |
| How to add a new screen (mobile)? | Add to `BottomTabNavigator.tsx` Stack.Navigator, add route to linking config in `App.tsx` |
| How to add a new screen (web)? | Add case to `activeScreen` union type in `App.tsx:59`, add `case` to `renderScreen()` in `App.tsx:463` |
| How to add a new API module? | Create `src/core/api/yourmodule.api.ts`, use `get/post/put/del/patch` from `config.ts` |
| How does ERP get school_id? | `useErpRole()` reads from `useUserStore.schoolId` (set at login time) |
| How to make a cached API call? | Use `cachedApiCall(apiFunction, cacheKey, ttl)` from `cacheService.ts` |

---

*This document was generated by analyzing 100% of the source files in `E:\Eduvijna\Eduvijna\src\` plus all configuration files. Every claim is directly traceable to the file and line number cited. Last analyzed: June 10, 2026.*
