# ERP Schools — Mobile Guide (Teacher · Student · Admin)

> **Audience:** Agents implementing or extending **Teacher**, **Student**, or **Admin** personas in mobile `erp_schools`.  
> **Product source of truth:** Quiz-React web School ERP — `d:\eduvijna\Quiz-React\src\components\ERPManagement\`.  
> **Mobile package:** `d:\eduvijna\Eduvijna\src\erp_schools\`.  
> **Config:** `config.ts` → `USE_MOCK_DATA = false` (live APIs by default).  
> **Renamed from:** `TEACHER_ERP_GUIDE.md` (this file is the single ERP guide).  
> **Status (2026-07):** Teacher + Student core modules LIVE. **Next persona focus: Admin.**

---

## 1. How to use this doc

| If you need… | Go to |
|--------------|--------|
| Auth → persona → stacks | §2 |
| Design / data / code patterns | §3 |
| Web ↔ mobile principles | §4 |
| Teacher LIVE vs MOCK | §5 |
| Student LIVE vs MOCK + nav | §6 |
| Shared screens (reuse first) | §7 |
| Admin playbook (start here for admin) | §8 |
| Module deep-dives (Exams, shared, student) | §9 |
| Footguns | §10 |
| File index | §11 |
| Suggested order | §12 |
| Changelog | §13 |

**Golden rule:** Open the web tab first → list its `erpApi` calls → mirror paths in `erp.api.ts` → persona hook with **empty + loader** → UI. Do not invent a second data model. Prefer `screens/shared/*` when UI is 80%+ identical.

---

## 2. High-level architecture

### Auth → persona → stack

```
App login (useAuth / role)
  → BottomTabNavigator → ERPSchools tab
    → SchoolsTabEntry (only while tab focused)
      → AcademicYearProvider
      → persona gate (useSchoolsSession):
           teacher / instructor  → TeacherStack
           student               → StudentStack
           admin / principal     → AdminStack
```

| Layer | Path |
|--------|------|
| Tab entry | `navigation/SchoolsTabEntry.tsx` |
| Session / persona | `hooks/useSchoolsSession.ts` |
| Role tab scopes | `utils/erpRoleScopes.ts` (mirror web) |
| Stacks / tabs | `TeacherStack` · `StudentStack` · `AdminStack` + `*Tabs.tsx` |
| Routes | `navigation/routes.ts` · `studentRoutes.ts` · `adminRoutes.ts` · `types/navigation.ts` |
| Live vs mock | `config.ts` → `USE_MOCK_DATA = false` |
| API client | `src/core/api/erp.api.ts` |
| Shared UI | `components/` + `theme/` |

### Bottom tabs by persona

| Persona | Tabs (L→R) |
|---------|------------|
| **Teacher** | Dashboard · Classes · Home (→ main app) · Students · More |
| **Student** | Dashboard · Subjects · Home (→ main app) · **Timetable** · More |
| **Admin** | (see `AdminTabs.tsx`) · More hubs most modules |

Stack screens push on top of tabs for every detail flow. Keep **route names unique across personas** (e.g. student `StudentTimetable` ≠ teacher `Timetable`).

---

## 3. Design / data / code flow

### Design

- Shell: `TeacherScreen` + `ScreenHeader` (staff) or `StudentModuleHeader` (student identity + **Academic Year pill**).
- Web heroes → compact eyebrow + subtitle on mobile.
- Dense tables → `ListItem` / cards; master-detail → list → stack detail.
- Filters: `SelectField` / `SearchBar` / `SegmentedControl` / `FilterChips`.
- CTAs: `PrimaryButton` — `size="compact"` inline; default full-width in footers.

### Data

```
Screen
  → persona / shared hook
    → @core/api/erp.api.*   (USE_MOCK_DATA === false)
    → mappers (hook or utils/*Meta.ts)
  → UI: loading | empty | error | ready
```

| Concern | Pattern |
|---------|---------|
| Live load | `status: idle \| loading \| ready \| error` |
| Focus refresh | `useFocusEffect` + **stable `refetchRef`** (never depend on unstable `refetch` identity) |
| Pull refresh | User-triggered only |
| Soft delete | Confirm → DELETE → refetch; label “Deactivate” when soft |
| School scope | Pass `school_id` wherever web does |
| Empty while loading | **Empty arrays + `ScreenLoader`** — never seed live mode with `data/*` fixtures |

**Do not** call `useAdminData()` from teacher/student screens → admin APIs can **403** → axios may **force logout** (`src/core/api/config.ts`).

---

## 4. Web ↔ mobile principles

| Topic | Web | Mobile |
|--------|-----|--------|
| Module shell | `ERPManagement` tab | More / tabs + stack |
| Sub-tabs | `ERPCompactSubTabs` | Chips / `SegmentedControl` |
| CRUD | Modals | Create/edit screens |
| Class filters (Exams) | `academicClassesApi` school-wide | Same — **not** teacher-assigned classes only |
| Student Exams | `mySchedule` only | Same — no staff Marks/Results/Report Cards |
| Shared modules | Same APIs when tab visible | Prefer `screens/shared/*` |

**Web folders:**

- Tabs: `Quiz-React/src/components/ERPManagement/tabs/`
- Student dashboard: `…/StudentERPDashboard.tsx`
- APIs: `Quiz-React/src/services/erpApi.ts`
- Role tabs: `Quiz-React/src/utils/erpRoleScopes.ts`

---

## 5. Teacher — LIVE vs MOCK

### LIVE

| Module | Entry | Hook |
|--------|--------|------|
| Home / Dashboard | Tab | `useTeacherData`, `useTeacherHrData`, `useTeacherStaffProfile` |
| Classes + details | Tab / stack | `useTeacherData`, `useClassDetails` |
| Students + profile | Tab / stack | `useTeacherData` + student action APIs |
| Attendance (my / mark / calendar) | More / stack | Attendance hooks → ERP |
| Payroll / Leave / Payslips | More + Home | `useTeacherHrData` (empty init in live — no mock flash) |
| Notices | More | `useTeacherNotices` |
| Timetable | More | `useTeacherTimetable` |
| Fee Management | More | `useTeacherFeesData` |
| Student Progress | More | `useStudentProgressAnalytics` |
| Library | More | `useLibraryData` **shared** |
| Engagement | More | `useEngagementData` **shared** |
| Holidays | More | `useHolidayCalendarData` **shared** |
| Exams (full staff) | Home + More | `useTeacherExamsData` |
| My Profile | header / More | `useTeacherStaffProfile` |

### MOCK / static (still linked unless product asks)

| Module | Notes |
|--------|--------|
| Assignments | `data/` fixtures; create = demo Alert |
| Assessments | Fixtures; grade save stub |
| Reports (+ analytics) | Chart fixtures |
| Notifications | Fixtures |
| Settings | Local theme toggles |
| AI Teacher Assistant | Stub replies |

### Hidden from More (stack only)

Study Material / Parent Chat / Broadcast / Scheduled Notice / orphan Attendance Report — leave until APIs.

---

## 6. Student — LIVE vs MOCK + navigation

### Tabs

`StudentHome` · `StudentAcademics` (Subjects) · Home (main app) · **`StudentTimetableTab`** · `StudentMore`

- Timetable tab mounts `TimetableScreen` with `showBack={false}`.
- Stack route `StudentTimetable` kept for deep links; prefer `useOpenStudentTimetable()` → tabs.
- AI Test tab **removed**; Learning section **removed** from More.
- Dashboard identity card: **Academic Year pill** (same as module headers), not Profile button. Profile via More card.

### LIVE (primary surfaces)

| Module | Entry | Hook / notes |
|--------|--------|----------------|
| Dashboard | Tab | `useStudentData` — roster, att, fees, subjects, exams, holidays, notices, today schedule |
| Subjects + detail | Tab | `useStudentSubjectsData` — honest empty analytics when no marks |
| Timetable + PDF | Tab | `useStudentTimetable` |
| Attendance + PDF | More / home | `useStudentAttendance` |
| Exam Schedule + PDF | More / home | `useStudentExams` (`my-schedule` only) |
| My Fees + Receipts | More / home | `useStudentFeesData` (Pay Now = stub like web) |
| Library | More | Shared `useLibraryData` — Books + **My Issues** |
| Holidays | More / home | Shared `useHolidayCalendarData` — **read-only** |
| Notices | Home / stack | `noticesApi` via `useStudentData` |
| Events | More | `eventsApi` via `useStudentData` |
| Profile | More card | Roster fields (empty if API omits DOB/phone/etc.) |
| Notifications | More · Account | Remapped from live notices |

### Partial / thin

| Module | Notes |
|--------|--------|
| Marks Report | `my-subject-performance` subjects; rank often 0; not a full report-card API |
| Progress Report | Live hook but `termComparison` empty → flat UI |
| Assignments (+ submit) | `assignmentsApi` + `submissionsApi`; **not in More**; charts thin |
| Exam Results screen | Live perf API; **not linked** from Exams (web schedule-only) |
| Dashboard weekly % | Cosmetic client heuristic |

### MOCK / placeholder

| Module | Notes |
|--------|--------|
| AI Tutor / Practice / Quiz | Hardcoded / sample Qs — removed from More + tabs; stack still registered |
| Settings | Local toggles only |
| Old `screens/student/library/*` | Unused — More uses shared Library |

### Student chrome conventions

- Every module screen: `StudentModuleHeader` (identity + AY pill).
- PDF exports: `expo-print` + `expo-sharing` (timetable, attendance, exam schedule, fee receipts).
- Never invent exam % / topic / skills fillers when marks missing.

---

## 7. Shared screens (reuse for Admin)

| Screen | Hook | Teacher | Student | Admin |
|--------|------|---------|---------|-------|
| `HolidayCalendarScreen` (+ Create) | `useHolidayCalendarData` | CRUD | Read-only | CRUD (mounted) |
| `LibraryScreen` (+ Create Book/Tx) | `useLibraryData` | CRUD | Books + My Issues | CRUD (mounted as Library / Book Management) |
| `EngagementHubScreen` (+ Create) | `useEngagementData` | CRUD | Hidden on web | CRUD (mounted) |

**Admin already reuses** Holidays, Library, Engagement on `AdminStack`. Prefer mounting **teacher Exams hub** next instead of the mock `screens/admin/academics/ExamsScreen` fixtures.

`canManage = !isStudent` (and staff create screens alert + goBack if student).

---

## 8. Admin playbook — start here

### Current state

| Area | Status |
|------|--------|
| `AdminStack` + `AdminTabs` + More menu | Wired |
| Holidays / Library / Engagement | **LIVE** via shared screens |
| Most admin screens (`useAdminData`) | **Still mock / fixtures** under `data/admin/` — verify before trusting |
| Web admin surface | Same ERP tabs as staff for many modules + school-wide people/finance/ops |

### Do this first (recommended order)

1. **Confirm web tabs** for admin/principal via `erpRoleScopes` + `ERPManagement.tsx`.
2. **Reuse shared LIVE modules** already on AdminStack (Holidays, Library, Engagement) — polish only if gaps vs web.
3. **Exams:** Mount teacher exams screens / `useTeacherExamsData` (group→item model). Replace or bypass mock `ExamsScreen` that uses `useAdminData` exam fixtures.
4. **Fees / Attendance / Notices:** Mirror teacher live hooks where web admin sees the same staff UI; use school-wide list params.
5. **People (students/teachers/parents/staff):** Map web People tabs → new hooks; do **not** seed from `data/admin/people.ts` in live mode.
6. **Dashboard / School Overview:** Port web admin dashboard APIs one block at a time with empty+loader.
7. **Admissions / Transport / Hostel / Inventory:** Only after web API inventory; keep mock until then.

### Admin-specific rules

| Rule | Why |
|------|-----|
| Admin **may** call broader APIs | Unlike teacher/student |
| Still prefer exam **group-items** model | Not legacy gradebook / competitive ClassManagement exams |
| Soft-delete + `school_id` | Same as teacher |
| Don’t break shared screens’ `canManage` | Students must stay read-only on holidays/library writes |
| Isolate route names | `Admin*` prefixes in `adminRoutes.ts` / `AdminStackParamList` |
| `useAdminData` is fixture-shaped | Fine for UI scaffolding; **replace per module** with real hooks when going live |

### Web tabs to open for admin parity

Typical admin/staff tabs (confirm with `ROLE_ERP_TABS`): Dashboard, Classes, Attendance, Exams, Timetable, Fees, Library, Holidays, Engagement, Notices/Announcements, plus admin-only People / Admissions / Finance analytics / Ops.

---

## 9. Module deep-dives

### 9.1 Exams — staff (Teacher; reuse for Admin)

**Hierarchy:** ExamGroup → ExamItem → Subjects (papers) / Students / Marks / Results; Grades on group; Report Cards from results.

**Hub tabs:** Groups | Exams | Schedules | Marks (RO) | Results (RO) | Report Cards  
**Screens:** `screens/teacher/exams/*` · **Hook:** `useTeacherExamsData` · **Meta:** `examMeta.ts`

**APIs:** `examGroupsApi` · `examGroupItemsApi` · `examSubjectsApi` (`/exams/items/{id}/subjects`) · `examStudentsApi` · `examGradesApi` · `examMarksApi` · `examResultsApi` · `examAllItemsApi.list` · `academicClassesApi.list` · `examSectionsApi.list`

Schedules = derived from exam subjects’ `exam_date` (not legacy `/schedules`). Class filter = school-wide academic classes.

### 9.2 Exams — student

Schedule-only: `useStudentExams` → `mySchedule` + optional `mySubjectPerformance` (Subjects/Dashboard). No staff mark entry.

### 9.3 Engagement

Tabs: Councils | Members | Grievances | Events | Registrations | Gallery  
**Hook:** `useEngagementData` · APIs: `/api/v1/erp/engagement/*` · soft deactivate · `per_page: 25`

### 9.4 Library

Books + Transactions (student: My Issues). **Hook:** `useLibraryData` · focus refresh via stable ref. Categories list hardcoded (web same).

### 9.5 Holidays

Calendar **year** (not AY). **Hook:** `useHolidayCalendarData` · `holidaysApi` · filters, month cal, KPIs, pagination 10, detail sheet · staff CRUD.

### 9.6 Teacher Payroll / Leave

**Hook:** `useTeacherHrData` — live mode must start **empty** + loader (no mock flash).

### 9.7 Student modules (summary)

| Module | Web | Mobile hook / screen |
|--------|-----|----------------------|
| Dashboard | `StudentERPDashboard` | `useStudentData` · `StudentHomeScreen` |
| Subjects | `studentClassesOverview` | `useStudentSubjectsData` |
| Timetable | `TimetableTab` personal | `useStudentTimetable` · tab `StudentTimetableTab` |
| Attendance | `StudentAttendancePanel` | `useStudentAttendance` + PDF |
| Fees | `FeesTab` student views | `useStudentFeesData` + receipt PDF |
| Exams | `StudentExamSchedule` | `useStudentExams` + schedule PDF |
| Library / Holidays | shared tabs | shared screens |

Detailed block tables (KPIs, APIs, QA notes for Eshwara) lived in the old §12a–12h sections — keep behavior as implemented; when changing a student module, re-read that screen’s hook header comment + web tab.

---

## 10. Known footguns

1. **`useAdminData` on teacher/student** → 403 → logout.
2. **Mock-seeded `useState(mockX)`** while live fetch runs → fixture flash. Use `[]` + loader.
3. **`useFocusEffect([refetch])`** with unstable refetch → infinite RefreshControl. Use ref.
4. **`PrimaryButton` width 100%** in a row → overflow. Use `size="compact"`.
5. **Teacher-assigned classes ≠ school classes** — Exams filters need `academicClassesApi`.
6. **Three exam concepts:** School ERP group-items (target) · ClassManagement competitive · legacy `examsApi`/`examSchedulesApi`.
7. Axios **any 403** ≈ auth failure in `config.ts` — pick role-safe endpoints.
8. **Route name collisions** across personas — e.g. always `StudentTimetable` / `StudentTimetableTab` for students.
9. **Honest student analytics** — no invented % when marks missing.
10. **Holiday year ≠ academic year** — calendar year stepper.
11. **Student library More** must hit **shared** `Library`, not old student library fixtures screen.

---

## 11. Key file index

```
src/erp_schools/
  ERP_GUIDE.md                       # this file
  config.ts                          # USE_MOCK_DATA
  navigation/
    SchoolsTabEntry.tsx
    TeacherStack.tsx / TeacherTabs.tsx / routes.ts
    StudentStack.tsx / StudentTabs.tsx / studentRoutes.ts
    AdminStack.tsx / AdminTabs.tsx / adminRoutes.ts
  hooks/
    useSchoolsSession.ts
    useTeacherData.ts / useTeacherHrData.ts / useTeacherExamsData.ts
    useTeacherNotices.ts / useTeacherTimetable.ts / useTeacherFeesData.ts
    useLibraryData.ts / useEngagementData.ts / useHolidayCalendarData.ts
    useStudentData.ts / useStudentSubjectsData.ts / useStudentTimetable.ts
    useOpenStudentTimetable.ts / useStudentAttendance.ts
    useStudentFeesData.ts / useStudentExams.ts
    useAdminData.ts                  # mostly fixtures today
  screens/teacher/…  screens/student/…  screens/admin/…  screens/shared/…
  utils/
    examMeta.ts / engagementMeta.ts / libraryMeta.ts / holidayMeta.ts
    studentDashboardMeta.ts / studentSubjectsMeta.ts
    studentTimetablePdf.ts / studentAttendancePdf.ts
    studentFeeReceiptPdf.ts / studentExamSchedulePdf.ts
    erpRoleScopes.ts / apiHelpers.ts
  components/  (StudentModuleHeader, AcademicYearPill, …)
  data/                              # fixtures only when USE_MOCK_DATA
src/core/api/erp.api.ts
```

---

## 12. Suggested order (remaining work)

### Done

- Teacher core LIVE (attendance, HR, notices, timetable, fees, exams, shared Holidays/Library/Engagement).
- Student core LIVE (dashboard, subjects, timetable tab, attendance, fees, exams schedule, library, holidays).
- Student chrome: AY pill on modules + dashboard; AI Learning/More + AI Test tab removed.

### Next

1. **Admin Exams** → reuse teacher exam hub (group-items).
2. **Admin Fees / Attendance / Announcements** → live APIs (school-wide).
3. **Admin People + Dashboard** → live hooks replacing `useAdminData` slices.
4. **Admin Ops** (transport/hostel/inventory) + Admissions — after web API map.
5. Teacher/Student Assignments & Assessments polish (still mock/thin).
6. Always: empty+loader; never seed live UI from `data/*`.

---

## 13. Changelog summary

### Teacher workstream (baseline)

- Live default; attendance, payroll/leave (no mock flash), notices, timetable, fees.
- Shared Holidays, Library, Engagement.
- Exams full group→item→subjects/students/grades/marks/results/report-cards; school-wide classes; schedule calendar.
- Left mock: Assignments, Assessments, Reports, Notifications, Settings, AI (+ hidden materials/parent chat).

### Student workstream

- Dashboard, Subjects, Timetable (tab), Attendance, Fees, Exam Schedule, Library, Holidays — **LIVE**.
- StudentModuleHeader + Academic Year everywhere; dashboard Profile → AY pill.
- Tabs: AI Test → Timetable; More Learning (AI) removed.
- Honest analytics; PDFs for timetable / attendance / exams / fee receipts.
- Thin/orphan: Marks/Progress reports, Assignments, AI stack routes.
- Still next for student: Assignments polish if product asks.

### Admin (current)

- Stack + More wired; Holidays / Library / Engagement **LIVE** shared.
- Most other admin screens still **`useAdminData` fixtures** — next major workstream.

---

*When in doubt: web tab → `erpApi` → `erp.api.ts` → hook (empty+loader) → UI. Reuse shared screens. Do not invent a second data model.*
