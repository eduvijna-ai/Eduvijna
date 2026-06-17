# UI_REFACTOR_PLAN.md

> **Purpose:** Comprehensive plan for refactoring the UI of Analytics, Assessments, and Home Dashboard to match the architecture and design quality of the ERP Schools module.
> **Constraint:** DO NOT modify APIs, services, business logic, or navigation routes. Only refactor UI layer.
> **Last updated:** June 17, 2026

---

## Table of Contents

1. [Current UI Architecture](#1-current-ui-architecture)
2. [ERP Schools UI Architecture (Reference)](#2-erp-schools-ui-architecture-reference)
3. [Gap Analysis](#3-gap-analysis)
4. [Reusable Component Inventory](#4-reusable-component-inventory)
5. [Screens Requiring Refactor](#5-screens-requiring-refactor)
6. [Refactor Priority Matrix](#6-refactor-priority-matrix)
7. [Risk Matrix](#7-risk-matrix)
8. [Migration Strategy](#8-migration-strategy)
9. [Dependency Impact Analysis](#9-dependency-impact-analysis)

---

## 1. Current UI Architecture

### 1.1 Design System

The current Analytics, Assessments, and Dashboard screens use a **fragmented, inline style system**:

| Attribute | Current Approach | Problem |
|---|---|---|
| Colors | Hardcoded hex strings in `StyleSheet.create()` | No token system — `#3B82F6`, `#10B981`, `#EF4444` etc. scattered throughout |
| Typography | Raw `fontSize` + `fontWeight` values inline | No typographic scale — `fontSize: 24, fontWeight: 'bold'` written per-screen |
| Spacing | Raw pixel values (`padding: 16`, `margin: 8`) | No spacing scale — every screen re-defines its own spacing |
| Corner Radius | Inline `borderRadius: 12` | Inconsistent — varies between screens (8, 10, 12, 16) |
| Shadows | Inline `shadowColor`, `shadowOffset`, `shadowOpacity`, `elevation` | Not standardized |
| Theme Support | `useTheme()` hook available but **not used in most remaining module screens** | Dashboard mobile/simple screen uses theme; TeacherDashboard uses it; StudentDashboard uses it; Assessments uses it; **Analytics screens use hardcoded colors only** |
| Dark Mode | `isDark` flag from `useTheme` — partially applied | Analytics screens do not respond to dark mode |
| Font | Poppins via `vendor/react-native.ts` shim | Works system-wide, but ERP Schools uses explicit `fontFamily: 'Poppins-SemiBold'` tokens |

### 1.2 Card Design (Current)

Cards in current screens are simple `<View>` with inline `StyleSheet`:

```typescript
// Example: TeacherDashboard stat card
{
  backgroundColor: '#FFFFFF',
  padding: 16,
  borderRadius: 12,
  borderLeftWidth: 4,
  borderLeftColor: '#3B82F6',  // hardcoded color
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 2,
}
```

### 1.3 Screen Layout (Current)

Current screen structure:
```
<ScrollView style={{ backgroundColor: '#F9FAFB' }}>
  <View style={{ padding: 16 }}>   ← section
    <Text style={{ fontSize: 18, fontWeight: '600' }}>Title</Text>
    {items.map(...)}
  </View>
</ScrollView>
```

No consistent screen wrapper component.  
No shared header component (uses native stack header).  
No consistent section header pattern.

### 1.4 List / Table Design (Current)

Lists are rendered with `{items.map(item => <View key={item.id}>...)}` — no shared list component.

### 1.5 Chart / Visualization (Current)

No chart library is used. "Charts" are:
- Topic bar: `<View style={{ width: `${score}%`, backgroundColor: color }} />`
- Progress bar: `<View style={{ width: `${pct}%`, height: 8, backgroundColor: '#EF4444' }} />`
- No tooltips, legends, or interactive elements

### 1.6 Filter Tabs (Current)

Status filters are inline `TouchableOpacity` grids with hardcoded styles. Different screens implement the same filter UI differently:
- `Assessments.tsx` — filter tabs + classroom filter dropdown + date filter
- `StudentAnalyticsScreen.tsx` — status dropdown + sort dropdown + date range picker + quiz selector
- `Analytics.tsx` — week/month/year buttons

---

## 2. ERP Schools UI Architecture (Reference)

### 2.1 Design Token System

ERP Schools uses `src/erp_schools/theme/tokens.ts`:

```typescript
// Spacing scale
spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }

// Typography scale
fontSize: { xs: 11, sm: 12, md: 14, lg: 16, xl: 18, xxl: 24, xxxl: 32 }
fontWeight: { regular: '400', medium: '500', semiBold: '600', bold: '700' }

// Radius
radius: { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 }

// Shadows
shadow: { sm: {...}, md: {...}, lg: {...} }

// Color palette via useTeacherTheme() / accents.ts
```

### 2.2 Screen Wrapper Component

ERP Schools screens use `TeacherScreen` / similar wrappers that provide:
- Safe area handling
- Consistent background color
- Header slot
- ScrollView with standard padding

### 2.3 Card Patterns

ERP Schools cards follow structured patterns:
- **Metric card:** Icon + label + value in teal/white design
- **Overview card:** White card overlapping hero section with `borderRadius: 16` and clean shadow
- **List item card:** Left border accent, icon, title, subtitle, meta

### 2.4 Typography Pattern

ERP Schools uses mixed weight per line:
```
Welcome, (Poppins-Medium) + Name (Poppins-Bold) + 👋
```

Consistent use of `fontFamily: 'Poppins-SemiBold'`, `'Poppins-Regular'` etc.

### 2.5 Navigation Pattern

ERP Schools uses:
- Bottom tab bar with 5 items
- Stack screens pushed modally or as cards
- `useMainAppNavigation()` hook for cross-module navigation
- No global header — each screen has its own header or uses `TeacherScreen` wrapper

### 2.6 Colors

ERP Schools primary: `teal (#1B4F5C or similar)`  
Status colors: `green (#059669 bg: #D1FAE5)`, `red (#DC2626 bg: #FEE2E2)`, `amber (#F59E0B bg: #FEF3C7)`, `teal-light (#1B4F5C bg: #E8F4F8)`

---

## 3. Gap Analysis

### 3.1 Design System Gaps

| Dimension | Current (Analytics/Assessments/Dashboard) | ERP Schools | Gap |
|---|---|---|---|
| Color tokens | ❌ Hardcoded hex | ✅ `tokens.ts` | **HIGH** |
| Spacing tokens | ❌ Hardcoded px | ✅ `spacing` scale | **HIGH** |
| Typography tokens | ❌ Hardcoded `fontSize/fontWeight` | ✅ `fontSize/fontWeight` scale | **HIGH** |
| Dark mode support | ⚠️ Partial (Dashboard uses theme, Analytics doesn't) | ❌ Not applicable (ERP Schools is light-only) | MEDIUM |
| Screen wrapper | ❌ No wrapper | ✅ `TeacherScreen` component | MEDIUM |
| Card components | ❌ Inline `StyleSheet` | ✅ Structured card patterns | **HIGH** |
| Chart components | ❌ `View` width hacks | ❌ Custom as well but structured | MEDIUM |
| Filter components | ⚠️ `FilterComponents.tsx` exists but not consistent | ✅ `IconTabs` component | MEDIUM |
| Loading states | ⚠️ `LoadingSpinner` used inconsistently | ✅ Consistent skeleton/spinner | MEDIUM |
| Empty states | ❌ No empty state components | ✅ Illustrated empty states | **HIGH** |

### 3.2 Screen Structure Gaps

| Screen | Hero Section | Stats Grid | Section Headers | Card Style | Empty State | Dark Mode |
|---|---|---|---|---|---|---|
| TeacherDashboard | ❌ None | ⚠️ Basic 3-tile row | ⚠️ Plain text | ⚠️ Left-border cards | ❌ No | ✅ Partial |
| StudentDashboard | ❌ None | ⚠️ Basic 4-tile row | ⚠️ Plain text | ⚠️ Basic white cards | ❌ No | ✅ Partial |
| Assessments | ❌ No hero | ⚠️ No stats | ✅ Filter tabs | ⚠️ Quiz list items | ⚠️ Minimal | ✅ Partial |
| Analytics (mobile) | ❌ None | ⚠️ 4-up summary grid | ⚠️ Plain text | ⚠️ Basic cards | ❌ No | ❌ None |
| StudentAnalyticsScreen | ❌ None | ⚠️ Summary cards | ⚠️ Section dividers | ⚠️ Quiz items + topic bars | ❌ No | ✅ Partial |

### 3.3 Navigation UX Gaps

| Issue | Description | Screens Affected |
|---|---|---|
| Analytics tab mislabeling | Tab says "Analytics" but shows `ClassesList` | BottomTabNavigator |
| No breadcrumbs | Deep navigation has no way to understand where you are | StudentAnalyticsScreen |
| Back from QuizTaking | Custom back arrow navigates to Dashboard, not previous screen | QuizTakingScreen |
| No onboarding / empty state | New teacher/student sees blank screen with no guidance | TeacherDashboard, StudentDashboard |

---

## 4. Reusable Component Inventory

### 4.1 Components to Build (New, Shared)

These should be created in `src/components/` (shared) and used across the refactored screens:

| Component Name | Purpose | Used By |
|---|---|---|
| `StatCard` | Metric tile — icon + label + value + optional color accent | TeacherDashboard, StudentDashboard, Analytics |
| `SectionHeader` | Section label + optional "See All" button | All screens |
| `ProgressBar` | Labeled progress bar with percentage | Analytics, StudentAnalyticsScreen |
| `AssessmentCard` | Quiz/Assessment list item — title, status badge, metadata row | Assessments, Dashboard |
| `StatusBadge` | Pill badge — color by status (active/expired/upcoming/completed/missed) | Assessments, Dashboard |
| `EmptyState` | Illustrated empty state with title + description + optional CTA | All screens |
| `FilterTabBar` | Horizontal scrollable filter tabs | Assessments, Analytics |
| `ScreenWrapper` | Safe area + background + scroll wrapper | All remaining module screens |
| `DashboardHero` | Gradient/solid hero section with welcome + overview card | TeacherDashboard, StudentDashboard |
| `TopicBar` | Topic name + color bar + score % — for analytics | Analytics, StudentAnalyticsScreen |
| `StudentRow` | Student avatar + name + score + trend pill | StudentAnalyticsScreen, TeacherDashboard weak students |
| `ScoreIndicator` | Circle with large % + grade letter | QuizResultsScreen |

### 4.2 Existing Components to Reuse (Already in Codebase)

| Component | Location | Reuse Notes |
|---|---|---|
| `LoadingSpinner` | `src/components/LoadingSpinner.tsx` | Already used, keep as-is |
| `FilterComponents` | `src/components/FilterComponents.tsx` | Keep, consolidate filter UI into it |
| `CreateAssessmentModal` | `src/components/CreateAssessmentModal.tsx` | Keep as-is |
| `MathRenderer` | `src/components/MathRenderer.tsx` | Keep as-is |
| `QuizExplanationAccordion` | `src/components/QuizExplanationAccordion.tsx` | Keep as-is |
| `QuizGenerationGrid` | `src/components/QuizGenerationGrid.tsx` | Keep as-is |
| `DonutChart` (ERP Schools) | `src/erp_schools/components/DonutChart.tsx` | Consider adapting for Analytics module |

### 4.3 ERP Schools Components Worth Adapting

| ERP Schools Component | Potential Use in Remaining Modules |
|---|---|
| `TeacherScreen` wrapper | Basis for new `ScreenWrapper` |
| `IconTabs` | Replace current filter tab implementations |
| `QuickActionGrid` | Replace `QuizGenerationGrid` in TeacherDashboard |
| `DonutChart` | Use in Analytics for completion rate visualization |
| `StudentIdentityHeader` | Adapt for `StudentAnalyticsScreen` student header |

---

## 5. Screens Requiring Refactor

### 5.1 TeacherDashboard.tsx — Refactor Scope

**Current Issues:**
- No hero / welcome section
- Stat cards use left-border color accent (not ERP Schools style)
- `weakStudents` list has no avatar, just plain text
- `recentAssessments` list items are plain text rows
- No empty states
- Typography is inconsistent with ERP Schools

**Refactor Vision:**
```
TeacherDashboard
  ├── DashboardHero (welcome + school name + avatar)
  ├── StatsRow (3 StatCards: quizzes, students, avg score)
  ├── SectionHeader ("Recent Assessments") + See All button
  │     └── AssessmentCard[] (5 items)
  ├── SectionHeader ("Students Needing Attention")
  │     └── StudentRow[] (with score + trend pill)
  └── SectionHeader ("Quick Actions")
        └── QuizGenerationGrid
```

**APIs to Preserve:** All data comes from `useTeacherDashboard()` hook — no API changes needed.

---

### 5.2 StudentDashboard.tsx — Refactor Scope

**Current Issues:**
- No hero section
- Stats are 4 plain cards without icons or visual hierarchy
- Quiz list items are plain white cards
- No classroom visual grouping
- Deduplication logic is complex and embedded in the component

**Refactor Vision:**
```
StudentDashboard
  ├── DashboardHero (welcome + avg score ring)
  ├── StatsRow (4 StatCards: total, pending, completed, avg%)
  ├── FilterTabBar (All / Pending / Upcoming / Completed / Missed)
  ├── SectionHeader ("Pending Quizzes")
  │     └── AssessmentCard[] (pending, with due date countdown)
  ├── SectionHeader ("Upcoming Quizzes")
  │     └── AssessmentCard[] (upcoming, with start time)
  └── SectionHeader ("Completed")
        └── AssessmentCard[] (with score badge)
```

**APIs to Preserve:** `fetchQuizCheckRecord` call in `fetchDashboardData` — no API changes.  
**Logic to Preserve:** Deduplication logic (`quizMap` by `quiz_id + session_id`), stats calculation — keep in component or extract to a hook.

---

### 5.3 Assessments.tsx — Refactor Scope

**Current Issues:**
- Very large (60KB) — mixing too many concerns in one file
- Filter UI (tabs + classroom + date + search) is visually complex
- Quiz list items differ between teacher and student view
- `completedAttemptModal` is inline — not a separate component

**Refactor Vision:**
```
Assessments
  ├── StickySearchBar
  ├── FilterTabBar (role-aware tabs)
  ├── FilterRow (Classroom + Date filters — compact)
  └── AssessmentCard[] (role-aware: teacher shows student counts, student shows score/status)
       └── [teacher] QuizStatsRow (pending count, completed count)
       └── [student] ScoreBadge + StatusBadge
```

**APIs to Preserve:** `useTeacherDashboard`, `useDashboardStore` (student), `checkQuizAttempt`, `getQuizBySessionId` — no changes.

---

### 5.4 Analytics Screens — Refactor Scope

**Mobile Analytics (Analytics.tsx):**
- Replace hardcoded colors with `useTheme()` tokens
- Replace custom bar charts with proper `ProgressBar` component
- Add `ScoreIndicator` for overall average

**StudentAnalyticsScreen.tsx:**
- Extract topic analysis into `TopicBar` component
- Add `StudentRow` for weak/strong topic display
- Replace inline filter dropdowns with `FilterTabBar`
- Add `DashboardHero` with student name and summary stats

---

### 5.5 QuizResultsScreen.tsx — Refactor Scope

**Current Issues:**
- Score display is a plain large text number
- No visual grade indicator
- No animated reveal

**Refactor Vision:**
```
QuizResultsScreen
  ├── ScoreIndicator (large circle with %, animated fill)
  ├── GradeBadge (A+/A/B+/B/C/D/F pill)
  ├── StatsRow (correct, incorrect, time taken)
  └── QuestionReview accordion (per question with explanation)
```

---

## 6. Refactor Priority Matrix

| Priority | Screen | Why | Effort |
|---|---|---|---|
| 1 — Highest | `TeacherDashboard.tsx` | First screen teachers see; most visible | MEDIUM |
| 2 | `StudentDashboard.tsx` | First screen students see; highest user traffic | HIGH |
| 3 | `Assessments.tsx` | Most used feature screen; size makes it hardest | HIGH |
| 4 | `QuizTakingScreen.tsx` | Critical UX — quiz experience | HIGH |
| 5 | `QuizResultsScreen.tsx` | High moment of truth for students | LOW |
| 6 | `StudentAnalyticsScreen.tsx` | Teacher-only detailed view | MEDIUM |
| 7 | `Analytics.tsx` (mobile) | Currently behind mislabeled tab | LOW |
| 8 | `Dashboard.tsx` (platform prototype) | Prototype, not actively used | LOW |

**Recommended Phase Order:**
1. **Phase 1:** Build shared component library (`StatCard`, `AssessmentCard`, `SectionHeader`, `ScreenWrapper`, `StatusBadge`, `EmptyState`, `FilterTabBar`)
2. **Phase 2:** Refactor `TeacherDashboard` + `StudentDashboard` using new components
3. **Phase 3:** Refactor `Assessments.tsx` (requires splitting into sub-components)
4. **Phase 4:** Refactor `QuizTakingScreen` + `QuizResultsScreen`
5. **Phase 5:** Refactor `StudentAnalyticsScreen` + `Analytics.tsx`

---

## 7. Risk Matrix

### Per-Screen Risk Assessment

| Screen | Risk Level | Risk Factors | Mitigation |
|---|---|---|---|
| `TeacherDashboard.tsx` | **LOW** | Thin UI wrapper over `useTeacherDashboard` hook; no API logic in UI | Extract hook data to same interface |
| `StudentDashboard.tsx` | **MEDIUM** | Has complex deduplication and stats logic embedded in component; store sharing with Assessments | Keep `fetchDashboardData()` function intact; only replace JSX rendering |
| `Assessments.tsx` | **HIGH** | 60KB file; quiz tap flow involves 4 API calls; role-based branching; modal state; route params | Refactor JSX only; keep all handlers, state, and API calls unchanged |
| `QuizTakingScreen.tsx` | **HIGH** | Timer logic; `findOrCreateAttempt` create-or-reuse; answer state; submission flow | Change only visual layer (question card, option buttons); keep all logic |
| `QuizResultsScreen.tsx` | **LOW** | All data via route params; no API calls | Pure UI refactor |
| `StudentAnalyticsScreen.tsx` | **MEDIUM** | Teacher API calls embedded; filtering logic in component | Keep API calls; extract to custom hook if needed |
| `Analytics.tsx` (mobile/web) | **LOW** | Uses hooks cleanly; swap colors + layout | Minimal risk |

### Risk Legend

| Level | Definition |
|---|---|
| LOW | UI-only changes with no state or API coupling; safe to refactor in one PR |
| MEDIUM | Some state or business logic mixed in UI; requires careful extraction |
| HIGH | Business logic, navigation, and API calls deeply coupled to UI; requires methodical refactor |

---

## 8. Migration Strategy

### 8.1 Principle: API Preservation Contract

**Before any refactor, document:**
1. What API endpoints this screen calls
2. What route params it reads
3. What navigation actions it performs
4. What state it shares with other screens (via Zustand stores)

**This contract must be preserved exactly** through the refactor.

### 8.2 Approach: Component Extraction Pattern

For each screen, follow this pattern:

```
Step 1: Read current screen fully — identify:
  - API calls / service calls
  - Hook usages
  - Store reads/writes
  - Navigation actions
  - Route params consumed

Step 2: Create new shared components:
  - Pure presentational (no hooks, no navigation)
  - Accept all data via props
  - Handle no business logic

Step 3: Refactor screen JSX:
  - Keep ALL hooks, handlers, API calls, state
  - Replace <View>/<Text> blocks with new components
  - Pass data to new components via props

Step 4: Test:
  - Same API calls fire
  - Same navigation occurs
  - Same store writes happen
  - Role-based rendering works
```

### 8.3 StyleSheet Migration Pattern

For each screen transitioning to the theme token system:

```typescript
// BEFORE (hardcoded)
backgroundColor: '#F9FAFB',
color: '#111827',
fontSize: 18,
fontWeight: '600',

// AFTER (theme tokens)
const { theme } = useTheme();
backgroundColor: theme.colors.background,
color: theme.colors.text,
fontSize: theme.typography?.h3 || 18,
fontWeight: '600',
```

> **Important:** `src/platforms/mobile/screens/Analytics.tsx` currently does NOT import `useTheme`. This must be added first.

### 8.4 Phase 1: Shared Component Library

Create these files:

```
src/components/ui/
  ├── StatCard.tsx          ← metric display
  ├── AssessmentCard.tsx    ← quiz/assessment list item
  ├── SectionHeader.tsx     ← titled section with optional CTA
  ├── StatusBadge.tsx       ← color pill for status
  ├── ProgressBar.tsx       ← labeled progress bar
  ├── EmptyState.tsx        ← illustrated empty state
  ├── FilterTabBar.tsx      ← horizontal tab filter
  ├── ScreenWrapper.tsx     ← safe area + bg + scroll
  ├── ScoreIndicator.tsx    ← circular score display
  └── DashboardHero.tsx     ← hero with welcome + metric
```

---

## 9. Dependency Impact Analysis

### 9.1 Screens That Share State (Must Stay Consistent)

| Store | Screens Reading | Screens Writing | Refactor Risk |
|---|---|---|---|
| `useDashboardStore` | `Assessments.tsx` (student), `ClassesList.tsx` | `StudentDashboard.tsx` | HIGH — student must write before Assessments reads |
| `useTeacherDashboardStore` | `TeacherDashboard`, `Assessments.tsx` (teacher), `RecentAssessmentsScreen`, `StudentAnalyticsScreen` | Auto-loaded by `useTeacherDashboard` | MEDIUM |
| `useUserStore` | All screens (role-based rendering) | Auth flow | LOW |

### 9.2 Component Usage Chain (Don't Break These)

```
CreateAssessmentModal (global, in header)
  → onPress → navigate to Create screens
  → These Create screens are NOT in refactor scope

QuizTakingScreen → QuizResultsScreen
  → Passes quizId, score, answers, quiz via route.params
  → If QuizResultsScreen UI changes, must keep same route.params interface

StudentDashboard → useDashboardStore
  → Assessments.tsx (student) reads from same store
  → Must keep setQuizzes(parsed, total) call intact
```

### 9.3 Deep Link Impact

Quiz deep links (`eduvijna://quiz/{quizId}`) are handled by `openQuizHandler.ts` → navigate to `QuizTakingScreen`. Refactoring `QuizTakingScreen` UI must not change its registered route name or param interface.

### 9.4 Push Notification Impact

`NotificationHandler.tsx` navigates to `QuizTakingScreen` and `QuizResultsScreen` on notification tap. Route names must remain:
- `QuizTakingScreen`
- `QuizResultsScreen`
- `QuizPreviewScreen`

### 9.5 Web Navigation Impact

`WebNavigation.tsx` state machine uses string literal screen names. After refactor, web screen components must still accept `onNavigate` prop pattern used by `App.tsx` web render tree.

---

## Summary: Recommended Refactor Order

| Phase | Deliverables | Risk | Estimated Effort |
|---|---|---|---|
| **Phase 0** | API Preservation Audit (document all API contracts per screen) | None | 2 days |
| **Phase 1** | Build `src/components/ui/` shared library (10 new components) | None | 3-4 days |
| **Phase 2** | Refactor `TeacherDashboard` + `StudentDashboard` | LOW-MEDIUM | 3-4 days |
| **Phase 3** | Refactor `Assessments.tsx` (major refactor, split file) | HIGH | 5-7 days |
| **Phase 4** | Refactor `QuizTakingScreen` + `QuizResultsScreen` | HIGH-LOW | 4-5 days |
| **Phase 5** | Refactor `Analytics.tsx` + `StudentAnalyticsScreen` | LOW-MEDIUM | 3-4 days |
| **Phase 6** | Fix Analytics tab routing bug (Analytics → ClassesList mismatch) | LOW | 1 day |
| **Total** | | | **~21-27 dev days** |
