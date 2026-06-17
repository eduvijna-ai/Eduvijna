# NAVIGATION_FLOW.md

> **Purpose:** Complete navigation tree, role-based routes, hidden routes, conditional routes, screen relationships, and parent-child hierarchy for the EduVijna app (remaining modules).
> **Scope:** Analytics, Assessments, Home Dashboard, and the overall app shell. ERP Schools internal navigation is documented in `SCREENS.md`.
> **Last updated:** June 17, 2026

---

## Table of Contents

1. [Navigation Architecture Overview](#1-navigation-architecture-overview)
2. [Mobile Navigation Tree (Complete)](#2-mobile-navigation-tree-complete)
3. [Web Navigation State Machine](#3-web-navigation-state-machine)
4. [Role-Based Navigation](#4-role-based-navigation)
5. [Hidden Routes](#5-hidden-routes)
6. [Conditional Routes](#6-conditional-routes)
7. [Screen Relationships (Parent–Child)](#7-screen-relationships-parentchild)
8. [Deep Link Routes](#8-deep-link-routes)
9. [Notification-Driven Navigation](#9-notification-driven-navigation)
10. [Cross-Module Navigation](#10-cross-module-navigation)

---

## 1. Navigation Architecture Overview

EduVijna uses **two completely separate navigation systems**:

| Platform | System | Type | File |
|---|---|---|---|
| **Mobile (iOS/Android)** | React Navigation 6 | `NativeStack` + `BottomTab` | `src/platforms/mobile/navigation/BottomTabNavigator.tsx` |
| **Web** | Custom state machine | `activeScreen` string state in `App.tsx` | `src/platforms/web/navigation/WebNavigation.tsx` |

**There is no shared navigation state between platforms.** Each uses its own system.

### Navigator Hierarchy (Mobile)

```
NavigationContainer (App.tsx)
  └── NativeStack (MobileNavigation)
        └── Screen "Main" → BottomTabNavigator
              ├── Tab screens (5 tabs)
              └── [Each tab has its own nested stack if needed]
        ├── Stack screens (quiz flow, create flow)
        └── [All stack screens are registered above tabs for global access]
```

### Navigator Hierarchy (Web)

```
App.tsx
  └── WebNavigation (sidebar wrapper)
        └── renderScreen(activeScreen)  ← switches between screen components
```

---

## 2. Mobile Navigation Tree (Complete)

### 2.1 Root Level: NativeStack

```
Stack.Navigator (initialRouteName="Main")
│
├── "Main"                              → BottomTabNavigator           [headerShown: false]
│
├── "StudentList"                       → StudentList.tsx              [modal, title: "All Students"]
├── "ClassesList"                       → ClassesList.tsx              [modal, title: "My Classes"]
│
│   ── Quiz Creation Flow ──────────────────────────────────────────────────────
├── "CreateAIQuizScreen"               → CreateAIQuizScreen.tsx        [modal, "Create AI Assessment"]
│                                         headerRight: "Recent" → navigate('RecentAssessmentsScreen')
├── "AssessmentWorkspaceScreen"        → AssessmentWorkspaceScreen.tsx [modal, mode-aware title]
├── "CreateDocumentQuizScreen"         → CreateDocumentQuizScreen.tsx  [modal, "Document Assessment"]
├── "CreateImageQuizScreen"            → CreateImageQuizScreen.tsx     [modal, "Create Image Assessment"]
├── "CreateYouTubeQuizScreen"          → CreateYouTubeQuizScreen.tsx   [modal, "YouTube Assessment"]
├── "CreateWebsiteQuizScreen"          → CreateWebsiteQuizScreen.tsx   [modal, "Create Website Assessment"]
├── "CreateHandwrittenQuizScreen"      → CreateHandwrittenQuizScreen.tsx [modal, "Handwritten Assessment"]
│
│   ── Quiz Taking Flow ─────────────────────────────────────────────────────────
├── "QuizTakingScreen"                 → QuizTakingScreen.tsx          [card, custom back+close header]
│                                         headerLeft: back → Main/Dashboard
│                                         headerRight: close → Main/Dashboard
│                                         (document flow: "Document Assessment")
├── "QuizResultsScreen"                → QuizResultsScreen.tsx         [card, "Assessment Results"]
├── "QuizPreviewScreen"                → QuizPreviewScreen.tsx         [modal, "Assessment Preview"]
├── "QuizStatusScreen"                 → QuizStatusScreen.tsx          [card, headerLeft: → Main/Dashboard]
├── "QuizLoadingScreen"                → QuizLoadingScreen.tsx         [headerShown: false]
│
│   ── Analytics ─────────────────────────────────────────────────────────────────
├── "StudentAnalytics"                 → StudentAnalyticsScreen.tsx    [card, "Student Analytics"]
│
│   ── Document Upload Flow ──────────────────────────────────────────────────────
├── "DocumentUploadHomeScreen"         → DocumentUploadHomeScreen.tsx  [modal, "Document & Handwritten"]
├── "DocumentUploadPreviewScreen"      → DocumentUploadPreviewScreen.tsx [card, "Preview"]
├── "DocumentUploadHistoryScreen"      → DocumentUploadHistoryScreen.tsx [card, "History"]
├── "DocumentUploadQuizScreen"         → DocumentUploadQuizScreen.tsx  [headerShown: false]
│
│   ── Utility ─────────────────────────────────────────────────────────────────────
├── "RecentAssessmentsScreen"          → RecentAssessmentsScreen.tsx   [card, "Recent Assessments"]
├── "WorksheetScreen"                  → WorksheetScreen.tsx           [card, "Worksheet"]
└── "TestNotifications"                → TestNotifications.tsx         [card, "🔔 Test Push Notifications"]
```

---

### 2.2 Bottom Tab Navigator

```
Tab.Navigator (initialRouteName="Dashboard", backBehavior="initialRoute")
│
├── Tab "Analytics"     → ClassesList.tsx           [icon: stats-chart]  ⚠️ MISLABELED
├── Tab "Assessments"   → RoleAssessments()          [icon: document-text]
├── Tab "Dashboard"     → RoleDashboard()            [icon: home]         ← initial
├── Tab "ERP"           → ERPNavigator               [icon: business]
├── Tab "ERPSchools"    → SchoolsTabEntry            [icon: school]       [CONDITIONAL — see §6]
├── Tab "Notifications" → NotificationsScreen        [tabBarButton: null] ← HIDDEN from bar
└── Tab "Profile"       → ProfileScreen              [tabBarButton: null] ← HIDDEN from bar
```

**Tab order matters** for `backBehavior="initialRoute"` (Android back returns to Dashboard).

---

## 3. Web Navigation State Machine

### 3.1 `activeScreen` Type

```typescript
type WebScreen =
  | 'dashboard'
  | 'assessments'
  | 'analytics'          // sidebar nav item — actually renders ClassesList ⚠️
  | 'ClassesList'        // explicit state for ClassesList
  | 'StudentList'
  | 'Assessments'        // capital-A variant used by CreateAssessmentModal
  | 'profile'
  | 'notifications'
  | 'theme'
  | 'ERP'
  | 'CreateAIQuizScreen'
  | 'CreateDocumentQuizScreen'
  | 'CreateImageQuizScreen'
  | 'CreateYouTubeQuizScreen'
  | 'CreateWebsiteQuizScreen'
  | 'CreateHandwrittenQuizScreen'
  | 'QuizPreviewScreen'
  | 'QuizResultsScreen'
  | 'QuizTakingScreen'
  | 'QuizStatusScreen'
  | 'QuizLoadingScreen';
```

### 3.2 Sidebar Navigation Items → `activeScreen` mapping

| Sidebar Item | Sets `activeScreen` | Renders Component |
|---|---|---|
| Dashboard | `'dashboard'` | `TeacherDashboard` or `StudentDashboard` (role-based) |
| Assessments | `'assessments'` | `Assessments.tsx` |
| Analytics | via `onNavigate('ClassesList')` | `ClassesList.tsx` ⚠️ |

### 3.3 Web renderScreen() (App.tsx)

```
activeScreen === 'dashboard'     → role-based Dashboard component
activeScreen === 'assessments'   → Assessments
activeScreen === 'analytics'     → Analytics (web)
activeScreen === 'ClassesList'   → ClassesList
activeScreen === 'StudentList'   → StudentList
activeScreen === 'profile'       → Profile (web)
activeScreen === 'notifications' → Notifications (web)
activeScreen === 'theme'         → ThemeSettings (web)
activeScreen === 'ERP'           → ERPNavigator
activeScreen === 'QuizTakingScreen'   → QuizTakingScreen
activeScreen === 'QuizResultsScreen'  → QuizResultsScreen
...etc for all Create/Quiz screens
```

---

## 4. Role-Based Navigation

### 4.1 Dashboard Routing

```typescript
function RoleDashboard({ navigation }) {
  const { user } = useAuth();
  if (user?.role === 'instructor' || user?.role === 'admin') {
    return <TeacherDashboard navigation={navigation} />;
  }
  return <StudentDashboard navigation={navigation} />;
}
```

| Role | Component | Data Source |
|---|---|---|
| `instructor` | `TeacherDashboard.tsx` | `useTeacherDashboard` → `teacherDashboard.store` |
| `admin` | `TeacherDashboard.tsx` | Same as instructor |
| `student` | `StudentDashboard.tsx` | `fetchQuizCheckRecord` → `dashboardApi.ts` |
| `super_admin` | `TeacherDashboard.tsx` | Same as instructor |

### 4.2 Assessments Routing

```typescript
function RoleAssessments({ navigation, route }) {
  const { user } = useAuth();
  const userRole = (user?.role === 'instructor' || user?.role === 'admin') ? 'instructor' : 'student';
  return <AssessmentsScreen userRole={userRole} navigation={navigation} route={route} />;
}
```

| Role | `userRole` prop | Filter Tabs | Data Source |
|---|---|---|---|
| `instructor` | `'instructor'` | all, active, available_soon, expired | `useTeacherDashboard` store |
| `admin` | `'instructor'` | same | same |
| `student` | `'student'` | all, ongoing, completed, missed | `useDashboardStore` (pre-loaded) |

### 4.3 ERPSchools Tab Visibility

```typescript
// Rendered ONLY when:
(user?.role === 'instructor' || user?.role === 'student' || user?.role === 'admin' || user?.role === 'super_admin')
OR
(Number((user as any)?.role_id) === 1)
OR
(Number((user as any)?.role_id) === 2)
OR
(Number((user as any)?.role_id) === 4)
```

| Condition | Tab Shown | Tab Hidden |
|---|---|---|
| `role in ['instructor', 'student', 'admin', 'super_admin']` | ✅ | — |
| `role_id in [1, 2, 4]` | ✅ | — |
| Any other role | — | ✅ |

**ERPSchools tab style:** `tabBarStyle: { display: 'none' }` — the tab bar itself is HIDDEN while inside ERPSchools (because ERPSchools has its own inner bottom tab bar).

### 4.4 Create Assessment Button Visibility

The `+` button in the custom header (`CustomHeader`) is shown for:
```typescript
(user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'student')
```

Students CAN see the Create Assessment button. Its `CreateAssessmentModal` shows role-appropriate options.

### 4.5 Inline Role Checks in StudentAnalyticsScreen

`StudentAnalyticsScreen` is navigated to exclusively from teacher-facing screens. It reads `studentId` + `studentName` from `route.params`. There is no `role` guard inside the screen itself — the gate is implicit via navigation.

---

## 5. Hidden Routes

### 5.1 Tabs Hidden from Tab Bar

| Route Name | Why Hidden | Still Accessible Via |
|---|---|---|
| `Notifications` | `tabBarButton: () => null` | `navigation.navigate('Notifications')` from header bell icon |
| `Profile` | `tabBarButton: () => null` | `navigation.navigate('Profile')` from header avatar tap |

### 5.2 Screens with `headerShown: false`

| Route Name | Why No Header |
|---|---|
| `QuizLoadingScreen` | Full-screen loading transition — no header needed |
| `DocumentUploadQuizScreen` | Full-screen quiz experience |

### 5.3 Commented-Out Routes

| Route | Status | Comment in code |
|---|---|---|
| `Theme` tab | Commented out in `BottomTabNavigator.tsx` | Was part of dev, removed from production |
| `import AnalyticsScreen` | Commented out: `// import AnalyticsScreen from '../screens/Analytics'` | Analytics.tsx import commented out, ClassesList used instead |

---

## 6. Conditional Routes

### 6.1 ERPSchools Tab

The `ERPSchools` tab is conditionally rendered (not just hidden) — it may not exist in the tab navigator DOM at all:

```typescript
{(user?.role === 'instructor' || ...) && (
  <Tab.Screen name="ERPSchools" component={SchoolsTabEntry} ... />
)}
```

If user doesn't meet the condition → the tab screen is never registered.

### 6.2 Analytics Tab — Classification Mismatch

```typescript
// Registered as "Analytics" but renders ClassesList
<Tab.Screen
  name="Analytics"
  component={ClassesList}          // ← NOT AnalyticsScreen
  options={{ title: 'Analytics' }}
/>
```

This is a **permanent code state** (not commented out) — the "Analytics" tab currently shows the Classes list view for all users.

### 6.3 QuizTakingScreen Header — Context-Conditional

The `QuizTakingScreen` header changes based on `source` param:

```typescript
if (routeParams.source === 'document') {
  // Header: "Document Assessment" with document icon
} else {
  // Header: "Taking Assessment" with custom back/close buttons
  // Both back AND close → navigate('Main', { screen: 'Dashboard' })
}
```

### 6.4 School Badge in Header

The school name badge in `CustomHeader` is conditionally rendered:

```typescript
// 1. Fetch from API /api/v1/school-management/my-school (except super_admin)
// 2. Fallback to user object fields
// 3. If empty string → badge not shown
{!!schoolName && <SchoolBadge>{schoolName}</SchoolBadge>}

// Never shown for super_admin (role_id === 1 or role_name === 'super_admin')
const isSuperAdmin = user?.role_id === 1 || user?.role_name === 'super_admin' || user?.role === 'super_admin';
```

### 6.5 Assessments Filter State from Route Params

`Assessments.tsx` conditionally initializes filter state from route params:

```typescript
const filterStatus = route?.params?.filterStatus;    // from ClassesList
const initialFilter = route?.params?.filter || mapFilterStatus(filterStatus);  // direct filter
const classroomId = route?.params?.classroomId;      // pre-select classroom

// Result: tab + classroom filter pre-set on mount
```

This enables deep-linked filtering from TeacherDashboard stat cards and ClassesList rows.

---

## 7. Screen Relationships (Parent–Child)

### 7.1 Dashboard Flow

```
BottomTabNavigator
  └── [Dashboard tab] RoleDashboard
        ├── [instructor/admin] TeacherDashboard
        │     ├── → StudentAnalyticsScreen  (tap weak student)
        │     ├── → StudentList             (tap recent quiz)
        │     └── → [via QuizGenerationGrid] Create flow
        └── [student] StudentDashboard
              ├── → QuizTakingScreen        (tap active quiz)
              ├── → QuizStatusScreen        (quiz already attempted)
              └── → Assessments            (tap "View All")
```

### 7.2 Assessments Flow

```
BottomTabNavigator
  └── [Assessments tab] / Stack "Assessments"
        └── Assessments.tsx (both roles)
              ├── [teacher] → QuizPreviewScreen        (preview quiz)
              ├── [student, active] → QuizTakingScreen
              │         └── → QuizResultsScreen
              ├── [student, completed] → CompletedAttemptModal (inline modal)
              └── → QuizStatusScreen                  (attempted, check status)
```

### 7.3 Quiz Creation Flow

```
CustomHeader [+ button]
  └── CreateAssessmentModal
        ├── → CreateAIQuizScreen
        │         └── [header right] → RecentAssessmentsScreen
        ├── → CreateDocumentQuizScreen
        ├── → AssessmentWorkspaceScreen (mode='document')
        ├── → CreateImageQuizScreen
        ├── → CreateYouTubeQuizScreen
        ├── → CreateWebsiteQuizScreen
        ├── → CreateHandwrittenQuizScreen
        └── → DocumentUploadHomeScreen
                    ├── → DocumentUploadPreviewScreen
                    ├── → DocumentUploadHistoryScreen
                    └── → DocumentUploadQuizScreen
```

### 7.4 Analytics Flow

```
BottomTabNavigator
  └── [Analytics tab] → ClassesList   ⚠️ (mislabeled as Analytics)
        └── tap classroom → Assessments (classroomId param)
              └── [teacher] → StudentAnalyticsScreen  (via StudentList → StudentAnalyticsScreen)

StudentList (from TeacherDashboard or ClassesList)
  └── tap student → StudentAnalyticsScreen
```

### 7.5 ERP Schools Cross-Navigation

```
BottomTabNavigator
  └── [ERPSchools tab] → SchoolsTabEntry
        └── [persona center] → [Home tab] → navigateToAppMainTab(APP_MAIN_TABS.DASHBOARD)
                                            → BottomTabNavigator "Dashboard" tab
```

This uses `navigateToAppMainTab()` from `navigateToAppMainTab.ts` to escape the ERPSchools navigator back to the main app.

---

## 8. Deep Link Routes

**Scheme:** `eduvijna://` (from `app.json` + Android intent filters)

| Deep Link | Handler | Destination |
|---|---|---|
| `eduvijna://quiz/{quizId}` | `openQuizHandler.ts` → `deepLinkService.ts` | `QuizTakingScreen` |
| `eduvijna://quiz/{quizId}?session={sessionId}` | `openQuizHandler.ts` | `QuizTakingScreen` (with session) |
| `eduvijna://reset-password?token={token}` | `deepLinkNavigationHandler.ts` | Password reset flow |

### Deep Link Processing Flow

```
App.tsx subscribes to Linking events
  → deepLinkService.ts.handleDeepLink(url)
  → parse URL → extract quizId / sessionId
  → openQuizHandler.ts.handleOpenQuiz({ quizId, sessionId })
    → fetch quiz data
    → navigate to QuizLoadingScreen (while fetching)
    → navigate to QuizTakingScreen with normalized quiz data
```

---

## 9. Notification-Driven Navigation

**Source:** `NotificationHandler.tsx` (mounted globally in `BottomTabNavigator`)  
**Trigger:** FCM push notification tap → `NotificationPollingService`

| Notification Type | Navigation Destination |
|---|---|
| `quiz_assigned` | `QuizPreviewScreen` (if `quizId` in data) or `assessments` tab |
| `quiz_graded` | `QuizResultsScreen` (if `quizId` in data) or `assessments` tab |
| `classroom_invite` | `ClassesList` (mobile) or `'classes'` (web) |
| `announcement` | `Notifications` screen |
| Other | `assessments` (if `quizId`) else `Dashboard` |

**Web Notification Navigation** (from `WebNavigation.tsx`):

```typescript
switch(notification.type) {
  case 'quiz_assigned':   onNavigate('QuizPreviewScreen')  // or 'assessments'
  case 'quiz_graded':     onNavigate('QuizResultsScreen')  // or 'assessments'
  case 'classroom_invite': onNavigate('classes')
  case 'announcement':    onNavigate('notifications')
  default:                onNavigate('assessments') or onNavigate('dashboard')
}
```

---

## 10. Cross-Module Navigation

### 10.1 Main App ↔ ERP Schools

**Into ERP Schools:**
```
Main app → tap ERP Schools tab → SchoolsTabEntry
```

**Out of ERP Schools (escape):**
```
Teacher/Student/Admin tabs → Home tab (middle tab) → navigateToAppMainTab(APP_MAIN_TABS.DASHBOARD)
  → calls navigation.navigate('Main', { screen: 'Dashboard' })
  → lands on Dashboard tab in main app
```

**ERP Schools internal:** See `SCREENS.md` for complete Teacher/Student/Admin tab navigation.

### 10.2 Main App ↔ Old ERP

**Into ERP:**
```
Main app → tap ERP tab → ERPNavigator (22-screen NativeStack)
```

**Out of ERP:**
```
Any ERP screen → hardware/gesture back → ERPNavigator → back to Main app
```

### 10.3 TeacherDashboard → StudentList → StudentAnalyticsScreen

```
TeacherDashboard.handleViewQuiz(quizId)
  → navigation.navigate('StudentList', { quizId })
  → StudentList.tsx renders student list for this quiz
  → StudentList.tap(student)
  → navigation.navigate('StudentAnalytics', { studentId, studentName, classroomId, classroomName })
  → StudentAnalyticsScreen
```

### 10.4 ClassesList → Assessments

```
ClassesList.tap(classroom)
  → navigation.navigate('Assessments', {
      filterStatus: quiz.student_status,  // pre-filter tab
      classroomId: quiz.class_id,         // pre-filter classroom
      classroomName: quiz.classroom_name,
    })
```

---

## Navigation Quick Reference

### Mobile Route Names (String Keys)

```
Main, Analytics, Assessments, Dashboard, ERP, ERPSchools, Notifications, Profile,
StudentList, ClassesList,
CreateAIQuizScreen, AssessmentWorkspaceScreen, CreateDocumentQuizScreen,
CreateImageQuizScreen, CreateYouTubeQuizScreen, CreateWebsiteQuizScreen,
CreateHandwrittenQuizScreen,
QuizTakingScreen, QuizResultsScreen, QuizPreviewScreen, QuizStatusScreen, QuizLoadingScreen,
StudentAnalytics, TestNotifications, RecentAssessmentsScreen, WorksheetScreen,
DocumentUploadHomeScreen, DocumentUploadPreviewScreen, DocumentUploadHistoryScreen, DocumentUploadQuizScreen
```

**Total registered routes:** 31

### Web Screen States (String Values)

```
dashboard, assessments, analytics, ClassesList, StudentList, Assessments,
profile, notifications, theme, ERP,
CreateAIQuizScreen, CreateDocumentQuizScreen, CreateImageQuizScreen,
CreateYouTubeQuizScreen, CreateWebsiteQuizScreen, CreateHandwrittenQuizScreen,
QuizPreviewScreen, QuizResultsScreen, QuizTakingScreen, QuizStatusScreen, QuizLoadingScreen
```

**Total web states:** 21

---

## Known Navigation Issues

| Issue | Location | Severity | Description |
|---|---|---|---|
| Analytics tab mounts ClassesList | `BottomTabNavigator.tsx:652` | HIGH | Tab says "Analytics", icon is bar chart, but component is `ClassesList` |
| Web Analytics nav item targets ClassesList | `WebNavigation.tsx:139` | HIGH | `onNavigate('ClassesList')` instead of analytics screen |
| QuizTakingScreen back navigates to Dashboard always | `BottomTabNavigator.tsx:393-407` | MEDIUM | Back/close always go to Main/Dashboard regardless of entry point |
| No history stack for QuizResults | — | LOW | After QuizResultsScreen, back goes to QuizTakingScreen (which was already submitted) |
| ERPSchools tab hides main tab bar | `BottomTabNavigator.tsx:685` | INFO | By design, but can confuse users who forget how to go back |
