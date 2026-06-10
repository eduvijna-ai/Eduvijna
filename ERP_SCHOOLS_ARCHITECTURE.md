# ERP_SCHOOLS_ARCHITECTURE.md — EduVijna ERP Schools Module

> **Status:** Foundation + Teacher module (UI-only, no API integration yet)
> **Scope of this document:** Architecture, folder structure, navigation, shared
> component inventory, screen plan, reuse analysis, gap analysis, and roadmap for a
> brand-new, isolated **ERP Schools** module that lives *alongside* the existing
> `src/erp/` module without modifying it.

---

## 0. Guiding Constraints (non-negotiable)

| # | Constraint | How it is honoured |
|---|------------|--------------------|
| 1 | **Do not modify the existing ERP module** (`src/erp/`) | The new module lives in a separate top-level folder `src/erp_schools/`. No file under `src/erp/` is touched. |
| 2 | **No route collisions / no breaking changes** | The new module has its own self-contained navigator with its own param-list and route names prefixed `Teacher*`. It is **not** wired into the existing `BottomTabNavigator` automatically — a single additive integration snippet is documented (§9). |
| 3 | **Reuse existing auth/session** | The module consumes the existing `useUserStore` (Zustand) + `useAuth` hook. No new login/token/refresh logic is created. |
| 4 | **Reuse existing design system + state management** | Dark-mode awareness comes from the existing `ThemeContext` (`useTheme`). Global state continues to use **Zustand**. |
| 5 | **Scale for Teacher → Student → Parent → Principal → Admin** | Personas are first-class: navigation, theme, and folder layout are persona-scoped so new personas plug in without restructuring (§8). |
| 6 | **UI only for now** | Screens render from typed **mock fixtures** in `erp_schools/data/`. A single swap of the data layer (fixtures → API hooks) later integrates the backend with zero screen changes. |

---

## 1. Discovery Summary — What Already Exists (and is reused)

Traced from `SKILLS.md` + source:

| Concern | Existing implementation | Decision for ERP Schools |
|---------|------------------------|--------------------------|
| **Framework** | Expo SDK 54 / RN 0.81.5 / React 19 / TS strict | Same — no new runtime deps |
| **Auth** | `useAuth` (`src/core/hooks/useAuth.ts`) + `useUserStore` (`src/core/store/user.store.ts`); JWT via `tokenStorage.ts` | **Reused as-is.** New `useTeacherSession()` is a thin read-only adapter over `useUserStore`. |
| **Role detection** | `role === 'instructor' \|\| role === 'teacher'` (`src/erp/hooks/useErpRole.ts`) | Same predicate, re-implemented locally over `@core` so the module does **not** depend on `src/erp/`. |
| **Navigation** | React Navigation 6 — native-stack + bottom-tabs. ERP is a nested stack inside the `ERP` tab. | New module = **independent native-stack** (`TeacherNavigator`) containing a **bottom-tab** (`TeacherTabs`) + detail stack screens. |
| **State** | Zustand (5 stores) + Context (Theme, Dropdown) | **Zustand** for module UI state (`teacherUI.store.ts`). |
| **Theme** | `ThemeContext` → `useTheme()` returns `{ theme, isDark }`; tokens in `src/theme/theme.ts` | Reuse `isDark`. Add DESIGN.md-accurate token set in `erp_schools/theme/tokens.ts` (extends, does not replace). |
| **Storage** | AsyncStorage + SecureStore via `tokenStorage.ts` | Not needed yet (UI-only). Will reuse when APIs land. |
| **Icons** | `@expo/vector-icons` (Ionicons) | Same. |
| **Charts/Gradients** | `react-native-svg` 15.12.1 available; **no** `expo-linear-gradient` | Gradients + donut charts built with `react-native-svg` (no new dependency). |
| **Path aliases** | `@core @screens @platforms @mobile @web @context @theme @components` (tsconfig + babel) | Reused. The module imports via existing aliases + relative paths internally. (No new alias is required; one is *suggested* in the roadmap.) |

### Why a sibling folder `src/erp_schools/` (not `src/modules/erp_schools/`)

The existing convention is a **flat feature folder** (`src/erp/`, not `src/modules/erp/`). To stay
consistent and to read as a true sibling of `src/erp/`, the new module is `src/erp_schools/`.
This is an intentional, documented deviation from the prompt's `src/modules/...` illustration in
favour of matching the repository's real convention.

---

## 2. Proposed Folder Structure

```
src/erp_schools/
├── index.ts                      # Public entry — exports <ERPSchoolsTeacherApp/> + TeacherNavigator
├── ERPSchoolsTeacherApp.tsx      # Mountable root (wraps TeacherNavigator in module providers)
│
├── navigation/
│   ├── TeacherNavigator.tsx      # Root native-stack (tabs + detail screens)
│   ├── TeacherTabs.tsx           # Bottom-tab navigator (Home/Classes/Students/Reports/More)
│   └── routes.ts                 # Route name constants (collision-free, Teacher*-prefixed)
│
├── theme/
│   ├── tokens.ts                 # DESIGN.md palette (light+dark), typography, spacing, radius, shadow, gradients
│   └── useTeacherTheme.ts        # Hook: merges dark-mode flag from @context/ThemeContext with tokens
│
├── types/
│   ├── navigation.ts             # Param lists for stack + tabs (type-safe routes)
│   └── domain.ts                 # Teacher domain models (ClassInfo, StudentInfo, Assignment, …)
│
├── hooks/
│   ├── useTeacherSession.ts      # Read-only adapter over @core auth (identity, role, schoolId)
│   └── useTeacherData.ts         # Selector hooks over mock fixtures (single seam for future API)
│
├── store/
│   └── teacherUI.store.ts        # Zustand — cross-screen UI state (active class, filters)
│
├── data/                         # MOCK fixtures only (NO network). One seam to replace with APIs.
│   ├── classes.ts  students.ts  schedule.ts  timetable.ts  attendance.ts
│   ├── assignments.ts  assessments.ts  materials.ts  notices.ts
│   ├── communication.ts  payroll.ts  reports.ts  profile.ts  notifications.ts
│
├── components/                   # Shared, reusable, persona-agnostic UI primitives
│   ├── index.ts                  # Barrel export
│   ├── Gradient.tsx              # SVG linear-gradient background (no extra dep)
│   ├── TeacherScreen.tsx         # Safe-area + scroll scaffold (Header/Content/BottomNav contract)
│   ├── TeacherTopBar.tsx         # Logo + notifications + avatar (dashboard header)
│   ├── ScreenHeader.tsx          # Back + centered title + trailing action
│   ├── HeroCard.tsx              # Gradient hero / class-context banner
│   ├── ClassContextBanner.tsx    # "Class 8-A · Science · Room 204 · 32 Students" banner
│   ├── StatCard.tsx / StatGrid.tsx
│   ├── QuickActionGrid.tsx       # 2/4-column action tiles
│   ├── SurfaceCard.tsx           # Generic card
│   ├── SectionHeader.tsx         # Title + "View All ›"
│   ├── ListItem.tsx              # Avatar/icon + title/subtitle + trailing
│   ├── Avatar.tsx                # Image or initials
│   ├── Badge.tsx / StatusPill.tsx
│   ├── SearchBar.tsx  FilterChips.tsx  SegmentedControl.tsx
│   ├── PrimaryButton.tsx         # Solid + gradient CTA
│   ├── ProgressBar.tsx  DonutChart.tsx  BarChart.tsx   (svg)
│   └── EmptyState.tsx  SkeletonCard.tsx
│
└── screens/teacher/              # Screens grouped by domain (§5)
    ├── dashboard/   profile/   attendance/   payroll/   classes/
    ├── students/    assignments/ assessments/ materials/ timetable/
    ├── communication/ notices/  reports/      ai/        settings/
```

---

## 3. Navigation Architecture

```
ERPSchoolsTeacherApp                      (module root – mountable from anywhere)
  └── TeacherThemeProvider (implicit via hook)   [no NavigationContainer here]
        └── TeacherNavigator   (createNativeStackNavigator<TeacherStackParamList>)
              ├── TeacherTabs  (createBottomTabNavigator<TeacherTabParamList>)  ← initial
              │     ├── TeacherHome        → dashboard/TeacherHomeScreen
              │     ├── TeacherClasses     → classes/MyClassesScreen
              │     ├── TeacherStudents    → students/StudentListScreen
              │     ├── TeacherReports     → reports/ReportsDashboardScreen
              │     └── TeacherMore        → settings/MoreMenuScreen
              │
              └── Detail / flow screens (pushed on top of tabs):
                    Profile, MyAttendance, AttendanceCalendar,
                    PayrollDashboard, PayslipDetails, SalaryHistory,
                    LeaveDashboard, ApplyLeave, LeaveHistory,
                    ClassDetails, StudentProfile, StudentAttendance,
                    MarkAttendance, AttendanceReport, GradeStudents,
                    AssessmentList, AssessmentDetails,
                    AssignmentDashboard, CreateAssignment, AssignmentSubmissions,
                    StudyMaterial, UploadMaterial, ResourceLibrary,
                    Timetable, ParentCommunication, ParentChat, BroadcastMessage,
                    NoticeBoard, CreateNotice, ScheduledNotice,
                    AttendanceAnalytics, AssignmentAnalytics, AssessmentAnalytics,
                    StudentProgressAnalytics, AITeacherAssistant, Notifications, Settings
```

**Collision-free guarantee:** every route name is unique to this module (`TeacherHome`,
`MarkAttendance`, …). The existing ERP stack uses `ERP*` names; the main app uses `Dashboard`,
`Assessments`, etc. No overlap. The module exposes **a navigator, not a `NavigationContainer`**, so
it nests cleanly inside the app's existing container (avoids nested-container bugs).

**Bottom-tab choice:** 5 tabs max (per DESIGN.md). The persistent bar is
`Home · Classes · Students · Reports · More`. Domain screens (Attendance, Timetable, Notices, …)
are reached from Quick Actions / the More menu and pushed onto the stack — matching the reference
screens where the active tab changes contextually.

---

## 4. Shared Component Inventory

| Component | Purpose | Used by |
|-----------|---------|---------|
| `Gradient` | SVG linear-gradient fill (replaces `expo-linear-gradient`) | HeroCard, PrimaryButton, banners |
| `TeacherScreen` | Safe-area scaffold: header slot + scroll content + optional footer CTA | every screen |
| `TeacherTopBar` | Logo + notification bell (badge) + profile avatar | Home, dashboard-style screens |
| `ScreenHeader` | Back arrow + centered title + trailing (⋯ / +) | all detail screens |
| `HeroCard` | Gradient greeting/KPI banner with optional palm motif | Home, MyAttendance, Payroll |
| `ClassContextBanner` | Teal banner showing class + subject + room + students | Classes detail, Attendance, Timetable, Notices, Materials, Reports |
| `StatCard` / `StatGrid` | Tinted metric tiles (icon + value + label + trend) | Home overview, Classes, Reports, Attendance summaries |
| `QuickActionGrid` | Tap-tile grid (icon bubble + label) | Home, Notice, Materials, Communication |
| `SurfaceCard` | Generic elevated surface | everywhere |
| `SectionHeader` | Section title + "View All ›" | lists |
| `ListItem` | Leading avatar/icon, title/subtitle, trailing badge/chevron | students, conversations, notices, history |
| `Avatar` | Photo or colored initials | students, parents, profile |
| `Badge` / `StatusPill` | Status colors (present/absent/late/paid/pending…) | attendance, payroll, notices |
| `SearchBar` | Rounded search input with clear | classes, students, materials, notices |
| `FilterChips` | Horizontally-scrolling filter pills | notices, materials, students |
| `SegmentedControl` | 2-way toggle (Payroll/Leave, Check-In/Out) | payroll, attendance |
| `PrimaryButton` | Solid + gradient CTA, icon support, loading | forms, Save/Submit/Upload CTAs |
| `ProgressBar` | Single/stacked progress | reports, storage usage |
| `DonutChart` | SVG donut with center label | attendance summary |
| `BarChart` | SVG vertical bars | assessment performance |
| `EmptyState` / `SkeletonCard` | Empty + loading states (DESIGN.md requirement) | all lists |

No duplicated UI logic: screens compose these primitives only.

---

## 5. Teacher Screen Implementation Plan (from SCREENS.md)

Reference image available = pixel-targeted. Others follow the same design system.

| Domain | Screens | Ref image |
|--------|---------|-----------|
| **dashboard** | Teacher Home (Overview, Quick Actions, Schedule, Announcements, AI entry) | ✅ home |
| **profile** | My Profile | — |
| **attendance (self)** | My Attendance (Check-In/Out), Attendance Calendar | ✅ ×2 |
| **payroll** | Payroll Dashboard, Payslip Details, Salary History, Leave Dashboard, Apply Leave, Leave History | ✅ payroll+leave |
| **classes** | My Classes, Class Details | ✅ classes |
| **students** | Student List, Student Profile, Student Attendance | — |
| **attendance (class)** | Mark Attendance, Attendance Report | ✅ mark attendance |
| **assessments** | Grade Students, Assessment List, Assessment Details | — |
| **assignments** | Assignment Dashboard, Create Assignment, Assignment Submissions | — |
| **materials** | Study Material, Upload Material, Resource Library | ✅ study materials |
| **timetable** | Timetable | ✅ timetable |
| **communication** | Parent Communication, Parent Chat, Broadcast Message | ✅ parent comms |
| **notices** | Notice Board, Create Notice, Scheduled Notice | ✅ notice board |
| **reports** | Reports Dashboard, Attendance/Assignment/Assessment/Student-Progress Analytics | ✅ reports |
| **ai** | AI Teacher Assistant | — |
| **system** | Notifications, Settings | — |

**Implementation order:** (1) referenced screens at high fidelity → (2) their sibling
flow screens → (3) analytics/AI/system screens.

---

## 6. Reuse Analysis (build vs. reuse)

| Capability | Reuse from existing app | New in ERP Schools |
|-----------|------------------------|--------------------|
| Login / tokens / refresh / session restore | ✅ `useAuth`, `tokenStorage`, `config.ts` interceptors | — |
| Global user/auth state | ✅ `useUserStore` | thin `useTeacherSession` adapter |
| Dark-mode flag + persistence | ✅ `ThemeContext` (`useTheme().isDark`) | DESIGN.md token palette mapped to `isDark` |
| Role predicate | ✅ logic mirrored (`instructor`/`teacher`) | local copy over `@core` (no `src/erp` dependency) |
| Navigation libs | ✅ `@react-navigation/*` | module-scoped navigators |
| Icons / SVG / safe-area | ✅ existing deps | gradient + charts via `react-native-svg` |
| State manager | ✅ Zustand | `teacherUI.store` |
| Domain data | — (UI-only now) | typed **mock fixtures** in `data/` |

**Net new runtime dependencies: 0.**

---

## 7. Gap Analysis — Existing ERP vs. ERP Schools

| Dimension | Existing `src/erp/` | New `src/erp_schools/` |
|-----------|--------------------|------------------------|
| Audience | Admin/super-admin-centric, 22 management modules | **Persona-first** (Teacher now; Student/Parent/Principal/Admin later) |
| UI language | Dense, table-ish, neutral grays (`COLORS.gray.*`) | DESIGN.md: card-first, teal gradient heroes, generous spacing, AI-visible |
| Navigation | Single tile-grid → 22 stack screens | Bottom-tab + contextual stack per persona |
| Theming | Hard-coded `BRAND`/`COLORS` constants in `components/common` | Centralised `tokens.ts` (light+dark), consumed via `useTeacherTheme` |
| Data | Live `erp.api.ts` (925 lines) | Mock fixtures behind `useTeacherData` seam (API later) |
| Reusability | One `common/index.tsx` grab-bag | Granular, single-responsibility component library |
| Scalability | Adding a persona = new screens in same flat stack | Persona = new `screens/<persona>/` + `<Persona>Tabs` + `<Persona>Navigator`; shared `components/` & `theme/` reused |

**Conclusion:** ERP Schools is not a refactor of ERP — it is a parallel, persona-scoped product
surface that shares only the *platform* (auth, theme engine, nav libs, state lib) and adds a
modern, DESIGN.md-accurate UI layer.

---

## 8. Future Scalability Plan (Teacher → Student → Parent → Principal → Admin)

1. **Persona-scoped screens:** `screens/teacher/…` today; `screens/student/…`, `screens/parent/…`,
   etc. added later. No existing folder is touched.
2. **Per-persona navigators:** `TeacherNavigator`/`TeacherTabs` today; `StudentNavigator`,
   `ParentNavigator`, … added later, all composing the same shared `components/` + `theme/`.
3. **Persona router (future):** `ERPSchoolsApp` will branch on
   `useTeacherSession().persona` (`teacher | student | parent | principal | admin`, derived from
   the existing role) and mount the right persona navigator. Today it mounts Teacher directly.
4. **Shared design system:** all personas consume `theme/tokens.ts` + `components/*`. A brand tweak
   is one-file. Persona accents can be added as token variants without new components.
5. **Data seam:** every screen reads through `useTeacherData`/fixtures. Swapping a fixture module
   for an API-backed hook (React Query or Zustand + `@core/api`) is invisible to screens.
6. **Theme tokens, not hex literals:** screens never hard-code colors/sizes → global restyle is safe.

---

## 9. Integration (additive, optional, non-breaking)

The module is fully self-contained and does **not** auto-wire into the app. To expose it later,
add **one** screen to the existing root stack (this is additive — it neither edits nor removes any
existing route):

```tsx
// In the app's root Stack.Navigator (e.g. BottomTabNavigator root stack) — ADDITIVE ONLY:
import { ERPSchoolsTeacherApp } from '../../../erp_schools';
// ...
<Stack.Screen name="ERPSchools" component={ERPSchoolsTeacherApp} options={{ headerShown: false }} />
// then navigate: navigation.navigate('ERPSchools')
```

Until that line is added, the module ships as isolated, compile-clean code with zero runtime impact
on the existing app.

---

## 10. Quality Standards Applied

- **TypeScript strict** (project already enforces `strict`, `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitReturns`). **No `any`** in module code.
- **No hard-coded design values** in screens — all via `useTeacherTheme()` tokens.
- **No inline business logic** — domain shapes in `types/domain.ts`, data in `data/`,
  selectors in `hooks/useTeacherData.ts`.
- **No dead code / no duplicated UI** — shared `components/` only.
- **Accessibility** — 48px touch targets, `accessibilityRole`/labels on interactive elements,
  high-contrast token pairs, dynamic-font-friendly sizing.
- **Reusability** — every screen is a thin composition of shared primitives + fixtures.

---

## 11. Deliverables Checklist

- [x] `ERP_SCHOOLS_ARCHITECTURE.md` (this file)
- [x] Teacher module folder structure (`src/erp_schools/`)
- [x] Navigation structure (`TeacherNavigator` + `TeacherTabs` + `routes`)
- [x] Shared component inventory (§4) + implemented `components/`
- [x] Screen implementation plan (§5) + implemented `screens/teacher/`
- [x] Reuse analysis (§6)
- [x] Gap analysis (§7)
- [x] Implementation roadmap (§8 future scalability + §9 integration)
```
