# STUDENT_MODULE_ANALYSIS.md — ERP Schools Student Persona

> **Module path:** `src/erp_schools/`
> **Status:** Analysis + UI implementation (mock data, no API yet — same as Teacher)
> **Reference images:** `assets/student_screens/`
> **Architecture basis:** `SKILLS.md`, `DESIGN.md`, `SCREENS.md`, existing `src/erp_schools/` Teacher module
> **Author:** Principal Engineer note — Student is the second persona to plug into the shared ERP Schools shell. Zero regression to Teacher is a hard requirement.

---

## 1. Existing Architecture Review (traced from source)

### 1.1 Module isolation

`src/erp_schools/` is a **sibling** of `src/erp/`. It must **never** import from `src/erp/`. It consumes only:
- `@core/*` (store, hooks, types) for session/auth.
- `@context/ThemeContext` for dark-mode state.
- `@mobile/navigation/*` for the host escape hatch (`navigateToAppMainTab`).

### 1.2 Teacher folder structure (mirrored for Student)

```
src/erp_schools/
├── navigation/
│   ├── TeacherNavigator.tsx     ← public entry; comment already says "future personas branch here"
│   ├── SchoolsTabEntry.tsx      ← mounts the persona stack only while Schools tab focused
│   ├── TeacherStack.tsx         ← native-stack: TeacherTabs + ~30 detail screens
│   ├── TeacherTabs.tsx          ← 5-item bottom tab bar
│   ├── routes.ts                ← TEACHER_TABS / TEACHER_ROUTES string constants
│   └── index.ts                 ← barrel
├── screens/teacher/<feature>/   ← dashboard, attendance, payroll, classes, students,
│                                  assessments, assignments, materials, timetable,
│                                  communication, notices, reports, ai, profile, settings
├── components/                  ← 25 shared, persona-agnostic UI primitives (+ barrel index.ts)
├── theme/                       ← tokens.ts · useTeacherTheme.ts · accents.ts
├── hooks/                       ← useTeacherSession · useTeacherNavigation · useTeacherData · useMainAppNavigation
├── store/                       ← teacherUI.store.ts (Zustand, ephemeral UI only)
├── data/                        ← typed mock fixtures (single UI↔data seam)
└── types/                       ← navigation.ts · domain.ts
```

### 1.3 Teacher navigation structure

- Host `BottomTabNavigator` renders an **`ERPSchools`** tab → `SchoolsTabEntry` → `TeacherStack`.
- The tab is gated: `user?.role === 'instructor'`.
- Inside Schools the **host tab bar is hidden** (`tabBarStyle: { display: 'none' }`); only the persona's own bottom tabs show.
- The host **`CustomHeader`** (EduVijna logo bar) stays visible above the persona content.
- Stack detail screens render `ScreenHeader`/`ClassContextBanner` **in content** below the host bar.
- Escape to main app via center `Dashboard` tab and the side-nav, both using `navigateToAppMainTab(APP_MAIN_TABS.DASHBOARD)`.

### 1.4 Teacher components (all persona-agnostic, reused as-is)

`Gradient · TeacherScreen · ScreenHeader · HeroCard · ClassContextBanner · SurfaceCard · SectionHeader · StatCard/StatGrid · QuickActionGrid · ListItem · Avatar · Badge/StatusPill · SearchBar · FilterChips · SegmentedControl · PrimaryButton · ProgressBar · DonutChart · BarChart · EmptyState · InfoBanner · FormField/TextField/SelectField`

> Despite the `Teacher*` naming on the scaffold (`TeacherScreen`), these components contain **no teacher business logic** — they consume `useTeacherTheme()` tokens only. They are the ERP Schools design-system layer and are reused unchanged by Student.

### 1.5 Teacher hooks & stores

| Item | Reuse decision |
|------|----------------|
| `useTeacherSession()` | **Reused.** Already returns a generic `persona` (`teacher/student/parent/principal/admin`). Used by `SchoolsTabEntry` to branch. |
| `useTeacherNavigation()` | Pattern mirrored as `useStudentNavigation()` (typed to `StudentStackParamList`). |
| `useTeacherData()` | Pattern mirrored as `useStudentData()` (single read seam over mock fixtures). |
| `useMainAppNavigation()` | **Reused.** Student "Switch to App Home" + side-nav escape. |
| `useTeacherTheme()` + tokens/accents | **Reused unchanged.** Same colors, spacing, radius, typography, shadows. |
| `teacherUI.store.ts` | Pattern mirrored as `studentUI.store.ts` (ephemeral UI selections only). |

### 1.6 Authentication / role flow (traced)

- Primary auth: `useAuth` (`src/core/hooks/useAuth.ts`) → Zustand `useUserStore` (`user`, `isAuthenticated`, `schoolId`).
- Roles (`SKILLS.md §7`, `src/erp/hooks/useErpRole.ts`):
  - `super_admin` (role_id 1), `admin` (role_id 2), `instructor`/`teacher`, `student`.
- Existing student predicate: **`role === 'student'`**.
- `useTeacherSession.toPersona()` already maps `role === 'student' → 'student'`. We additionally accept **`role_id === 4`** per requirement, without disturbing the admin/teacher branches.

**No new auth, token, storage, or session code is introduced.** Student routing is a pure read of the already-resolved `useUserStore` user.

---

## 2. Student Module Mapping

Persistent bottom tab bar (from `student or parent home screen.png`, capped at 5 per DESIGN.md):
**Home · Academics · Updates · Profile · More**

| screens.md name | Route | File | UX reference | Similar Teacher screen | Key reused components |
|-----------------|-------|------|--------------|------------------------|------------------------|
| Student Home | `StudentHome` (tab) | `dashboard/StudentHomeScreen.tsx` | student or parent home screen | TeacherHomeScreen | HeroCard-style hero, SurfaceCard, QuickActionGrid, SectionHeader, ListItem, InfoBanner |
| Academics (Marks) | `Academics` (tab) | `academics/AcademicsScreen.tsx` | student academic marks screen | ReportsDashboard/AssessmentAnalytics | StudentIdentityHeader, StatGrid, IconTabs, DonutChart, ProgressBar, SurfaceCard |
| Subject Details / Detailed Report | `SubjectDetails` | `academics/SubjectDetailsScreen.tsx` | …subtab detailed report screen | AssessmentAnalytics | StudentIdentityHeader, IconTabs, SurfaceCard, ListItem, StatusPill, InfoBanner |
| Marks Report | `MarksReport` | `academics/MarksReportScreen.tsx` | academic marks (Subject Wise) | AssessmentAnalytics | SurfaceCard, ProgressBar, ListItem |
| Progress Report | `ProgressReport` | `academics/ProgressReportScreen.tsx` | academic marks (Term Comparison) | StudentProgressAnalytics | SurfaceCard, BarChart, ProgressBar |
| Attendance | `Attendance` | `attendance/AttendanceScreen.tsx` | student attendance screen | MyAttendance/AttendanceAnalytics | StudentIdentityHeader, SegmentedControl, StatGrid, DonutChart, ListItem, StatusPill |
| Attendance Details | `AttendanceDetails` | `attendance/AttendanceDetailsScreen.tsx` | attendance (Daily/Monthly) | AttendanceReport | StudentIdentityHeader, ListItem, StatusPill, ProgressBar |
| Assignments | `Assignments` | `assignments/AssignmentsScreen.tsx` | student assignments screen | AssignmentDashboard | StatGrid, SegmentedControl, SurfaceCard, StatusPill, ListItem |
| Assignment Details | `AssignmentDetails` | `assignments/AssignmentDetailsScreen.tsx` | (derived) | AssessmentDetails | StudentIdentityHeader, SurfaceCard, StatusPill, InfoBanner, PrimaryButton |
| Assignment Submission | `AssignmentSubmission` | `assignments/AssignmentSubmissionScreen.tsx` | (derived) | CreateAssignment | StudentIdentityHeader, FormField, PrimaryButton, SurfaceCard |
| Assignment Performance | `AssignmentPerformance` | `assignments/AssignmentPerformanceScreen.tsx` | student assignments performance screen | AssignmentAnalytics | StudentIdentityHeader, StatGrid, SegmentedControl, DonutChart, ProgressBar, ListItem |
| Timetable | `Timetable` | `timetable/TimetableScreen.tsx` | student timetable screen | Teacher Timetable | StudentIdentityHeader, FilterChips, SurfaceCard, InfoBanner |
| Exam Schedule | `ExamSchedule` | `exams/ExamScheduleScreen.tsx` | (derived) | AssessmentList | StudentIdentityHeader, SegmentedControl, SurfaceCard, ListItem, StatusPill |
| Exam Results | `ExamResults` | `exams/ExamResultsScreen.tsx` | academic marks (results) | AssessmentAnalytics | StudentIdentityHeader, StatGrid, DonutChart, ListItem |
| Fee Dashboard | `FeeDashboard` | `fees/FeeDashboardScreen.tsx` | student fee details screen | (new domain) | StudentIdentityHeader, StatGrid, SurfaceCard, ListItem, StatusPill, ProgressBar, InfoBanner |
| Library | `Library` | `library/LibraryScreen.tsx` | student library screen | (new domain) | StudentIdentityHeader, SearchBar, QuickActionGrid, StatGrid, ListItem |
| Notices (Updates tab) | `Notices` (tab) | `notices/NoticesScreen.tsx` | student notices screen | NoticeBoard | IconTabs, SearchBar, SurfaceCard, Badge, ListItem |
| Events | `Events` | `events/EventsScreen.tsx` | student events screen | (new domain) | IconTabs, SearchBar, SurfaceCard, Badge |
| Student Profile | `Profile` (tab) | `profile/StudentProfileScreen.tsx` | (derived from identity card) | MyProfile | StudentIdentityHeader, SurfaceCard, ListItem, StatGrid |
| AI Tutor | `AITutor` | `ai/AITutorScreen.tsx` | (Home AI card) | AITeacherAssistant | HeroCard, SurfaceCard, QuickActionGrid, InfoBanner |
| AI Practice Test | `AIPracticeTest` | `ai/AIPracticeTestScreen.tsx` | (derived) | AITeacherAssistant | SurfaceCard, FormField, SegmentedControl, PrimaryButton |
| AI Quiz | `AIQuiz` | `ai/AIQuizScreen.tsx` | (derived) | AITeacherAssistant | SurfaceCard, ProgressBar, PrimaryButton |
| Notifications | `Notifications` | `settings/NotificationsScreen.tsx` | (shared pattern) | Teacher Notifications | SurfaceCard, ListItem, Badge |
| Settings | `Settings` | `settings/SettingsScreen.tsx` | (shared pattern) | Teacher Settings | SurfaceCard, ListItem, SegmentedControl |
| More | `More` (tab) | `settings/MoreMenuScreen.tsx` | (Home "More" tab) | Teacher MoreMenu | SurfaceCard, SectionHeader, ListItem, Avatar |

> **Note on screens.md vs references:** screens.md lists the canonical Student screen names. The reference set additionally ships dedicated mockups for **Library / Notices / Events / Assignment Performance**, all reachable from the Home "Quick Access" grid. These are implemented to honor the visual source of truth and Home navigation. No screen was renamed or invented beyond these reference-backed additions.

---

## 3. Reuse Opportunities (maximize reuse)

| Need | Reused from Teacher | New (shared, persona-agnostic) |
|------|---------------------|--------------------------------|
| Screen scaffold | `TeacherScreen` | — |
| Stack header | `ScreenHeader` | `StudentIdentityHeader` (teal banner + identity card; reference-specific, lives in shared `components/`) |
| Hero / greeting | `HeroCard` + Teacher Home hero pattern | — |
| Cards | `SurfaceCard` | — |
| Section titles | `SectionHeader` | — |
| Stat tiles | `StatCard` / `StatGrid` | — |
| Quick actions | `QuickActionGrid` | — |
| List rows | `ListItem` | — |
| Avatars | `Avatar` | — |
| Badges / status | `Badge` / `StatusPill` | — |
| Pill tabs | `SegmentedControl` | — |
| Underline/icon tabs | — | `IconTabs` (scrollable underline tabs; used by Academics, Notices, Events) |
| Filter pills | `FilterChips` | — |
| Search | `SearchBar` | — |
| Buttons | `PrimaryButton` | — |
| Progress | `ProgressBar` | — |
| Charts | `DonutChart`, `BarChart` | — |
| Empty / info | `EmptyState`, `InfoBanner` | — |
| Forms | `FormField` / `TextField` / `SelectField` | — |
| Theme | `useTeacherTheme()` + `tokens.ts` + `accents.ts` | — |
| Escape hatch | `useMainAppNavigation()` | — |
| Session/persona | `useTeacherSession()` | — |

**Net new shared components: 2** (`StudentIdentityHeader`, `IconTabs`). Everything else is reuse.

---

## 4. Role-Based ERP Schools Routing

```
BottomTabNavigator
  └── ERPSchools tab  (visible when role==='instructor' OR role==='student')
        └── SchoolsTabEntry            ← reads useTeacherSession().persona
              ├── persona==='student'  → StudentStack  (StudentTabs + detail screens)
              └── otherwise            → TeacherStack  (unchanged)
```

- **Teacher unchanged:** non-student personas still resolve to `TeacherStack`.
- **Student routing:** `persona === 'student'` (i.e. `role === 'student'` or `role_id === 4`) → `StudentStack`.
- Route names are `Student*`-namespaced where ambiguous and live in `StudentTabParamList` / `StudentStackParamList`, so there are **zero collisions** with Teacher (`Teacher*`), ERP (`ERP*`), or host tabs.

---

## 5. Quality Bar

TypeScript strict · no `any` · no console logs · no dead code · shared-component reuse · single data seam (`useStudentData`) · ephemeral UI state in `studentUI.store.ts` · tokens-only styling (no hard-coded palette in screens beyond on-gradient white text, mirroring Teacher).

---

## 6. Validation Checklist

- [x] Teacher flow untouched (`SchoolsTabEntry` defaults to `TeacherStack`).
- [x] Existing ERP module unchanged.
- [x] Existing navigation unchanged (only additive: student gate + persona branch).
- [x] Authentication unchanged (read-only persona derivation).
- [x] Student routing + role-based routing.
- [x] Student screens match UX references.
- [x] Shared components reused; only 2 net-new shared primitives.
- [x] No duplicated business logic.
- [x] TypeScript + lint pass.
