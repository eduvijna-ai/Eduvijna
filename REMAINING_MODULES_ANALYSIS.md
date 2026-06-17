# REMAINING_MODULES_ANALYSIS.md

> **Purpose:** Deep analysis of the Analytics, Assessments, and Home Dashboard modules — the remaining non-ERP-Schools areas of the EduVijna app.
> **Source of truth:** Direct code tracing from `src/` — no guesses.
> **Last updated:** June 17, 2026

---

## Table of Contents

1. [Analytics Module Analysis](#1-analytics-module-analysis)
2. [Assessments Module Analysis](#2-assessments-module-analysis)
3. [Home Dashboard Analysis](#3-home-dashboard-analysis)
4. [Navigation Mapping](#4-navigation-mapping)
5. [Screen Mapping](#5-screen-mapping)
6. [API Mapping](#6-api-mapping)
7. [Component Mapping](#7-component-mapping)
8. [State Flow Analysis](#8-state-flow-analysis)
9. [Business Flow Analysis](#9-business-flow-analysis)
10. [Final Counts & Scores](#10-final-counts--scores)

---

## 1. Analytics Module Analysis

### Overview

The Analytics module has TWO distinct implementations that serve different audiences:

| Implementation | Path | Audience | Data Source | Chart Library |
|---|---|---|---|---|
| Mobile/Web Analytics (simple) | `src/platforms/mobile/screens/Analytics.tsx` | Teacher + Student (core app) | `useAnalytics` hook → `analytics.api.ts` | None — custom bar charts with `View` + `StyleSheet` |
| Student Analytics Screen (detailed) | `src/screens/StudentAnalyticsScreen.tsx` | Teacher viewing a student | `fetchTeacherDashboardSummary` / `fetchTeacherQuizzes` | None — custom progress bars |
| Web Analytics Screen | `src/platforms/web/screens/Analytics.tsx` | Teacher + Student (web) | `useAnalytics` hook | None |

> **Critical finding:** `react-native-chart-kit` is installed as a dependency but is NOT currently used in any live analytics screen. All charts are rendered with raw `View` + `StyleSheet` width calculations.

---

### 1.1 Screen: Mobile Analytics Screen

**Screen Name:** AnalyticsScreen  
**Location:** `src/platforms/mobile/screens/Analytics.tsx`  
**Purpose:** Role-aware analytics overview. Shows teacher-view or student-view based on `user.role`.  
**Entry Point:** Bottom tab `Analytics` → maps to `ClassesList` (⚠️ mismatch — see note below)  
**Navigation Route:** Tab `Analytics` (BottomTabNavigator)  
**Parent Screen:** `BottomTabNavigator`  
**Child Screens:** None — standalone scrollable screen

> ⚠️ **IMPORTANT MISMATCH:** The tab named `Analytics` actually mounts `ClassesList` component, NOT `Analytics.tsx`. The `Analytics.tsx` screen is only reachable as a stack screen called `StudentAnalytics`.

**Services Used:** `useAnalytics`, `useWeakTopics`, `useStudentPerformance`, `useAssessmentStatistics`, `usePercentageColor`, `useCurrentUser`  
**Hooks Used:** All from `@core/hooks/useAnalytics`  
**State Used:** Local `dateRange: 'week' | 'month' | 'year'`  
**APIs Called:** (via hooks) → `analytics.api.ts`:
- `GET /analytics/{userId}?dateFrom=&dateTo=` — teacher & student
- `GET /analytics/student/{studentId}/weak-topics` — student only
- `GET /analytics/teacher/{teacherId}/student-performance` — teacher only
- `GET /analytics/teacher/{teacherId}/assessment-stats` — teacher only

**Components Used:**
- `TeacherAnalytics` (internal function component)
- `StudentAnalytics` (internal function component)
- `SummaryCard` (internal function component)
- Date range filter buttons (Week / Month / Year — inline JSX)

**Role Access:** `instructor` → `TeacherAnalytics`; `student` → `StudentAnalytics`  
**Permission Gate:** `canViewAnalytics(user)` from `permissions.logic.ts`

#### Teacher Analytics View (within Mobile Analytics):

| Section | Data Source | Notes |
|---|---|---|
| Summary Cards (4-up grid) | `useAssessmentStatistics` → `getAnalyticsSummary()` | Total Assessments, Total Attempts, Avg Score%, Pass Rate% |
| Top Performers list | `useStudentPerformance` → `getTopPerformers()` | Top 10% or minimum 3 students |
| Needs Attention list | `useStudentPerformance` → `getStudentsNeedingAttention()` | Score < 50% threshold |
| Assessment Statistics (5 items) | `useAssessmentStatistics` | Per-assessment: attempts, avg score, pass rate |

#### Student Analytics View (within Mobile Analytics):

| Section | Data Source | Notes |
|---|---|---|
| Performance Summary (bar chart) | `useAnalytics` → `data.topicAnalysis` | Top 5 topics, custom bar using View width % |
| Weak Topics list | `useWeakTopics` | Score < 60% threshold, improvement percentage |
| Recent Performance | `useAnalytics` → `data.studentPerformance` | 5 items: total assessments, avg, highest, trend |

---

### 1.2 Screen: StudentAnalyticsScreen (Teacher-initiated deep dive)

**Screen Name:** StudentAnalyticsScreen  
**Location:** `src/screens/StudentAnalyticsScreen.tsx` (44,241 bytes — large screen)  
**Purpose:** Teacher viewing a specific student's quiz history, topic performance, and analytics.  
**Entry Point:**
- `TeacherDashboard.tsx` → `navigation.navigate('StudentAnalytics', { studentId, studentName })`
- `StudentList.tsx` → tap on a student row

**Navigation Route:** Stack screen `StudentAnalytics` (registered in `BottomTabNavigator.tsx` line ~434)  
**Parent Screen:** `TeacherDashboard` or `StudentList`  
**Child Screens:** None  

**Services Used:** `fetchTeacherDashboardSummary`, `fetchTeacherQuizzes` (from `dashboardApi.ts`)  
**Hooks Used:** `useTheme`  
**State Used:**
```typescript
summary: StudentSummary         // totalQuizzes, attemptedCount, completedCount, missedCount, averageScore, highestScore, lowestScore
quizAttempts: QuizAttempt[]     // Full list
filteredAttempts: QuizAttempt[] // After filter
strongTopics: TopicPerformance[]
weakTopics: TopicPerformance[]
statusFilter: 'All' | 'Completed' | 'Absent' | 'In Progress'
sortBy: 'score' | 'date'
dateFilter: DateFilterType      // from dateFilters.ts utility
selectedQuiz: number | null
availableQuizzes: QuizOption[]
dateRangeStart: Date
dateRangeEnd: Date
```

**APIs Called:**
- `GET /api/v1/dashboard/quizzes?view_type=summary` (via `fetchTeacherDashboardSummary`) — loads all teacher quizzes to find ones assigned to this student
- `GET /api/v1/dashboard/quizzes?view_type=summary&classroom_id={classroomId}` — filtered by classroom (via `fetchTeacherQuizzes`)

**Components Used:**
- `LoadingSpinner` from `@components/`
- `DateRangeFilter`, `FilterSection`, `ClassroomFilter` from `@components/FilterComponents`

**Role Access:** Teacher only (navigated from teacher-only screens)  

**Data Flow:**
```
fetchTeacherDashboardSummary()
  → returns all quizzes for teacher
  → filters by studentId in attempts data
  → calculates per-student summary
  → groups by topic → strongTopics / weakTopics
  → renders filtered, sorted list
```

---

### 1.3 useAnalytics Hook

**Location:** `src/core/hooks/useAnalytics.ts`

**Exported Hooks:**

| Hook | Purpose | Role Gated |
|---|---|---|
| `useCurrentUser()` | Returns `User \| null` from Zustand store | No |
| `usePercentageColor()` | Returns `getPercentageColor` function | No |
| `useAnalytics(filters?)` | Main analytics data fetch | `canViewAnalytics(user)` |
| `useWeakTopics()` | Student weak topics | `user.role === 'student'` |
| `useStudentPerformance(filters?)` | Teacher student performance | `canViewAllStudentsAnalytics(user)` |
| `useAssessmentStatistics(filters?)` | Teacher assessment stats | `canViewAllStudentsAnalytics(user)` |
| `useTopicAnalysis(filters?)` | Topic-wise analysis | All authenticated |

**Default Date Filter:** Last 30 days from current date  
**State Pattern:** Local `useState` — NOT Zustand store (unlike assessments which uses global store)

---

### 1.4 Analytics API (`src/core/api/analytics.api.ts`)

All functions use the `get()` helper from `config.ts` (Axios-based).

| Function | Endpoint | Purpose |
|---|---|---|
| `fetchDashboardStats(userId, role)` | `GET /dashboard/{role}/{userId}` | Role-agnostic dashboard stats |
| `fetchTeacherDashboardStats(teacherId)` | `GET /dashboard/teacher/{teacherId}` | Teacher stats |
| `fetchStudentDashboardStats(studentId)` | `GET /dashboard/student/{studentId}` | Student stats |
| `fetchAnalytics(userId, filters)` | `GET /analytics/{userId}?dateFrom=&dateTo=` | Comprehensive analytics data |
| `fetchStudentPerformance(teacherId, filters?)` | `GET /analytics/teacher/{teacherId}/student-performance` | All students for a teacher |
| `fetchAssessmentStatistics(teacherId, filters?)` | `GET /analytics/teacher/{teacherId}/assessment-stats` | Per-assessment stats for teacher |
| `fetchTopicAnalysis(userId, filters?)` | `GET /analytics/{userId}/topic-analysis` | Topic-wise scores |
| `fetchWeakTopics(studentId)` | `GET /analytics/student/{studentId}/weak-topics` | Student weak topics |
| `fetchPerformanceTrends(userId, filters)` | `GET /analytics/{userId}/trends` | `{dates: string[], scores: number[]}` |
| `fetchClassPerformance(teacherId, classId)` | `GET /analytics/teacher/{teacherId}/classes/{classId}/performance` | Class-level performance |
| `exportAnalytics(userId, filters, format)` | `GET /analytics/{userId}/export?format=csv\|xlsx\|pdf` | Export analytics as file |

**Filters Interface (`AnalyticsFilters`):**
```typescript
{
  dateFrom?: string;    // ISO date string
  dateTo?: string;      // ISO date string
  classId?: string;
  subjectId?: string;
  topicId?: string;
}
```

---

### 1.5 Analytics Domain Logic (`src/core/domain/analytics.logic.ts`)

Pure functions with NO API calls:

| Function | Purpose |
|---|---|
| `calculateAverage(scores[])` | Mean calculation |
| `findHighestScore(scores[])` | Max |
| `findLowestScore(scores[])` | Min |
| `calculateMedian(scores[])` | Median |
| `calculateStandardDeviation(scores[])` | Std dev |
| `identifyWeakTopics(topics[], threshold=60)` | Filter < threshold, map to WeakTopic[] |
| `calculateImprovement(prev, curr)` | % improvement |
| `getPerformanceCategory(avg)` | `excellent/good/average/needs-improvement` |
| `sortStudentsByPerformance(students[])` | Sort desc by averageScore |
| `getTopPerformers(students[])` | Top 10% or min 3 |
| `getStudentsNeedingAttention(students[], threshold=50)` | Score < threshold |
| `calculatePassRate(total, passed)` | Pass % |
| `groupByDateRange(data[], range)` | Daily/weekly/monthly grouping |
| `calculateTopicMastery(avg, successRate)` | `mastered/proficient/developing/needs-practice` |
| `getAnalyticsSummary(stats[])` | Summary totals |
| `getPercentageColor(pct)` | `≥80 green, ≥60 yellow, ≥40 orange, else red` |
| `generateDateRangeLabels(start, end, interval)` | Date label array |
| `calculatePercentileRank(score, allScores[])` | Percentile % |

---

## 2. Assessments Module Analysis

### Overview

The Assessments module is the **most complex module** in the app. It serves both teachers and students through a single `Assessments.tsx` screen and a full quiz-taking flow of 7 screens.

| Screen | File | Audience | Entry |
|---|---|---|---|
| Assessments List | `src/screens/Assessments.tsx` | Teacher + Student | Bottom tab `Assessments` |
| Quiz Taking | `src/screens/QuizTakingScreen.tsx` | Student + Teacher preview | From list / deep link |
| Quiz Results | `src/screens/QuizResultsScreen.tsx` | Student + Teacher | After submission |
| Quiz Preview | `src/screens/QuizPreviewScreen.tsx` | Teacher | From list "preview" action |
| Quiz Status | `src/screens/QuizStatusScreen.tsx` | Student | After quiz open checks |
| Quiz Loading | `src/screens/QuizLoadingScreen.tsx` | Student | Transition screen |
| Recent Assessments | `src/screens/RecentAssessmentsScreen.tsx` | Teacher | Header button in CreateAIQuizScreen |
| Assessment Workspace | `src/screens/AssessmentWorkspaceScreen.tsx` | Teacher | CreateAssessmentModal |

---

### 2.1 Screen: Assessments.tsx (Main Listing)

**Screen Name:** Assessments  
**Location:** `src/screens/Assessments.tsx` (60,261 bytes — very large)  
**Purpose:** Unified assessment list for both teachers and students. Handles filtering, search, pagination, classroom filter, date filter.

**Entry Points:**
- Mobile: Bottom tab `Assessments` (role-routed via `RoleAssessments`)
- Mobile: `ClassesList` → tap classroom card → `navigation.navigate('Assessments', { filterStatus, classroomId, classroomName })`
- Mobile: `TeacherDashboard` → tap a stat card → `navigation.navigate('Assessments', { filter: 'active' })`
- Web: Sidebar `Assessments` nav item

**Navigation Route:** `Assessments` (registered in stack in `BottomTabNavigator.tsx`)  
**Parent Screen:** `BottomTabNavigator` (tab) or `ClassesList` (stack push)  
**Child Screens:**
- → `QuizTakingScreen` (student taps an active quiz)
- → `QuizPreviewScreen` (teacher previews a quiz)
- → `QuizStatusScreen` (student, quiz with prior attempt)

**Props:**
```typescript
interface Props {
  navigation?: any;
  onNavigate?: (screen: string, params?: any) => void;   // Web usage
  userRole: 'instructor' | 'student';
  route?: {
    params?: {
      filter?: FilterTab;
      filterStatus?: string;
      classroomId?: string;
      classroomName?: string;
    };
  };
}
```

**Services Used:**
- `useTeacherDashboard` (hook) → `teacherDashboard.store` → `dashboardApi.ts`
- `useDashboardStore()` (Zustand) — student quiz data pre-loaded by `StudentDashboard`
- `checkQuizAttempt()` from `sharedApi.ts` — verify attempt before entering quiz
- `getQuizBySessionId()` from `sharedApi.ts` — fetch quiz data for taking

**State Used:**
```typescript
selectedTab: FilterTab          // 'all' | 'active' | 'available_soon' | 'expired' | 'ongoing' | 'completed' | 'missed'
searchQuery: string
displayCount: number            // pagination (10 per load)
selectedClassroom: string       // classroom filter
selectedDateFilter: DateFilterType
dateRangeStart: Date
dateRangeEnd: Date
loadingQuizId: number | null    // tracks which quiz button is loading
completedAttemptModal: {...} | null  // modal for re-taking completed quiz
```

**Filter Tabs by Role:**
- Teacher: `all | active | available_soon | expired`
- Student: `all | ongoing | completed | missed`

**APIs Called (indirectly):**

| Via | Endpoint | When |
|---|---|---|
| `useTeacherDashboard` | `GET /api/v1/dashboard/quizzes?view_type=summary` | Teacher, on mount |
| `useDashboardStore` | Pre-loaded by StudentDashboard | Student, no new API call |
| `checkQuizAttempt(quizId, sessionId, userId)` | `GET /api/v1/dashboard/quiz-attempts?quiz_id=&class_id=&student_id=` | Student, on quiz tap |
| `getQuizBySessionId(sessionId)` | `GET /api/v1/quizzes/by-session/{sessionId}` | Student, after attempt check |

**Filtering Logic (client-side):**
```
All quizzes from store
  → filter by selectedTab (availability_status / student_status)
  → filter by selectedClassroom (classroom_id match)
  → filter by searchQuery (quiz_name, topic, subject, classroom_name)
  → filter by selectedDateFilter (date-fns comparison using dateFilters.ts)
  → slice(0, displayCount) for pagination
```

---

### 2.2 Screen: QuizTakingScreen.tsx

**Screen Name:** QuizTakingScreen  
**Location:** `src/screens/QuizTakingScreen.tsx` (62,511 bytes — largest screen)  
**Purpose:** Core quiz-taking experience. Handles question navigation, timer, answer selection, submission, and results rendering.  
**Entry Point:**
- Student taps active quiz in `Assessments.tsx` → passes `{ quiz, quizId, sessionId, classroomId }`
- Deep link: `eduvijna://quiz/{quizId}` → opens via `openQuizHandler.ts`
- `CreateAIQuizScreen` → teacher previewing a generated quiz

**Navigation Route:** `QuizTakingScreen` (stack)  
**Parent Screen:** `Assessments` or deep link  
**Child Screens:**
- → `QuizResultsScreen` (after submission)
- → `Main/Dashboard` (cancel/close)

**Route Params:**
```typescript
{
  quiz: NormalizedQuiz,           // Primary path
  quizData: any,                  // Legacy path
  quizId: string,
  sessionId: string,
  classroomId: string,
  showShareButton: boolean,
  showActionButtons: boolean,
  source: 'image' | 'youtube' | 'document' | 'handwritten' | undefined
}
```

**Services Used:**
- `findOrCreateAttempt()` from `sharedApi.ts` — creates or finds attempt record
- `updateQuizAttempt()` from `sharedApi.ts` — saves progress and final submission
- `generateAIQuiz()` from `sharedApi.ts` — used for regenerating quizzes (teacher flow)
- `clearCacheEntry()` from `cacheService.ts` — invalidates quiz cache after submission

**State Used:**
```typescript
questions: QuizQuestion[]
currentQuestionIndex: number
selectedAnswers: Record<string, string>
isSubmitted: boolean
isSubmitting: boolean
quizStarted: boolean
timeRemaining: number | null
timerActive: boolean
attemptId: number | undefined
showShareModal: boolean
showShareOptionsModal: boolean
quizAvailability: QuizAvailability
```

**APIs Called:**

| Function | Endpoint | Purpose |
|---|---|---|
| `findOrCreateAttempt()` | `GET /api/v1/dashboard/quiz-attempts?...` then `POST /api/v1/dashboard/quiz-attempts` | Start attempt |
| `updateQuizAttempt(attemptId, {...})` | `PUT /api/v1/dashboard/quiz-attempts/{attemptId}` | Save/submit |

**Quiz Flow:**
```
Mount → verify quiz availability (start_time/end_time)
     → findOrCreateAttempt() → get attemptId
     → render questions one-by-one
     → student selects answers → stored in selectedAnswers{}
     → timer (if has_time_limit) counts down
     → Submit → updateQuizAttempt(score, status='completed', completed_at, time_spent_seconds)
     → clearCacheEntry(quiz cache key)
     → navigate to QuizResultsScreen (or show inline results)
```

**Components Used:**
- `QuizExplanationAccordion` — shows explanation per question after submit
- `ShareQuizModal` — share quiz link
- `ShareOptionsModal` — multiple share options
- `LoadingSpinner`
- `MathRenderer` — renders LaTeX math in questions (via `react-native-webview` + `katex`)

**Timer Logic:** If `quiz.has_time_limit && quiz.duration > 0`, a `setInterval` countdown runs in seconds. Auto-submits when `timeRemaining === 0`.

---

### 2.3 Screen: QuizResultsScreen.tsx

**Screen Name:** QuizResultsScreen  
**Location:** `src/screens/QuizResultsScreen.tsx` (20,922 bytes)  
**Purpose:** Show score, grade, correct answers, and option to retake or share.

**Entry Point:** `QuizTakingScreen` after submission  
**Navigation Route:** `QuizResultsScreen` (stack)  
**Route Params:**
```typescript
{
  quizId: number,
  sessionId: string,
  score: number,
  totalQuestions: number,
  timeTaken: number,
  selectedAnswers: Record<string, string>,
  quiz: QuizData
}
```

**Services Used:** None (all data passed via route params)  
**APIs Called:** None  

**Business Logic (local):**
- `calculatePercentage(score, totalQuestions)` → grade letter (A+/A/B+/B/C/D/F)
- Display correct/incorrect per question with explanation

---

### 2.4 Screen: QuizPreviewScreen.tsx

**Screen Name:** QuizPreviewScreen  
**Location:** `src/screens/QuizPreviewScreen.tsx` (14,780 bytes)  
**Purpose:** Teacher preview of a generated quiz before assigning/sharing.

**Entry Point:**
- `CreateAIQuizScreen` → after AI generation
- `Assessments.tsx` → teacher taps preview on a quiz
- Notification deep link for `quiz_assigned` type

**Navigation Route:** `QuizPreviewScreen` (stack, modal presentation)  
**Parent Screen:** Various  
**Route Params:** `{ quiz: QuizData, quizId?, sessionId? }`

**Services Used:** `sharedApi.ts` — `checkQuizAttempt()`  
**APIs Called:** `GET /api/v1/dashboard/quiz-attempts?quiz_id=&class_id=&student_id=` — check if already attempted

---

### 2.5 Screen: QuizStatusScreen.tsx

**Screen Name:** QuizStatusScreen  
**Location:** `src/screens/QuizStatusScreen.tsx` (10,194 bytes)  
**Purpose:** Intermediate screen showing quiz availability status (not started, active window, expired).

**Entry Point:** `Assessments.tsx` when `checkQuizAttempt()` returns a prior attempt  
**Navigation Route:** `QuizStatusScreen` (stack)  

---

### 2.6 Screen: QuizLoadingScreen.tsx

**Screen Name:** QuizLoadingScreen  
**Location:** `src/screens/QuizLoadingScreen.tsx` (1,395 bytes — tiny)  
**Purpose:** Animated loading screen while quiz data is being fetched.

**Navigation Route:** `QuizLoadingScreen` (stack, `headerShown: false`)  

---

### 2.7 Screen: RecentAssessmentsScreen.tsx

**Screen Name:** RecentAssessmentsScreen  
**Location:** `src/screens/RecentAssessmentsScreen.tsx` (13,193 bytes)  
**Purpose:** Shows teacher their 10 most recently created assessments. Accessible from the `CreateAIQuizScreen` header "Recent" button.

**Entry Point:** `CreateAIQuizScreen` header right button  
**Navigation Route:** `RecentAssessmentsScreen` (stack)  

**Services Used:** `useTeacherDashboard` hook → data from `teacherDashboard.store`  
**APIs Called:** None (uses already-loaded store data)

---

### 2.8 Screen: AssessmentWorkspaceScreen.tsx

**Screen Name:** AssessmentWorkspaceScreen  
**Location:** `src/screens/AssessmentWorkspaceScreen.tsx` (41,556 bytes)  
**Purpose:** Combined workspace for creating quizzes from Documents OR Handwritten content. Two modes: `document` | `handwritten`.

**Entry Point:** `CreateAssessmentModal` → taps "Document" or "Handwritten"  
**Navigation Route:** `AssessmentWorkspaceScreen` (stack, modal, `mode` param)  

**Services Used:** `documentUploadApi.ts`, `expo-document-picker`, `expo-image-picker`  

---

### 2.9 useAssessments Hook

**Location:** `src/core/hooks/useAssessments.ts`  
**Key Design:** Uses **global dashboard store** (`useDashboardStore`) — data loaded once by dashboard, shared here.

**Exported:**

| Export | Purpose |
|---|---|
| `useCurrentUser()` | User from store |
| `useAssessmentHelpers()` | `{getAssessmentStatusColor, getDifficultyColor, formatDuration}` |
| `useAssessments(filters?)` | Main hook — loads from `useDashboardStore`, applies client-side filters |
| `useFilteredAssessments(statuses[])` | Filtered subset by status |
| `useCanStartAssessment(assessment)` | Boolean check |

**Store Dependency:** `useDashboardStore().quizzes` — shared with `StudentDashboard`

---

### 2.10 Assessment API (`src/core/api/assessment.api.ts`)

| Function | Endpoint | Used By |
|---|---|---|
| `fetchAssessments(params)` | Via `fetchTeacherQuizzes` | Teacher listing |
| `fetchStudentAssessments(studentId, params)` | Via `fetchStudentQuizzes` | Student listing |
| `fetchAssessmentById(id)` | `GET /assessments/{id}` | Detail view |
| `createAssessment(data)` | `POST /assessments` | Teacher create |
| `updateAssessment(id, data)` | `PUT /assessments/{id}` | Teacher edit |
| `deleteAssessment(id)` | `DELETE /assessments/{id}` | Teacher delete |
| `fetchAssessmentQuestions(id)` | `GET /assessments/{id}/questions` | Quiz taking |
| `startAssessment(id)` | `POST /assessments/{id}/start` | Begin attempt |
| `submitAssessment(id, attemptId, answers)` | `POST /assessments/{id}/submit` | Submit |
| `fetchAssessmentResult(id, attemptId)` | `GET /assessments/{id}/results/{attemptId}` | View result |
| `fetchStudentResults(studentId, params?)` | `GET /students/{studentId}/results` | All results |
| `fetchUpcomingAssessments(studentId)` | `GET /students/{studentId}/assessments/upcoming` | Upcoming |
| `fetchScheduledAssessments(studentId)` | `GET /students/{studentId}/assessments/scheduled` | Scheduled |

> **Note:** The `submit`, `start`, `fetchAssessmentById` endpoints are **defined** but not currently used in the main flow. The actual quiz taking uses `sharedApi.ts` (`findOrCreateAttempt` + `updateQuizAttempt`) which call different endpoints.

---

## 3. Home Dashboard Analysis

### Overview

The Home Dashboard is the **central hub** of the application. It is role-aware (teacher vs student) and rendered differently on mobile vs web.

| Implementation | Path | Role | Data Source |
|---|---|---|---|
| `TeacherDashboard.tsx` | `src/screens/TeacherDashboard.tsx` | `instructor` / `admin` | `useTeacherDashboard` hook → `teacherDashboard.store` → `dashboardApi.ts` |
| `StudentDashboard.tsx` | `src/screens/StudentDashboard.tsx` | `student` | `fetchQuizCheckRecord` → `dashboardApi.ts` |
| `Dashboard.tsx` (mobile, simple) | `src/platforms/mobile/screens/Dashboard.tsx` | Both | `useDashboard` → `analytics.api.ts` |
| `Dashboard.tsx` (web) | `src/platforms/web/screens/Dashboard.tsx` | Both | `useDashboard` → `analytics.api.ts` |

> **Critical finding:** The bottom tab `Dashboard` mounts `RoleDashboard` → `TeacherDashboard` or `StudentDashboard` (the full-featured screens), NOT the simpler `src/platforms/mobile/screens/Dashboard.tsx`. The platform Dashboard screens appear to be early prototypes.

---

### 3.1 Screen: TeacherDashboard.tsx

**Screen Name:** TeacherDashboard  
**Location:** `src/screens/TeacherDashboard.tsx` (14,512 bytes)  
**Purpose:** Main dashboard for teachers. Shows stats, weak students, recent assessments, quiz creation grid.

**Entry Point:** `RoleDashboard` component when `user.role === 'instructor'` or `'admin'`  
**Navigation Route:** Bottom tab `Dashboard`  

**Services Used:** `useTeacherDashboard` hook  
**Hook Used:** `useTeacherDashboard` from `@core/hooks/useTeacherDashboard`  
**State Used:** All state managed by `useTeacherDashboardStore` (Zustand)

**APIs Called (via hook → store → dashboardApi):**
- `GET /api/v1/dashboard/quizzes?view_type=summary` → loads all teacher quizzes

**Dashboard Sections:**

| Section | Data | Navigation Target |
|---|---|---|
| Stats cards (3-tile row) | `stats.totalQuizzes`, `stats.totalStudents`, `stats.avgScore` | Tap → `StudentList` (`quizId`) or `Assessments` (filter) |
| Weak Students list | `weakStudents[]` from store | Tap → `StudentAnalytics` (`studentId`, `studentName`) |
| Recent Assessments (10) | `recentAssessments[]` sorted desc by `created_at` | Tap → `StudentList` (`quizId`) |
| Quiz Generation Grid | `QuizGenerationGrid` component | Tap → appropriate Create screen |

**Components Used:**
- `LoadingSpinner` from `@components/`
- `QuizGenerationGrid` from `@components/QuizGenerationGrid`

**Navigation Actions from TeacherDashboard:**
```typescript
handleViewStudent(studentId, studentName) → navigate('StudentAnalytics', { studentId, studentName })
handleViewQuiz(quizId) → navigate('StudentList', { quizId })
```

---

### 3.2 Screen: StudentDashboard.tsx

**Screen Name:** StudentDashboard  
**Location:** `src/screens/StudentDashboard.tsx` (34,478 bytes — very large)  
**Purpose:** Main dashboard for students. Shows stats, pending quizzes, completed quizzes, upcoming quizzes. Handles quiz card taps (navigate to taking).

**Entry Point:** `RoleDashboard` component when `user.role === 'student'`  
**Navigation Route:** Bottom tab `Dashboard`  

**Services Used:** `fetchQuizCheckRecord()` from `dashboardApi.ts` — uses check-record endpoint  
**Hooks Used:** `useAuth`, `useDashboardStore`, `useFocusEffect` (react-navigation)  

**State Used:**
```typescript
stats: DashboardStats {
  total_quizzes, completed_count, pending_count, missed_count,
  average_score, total_time_spent, total_questions_attempted, total_classes
}
allQuizzes: ParsedQuiz[]
loading: boolean
refreshing: boolean
```

**APIs Called:**
- `GET /api/v1/dashboard/quiz-check-record/{userId}?status=pending` (via `fetchQuizCheckRecord`)

**Deduplication Logic:**
```
API response → map to ParsedQuiz
             → deduplicate by `quiz_id + session_id` key
             → keep latest attempt (completed > in_progress > pending, then by date)
             → calculate stats: total, completed, pending, missed, avg score
             → store in useDashboardStore for Assessments screen to reuse
```

**Dashboard Sections:**

| Section | Data | Filter |
|---|---|---|
| Stats row (4 cards) | `stats.total_quizzes`, `completed_count`, `pending_count`, `average_score` | — |
| Pending Quizzes | `allQuizzes.filter(isStudentQuizActive)` | `availability_status === 'active'` + not completed |
| Upcoming Quizzes | `allQuizzes.filter(q => q.availability_status === 'available_soon')` | — |
| Completed Quizzes | `allQuizzes.filter(q => q.status === 'completed')` sorted by `completed_at` desc | — |
| Classes Summary | Computed from `allQuizzes.map(q.class_id)` unique count | — |

**Navigation Actions from StudentDashboard:**
```
Tap active quiz card → openQuizHandler (or navigate to QuizStatusScreen/QuizTakingScreen)
Tap "View All" → navigate('Assessments', { filter, classroomId })
Tap stat card → navigate('Assessments', { filterStatus })
```

**Refresh Strategy:**
- `useFocusEffect` → refetch on every tab focus (mobile)
- `useEffect` with condition `Platform.OS === 'web'` → only on web

---

### 3.3 Mobile Bottom Tab Navigator

**Location:** `src/platforms/mobile/navigation/BottomTabNavigator.tsx` (787 lines)  
**Type:** React Navigation `createBottomTabNavigator()` + `createNativeStackNavigator()`

#### Tab Bar (Visible Tabs):

| Tab Position | Tab Name | Route Name | Component | Icon |
|---|---|---|---|---|
| 1 | Analytics | `Analytics` | `ClassesList` ⚠️ | `stats-chart` |
| 2 | Assessments | `Assessments` | `RoleAssessments` | `document-text` |
| 3 | Home | `Dashboard` | `RoleDashboard` | `home` |
| 4 | ERP | `ERP` | `ERPNavigator` | `business` |
| 5 | Schools | `ERPSchools` | `SchoolsTabEntry` | `school` (conditional) |

> ⚠️ Tab `Analytics` mounts `ClassesList`, not an Analytics screen. The Analytics tab label/icon misleads into the Classes view.

#### Hidden Tabs (in tab bar but `tabBarButton: () => null`):

| Route Name | Component | Accessible Via |
|---|---|---|
| `Notifications` | `NotificationsScreen` | Header bell icon |
| `Profile` | `ProfileScreen` | Header avatar tap |

#### Stack Screens (registered above tab navigator):

| Route Name | Component | Presentation | Entry |
|---|---|---|---|
| `Assessments` | `RoleAssessments` | Default card | Tab or navigate() |
| `StudentList` | `StudentList` | Modal | TeacherDashboard, StudentList |
| `ClassesList` | `ClassesList` | Modal | TeacherDashboard header |
| `CreateAIQuizScreen` | `CreateAIQuizScreen` | Modal | CreateAssessmentModal |
| `AssessmentWorkspaceScreen` | `AssessmentWorkspaceScreen` | Modal | CreateAssessmentModal |
| `CreateDocumentQuizScreen` | `CreateDocumentQuizScreen` | Modal | CreateAssessmentModal |
| `CreateImageQuizScreen` | `CreateImageQuizScreen` | Modal | CreateAssessmentModal |
| `CreateYouTubeQuizScreen` | `CreateYouTubeQuizScreen` | Modal | CreateAssessmentModal |
| `CreateWebsiteQuizScreen` | `CreateWebsiteQuizScreen` | Modal | CreateAssessmentModal |
| `CreateHandwrittenQuizScreen` | `CreateHandwrittenQuizScreen` | Modal | CreateAssessmentModal |
| `QuizTakingScreen` | `QuizTakingScreen` | Card | Assessments / deep link |
| `QuizResultsScreen` | `QuizResultsScreen` | Card | QuizTakingScreen |
| `QuizPreviewScreen` | `QuizPreviewScreen` | Modal | Assessments, CreateAIQuizScreen |
| `StudentAnalytics` | `StudentAnalyticsScreen` | Card | TeacherDashboard, StudentList |
| `TestNotifications` | `TestNotifications` | Card | — |
| `QuizStatusScreen` | `QuizStatusScreen` | — | Assessments |
| `QuizLoadingScreen` | `QuizLoadingScreen` | — | Transition |
| `RecentAssessmentsScreen` | `RecentAssessmentsScreen` | — | CreateAIQuizScreen header |
| `WorksheetScreen` | `WorksheetScreen` | — | — |
| `DocumentUploadHomeScreen` | `DocumentUploadHomeScreen` | Modal | CreateAssessmentModal |
| `DocumentUploadPreviewScreen` | `DocumentUploadPreviewScreen` | — | DocumentUploadHomeScreen |
| `DocumentUploadHistoryScreen` | `DocumentUploadHistoryScreen` | — | DocumentUploadHomeScreen |
| `DocumentUploadQuizScreen` | `DocumentUploadQuizScreen` | — | DocumentUploadHomeScreen |

#### Role-based Tab Visibility:

```typescript
// ERPSchools tab — conditional render:
if (user.role in ['instructor', 'student', 'admin', 'super_admin'] || role_id in [1, 2, 4])
  render <Tab.Screen name="ERPSchools" ... />

// Analytics tab: always visible (renders ClassesList for all roles)
// Dashboard tab: role-routed via RoleDashboard (teacher vs student)
```

#### `RoleDashboard` Logic:
```typescript
if (user?.role === 'instructor' || user?.role === 'admin') → TeacherDashboard
else → StudentDashboard
```

#### `RoleAssessments` Logic:
```typescript
const userRole = (user?.role === 'instructor' || user?.role === 'admin') ? 'instructor' : 'student';
return <AssessmentsScreen userRole={userRole} />
```

---

### 3.4 Web Navigation (Sidebar)

**Location:** `src/platforms/web/navigation/WebNavigation.tsx`  
**Type:** Custom sidebar + state machine (no React Navigation)

#### Sidebar Nav Items (visible):

| Item | `activeScreen` value | Navigates to |
|---|---|---|
| Dashboard | `dashboard` | `onNavigate('dashboard')` |
| Assessments | `assessments` | `onNavigate('assessments')` |
| Analytics | `analytics` | `onNavigate('ClassesList')` ⚠️ |

#### Web Route State Type:
```typescript
type WebScreen = 'dashboard' | 'assessments' | 'analytics' | 'profile' | 'notifications' | 
                 'theme' | 'students' | 'classes' | 'ClassesList' | 'StudentList' | 
                 'Assessments' | 'CreateAIQuizScreen' | 'CreateDocumentQuizScreen' | 
                 'CreateImageQuizScreen' | 'CreateYouTubeQuizScreen' | 'CreateWebsiteQuizScreen' | 
                 'CreateHandwrittenQuizScreen' | 'QuizPreviewScreen' | 'QuizResultsScreen' | 
                 'QuizTakingScreen' | 'QuizStatusScreen' | 'QuizLoadingScreen' | 'ERP';
```

#### Header Actions (Web):
- Create Assessment button (for `instructor`, `admin`, `student`)
- Notification bell → opens `NotificationsDropdown`
- Theme toggle (moon/sun icon)
- Profile avatar → `onNavigate('profile')`

---

### 3.5 Custom Header (`CustomHeader` in BottomTabNavigator)

The mobile app has a **custom persistent header** shared across all screens:

| Element | Behavior |
|---|---|
| Hamburger menu | `AppSideNavMenuButton` → opens `AppSideNavContext` side drawer |
| EduVijna logo | Tap → `navigateToAppMainTab(APP_MAIN_TABS.DASHBOARD)` |
| School badge | Fetched from `GET /api/v1/school-management/my-school` on mount |
| Create Assessment (+) | Shows `CreateAssessmentModal` (for instructor, admin, student) |
| Notifications bell | `navigation.navigate('Notifications')` |
| Profile avatar | `navigation.navigate('Profile')` or shows initials placeholder |

**School Name Resolution Priority:**
1. API call `GET /api/v1/school-management/my-school` (primary)
2. `user.school_name` / `user.schoolName` / `user.school.name` (fallback)
3. Not shown for `super_admin` (role_id === 1)

---

### 3.6 Dashboard Service Architecture

#### `dashboardApi.ts` (Core Service — 33,281 bytes)

This is the **most critical service file**. It provides quiz data for both teacher dashboard and student dashboard.

| Function | Endpoint | Cache TTL | Users |
|---|---|---|---|
| `fetchTeacherDashboardSummary(filters)` | `GET /api/v1/dashboard/quizzes?view_type=summary` | `CACHE_TTL.DASHBOARD_SUMMARY` | Teacher |
| `fetchTeacherQuizzes(filters)` | `GET /api/v1/dashboard/quizzes?view_type=summary` | `CACHE_TTL.QUIZZES_LIST` (600s) | Teacher |
| `fetchStudentQuizzes(filters)` | `GET /api/v1/dashboard/quizzes?view_type=student_total_details` | `CACHE_TTL.QUIZZES_LIST` (600s) | Student |
| `fetchQuizCheckRecord(userId, status?)` | `GET /api/v1/dashboard/quiz-check-record/{userId}?status=pending` | — | Student |

**Authentication Error Handling:** All functions check for token → on 401/403 → `TokenStorage.clearAuthData()` → redirect to login (via callback or `window.location`).

**Student Quiz Response Parsing (Complex):**
```
API returns data.data[] where each item is a quiz session
Each quiz session has an `attempts` field (JSON string)
Parse attempts → expand → flatten into StudentQuiz[]
This produces multiple rows per quiz (one per attempt)
```

---

## 4. Navigation Mapping

### Complete Mobile Navigation Tree

```
App.tsx
  └── NavigationContainer
        └── MobileNavigation (NativeStack)
              ├── [name="Main"] BottomTabNavigator
              │     ├── [tab] Analytics → ClassesList ⚠️ (mislabeled)
              │     ├── [tab] Assessments → RoleAssessments → Assessments.tsx
              │     ├── [tab] Dashboard → RoleDashboard → TeacherDashboard | StudentDashboard
              │     ├── [tab] ERP → ERPNavigator (22 screens)
              │     ├── [tab, conditional] ERPSchools → SchoolsTabEntry → Teacher/Student/Admin tabs
              │     ├── [tab, hidden] Notifications → NotificationsScreen
              │     └── [tab, hidden] Profile → ProfileScreen
              │
              ├── [stack] StudentList
              ├── [stack] ClassesList
              ├── [stack] CreateAIQuizScreen
              ├── [stack] AssessmentWorkspaceScreen
              ├── [stack] CreateDocumentQuizScreen
              ├── [stack] CreateImageQuizScreen
              ├── [stack] CreateYouTubeQuizScreen
              ├── [stack] CreateWebsiteQuizScreen
              ├── [stack] CreateHandwrittenQuizScreen
              ├── [stack] QuizTakingScreen
              ├── [stack] QuizResultsScreen
              ├── [stack] QuizPreviewScreen
              ├── [stack] StudentAnalytics → StudentAnalyticsScreen
              ├── [stack] TestNotifications
              ├── [stack] QuizStatusScreen
              ├── [stack] QuizLoadingScreen
              ├── [stack] RecentAssessmentsScreen
              ├── [stack] WorksheetScreen
              ├── [stack] DocumentUploadHomeScreen
              ├── [stack] DocumentUploadPreviewScreen
              ├── [stack] DocumentUploadHistoryScreen
              └── [stack] DocumentUploadQuizScreen
```

### Complete Web Navigation State Machine

```
WebNavigation (App.tsx state: activeScreen)
  ├── 'dashboard'     → DashboardScreen (TeacherDashboard | StudentDashboard)
  ├── 'assessments'   → AssessmentsScreen
  ├── 'analytics'     → ClassesList ⚠️
  ├── 'ClassesList'   → ClassesList
  ├── 'StudentList'   → StudentList
  ├── 'profile'       → ProfileScreen
  ├── 'notifications' → NotificationsScreen
  ├── 'ERP'           → ERPNavigator
  ├── 'QuizTakingScreen'     → QuizTakingScreen
  ├── 'QuizResultsScreen'    → QuizResultsScreen
  ├── 'QuizPreviewScreen'    → QuizPreviewScreen
  ├── 'QuizStatusScreen'     → QuizStatusScreen
  ├── 'QuizLoadingScreen'    → QuizLoadingScreen
  ├── 'CreateAIQuizScreen'   → CreateAIQuizScreen
  ├── 'CreateDocumentQuizScreen' → CreateDocumentQuizScreen
  ├── 'CreateImageQuizScreen' → CreateImageQuizScreen
  ├── 'CreateYouTubeQuizScreen' → CreateYouTubeQuizScreen
  ├── 'CreateWebsiteQuizScreen' → CreateWebsiteQuizScreen
  └── 'CreateHandwrittenQuizScreen' → CreateHandwrittenQuizScreen
```

---

## 5. Screen Mapping

### Complete Screen Inventory (Remaining Modules)

| Screen Name | File Path | Module | Role | Status |
|---|---|---|---|---|
| TeacherDashboard | `src/screens/TeacherDashboard.tsx` | Home Dashboard | instructor, admin | Live |
| StudentDashboard | `src/screens/StudentDashboard.tsx` | Home Dashboard | student | Live |
| Dashboard (mobile) | `src/platforms/mobile/screens/Dashboard.tsx` | Home Dashboard | Both | Prototype |
| Dashboard (web) | `src/platforms/web/screens/Dashboard.tsx` | Home Dashboard | Both | Prototype |
| Analytics (mobile) | `src/platforms/mobile/screens/Analytics.tsx` | Analytics | Both | Partial |
| Analytics (web) | `src/platforms/web/screens/Analytics.tsx` | Analytics | Both | Partial |
| StudentAnalyticsScreen | `src/screens/StudentAnalyticsScreen.tsx` | Analytics | instructor | Live |
| Assessments | `src/screens/Assessments.tsx` | Assessments | Both | Live |
| AssessmentWorkspaceScreen | `src/screens/AssessmentWorkspaceScreen.tsx` | Assessments | instructor | Live |
| QuizTakingScreen | `src/screens/QuizTakingScreen.tsx` | Assessments | student | Live |
| QuizResultsScreen | `src/screens/QuizResultsScreen.tsx` | Assessments | student | Live |
| QuizPreviewScreen | `src/screens/QuizPreviewScreen.tsx` | Assessments | Both | Live |
| QuizStatusScreen | `src/screens/QuizStatusScreen.tsx` | Assessments | student | Live |
| QuizLoadingScreen | `src/screens/QuizLoadingScreen.tsx` | Assessments | student | Live |
| RecentAssessmentsScreen | `src/screens/RecentAssessmentsScreen.tsx` | Assessments | instructor | Live |
| WorksheetScreen | `src/screens/WorksheetScreen.tsx` | Assessments | Both | Live |
| ClassesList | `src/screens/ClassesList.tsx` | Dashboard/Analytics | Both | Live |
| StudentList | `src/screens/StudentList.tsx` | Dashboard/Analytics | instructor | Live |
| Notifications | `src/screens/Notifications.tsx` | App-wide | Both | Live |
| CreateAIQuizScreen | `src/screens/CreateAIQuizScreen.tsx` | Create | instructor | Live |
| CreateDocumentQuizScreen | `src/screens/CreateDocumentQuizScreen.tsx` | Create | instructor | Live |
| CreateImageQuizScreen | `src/screens/CreateImageQuizScreen.tsx` | Create | instructor | Live |
| CreateYouTubeQuizScreen | `src/screens/CreateYouTubeQuizScreen.tsx` | Create | instructor | Live |
| CreateWebsiteQuizScreen | `src/screens/CreateWebsiteQuizScreen.tsx` | Create | instructor | Live |
| CreateHandwrittenQuizScreen | `src/screens/CreateHandwrittenQuizScreen.tsx` | Create | instructor | Live |
| DocumentUploadHomeScreen | `src/screens/document-upload/` | Create | instructor | Live |
| ProfileScreen (mobile) | `src/platforms/mobile/screens/Profile.tsx` | Profile | Both | Live |

**Total: 27 screens** in remaining modules

---

## 6. API Mapping

### Complete API Table (Remaining Modules)

#### Analytics APIs

| Endpoint | Method | Service File | Used By | Criticality |
|---|---|---|---|---|
| `/dashboard/teacher/{teacherId}` | GET | `analytics.api.ts` | `useDashboard` | HIGH |
| `/dashboard/student/{studentId}` | GET | `analytics.api.ts` | `useDashboard` | HIGH |
| `/analytics/{userId}?dateFrom=&dateTo=` | GET | `analytics.api.ts` | `useAnalytics` | HIGH |
| `/analytics/teacher/{teacherId}/student-performance` | GET | `analytics.api.ts` | `useStudentPerformance` | HIGH |
| `/analytics/teacher/{teacherId}/assessment-stats` | GET | `analytics.api.ts` | `useAssessmentStatistics` | HIGH |
| `/analytics/{userId}/topic-analysis` | GET | `analytics.api.ts` | `useTopicAnalysis` | MEDIUM |
| `/analytics/student/{studentId}/weak-topics` | GET | `analytics.api.ts` | `useWeakTopics` | MEDIUM |
| `/analytics/{userId}/trends` | GET | `analytics.api.ts` | (unused) | LOW |
| `/analytics/teacher/{teacherId}/classes/{classId}/performance` | GET | `analytics.api.ts` | (unused) | LOW |
| `/analytics/{userId}/export?format=csv\|xlsx\|pdf` | GET | `analytics.api.ts` | (unused) | LOW |

#### Dashboard APIs

| Endpoint | Method | Service File | Used By | Criticality |
|---|---|---|---|---|
| `/api/v1/dashboard/quizzes?view_type=summary` | GET | `dashboardApi.ts` | TeacherDashboard, Assessments, StudentAnalytics | CRITICAL |
| `/api/v1/dashboard/quizzes?view_type=student_total_details` | GET | `dashboardApi.ts` | StudentDashboard, Assessments (student) | CRITICAL |
| `/api/v1/dashboard/quiz-check-record/{userId}?status=pending` | GET | `dashboardApi.ts` | StudentDashboard | HIGH |
| `/api/v1/school-management/my-school` | GET | `BottomTabNavigator.tsx` inline | CustomHeader school badge | MEDIUM |

#### Assessment / Quiz APIs

| Endpoint | Method | Service File | Used By | Criticality |
|---|---|---|---|---|
| `/api/v1/dashboard/quiz-attempts` | POST | `sharedApi.ts` | QuizTakingScreen (start) | CRITICAL |
| `/api/v1/dashboard/quiz-attempts/{id}` | PUT | `sharedApi.ts` | QuizTakingScreen (submit) | CRITICAL |
| `/api/v1/dashboard/quiz-attempts?quiz_id=&class_id=&student_id=` | GET | `sharedApi.ts` | Assessments, QuizPreviewScreen | HIGH |
| `/api/v1/quizzes/by-session/{sessionId}` | GET | `sharedApi.ts` | Assessments (load quiz for taking) | CRITICAL |
| `/assessments/{id}` | GET | `assessment.api.ts` | (defined, unused in main flow) | LOW |
| `/assessments` | POST | `assessment.api.ts` | `useAssessments.createAssessment` | MEDIUM |
| `/assessments/{id}` | PUT | `assessment.api.ts` | `useAssessments.updateAssessment` | MEDIUM |
| `/assessments/{id}` | DELETE | `assessment.api.ts` | `useAssessments.deleteAssessment` | MEDIUM |
| `/assessments/{id}/questions` | GET | `assessment.api.ts` | (defined, unused in main flow) | MEDIUM |
| `/assessments/{id}/start` | POST | `assessment.api.ts` | (defined, unused in main flow) | LOW |
| `/assessments/{id}/submit` | POST | `assessment.api.ts` | (defined, unused in main flow) | LOW |
| `/assessments/{id}/results/{attemptId}` | GET | `assessment.api.ts` | (defined, unused) | LOW |
| `/students/{studentId}/results` | GET | `assessment.api.ts` | (defined, unused) | LOW |
| `/students/{studentId}/assessments/upcoming` | GET | `assessment.api.ts` | (defined, unused) | LOW |

---

## 7. Component Mapping

### Shared Components Used in Remaining Modules

| Component | Location | Used By |
|---|---|---|
| `LoadingSpinner` | `src/components/LoadingSpinner.tsx` | TeacherDashboard, StudentDashboard, Assessments, StudentAnalyticsScreen |
| `QuizGenerationGrid` | `src/components/QuizGenerationGrid.tsx` | TeacherDashboard, StudentDashboard |
| `FilterComponents` (`ClassroomFilter`, `DateRangeFilter`, `FilterSection`) | `src/components/FilterComponents.tsx` | Assessments, StudentAnalyticsScreen |
| `CreateAssessmentModal` | `src/components/CreateAssessmentModal.tsx` | CustomHeader (mobile), WebNavigation (web) |
| `QuizExplanationAccordion` | `src/components/QuizExplanationAccordion.tsx` | QuizTakingScreen |
| `ShareQuizModal` | `src/components/ShareQuizModal.tsx` | QuizTakingScreen |
| `ShareOptionsModal` | `src/components/ShareOptionsModal.tsx` | QuizTakingScreen |
| `MathRenderer` | `src/components/MathRenderer.tsx` | QuizTakingScreen |
| `NotificationBell` | `src/components/NotificationBell.tsx` | WebNavigation |
| `NotificationsDropdown` | `src/components/NotificationsDropdown.tsx` | WebNavigation |
| `PushNotificationPrompt` | `src/components/PushNotificationPrompt.tsx` | BottomTabNavigator |
| `NotificationHandler` | `src/components/NotificationHandler.tsx` | BottomTabNavigator |
| `Header` | `src/core/components/Header.tsx` | Various |

---

## 8. State Flow Analysis

### Zustand Stores (Core App)

| Store | File | State Shape | Used By |
|---|---|---|---|
| `useUserStore` | `src/core/store/user.store.ts` | `{ user: User \| null, setUser, clearUser }` | Auth, all hooks |
| `useDashboardStore` | `src/core/store/dashboard.store.ts` | `{ quizzes[], totalCount, isLoading, error, setQuizzes, setLoading, setError }` | StudentDashboard, Assessments (student) |
| `useAssessmentStore` | `src/core/store/assessment.store.ts` | `{ assessments[], addAssessment, updateAssessment, removeAssessment }` | useAssessments hook |
| `useTeacherDashboardStore` | `src/core/store/teacherDashboard.store.ts` | `{ allQuizzes[], classrooms[], stats, weakStudents[], uniqueStudents[], loading, error, lastFetched, loadDashboard, refresh, loadStudentListForClass }` | useTeacherDashboard |
| `useNotificationStore` | `src/core/store/notification.store.ts` | Notifications state | useNotifications |

### Data Flow: Teacher Dashboard Load

```
BottomTabNavigator mounts
  → Tab "Dashboard" active
  → RoleDashboard → TeacherDashboard
  → useTeacherDashboard()
  → useTeacherDashboardStore.loadDashboard()
    → if already loaded (lastFetched) → skip
    → else fetchTeacherDashboardSummary({ view_type:'summary', limit:1000 })
      → cachedApiCall() → L1 memory cache or fetch
      → GET /api/v1/dashboard/quizzes?view_type=summary
      → response → toTeacherQuiz() mapping
      → setAllQuizzes(), setStats(), setWeakStudents()
  → TeacherDashboard renders with data
```

### Data Flow: Student Quiz Taking

```
StudentDashboard mounts (on focus via useFocusEffect)
  → fetchQuizCheckRecord(user.id, 'pending')
  → GET /api/v1/dashboard/quiz-check-record/{userId}?status=pending
  → map to ParsedQuiz[] → deduplicate → calculate stats
  → setQuizzes(parsed) into useDashboardStore (shared)
  
Student taps quiz in Assessments.tsx
  → checkQuizAttempt(quizId, sessionId, userId)
  → GET /api/v1/dashboard/quiz-attempts?quiz_id=&class_id=&student_id=
  
  if completedAttempt → show CompletedAttemptModal
  else
    → getQuizBySessionId(sessionId)
    → GET /api/v1/quizzes/by-session/{sessionId}
    → navigate('QuizTakingScreen', { quiz, ... })

QuizTakingScreen mounts
  → findOrCreateAttempt({ quiz_id, student_id, class_id, started_at })
    → GET existing attempts, if found reuse, else POST new attempt
  → student answers questions
  → timer (if has_time_limit)
  
Student submits
  → updateQuizAttempt(attemptId, { score, status:'completed', completed_at, time_spent_seconds })
    → PUT /api/v1/dashboard/quiz-attempts/{attemptId}
  → clearCacheEntry(quiz_cache_key)
  → navigate('QuizResultsScreen', { score, quiz, ... })
```

### Cache Architecture

| Cache Level | Storage | TTL | Used For |
|---|---|---|---|
| L1 (Memory) | JS object in `cacheService.ts` | `DASHBOARD_SUMMARY`: defined in CACHE_TTL | Teacher dashboard summary |
| L2 (AsyncStorage) | `@react-native-async-storage/async-storage` | Cleanup every 5 min | Persisted cache |
| Quiz list | `cachedApiCall()` | `CACHE_TTL.QUIZZES_LIST` = 600s | Teacher quizzes list |
| Invalidation | `clearCacheEntry(key)` | On quiz attempt submit | Ensures fresh data |

---

## 9. Business Flow Analysis

### Teacher Daily Flow

```
Login → TeacherDashboard
  → See stats: total quizzes, students, avg score
  → See weak students → drill into StudentAnalyticsScreen
  → See recent assessments → drill into StudentList
  
  → Create Assessment (+ button or QuizGenerationGrid)
    → CreateAssessmentModal → choose source (AI, Document, Image, YouTube, Website, Handwritten)
    → Create quiz → assign to classroom → quiz appears in student's dashboard

  → View Assessments tab → filter by active/expired/upcoming
  → Check Analytics tab → ClassesList (currently, not true analytics)
```

### Student Daily Flow

```
Login → StudentDashboard
  → See stats: total quizzes, pending, completed, avg score
  → See pending quizzes → tap quiz
    → checkQuizAttempt → getQuizBySessionId
    → QuizTakingScreen → answer questions
    → Submit → QuizResultsScreen → see score and grade
  → See upcoming quizzes → wait for scheduled time
  → See completed quizzes → tap for results review
  
  → Assessments tab → filter by ongoing/completed/missed
  → Analytics tab → ClassesList view of all classes
```

---

## 10. Final Counts & Scores

### Summary Table

| Metric | Count |
|---|---|
| **Total Screens (remaining modules)** | **27** |
| **Total API Endpoints Documented** | **25** |
| **Critical APIs (active in main flow)** | **8** |
| **Total Hooks (remaining modules)** | **12** |
| **Total Services Used** | **6** |
| **Total Navigation Routes** | **29** (mobile stack + tabs) |
| **Shared Components Used** | **13** |
| **Zustand Stores** | **5** |

### Module Complexity Scores

| Module | Score | Rationale |
|---|---|---|
| **Analytics** | 5/10 | 2 screens, hooks well-isolated, but Analytics tab mismatch and unused chart lib add confusion |
| **Assessments** | 9/10 | 8 screens, 2 API layers (new + legacy `sharedApi`), complex client-side filtering, timer logic, dual format handling |
| **Home Dashboard** | 7/10 | 4 screens, 2 data loading strategies (TeacherStore singleton vs StudentDashboard local fetch), cross-module store sharing, school-name resolution complexity |

### Known Issues Found During Analysis

| Issue | Location | Impact |
|---|---|---|
| Analytics tab mounts `ClassesList` not `AnalyticsScreen` | `BottomTabNavigator.tsx:652-656` | Users see Classes when tapping Analytics |
| `react-native-chart-kit` installed but unused | `package.json` | Dead dependency |
| `assessment.api.ts` submit/start endpoints defined but unused — actual submission via `sharedApi.ts` | `assessment.api.ts` | Dual API layer confusion |
| `src/platforms/mobile/screens/Dashboard.tsx` is a prototype not mounted | Navigation tree | Dead code |
| Student analytics uses teacher quiz API indirectly (load all, then filter by studentId) | `StudentAnalyticsScreen.tsx` | Performance concern |
| StudentDashboard uses `quiz-check-record` endpoint instead of `dashboard/quizzes` | `StudentDashboard.tsx` | Inconsistency with teacher flow |
