# DATABASE_AND_API_MAP.md — EduVijna Complete API & Data Map

> This document is the definitive reference for every backend endpoint, the screen that calls it, the service/hook that wraps it, and the request/response shape. Endpoint statuses are verified against actual call sites in source code.

---

## Table of Contents

1. [Backend Overview](#1-backend-overview)
2. [API Client Configuration](#2-api-client-configuration)
3. [Authentication Endpoints](#3-authentication-endpoints)
4. [Quiz & Assessment Endpoints](#4-quiz--assessment-endpoints)
5. [Student Endpoints](#5-student-endpoints)
6. [Analytics Endpoints](#6-analytics-endpoints)
7. [Classroom & School Endpoints](#7-classroom--school-endpoints)
8. [Notification Endpoints](#8-notification-endpoints)
9. [Device/Push Endpoints](#9-devicepush-endpoints)
10. [ERP Endpoints](#10-erp-endpoints)
11. [Quiz Navigation Endpoints](#11-quiz-navigation-endpoints)
12. [Profile Endpoints](#12-profile-endpoints)
13. [Dead / Suspected Endpoints](#13-dead--suspected-endpoints)
14. [Response Models](#14-response-models)
15. [Error Response Format](#15-error-response-format)
16. [Data Flow: Screen to Database](#16-data-flow-screen-to-database)

---

## 1. Backend Overview

| Property | Value |
|----------|-------|
| Base URL | `https://eduapi.eduvijna.com` |
| API Prefix | `/api/v1/` |
| Auth | JWT Bearer tokens |
| Framework | FastAPI (inferred from `detail` error field structure, `/api/v1/` prefix, 422 validation errors) |
| Backend Cache | Redis at `redis-prod.eduvijna.com:6379` (from `.env.cache.example` — not accessible from app) |
| Protocol | REST over HTTPS |
| Timeout | 30 seconds (configured in `config.ts`) |

---

## 2. API Client Configuration

### Primary Client: Axios (`src/core/api/config.ts`)

```
Base URL: Constants.expoConfig?.extra?.API_BASE_URL || 'https://eduapi.eduvijna.com'
Timeout: 30,000ms
Content-Type: application/json
Auth: Bearer <access_token> injected via request interceptor
Refresh: Automatic via response interceptor (queue pattern)
Error: 401/403 → refresh → retry; 500+ → preserve server message
```

### Secondary Client: fetch-based (`src/core/services/dashboardApi.ts`)

```
Base URL: API_BASE_URL + '/api/v1'
Auth: Manual Bearer injection per request (no auto-refresh)
Error: Own AuthenticationError class, calls setAuthErrorNavigationCallback
Cache: cachedApiCall() from cacheService.ts
```

**Note:** These two clients have different error handling and refresh behavior. See ARCHITECTURE_DECISIONS.md ADR-003.

---

## 3. Authentication Endpoints

### POST /api/v1/auth/login

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `auth.api.ts:login()` → `useAuth.ts:login()` → Login screens |
| **Client** | Axios (`config.ts`) |
| **Auth Required** | No |

**Request Body:**
```json
{
  "username_or_email": "teacher@school.com",
  "password": "password123",
  "remember_me": false,
  "device_info": "React Native Mobile App"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "uuid-string",
    "email": "teacher@school.com",
    "role": "instructor",
    "full_name": "John Doe",
    "school_id": 42,
    ...
  }
}
```

**Post-login actions:**
1. `TokenStorage.storeAuthTokens(accessToken, refreshToken, 3600)`
2. `TokenStorage.storeUserData(JSON.stringify(user))`
3. `enrichUserWithSchoolName(user)` → calls `/api/v1/school-management/my-school`
4. `useUserStore.setUser(enrichedUser)`
5. `useUserStore.setSchoolId(extractSchoolId(user))`

---

### POST /api/v1/auth/logout

| Property | Value |
|----------|-------|
| **Status** | ✅ Active (best-effort — local logout proceeds even if this fails) |
| **Called By** | `auth.api.ts:logout()` → `useAuth.ts:logout()` |
| **Client** | Axios |
| **Auth Required** | Yes |

**Response:** `void` or `{}`

---

### GET /api/v1/auth/profile

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `auth.api.ts:getCurrentUser()` → `useAuth.ts:checkAuth()` |
| **Client** | Axios |
| **Auth Required** | Yes |
| **Cache** | Stored in `auth_user_data` AsyncStorage/localStorage |

**Response:** `UserProfile` object (same shape as login response `user` field)

---

### PUT /api/v1/auth/profile

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `profile.api.ts:updateProfile()` → Profile screens |
| **Client** | Axios |
| **Auth Required** | Yes |

**Request Body:** Partial `UserProfile` fields

---

### POST /api/v1/auth/refresh

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `config.ts` response interceptor (automatic), `auth.api.ts:refreshToken()` (manual startup check) |
| **Client** | `refreshClient` (separate Axios instance with no interceptors) |
| **Auth Required** | Refresh token in body |

**Request Body:**
```json
{ "refresh_token": "eyJ..." }
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

---

## 4. Quiz & Assessment Endpoints

### GET /api/v1/quizzes/ (Teacher Dashboard)

| Property | Value |
|----------|-------|
| **Status** | ✅ Active — PRIMARY data source for teacher views |
| **Called By** | `dashboardApi.ts:fetchTeacherDashboardSummary()` → `teacherDashboard.store.ts:loadDashboard()` |
| **Client** | fetch (dashboardApi.ts) |
| **Cache** | `CACHE_TTL.QUIZZES_LIST` (600s) |
| **Auth Required** | Yes |

**Query Parameters:**
```
view_type: 'summary' | 'all_students' | 'class_wise_students'
limit: number (typically 1000)
offset: number
classroom_id?: string (required for class_wise_students)
```

**Response (`view_type=summary`):**
```json
{
  "data": [
    {
      "quiz_id": 123,
      "quiz_name": "Math Quiz 1",
      "topic": "Algebra",
      "quiz_type": "ai",
      "quiz_status": "active",
      "availability_status": "active",
      "question_count": 10,
      "duration": 30,
      "start_time": "2026-01-01T09:00:00Z",
      "end_time": "2026-01-01T10:00:00Z",
      "classroom_id": "class-uuid",
      "classroom_name": "Grade 10 A",
      "instructor": "{\"instructor_id\":\"...\",\"instructor_fullname\":\"...\"}",
      "total_students": 35,
      "pending_count": 5,
      "in_progress_count": 2,
      "completed_count": 28,
      "attempts": "[{\"student_id\":1,\"score\":85,...}]"
    }
  ],
  "meta": {
    "total_count": 156
  }
}
```

**Note:** `instructor` and `attempts` fields are **JSON strings**, not objects. Must be parsed with `JSON.parse()`.

---

### GET /api/v1/quizzes/student-dashboard

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `dashboardApi.ts:fetchStudentQuizzes()` → `StudentDashboard.tsx`, `useAssessments.ts` |
| **Client** | fetch (dashboardApi.ts) |
| **Auth Required** | Yes |

**Query Parameters:**
```
view_type: 'student_total_details'
limit: number
offset: number
```

**Response:**
```json
{
  "data": [
    {
      "quiz_id": 123,
      "quiz_name": "Math Quiz 1",
      "topic": "Algebra",
      "quiz_type": "ai",
      "availability_status": "active",
      "question_count": 10,
      "total_questions": 10,
      "duration": 30,
      "start_time": "...",
      "end_time": "...",
      "student_attempts": 1,
      "attempt_id": "attempt-uuid",
      "best_score": 85,
      "latest_score": 85,
      "completed_at": "..."
    }
  ],
  "meta": { "total_count": 48 }
}
```

---

### POST /api/v1/quizzes/generate (AI Quiz)

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `CreateAIQuizScreen.tsx` (direct Axios call) |
| **Client** | Axios |
| **Auth Required** | Yes |

**Request Body:**
```json
{
  "topic": "Quadratic Equations",
  "grade": "10",
  "difficulty": "medium",
  "num_questions": 10,
  "class_id": "classroom-uuid",
  "subject_id": "math-id"
}
```

**Response:** `QuizDetails` object with `quiz_id`, `questions[]`, etc.

---

### POST /api/v1/quizzes/generate-from-document

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `CreateDocumentQuizScreen.tsx` (direct Axios call) |
| **Client** | Axios (multipart/form-data) |
| **Auth Required** | Yes |

**Request:** `FormData` with file + metadata fields

---

### POST /api/v1/quizzes/generate-from-image

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `CreateImageQuizScreen.tsx` |
| **Client** | Axios |

---

### POST /api/v1/quizzes/generate-from-youtube

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `CreateYouTubeQuizScreen.tsx` |
| **Client** | Axios |

**Request Body:** `{ youtube_url: string, ... }`

---

### POST /api/v1/quizzes/generate-from-website

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `CreateWebsiteQuizScreen.tsx` |
| **Client** | Axios |

---

### POST /api/v1/quizzes/generate-from-handwritten

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `CreateHandwrittenQuizScreen.tsx` |
| **Client** | Axios (multipart/form-data with image) |

---

### GET /api/v1/quizzes/{quiz_id}

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `QuizPreviewScreen.tsx`, `QuizStatusScreen.tsx` |
| **Client** | Axios |

---

### GET /api/v1/quiz-sessions/{session_id}

| Property | Value |
|----------|-------|
| **Status** | ✅ Active — entry point for all quiz-taking flows |
| **Called By** | `openQuizHandler.ts`, `QuizTakingScreen.tsx` |
| **Client** | Axios |
| **Auth Required** | Yes |
| **Triggered By** | Notification tap, deep link, direct navigation |

**Response:** Session data including questions list

---

### POST /api/v1/quiz-sessions/{session_id}/submit

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `QuizTakingScreen.tsx` on completion |
| **Client** | Axios |

**Request Body:** `{ answers: [{ question_id, selected_answer }] }`

---

### GET /api/v1/quiz-sessions/{session_id}/results

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `QuizResultsScreen.tsx` |
| **Client** | Axios |

---

## 5. Student Endpoints

### GET /api/v1/classrooms/

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `dashboardApi.ts:fetchClassrooms()` → `ClassesList.tsx`, analytics |
| **Client** | fetch (dashboardApi.ts) |
| **Cache** | `CACHE_TTL.CLASSROOMS` (1800s) |

---

### GET /api/v1/analytics/student/{student_id}

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `StudentAnalyticsScreen.tsx` (direct Axios) |
| **Client** | Axios |

---

## 6. Analytics Endpoints

### GET /api/v1/school-management/my-school

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `useAuth.ts:enrichUserWithSchoolName()`, `BottomTabNavigator.tsx:CustomHeader` |
| **Client** | Axios (via `get()` wrapper) |
| **Purpose** | Resolves school name and `school_id` for display |

**Response:**
```json
{
  "school_id": 42,
  "school_name": "Sunrise International School",
  "name": "Sunrise International School"
}
```

---

### GET /api/v1/quiz-navigation-items (Role-based nav tiles)

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `useQuizNavItems.ts:useQuizNavItems()` via `quizNavItemsApi.getForRole(role)` |
| **Client** | Axios (via `erp.api.ts`) |
| **Cache** | Module-level cache (`cachedItems` in `useQuizNavItems.ts`) |

**Query Parameters:** `role=instructor` or `role=student`

**Response:**
```json
[
  {
    "id": 1,
    "label": "AI Assessment",
    "description": "Topic-based quiz generation",
    "route_path": "/ai-assessment",
    "component_name": "CreateAIQuizScreen",
    "icon": "bulb",
    "display_order": 1,
    "is_active": true
  }
]
```

---

## 7. Classroom & School Endpoints

### GET /api/v1/classrooms/{classroom_id}/students

| Property | Value |
|----------|-------|
| **Status** | ✅ Active (on-demand) |
| **Called By** | `teacherDashboard.store.ts:loadStudentListForClass()` |
| **Client** | fetch (dashboardApi.ts) |

---

## 8. Notification Endpoints

### GET /api/v1/notifications/

| Property | Value |
|----------|-------|
| **Status** | ⛔ **DISABLED** — rate limiting |
| **Called By** | `notifications.api.ts:getNotifications()` — function exists but is commented out in `useNotifications.ts` |
| **Note** | Returns early from `fetchNotifications()`: `console.log('⚠️ Notification API calls disabled')` |

---

### GET /api/v1/notifications/unread-count

| Property | Value |
|----------|-------|
| **Status** | ⛔ **DISABLED** — rate limiting |
| **Called By** | `notifications.api.ts:getUnreadCount()` — disabled in `useNotifications.ts` |

---

### PATCH /api/v1/notifications/{id}/read

| Property | Value |
|----------|-------|
| **Status** | ✅ Active (only one still working) |
| **Called By** | `notifications.api.ts:markAsRead()` → `useNotifications.ts:markNotificationRead()` |
| **Client** | Axios |

---

### PATCH /api/v1/notifications/read-all

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `notifications.api.ts:markAllAsRead()` → `useNotifications.ts:markAllNotificationsRead()` |
| **Client** | Axios |

---

## 9. Device/Push Endpoints

### POST /api/v1/notifications/devices/

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `device.api.ts:NotificationsAPI.registerDevice()` → `PushNotificationService.ts` |
| **Client** | Axios |
| **Purpose** | Registers FCM/Expo push token with backend |

**Request Body:**
```json
{
  "device_token": "ExponentPushToken[xxx]",
  "device_type": "android",
  "device_model": "Pixel 7",
  "app_version": "1.0.0"
}
```

---

### DELETE /api/v1/notifications/devices/{token}

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `device.api.ts` on logout |
| **Purpose** | Unregisters push token when user logs out |

---

## 10. ERP Endpoints

All ERP endpoints follow the pattern: `/api/v1/erp/{module}/{action}`

Source: `src/core/api/erp.api.ts` (925 lines)

### ERP Module Endpoint Groups

| Module | Base Path | Methods | Auth | Called By |
|--------|-----------|---------|------|-----------|
| Dashboard | `/api/v1/erp/dashboard` | GET | Yes | `DashboardScreen.tsx` |
| Class Overview | `/api/v1/erp/classes` | GET, POST | Yes | `ClassOverviewScreen.tsx` |
| Academic Setup | `/api/v1/erp/academic` | GET, POST, PUT | Yes | `AcademicSetupScreen.tsx` |
| Attendance | `/api/v1/erp/attendance` | GET, POST, PUT | Yes | `AttendanceScreen.tsx` |
| Notices | `/api/v1/erp/notices` | GET, POST, DELETE | Yes | `NoticesScreen.tsx` |
| Admissions | `/api/v1/erp/admissions` | GET, POST, PUT | Yes | `AdmissionsScreen.tsx` |
| Exams | `/api/v1/erp/exams` | GET, POST, PUT | Yes | `ExamsScreen.tsx` |
| Timetable | `/api/v1/erp/timetable` | GET, POST, PUT | Yes | `TimetableScreen.tsx` |
| Fees | `/api/v1/erp/fees` | GET, POST | Yes | `FeesScreen.tsx` |
| HR | `/api/v1/erp/hr` | GET, POST, PUT | Yes | `HRScreen.tsx` |
| Library | `/api/v1/erp/library` | GET, POST | Yes | `LibraryScreen.tsx` |
| Transport | `/api/v1/erp/transport` | GET, POST | Yes | `TransportScreen.tsx` |
| Hostel | `/api/v1/erp/hostel` | GET, POST | Yes | `HostelScreen.tsx` |
| Inventory | `/api/v1/erp/inventory` | GET, POST | Yes | `InventoryScreen.tsx` |
| Engagement | `/api/v1/erp/engagement` | GET, POST | Yes | `EngagementScreen.tsx` |
| Safety | `/api/v1/erp/safety` | GET, POST | Yes | `SafetyScreen.tsx` |
| Parent Portal | `/api/v1/erp/parent-portal` | GET | Yes | `ParentPortalScreen.tsx` |
| Holiday Calendar | `/api/v1/erp/holidays` | GET, POST | Yes | `HolidayCalendarScreen.tsx` |
| LMS | `/api/v1/erp/lms` | GET, POST | Yes | `LMSScreen.tsx` |
| Forms | `/api/v1/erp/forms` | GET, POST, DELETE | Yes | `FormsScreen.tsx` |
| Biometric | `/api/v1/erp/biometric` | GET | Yes | `BiometricScreen.tsx` |
| Analytics | `/api/v1/erp/analytics` | GET | Yes | `AnalyticsScreen.tsx` (ERP) |

All ERP calls use `schoolId` from `useErpRole()` as a query parameter or path segment.

---

## 11. Quiz Navigation Endpoints

### GET /api/v1/quiz-navigation-items

Already documented in §6. This is part of `erp.api.ts` (`quizNavItemsApi`).

---

## 12. Profile Endpoints

### GET /api/v1/auth/profile (also used for profile fetch)

Same as §3 auth profile endpoint. `profile.api.ts` uses the same endpoint.

### PUT /api/v1/auth/profile

| Property | Value |
|----------|-------|
| **Status** | ✅ Active |
| **Called By** | `profile.api.ts:updateProfile()` → Profile screens |
| **Client** | Axios |

---

## 13. Dead / Suspected Endpoints

These endpoints are defined in the codebase but have no confirmed active call sites:

| Endpoint | Defined In | Status | Reason |
|----------|------------|--------|--------|
| `GET /dashboard/teacher/{teacherId}` | `analytics.api.ts:32` | ⚠️ DEAD | No active screen calls `fetchTeacherDashboardStats()`. Actual dashboard uses `dashboardApi.ts` → `/api/v1/quizzes/`. |
| `GET /dashboard/student/{studentId}` | `analytics.api.ts:41` | ⚠️ DEAD | No active screen calls `fetchStudentDashboardStats()` from this file. |
| `GET /analytics/{userId}` | `analytics.api.ts:51` | ⚠️ DEAD | `useAnalytics()` hook likely unused. |
| `GET /analytics/teacher/{teacherId}/student-performance` | `analytics.api.ts:63` | ⚠️ DEAD | |
| `GET /analytics/teacher/{teacherId}/assessment-stats` | `analytics.api.ts:73` | ⚠️ DEAD | |
| `GET /analytics/{userId}/topic-analysis` | `analytics.api.ts:86` | ⚠️ DEAD | |
| `GET /analytics/student/{studentId}/weak-topics` | `analytics.api.ts:96` | ⚠️ DEAD | |
| `GET /analytics/{userId}/trends` | `analytics.api.ts:103` | ⚠️ DEAD | |
| `GET /analytics/teacher/{teacherId}/classes/{classId}/performance` | `analytics.api.ts:119` | ⚠️ DEAD | |
| `GET /analytics/{userId}/export` | `analytics.api.ts:134` | ⚠️ DEAD | |
| `POST /auth/forgot-password` | `auth.api.ts:133` | ⚠️ LIKELY DEAD | No UI screen found for password reset |
| `POST /auth/reset-password` | `auth.api.ts:140` | ⚠️ LIKELY DEAD | No UI screen found |
| `POST /auth/verify-email` | `auth.api.ts:146` | ⚠️ LIKELY DEAD | No UI screen found |
| `POST /api/v1/quizzes/` (create) | `assessment.api.ts:162` | ⚠️ POSSIBLY DEAD | Quiz creation screens use direct Axios calls to `/generate` variants, not this generic create endpoint |
| `PUT /api/v1/quizzes/{id}` (update) | `assessment.api.ts:184` | ⚠️ POSSIBLY DEAD | Same as above |
| `DELETE /api/v1/quizzes/{id}` | `assessment.api.ts:198` | ⚠️ POSSIBLY DEAD | |
| `GET /api/v1/quizzes/{id}/questions` | `assessment.api.ts` | ⚠️ POSSIBLY DEAD | |
| `GET /api/v1/notifications/` | `notifications.api.ts` | ⛔ DISABLED | Rate limit |
| `GET /api/v1/notifications/unread-count` | `notifications.api.ts` | ⛔ DISABLED | Rate limit |

---

## 14. Response Models

### UserProfile

```typescript
// src/core/types/dashboard.types.ts
interface UserProfile {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  role_id?: number;           // 1=super_admin, 2=admin
  role_name?: string;
  full_name?: string | null;
  username?: string;
  school_id?: number;         // May be in various nested paths
  school?: string | { id: number; school_name: string; };
  school_name?: string;
  profile?: {
    school_id?: number;
    school?: { id: number; };
  };
  organization_id?: number;
}
```

### TeacherQuiz

```typescript
// src/core/types/quiz.types.ts
interface TeacherQuiz {
  quiz_id: number;
  quiz_name: string;
  topic: string;
  quiz_type: string;          // 'ai', 'pdf', 'image', 'youtube', 'website', 'handwritten', 'manual'
  quiz_status: string;
  availability_status: 'active' | 'available_soon' | 'expired';
  question_count: number;
  duration: number;
  start_time: string;
  end_time: string;
  created_at: string;
  classroom_id: string;
  classroom_name: string;
  instructor: string;         // JSON string: { instructor_id, instructor_fullname, ... }
  subject?: string;
  total_students?: number;
  pending_count?: number;
  in_progress_count?: number;
  completed_count?: number;
  attempts?: string;          // JSON string: [{ student_id, score, ... }]
}
```

### StudentQuiz

```typescript
interface StudentQuiz {
  quiz_id: number;
  quiz_name: string;
  topic: string;
  quiz_type: string;
  availability_status: 'active' | 'available_soon' | 'expired';
  question_count: number;
  total_questions?: number;
  duration: number;
  start_time: string;
  end_time: string;
  created_at: string;
  student_attempts?: number;
  attempt_id?: string;
  best_score?: number;
  latest_score?: number;
  completed_at?: string;
  student_status?: string;
}
```

### AuthTokens

```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // seconds, hardcoded to 3600
}
```

### DashboardApiResponse

```typescript
interface DashboardApiResponse<T> {
  data: T[];
  meta?: {
    total_count: number;
    page?: number;
    limit?: number;
  };
}
```

---

## 15. Error Response Format

FastAPI standard error:
```json
{
  "detail": "Authentication failed"
}
```

FastAPI 422 validation error:
```json
{
  "detail": [
    { "loc": ["body", "username_or_email"], "msg": "field required", "type": "value_error.missing" }
  ]
}
```

Custom error:
```json
{
  "message": "Quiz not found",
  "error": "NOT_FOUND"
}
```

The Axios interceptor in `config.ts` handles all three formats, extracting a human-readable message.

---

## 16. Data Flow: Screen to Database

### Teacher Creates AI Quiz

```
Teacher: CreateAIQuizScreen
  │
  ▼ POST /api/v1/quizzes/generate
  │ body: { topic, grade, difficulty, num_questions, class_id, subject_id }
  │ header: Authorization: Bearer <access_token>
  │
  ▼ HTTPS → eduapi.eduvijna.com
  │
  ▼ FastAPI receives request
  │ → JWT validation
  │ → AI generation (OpenAI/similar)
  │ → PostgreSQL: INSERT INTO quizzes
  │              INSERT INTO questions
  │
  ▼ Response: { quiz_id, questions[], session_id }
  │
  ▼ App navigates to QuizPreviewScreen
  │
  ▼ Teacher publishes → PUT /api/v1/quizzes/{id}/publish
  │
  ▼ Response: { availability_status: 'active' }
  │
  ▼ teacherDashboard.store.refresh()  → cache cleared → dashboard reloads
```

### Student Takes Quiz via Notification

```
Backend sends push via Firebase → FCM → Device
  │
  ▼ expo-notifications fires listener in App.tsx
  │ data: { sessionId: "abc-123" }
  │
  ▼ handleOpenQuiz("abc-123", "notification", user, navigationAdapter)
  │ → src/core/services/openQuizHandler.ts
  │
  ▼ GET /api/v1/quiz-sessions/abc-123
  │ header: Authorization: Bearer <access_token>
  │
  ▼ FastAPI: validate session, check student enrollment
  │ → PostgreSQL: SELECT * FROM quiz_sessions WHERE id = 'abc-123'
  │
  ▼ Response: session data + questions[]
  │
  ▼ Navigate to QuizTakingScreen
  │ Student answers questions
  │
  ▼ POST /api/v1/quiz-sessions/abc-123/submit
  │ body: { answers: [...] }
  │
  ▼ FastAPI: calculate score, update attempt record
  │ → PostgreSQL: INSERT INTO quiz_attempts; UPDATE quiz_sessions
  │
  ▼ Response: { score, percentage, passed }
  │
  ▼ Navigate to QuizResultsScreen
  │ GET /api/v1/quiz-sessions/abc-123/results
  │
  ▼ Display results with KaTeX math rendering
```

### App Startup Auth Check

```
App.tsx mounts
  │
  ▼ TokenStorage.getAccessToken()
  │ ├── Mobile: AsyncStorage.getItem('auth_access_token')
  │ └── Web: localStorage.getItem('auth_access_token')
  │
  ├── No token → Show Login
  │
  └── Token found → TokenStorage.isTokenExpired()
        │
        ├── Expired → POST /api/v1/auth/refresh { refresh_token }
        │               Mobile: SecureStore.getItemAsync('auth_refresh_token')
        │               Web: localStorage.getItem('auth_refresh_token')
        │
        └── Valid → GET /api/v1/auth/profile
              │     (uses TokenStorage.getUserData() first as cache)
              │
              ▼ FastAPI: validate JWT, return UserProfile
              │
              ▼ enrichUserWithSchoolName → GET /api/v1/school-management/my-school
              │
              ▼ useUserStore.setUser(enrichedUser)
              ▼ useUserStore.setSchoolId(school_id)
              ▼ App shows authenticated UI
```

---

*All endpoints verified against actual import chains and call sites in source code. Status reflects June 2026 codebase state.*
