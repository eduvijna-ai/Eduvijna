# ADMIN_MODULE_ANALYSIS.md — ERP Schools Admin Module

> **Module path:** `src/erp_schools/screens/admin/`
> **Status:** Architecture review (pre-implementation) + build spec
> **Source of truth:** Existing Teacher + Student modules in `src/erp_schools/`
> **Reference UX:** `assets/admin_screens/` (13 screens)
> **Companion docs:** `ADMIN_UX_REVIEW.md`, `ADMIN_INFORMATION_ARCHITECTURE.md`, `SCREENS.md`, `DESIGN.md`, `SKILLS.md`

This document is the result of reading the **entire** `src/erp_schools` module (Teacher + Student), the host authentication / role-routing flow (`SKILLS.md §6–8`, `BottomTabNavigator.tsx`, `SchoolsTabEntry.tsx`, `useTeacherSession.ts`), and the shared component / theme / data layers. The Admin module **reuses this exact architecture** — no new patterns are introduced.

---

## 1. Teacher Module Review

### Folder structure
```
screens/teacher/
  dashboard/   TeacherHomeScreen, MainDashboardTabPlaceholder
  classes/     MyClassesScreen, ClassDetailsScreen
  students/    StudentListScreen, StudentProfileScreen
  attendance/  Mark/Report/StudentAttendance/MyAttendance/Calendar
  assessments/ Grade/List/Details
  assignments/ Dashboard/Create/Submissions
  materials/   StudyMaterial/Upload/ResourceLibrary
  timetable/   TimetableScreen
  communication/ ParentCommunication/ParentChat/Broadcast
  notices/     NoticeBoard/Create/Scheduled
  reports/     ReportsDashboard + 4 analytics screens
  payroll/     Payroll/Payslip/Salary/Leave×3
  profile/     MyProfileScreen
  settings/    MoreMenu/Notifications/Settings
  ai/          AITeacherAssistantScreen
```
**Pattern:** screens are grouped by **feature domain**; each screen is a `default export` function component returning a `<TeacherScreen>` scaffold.

### Navigation
- `TeacherStack` (native-stack, `headerShown:false`) hosts `TeacherTabs` + all detail screens.
- `TeacherTabs` = persistent 5-item bottom bar; center tab is a **Home escape** (`navigateToAppMainTab`) using a `MainDashboardTabPlaceholder` + `tabPress` listener `preventDefault`.
- Route names are constants in `routes.ts` (`TEACHER_TABS`, `TEACHER_ROUTES`) — no magic strings.
- Param lists in `types/navigation.ts` (`TeacherTabParamList`, `TeacherStackParamList`).
- Typed nav hook: `useTeacherNavigation()` → `NativeStackNavigationProp<TeacherStackParamList>`.

### Components
Screens compose the shared `components/` barrel — they never re-implement cards/lists/charts.

### Services / Data
- **No API yet.** Single read seam `useTeacherData()` returns typed mock fixtures from `data/`.
- Screens **never** import fixtures directly — always via the hook.

### Hooks
`useTeacherSession` (persona/identity, reads `@core/store/user.store`), `useTeacherData` (data seam), `useTeacherNavigation` (typed nav), `useMainAppNavigation` (escape hatch), `useTeacherTheme` (tokens × dark mode).

### State management
`teacherUI.store.ts` — Zustand, **ephemeral UI only** (e.g. selected date range). No server data in stores.

---

## 2. Student Module Review

### Folder structure
```
screens/student/
  dashboard/  StudentHomeScreen
  academics/  Academics/SubjectDetails/MarksReport/ProgressReport
  attendance/ Attendance/AttendanceDetails
  assignments/ Assignments/Details/Submission/Performance
  timetable/  TimetableScreen
  exams/      ExamSchedule/ExamResults
  fees/       FeeDashboardScreen
  library/    LibraryScreen
  notices/    NoticesScreen
  events/     EventsScreen
  ai/         AITutor/AIPracticeTest/AIQuiz
  profile/    StudentProfileScreen
  settings/   MoreMenu/Notifications/Settings
```

### Navigation
Identical shape to Teacher: `StudentStack` + `StudentTabs` (`Dashboard · Academics · Home(center escape) · AI Test · More`), `studentRoutes.ts`, `StudentTabParamList`/`StudentStackParamList`, `useStudentNavigation()`.

### Components / Data / Hooks / State
- Same shared component barrel.
- Data seam `useStudentData()` over `data/student/*` typed fixtures (`types/student.ts`).
- `studentUI.store.ts` — Zustand UI-only (academic year, term range).
- Detail screens use `StudentIdentityHeader` (teal banner + overlapping identity card) and `IconTabs` for in-page sections.

**Conclusion:** Teacher and Student are the **same architecture** with persona-specific routes, data seam, and screen folders. **Admin mirrors this 1:1.**

---

## 3. Shared ERP Schools Infrastructure

### Reusable components (`src/erp_schools/components/`)
| Component | Purpose | Admin reuse |
|-----------|---------|-------------|
| `TeacherScreen` | Screen scaffold (safe area, scroll, footer) | **Every admin screen** |
| `ScreenHeader` | Back arrow · title · trailing action | Admin stack detail screens |
| `SurfaceCard` | Elevated card surface | Everywhere |
| `SectionHeader` | Title + "View All ›" | Everywhere |
| `StatCard` / `StatGrid` | Tinted metric tiles w/ trend | All overview/summary rows |
| `QuickActionGrid` | Tap-tile action grid | Admin Home quick actions |
| `ListItem` | Avatar/icon · title/subtitle · trailing · chevron | All management lists |
| `Avatar` | Photo / initials fallback | People lists |
| `Badge` / `StatusPill` | Status chips | Statuses everywhere |
| `SearchBar` | Search input | Management lists |
| `FilterChips` | Horizontal filter pills | Management/segmented filtering |
| `SegmentedControl` | 2–4 option pill switch | Tab-like sub-views |
| `IconTabs` | Scrollable underline tabs | Overview sub-sections, announcement categories |
| `ProgressBar` | Single/multi-segment progress | Syllabus %, collection %, distributions |
| `DonutChart` | SVG donut + center label | Attendance/finance/grade distributions |
| `BarChart` | SVG vertical bars | Grade-wise / collection-trend |
| `EmptyState` | Illustration + message + CTA | Empty lists |
| `InfoBanner` | Soft info/tip banner | AI insight notes |
| `PrimaryButton` | Solid/gradient/outline CTA | Export / Add / actions |
| `HeroCard` / `Gradient` | Gradient hero banner | Optional finance hero |
| `FormField` / `TextField` / `SelectField` | Form inputs | Future create flows |
| `AcademicYearPill` | AY chip | Title rows |

**Result:** the admin module needs **zero new shared components** — it is fully composable from the existing barrel. (See `ADMIN_UX_REVIEW.md` "Reuse report".)

### Shared hooks
`useTeacherTheme`, `useTeacherSession`, `useMainAppNavigation` are **persona-agnostic** and reused directly by Admin.

### Shared navigation
- `SchoolsTabEntry` — persona branch. **Admin requires one added branch** (`persona === 'admin' → <AdminStack/>`).
- `navigateToAppMainTab` / `APP_MAIN_TABS` — center "Home" escape, reused unchanged.
- Host `CustomHeader` (in `BottomTabNavigator`) renders above all persona content — Admin reuses it (no `TeacherTopBar`).

### Shared theme
`theme/tokens.ts` (palette, spacing, radius, typography, shadow, gradients) + `theme/accents.ts`. Consumed via `useTeachertheme()`. Admin uses the **same tokens** — identical look & feel.

### Shared utilities / seam
`data/` + `data/student/` fixtures behind `useTeacherData` / `useStudentData`. Admin adds `data/admin/*` behind a new `useAdminData()` following the identical seam contract.

---

## 4. Role Routing — actual code mapping

From `src/erp_schools/hooks/useTeacherSession.ts → toPersona()` (already present):
```ts
if (roleId === 1 || role === 'super_admin') return 'admin';
if (roleId === 2 || role === 'admin')      return 'admin';   // ← Admin
if (role === 'instructor' || role === 'teacher') return 'teacher';
if (roleId === 4 || role === 'student')    return 'student';
```
- The persona derivation **already** classifies `admin` correctly (`role === 'admin'` **or** `role_id === 2` **or** super-admin). **No change needed here.**

Two **additive** changes required (no regressions):
1. **`SchoolsTabEntry.tsx`** — add `if (persona === 'admin') return <AdminStack />;` (currently admins fall through to `TeacherStack`).
2. **`BottomTabNavigator.tsx`** (Schools tab gate, ~L687) — extend the gate to show the Schools tab for admins:
   ```ts
   user?.role === 'instructor' || user?.role === 'student' ||
   user?.role === 'admin' || user?.role === 'super_admin' ||
   Number(user?.role_id) === 4 || Number(user?.role_id) === 1 || Number(user?.role_id) === 2
   ```
Teacher (`instructor`/`teacher`) and Student (`student`/`role_id 4`) branches are **untouched** → no regressions, no route conflicts (all admin routes are `Admin*`-prefixed / unique).

> Note: the main-app **Dashboard** tab (`RoleDashboard`) keeps `instructor|admin → TeacherDashboard`. That is the *host* dashboard and is intentionally left unchanged — the Admin ERP-Schools experience lives behind the **Schools** tab, exactly like Teacher/Student.

---

## 5. Admin module structure (to build)
```
screens/admin/
  dashboard/   AdminHomeScreen, MainDashboardTabPlaceholder (reuse teacher's)
  overview/    SchoolOverviewScreen
  people/      PeopleHubScreen, Student/Teacher/Parent/StaffManagementScreen,
               UserRolesScreen, PermissionsScreen
  academics/   AcademicOverviewScreen, ClassesScreen, ExamsScreen, AcademicReportsScreen
  admissions/  AdmissionsDashboardScreen, AdmissionApplicationsScreen, ApprovalWorkflowScreen
  attendance/  AttendanceDashboardScreen
  finance/     FinanceDashboardScreen, FeeCollectionScreen, RevenueAnalyticsScreen, ExpenseAnalyticsScreen
  library/     LibraryDashboardScreen, BookManagementScreen
  transport/   TransportDashboardScreen, VehicleManagementScreen, RouteManagementScreen
  hostel/      HostelDashboardScreen
  inventory/   InventoryDashboardScreen
  reports/     ReportsDashboardScreen
  communication/ AnnouncementsScreen
  profile/     AdminProfileScreen
  settings/    MoreMenuScreen, NotificationsScreen, SettingsScreen

navigation/  AdminStack.tsx, AdminTabs.tsx, adminRoutes.ts
types/       admin.ts (domain models) + admin param lists in navigation.ts
data/admin/  index.ts + per-domain fixtures
hooks/       useAdminData.ts, useAdminNavigation.ts
store/       adminUI.store.ts (ephemeral UI only)
```

### Admin bottom tabs (5 — convention-compliant)
`Dashboard (AdminHome) · People · Home (center escape) · Finance · More`
- Center **Home** = escape to host app (consistency with Teacher/Student).
- All other modules (Academics, Admissions, Operations, Reports) reachable via Dashboard quick actions + **More** hub.

---

## 6. Quality contract
- TypeScript strict; **no `any`** (admin types fully modelled in `types/admin.ts`).
- No dead code, no duplicated business logic, no direct fixture imports in screens.
- Colors/spacing/typography only via `useTeacherTheme()`.
- All routes `Admin*`-prefixed where ambiguous → zero collisions with Teacher/Student/ERP/host.
- Teacher / Student / host auth / existing ERP: **unchanged**.
