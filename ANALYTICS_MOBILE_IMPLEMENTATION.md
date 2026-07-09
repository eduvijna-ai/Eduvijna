# Mobile Analytics Implementation Reference

This document describes how **Teacher Analytics** and **Student Analytics** were implemented in the Eduvijna mobile app to match the Quiz-React web application.

---

## Overview

| Module | Web Route | Mobile Screen | API `view_type` |
|--------|-----------|---------------|-----------------|
| **Teacher Analytics** | `/analytics` | `QuizTeacherAnalyticsScreen` | `all` |
| **Student My Analytics** | `/student-analytics` | `QuizStudentMyAnalyticsScreen` | `student_total_details` |
| **Role Router** | Nav + route guards | `AnalyticsHubScreen` | — |

Both modules use the **same backend endpoint** as web:

```
GET /api/v1/dashboard/quizzes
```

---

## Permissions & Role Routing

### Web (Quiz-React)

| Route | Guard | Roles |
|-------|-------|-------|
| `/analytics` | `TeacherAdminProtectedRoute` | `instructor`, `admin` only |
| `/student-analytics` | `NavProtectedRoute` | DB nav roles (default: student, instructor, admin) |

### Mobile (Eduvijna)

| Entry | Logic |
|-------|-------|
| Bottom tab **Analytics** | `AnalyticsHubScreen` |
| Teacher view | `instructor`, `admin`, `super_admin` → `QuizTeacherAnalyticsScreen` |
| Student view | all other roles → `QuizStudentMyAnalyticsScreen` |

**Note:** `StudentAnalyticsScreen` (existing) is a **different feature** — teacher drill-down for a **single student** from dashboard/class list. It was **not replaced**; it remains on the stack as `StudentAnalytics`.

---

## Architecture

```
Analytics Tab (BottomTabNavigator)
        │
        ▼
AnalyticsHubScreen (role router)
        │
        ├── instructor / admin / super_admin
        │         └── QuizTeacherAnalyticsScreen
        │               └── GET /dashboard/quizzes?view_type=all
        │
        └── student (default)
                  └── QuizStudentMyAnalyticsScreen
                        └── GET /dashboard/quizzes?view_type=student_total_details
```

### Shared layers (ported from Quiz-React)

| Layer | Mobile Path |
|-------|-------------|
| Types | `src/core/types/quizAnalytics.types.ts` |
| API + aggregation | `src/core/services/quizAnalyticsApi.ts` |
| UI helpers | `src/core/utils/analyticsUiUtils.ts` |
| KPI grid | `src/components/analytics/AnalyticsKPIGrid.tsx` |
| Toolbar (refresh/date) | `src/components/analytics/AnalyticsToolbar.tsx` |
| Status filter chips | `src/components/analytics/AnalyticsStatusChips.tsx` |
| Attempt detail modal | `src/components/analytics/QuizAttemptDetailModal.tsx` |

---

## Teacher Analytics (`QuizTeacherAnalyticsScreen`)

### Data flow

1. Fetch quizzes with `view_type=all`, date range (default: last month → tomorrow)
2. Client-side aggregation via `quizAnalyticsApi.ts`:
   - `aggregateClassOverview()` — class cards
   - `aggregateQuizTiles()` — per-quiz metrics in class drill-down
   - `transformToStudentRows()` — student attempts per quiz
   - `generateInsights()`, `calculateAcademicKPIs()`, `calculateStudentHealthKPIs()`
3. All filtering (class, quiz, status) is **in-memory** after initial fetch (same as web)

### UI drill-down

```
Landing (Class Overview)
  ├── KPI tiles (active quizzes, submission rate, avg score, at-risk)
  ├── Class cards → tap
  │
Class drill-down
  ├── Status chips (All, Done, Pending, Missed, Active, Expired)
  ├── Insights
  ├── Quiz cards → tap
  │
Quiz drill-down
  ├── Attempt filter chips (All, Done, Pending, Missed)
  ├── Student attempt rows
  └── View → QuizAttemptDetailModal (parsed log_data)
```

### Advanced KPIs (toggle)

- Academic: overall avg, completion rate, missed rate
- Student health: at-risk, improving, consistent counts

---

## Student My Analytics (`QuizStudentMyAnalyticsScreen`)

### Data flow

1. Fetch with `view_type=student_total_details`
2. Aggregate class overview + student-specific quiz rows
3. `generateInsights()` for student-facing tips
4. `generateStudentKPITiles()` for overview metrics

### UI drill-down

```
Landing
  ├── KPI tiles (completed, pending, avg score, missed)
  ├── My Classes cards → tap
  ├── Recent quizzes list
  │
Class drill-down
  ├── Status filter chips
  └── Quiz rows with actions:
        ├── View (completed + log_data) → detail modal
        └── Start (pending + active) → QuizTakingScreen
```

### Start quiz navigation

```ts
navigation.navigate('QuizTakingScreen', {
  quizId: quiz.quiz_id,
  sessionId: quiz.session_id,
  classroomId: quiz.classroom_id,
});
```

---

## API Reference

### Primary endpoint

```
GET /api/v1/dashboard/quizzes
```

### Teacher initial load

```json
{
  "view_type": "all",
  "limit": 100,
  "offset": 0,
  "created_from": "2026-06-09",
  "created_to": "2026-07-10"
}
```

### Student initial load

```json
{
  "view_type": "student_total_details",
  "limit": 100,
  "offset": 0,
  "created_from": "2026-06-09",
  "created_to": "2026-07-10"
}
```

### Class students (future / web parity)

```json
{
  "view_type": "class_wise_students",
  "classroom_id": "<uuid>",
  "limit": 1000,
  "offset": 0
}
```

Defined in types but not yet wired in mobile UI (web "Show All Students" modal).

---

## Web vs Mobile Feature Matrix

| Feature | Web | Mobile (this implementation) |
|---------|-----|------------------------------|
| Teacher class overview | ✅ | ✅ |
| Class → quiz drill-down | ✅ | ✅ |
| Quiz → student attempts | ✅ | ✅ |
| Attempt detail popup | ✅ | ✅ (`QuizAttemptDetailModal`) |
| KPI banner | ✅ | ✅ (`AnalyticsKPIGrid`) |
| Status filter chips | ✅ | ✅ |
| Insights | ✅ | ✅ |
| Advanced KPI panel | ✅ | ✅ (teacher, toggle) |
| Student class overview | ✅ | ✅ |
| Student quiz table | ✅ | ✅ |
| Start quiz (student) | ✅ (web URL) | ✅ (`QuizTakingScreen`) |
| Highcharts chart views | ✅ | ⏳ Not yet (card/list UI instead) |
| Date picker (custom range) | ✅ | ⏳ Fixed default range shown in toolbar |
| Show All Students modal | ✅ | ⏳ Not yet |
| Worksheet detail popup | ✅ (teacher) | ⏳ Not yet |
| School overview (admin) | ✅ | ⏳ Types + API ready, UI not exposed |
| Pagination controls | ✅ | ⏳ Slice logic present, no page UI |

---

## Navigation Changes

### Before

```
Analytics tab → ClassesList (mislabeled)
```

### After

```
Analytics tab → AnalyticsHubScreen
  → role-based teacher or student analytics

ClassesList → still available via:
  - Stack screen "ClassesList"
  - TeacherDashboard / StudentDashboard shortcuts
```

**File changed:** `src/platforms/mobile/navigation/BottomTabNavigator.tsx`

---

## Comparison with Legacy Mobile Analytics

| Item | Old `platforms/mobile/screens/Analytics.tsx` | New implementation |
|------|-----------------------------------------------|-------------------|
| API | `/analytics/{userId}` (separate endpoints) | `/api/v1/dashboard/quizzes` (web parity) |
| Data model | Custom hooks (`useAnalytics`, etc.) | Ported `quizAnalyticsApi.ts` |
| Reachability | Not mounted on tab | **Analytics tab** |
| Drill-down | None | Class → Quiz → Attempts |
| Student actions | None | View + Start quiz |

The old `Analytics.tsx` screen is **unchanged** and can be removed or repurposed later.

---

## `StudentAnalyticsScreen` (unchanged)

**Path:** `src/screens/StudentAnalyticsScreen.tsx`

This screen is for **teachers viewing one student** (from `TeacherDashboard` weak students or `StudentList`). It uses `dashboardApi.ts` (`view_type=summary/all`), not the new quiz analytics module.

Do not confuse with `QuizStudentMyAnalyticsScreen` (student self-view).

---

## Testing Checklist

### Teacher (instructor/admin account)

- [ ] Open **Analytics** tab → see "Analytics Dashboard"
- [ ] KPI tiles load (active quizzes, submission rate, etc.)
- [ ] Class cards show avg score, completion metrics
- [ ] Tap class → quiz cards appear
- [ ] Tap quiz → student attempt list
- [ ] Tap **View** on completed attempt → answer breakdown modal
- [ ] Pull to refresh works
- [ ] Toggle advanced KPIs

### Student account

- [ ] Open **Analytics** tab → see "My Quiz Analytics"
- [ ] KPI tiles (completed, pending, avg, missed)
- [ ] Class cards and recent quiz list
- [ ] Tap class → filtered quiz list
- [ ] **View** on completed quiz → detail modal
- [ ] **Start** on active pending quiz → `QuizTakingScreen`

### Regression

- [ ] `ClassesList` still opens from dashboard
- [ ] `StudentAnalytics` stack screen still works from teacher flows

---

## Files Added / Modified

### Added

- `src/core/types/quizAnalytics.types.ts`
- `src/core/services/quizAnalyticsApi.ts`
- `src/core/utils/analyticsUiUtils.ts`
- `src/components/analytics/AnalyticsKPIGrid.tsx`
- `src/components/analytics/AnalyticsToolbar.tsx`
- `src/components/analytics/AnalyticsStatusChips.tsx`
- `src/components/analytics/QuizAttemptDetailModal.tsx`
- `src/screens/AnalyticsHubScreen.tsx`
- `src/screens/QuizTeacherAnalyticsScreen.tsx`
- `src/screens/QuizStudentMyAnalyticsScreen.tsx`
- `ANALYTICS_MOBILE_IMPLEMENTATION.md` (this file)

### Modified

- `src/platforms/mobile/navigation/BottomTabNavigator.tsx` — Analytics tab → `AnalyticsHubScreen`

---

## Future Enhancements

1. **Date range picker** — interactive from/to like web date inputs
2. **Chart views** — optional `react-native-chart-kit` or SVG charts for status/score visualizations
3. **Show All Students** — `class_wise_students` API + modal
4. **Admin school overview** — `calculateSchoolOverviewKPIs()` UI for admin role
5. **Worksheet submissions** — `WorksheetDetailPopup` parity in attempt modal
6. **Pagination UI** — page controls for long lists
7. **Web sidebar fix** — route web Analytics nav to `analytics` screen (separate task)

---

*Last updated: July 2026 — aligned with Quiz-React `AnalyticsPage` and `StudentAnalyticsPage`.*
