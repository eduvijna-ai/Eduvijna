# ERP Schools — Teacher Persona Guide

> **Audience:** Agents implementing **Student** or **Admin** persona parity in mobile `erp_schools`.  
> **Source of truth for product behavior:** Quiz-React web School ERP (`d:\eduvijna\Quiz-React\src\components\ERPManagement\`).  
> **Mobile package:** `d:\eduvijna\Eduvijna\src\erp_schools\`.  
> **Last focused workstream:** Student live-API parity (dashboard, subject overview + detail, timetable + PDF download). Teacher modules remain the reference baseline.

---

## 1. Purpose of this doc

Use this when you:

1. Port the same web modules to **Student** / **Admin** stacks.
2. Need to know which teacher modules are **LIVE vs MOCK**.
3. Need reusable patterns (hooks, shared screens, API client, loaders, navigation).
4. Must avoid known footguns (403 logout, mock flash, refetch loops).

---

## 2. High-level architecture

### Auth → persona → stack

```
App login (useAuth / role)
  → BottomTabNavigator → ERPSchools tab
    → SchoolsTabEntry (only while tab focused)
      → AcademicYearProvider
      → persona gate:
           teacher / instructor  → TeacherStack
           student               → StudentStack
           admin / principal     → AdminStack
```

| Layer | Path |
|--------|------|
| Tab entry | `navigation/SchoolsTabEntry.tsx` |
| Session / persona | `hooks/useSchoolsSession.ts` |
| Role tab scopes | `utils/erpRoleScopes.ts` (mirror web) |
| Teacher stack | `navigation/TeacherStack.tsx` |
| Teacher tabs | `navigation/TeacherTabs.tsx` |
| Routes | `navigation/routes.ts`, `types/navigation.ts` |
| Live vs mock flag | `config.ts` → `USE_MOCK_DATA = false` |
| API client | `src/core/api/erp.api.ts` |
| Shared UI | `components/` + `theme/` |

### Teacher bottom tabs

| Tab | Route | Notes |
|-----|--------|--------|
| Dashboard | `TeacherHome` | Live KPIs + quick actions |
| Classes | `TeacherClasses` | Live class list |
| Home (center) | placeholder | Redirects to **main app** Dashboard |
| Students | `TeacherStudents` | Live roster |
| More | `TeacherMore` | Module hub (“View All” from Quick Actions) |

Stack screens push on top of tabs for every detail flow.

---

## 3. Design / data / code flow (teacher)

### Design flow

- Screens use `TeacherScreen` + `ScreenHeader` + shared cards/lists/buttons.
- Web hero blocks (Exams / Engagement / Holidays) → compact card + pills on mobile.
- Dense web tables → `ListItem` cards; master-detail (Exam Groups) → list → detail stack.
- Filters: `SelectField` / `SearchBar` / `SegmentedControl` / chips.
- Primary CTAs: `PrimaryButton` (`size="compact"` when inline; default stretches full width in footers).

### Data flow

```
Screen
  → persona hook (useTeacherData / useTeacherHrData / useTeacherExamsData / …)
    → @core/api/erp.api.*  (when USE_MOCK_DATA === false)
    → mappers in hook (or utils/*Meta.ts)
  → UI state (loading / empty / error / list)
```

**Do not** call `useAdminData()` from teacher screens. Admin-leaning APIs can **403** and the axios interceptor may **force logout**.

### Code flow conventions

| Concern | Pattern |
|---------|---------|
| Live load | Hook `load()` in `useEffect` / focus; `status: idle \| loading \| ready \| error` |
| Focus refresh | `useFocusEffect` + **stable ref** to refetch (avoid infinite RefreshControl loops) |
| Pull refresh | Local `pulling` boolean; only user-triggered |
| Soft delete | Confirm Alert → API DELETE → refetch; UI says “Deactivate” |
| School scope | Always pass `school_id` where web does |
| Empty while loading | Prefer empty initial state + `ScreenLoader` — **never** seed live mode with mock fixtures (causes mock→real flash) |

---

## 4. Web ↔ mobile comparison principles

| Topic | Web (Quiz-React) | Mobile teacher |
|--------|------------------|----------------|
| Module shell | `ERPManagement` tab | More menu + stack routes |
| Sub-tabs | `ERPCompactSubTabs` | Horizontal chips / `SegmentedControl` |
| CRUD | Modals / drawers | Dedicated create/edit screens |
| Class filters (Exams Marks) | `academicClassesApi.list(schoolId)` — **all school classes** | Same (`academicClassesApi`) — **not** `useTeacherData().classes` (teacher-assigned only) |
| Exams schedule | List + Calendar | List + Calendar (parity) |
| Exams schedules data | Derived from **exam subjects** (`exam_date`), not legacy `/schedules` | Same |
| Student vs staff Exams | Student → `mySchedule` only | Teacher → full staff ExamsTab parity |
| Shared modules | Same APIs for admin/teacher when tab visible | Prefer `screens/shared/*` + shared hooks |

**Web source folders to open first:**

- Tabs: `Quiz-React/src/components/ERPManagement/tabs/`
- APIs/types: `Quiz-React/src/services/erpApi.ts`
- Role tabs: `Quiz-React/src/utils/erpRoleScopes.ts`

---

## 5. LIVE vs MOCK matrix (teacher) — current

`USE_MOCK_DATA = false` in production.

### LIVE (real dynamic APIs)

| Module | Entry | Hook / notes |
|--------|--------|----------------|
| Home / Dashboard | Tab | `useTeacherData`, `useTeacherHrData`, `useTeacherStaffProfile` |
| Classes + Class details | Tab / stack | `useTeacherData`, `useClassDetails` |
| Students + profile | Tab / stack | `useTeacherData` + student action APIs |
| Student / My attendance + calendar | More | Attendance hooks → ERP |
| Mark attendance | stack | `useTeacherAttendanceTracker` |
| Payroll / Leave / Payslips | More + Home “My Leave” | `useTeacherHrData` |
| Notices (board / create / detail) | More | `useTeacherNotices` |
| Timetable | More | `useTeacherTimetable` |
| Fee Management | More | `useTeacherFeesData` |
| Student Progress | More | `useStudentProgressAnalytics` |
| Library | More | `useLibraryData` (shared) |
| Engagement | More | `useEngagementData` (shared) |
| Holidays | More | `useHolidayCalendarData` (shared) |
| Exams (full) | Home + More | `useTeacherExamsData` + exam detail screens |
| My Profile | header / More | `useTeacherStaffProfile` |

### MOCK / STATIC (still linked — leave as-is unless asked)

| Module | Why |
|--------|-----|
| Assignments | Fixtures under `data/`; create = demo Alert |
| Assessments | Fixtures; grade save stub |
| Reports (+ analytics children) | Chart fixtures; AttendanceAnalytics reached via Reports |
| Notifications | `data/` fixtures |
| Settings | Local theme toggles only |
| AI Teacher Assistant | Stub reply text |

### MOCK but hidden from More (on stack only)

| Module | Notes |
|--------|--------|
| Study Material / Upload / Resource Library | Commented out in More until APIs |
| Parent Communication / Chat / Broadcast | Same |
| Scheduled Notice | Registered, not linked |
| Attendance Report screen | Orphan route (nothing navigates to it) |

---

## 6. Shared screens (reuse for Admin / Student)

Prefer extending these instead of duplicating:

| Screen | Hook | Teacher | Admin | Student notes |
|--------|------|---------|-------|----------------|
| `screens/shared/HolidayCalendarScreen` (+ Create) | `useHolidayCalendarData` | Yes | Yes | Usually read-only for students |
| `screens/shared/LibraryScreen` (+ Create Book/Tx) | `useLibraryData` | Yes | Yes | Student: “My Issues” / borrow rules |
| `screens/shared/EngagementHubScreen` (+ Create) | `useEngagementData` | Yes | Yes | Web hides Engagement for students |

Register on each persona stack + More menu as needed.

---

## 7. Module deep-dives (recently completed)

### 7.1 Exams (web `ExamsTab` parity)

**Hierarchy:** `ExamGroup` → `ExamItem` → Subjects (schedule papers) / Students / Marks / Results; Grades on group; Report Cards from results.

**Hub tabs:** Groups | Exams | Schedules | Marks (RO) | Results (RO) | Report Cards  

**Key screens:** `screens/teacher/exams/*`  
**Hook:** `hooks/useTeacherExamsData.ts`  
**Meta:** `utils/examMeta.ts`

**APIs (active model — use these):**

- `examGroupsApi`, `examGroupItemsApi`
- `examSubjectsApi` on `/exams/items/{id}/subjects` (not legacy schedules)
- `examStudentsApi` on `/exams/items/{id}/students`
- `examGradesApi` (bulk-save, apply-template)
- `examMarksApi.getGrid / bulkSave / getProgress / getTemplate`
- `examResultsApi.view / generate / publish`
- `examAllItemsApi.list`
- `academicClassesApi.list` for school-wide class filters
- `examSectionsApi.list`

**Avoid:** `useAdminData`, legacy-only paths for the new UI, seeding mock exam fixtures.

**UI notes:** Schedules = List + Calendar; class filter = school-wide academic classes.

### 7.2 Engagement (web `StudentEngagementTab`)

Tabs: Councils | Members | Grievances | Events | Registrations | Gallery  
**Hook:** `useEngagementData` (loads active tab only)  
**APIs:** `/api/v1/erp/engagement/*`  
Soft deactivate; `per_page: 25`.

### 7.3 Library (web `LibraryTab`)

Books + Transactions; search/category; CRUD forms.  
**Hook:** `useLibraryData` — focus refresh via **stable ref**.

### 7.4 Holidays (web holiday calendar)

Year stepper, type filters, month calendar, CRUD + soft delete.  
`canManage = !isStudent`.

### 7.5 Payroll / Leave

**Hook:** `useTeacherHrData`  
**Critical:** In live mode, initial leave/payroll state must be **empty**, not mock — otherwise Leave screen flashes fixtures. Show `ScreenLoader` while `status === idle|loading`.

---

## 8. Patterns to copy when building Student / Admin

### A. Persona stack checklist

1. Add routes to `types/navigation.ts` + persona `*Routes.ts`.
2. Register screens on `StudentStack` / `AdminStack`.
3. Wire More / dashboard quick actions.
4. Gate by `erpRoleScopes` if web hides the tab for that role.
5. Prefer shared screen under `screens/shared/` when UI is 80%+ identical.

### B. Hook checklist

1. `USE_MOCK_DATA` branch only for offline/UI review — production default `false`.
2. Live path: empty initial arrays + `loading` → fetch → map → `ready`.
3. Catch errors with `extractErrorMessage`; never let 403 on wrong APIs bubble as “session dead” if avoidable — **don’t call admin-only APIs as teacher/student**.
4. Pass `school_id`; soft-delete with confirm.
5. Focus refetch: `refetchRef.current = load` + `useFocusEffect(() => { void refetchRef.current(); }, [])`.

### C. API client checklist

1. Match web path + query style in `erp.api.ts` (see Exams / Engagement updates).
2. Keep legacy methods if other screens still use them; add item-based methods alongside.
3. Prefer `school_id` on mutate URLs/params like web `buildQS`.

### D. UI checklist

1. Loader until first ready payload (no mock flash).
2. EmptyState with optional CTA.
3. Mobile list/cards instead of wide tables; overflow actions → chips / detail screen.
4. `PrimaryButton` full-width in footers; `size="compact"` when sitting beside text in a row.

---

## 9. Student vs Admin — starting points (for next agents)

### Student

- Existing LIVE: Dashboard (`useStudentData`), Subject Overview + detail (`useStudentSubjectsData`), Timetable (`useStudentTimetable` + PDF download).
- Route note: student timetable screen name is **`StudentTimetable`** (not `Timetable`) so it never collides with teacher `Timetable`.
- Nav helper: `hooks/useOpenStudentTimetable.ts` — use from tab screens (Home / More) so parent stack navigation is reliable on device.
- Next: Attendance deep parity, Exams self-APIs polish, Fees polish; reuse shared Holidays/Library with `isStudent` / `canManage`.
- Do **not** invent student APIs for admin-only CRUD. Do **not** expose teacher mark-entry / generate-publish unless product asks.

### Admin

- Existing: `AdminStack`, `useAdminData` (many admin KPIs; some areas still mock — verify before reuse).
- Web admins typically see same Exams/Engagement/Library/Holidays with full CRUD.
- Can share teacher exam/engagement/library screens **or** mount the same shared screens on AdminStack (already done for holidays/library/engagement).
- Safe to use broader list APIs; still prefer exam **group-items** model over legacy gradebook for Exams tab parity.

---

## 10. Known footguns (read before coding)

1. **`useAdminData` on teacher** → 403 → logout. Never.
2. **Mock-seeded `useState(mockX)`** while live fetch runs → UI flashes fake data. Use `[]` + loader.
3. **`useFocusEffect([refetch])`** where `refetch` identity changes every render → infinite refresh spinner. Use ref.
4. **`PrimaryButton` default `width: '100%'`** inside a horizontal row → overflows card. Use `size="compact"`.
5. **Teacher-assigned classes ≠ school classes.** Exams Marks/Results filters need `academicClassesApi`.
6. **Two exam systems:** School ERP group-items vs ClassManagement competitive exams vs unused legacy `examsApi`/`examSchedulesApi`. Target group-items for School ERP Exams.
7. **Reports “Attendance Report” link** opens `AttendanceAnalytics` (fixture charts), not the orphan `AttendanceReport` route.
8. Axios **any 403** treated as auth failure in `src/core/api/config.ts` — choose endpoints the role can call.
9. **Student vs Teacher same route name** — do **not** reuse `Timetable` for student; use **`StudentTimetable`**. Tab screens must navigate via parent stack (`useOpenStudentTimetable`) or device can open the wrong screen / crash.
10. **Honest data on student analytics** — do not invent exam % / topic / skills fillers when marks are missing (web still does in places).

---

## 11. Key file index

```
src/erp_schools/
  config.ts                          # USE_MOCK_DATA
  navigation/
    SchoolsTabEntry.tsx
    TeacherStack.tsx / TeacherTabs.tsx
    StudentStack.tsx / AdminStack.tsx
    routes.ts / adminRoutes.ts
  hooks/
    useSchoolsSession.ts
    useTeacherData.ts
    useTeacherHrData.ts
    useTeacherExamsData.ts
    useTeacherNotices.ts / useTeacherTimetable.ts / useTeacherFeesData.ts
    useLibraryData.ts / useEngagementData.ts / useHolidayCalendarData.ts
    useStudentData.ts / useStudentSubjectsData.ts / useStudentTimetable.ts / useOpenStudentTimetable.ts / useAdminData.ts
  screens/teacher/…                  # teacher-only
  screens/shared/…                   # multi-persona
  screens/student/…  screens/admin/…
  utils/
    examMeta.ts / engagementMeta.ts / libraryMeta.ts / holidayMeta.ts
    studentDashboardMeta.ts / studentSubjectsMeta.ts / studentTimetablePdf.ts
    erpRoleScopes.ts / apiHelpers.ts
  data/                              # fixtures (mock-only consumers)
  components/  theme/  types/
src/core/api/erp.api.ts              # all ERP endpoints (+ lmsEnrollmentsApi)
```

**Web counterparts:**

```
Quiz-React/src/components/ERPManagement/tabs/ExamsTab.tsx
Quiz-React/src/components/ERPManagement/tabs/ExamGroupsSubView.tsx
Quiz-React/src/components/ERPManagement/tabs/ExamSchedulePanel.tsx
Quiz-React/src/components/ERPManagement/tabs/StudentEngagementTab.tsx
Quiz-React/src/services/erpApi.ts
Quiz-React/src/utils/erpRoleScopes.ts
```

---

## 12. Suggested order for Student / Admin parity

1. Confirm web tab visibility for the persona (`erpRoleScopes` + `ERPManagement`).
2. Reuse **shared** Holidays / Library / Engagement if applicable.
3. ~~Student Dashboard~~ **DONE** · ~~Subject Overview + detail~~ **DONE** · ~~Student Timetable (+ PDF)~~ **DONE**.
4. Student Attendance deep parity next; then Exams self-APIs polish; Fees polish.
5. Admin Exams → can mount same teacher exams hub/screens (already instructor-safe APIs).
6. Leave Assignments / Assessments / Reports / AI as mock until product prioritizes them (same as teacher).
7. Always add loaders; never seed live UI with `data/*` fixtures.
8. Student stack route names must stay unique vs teacher (`StudentTimetable`, not `Timetable`).

---

## 12a. Student Dashboard (home) — LIVE

Web source: `Quiz-React/.../StudentERPDashboard.tsx`  
Mobile: `screens/student/dashboard/StudentHomeScreen.tsx` + `hooks/useStudentData.ts` + `utils/studentDashboardMeta.ts`

| Block | Status | APIs / notes |
|-------|--------|----------------|
| Welcome hero (class · ADM · year) | LIVE | `studentsByUserApi`, fee meta, `AcademicYearContext` |
| KPI: Subjects / Attendance / Fee Due / Notices | LIVE | LMS enrollments + AY attendance metrics + `studentFeesApi.myPayments` + `noticesApi` |
| Current Class + weekly % | LIVE | Roster / enrollments; cosmetic weekly % |
| Pending Fees | LIVE | Fee rollup in `studentDashboardMeta.computeFeeSummaryFromPayments` |
| Attendance donut P/A/Leave/Total | LIVE | `attendanceRecordsApi.mySummary` + `getAll` (AY window via `computeYearAttendanceMetrics`) |
| My Subjects + % | LIVE | `lmsEnrollmentsApi.myClassrooms` (`GET /api/v1/class-management/my-enrolled-classrooms`); fallback `examAllItemsApi.mySubjectPerformance` |
| Exam schedule + month cal | LIVE | `examAllItemsApi.mySchedule` |
| Holiday month cal | LIVE | `holidaysApi.getAll` (current + AY years) |
| Quick Stats / Upcoming Events | LIVE | Derived (exam \| holiday \| notice) |
| Announcements | LIVE | `noticesApi` |
| Quick Access / Today Schedule / AI | LIVE/extra | Mobile-only; timetable prefers `timetableSlotsApi.myStudentTimetable` |

**Patterns:** empty initial payload + `ScreenLoader` until first ready; pull-to-refresh keeps content; student-scoped APIs only (no `useAdminData`); initials from profile name.

**QA (Eshwara):** ~6 subjects, attendance ~1%, fee due ≈ ₹48,750, Class 4 · A, Term Fee notice.

---

## 12c. Student Timetable — LIVE

Web source: `Quiz-React/.../TimetableTab.tsx` → `PersonalWeeklyTimetable` / `PersonalMonthlyTimetable` (student)  
Mobile: `screens/student/timetable/TimetableScreen.tsx` + `hooks/useStudentTimetable.ts`

| Block | Status | APIs / notes |
|-------|--------|----------------|
| Hero (My Schedule) + week badge | LIVE | Client week label |
| Weekly / Monthly toggle | LIVE | Local `viewMode` |
| Week / month date navigation | LIVE | `weekOffset` / `monthDate`; center tap resets to current |
| Refresh (header + pull) | LIVE | Refetch slots + templates |
| Period list with FREE cells | LIVE | Mon–Sat day chips; FREE when missing / outside template range |
| Today's Classes | LIVE | Real calendar today; Sunday → empty message |
| Weekly Overview KPIs | LIVE | Total periods · Scheduled days · Today's classes |
| Monthly calendar | LIVE | 42-cell grid; subjects + `+N` |
| Template effective range | LIVE | `timetableTemplatesApi.list` → `effective_from` / `effective_to` |
| Slot load | LIVE | `timetableSlotsApi.myStudentTimetable` → fallback `slots` list |
| Academic year | Display only | Web also does **not** pass `academic_year_id` to timetable APIs |
| Download PDF | LIVE | `expo-print` → PDF + `expo-sharing` save/share sheet |
| Nav entry points | LIVE | Home Today's Schedule / More / Subject Quick Action → `StudentTimetable` via `useOpenStudentTimetable` |

**Device footgun fixed (2026-07-27):** Student route renamed **`Timetable` → `StudentTimetable`** so it never collides with teacher `Timetable`. Home **View Timetable** / More must use parent-stack navigation (`useOpenStudentTimetable`). PDF download uses lazy `import()` so a missing native module does not crash screen open. Also hardened `AttendanceDetailsScreen` + `StatusPill` (stack sometimes showed that screen on bad route resolution).

**Not Attendance:** Student Attendance remains `screens/student/attendance/` — separate module.

---

## 12b. Student Subject Overview — LIVE

Web source: `Quiz-React/.../studentClassesOverview/` (`useStudentClassesData`, `AllClassesView`, `ClassDetailView`)  
Mobile: `screens/student/academics/AcademicsScreen.tsx` (overview) + `SubjectDetailsScreen.tsx` + `hooks/useStudentSubjectsData.ts` + `utils/studentSubjectsMeta.ts`  
Tab label: **Subjects** (`StudentAcademics`).

| Block | Status | APIs / notes |
|-------|--------|----------------|
| Overall class banner | LIVE | Enrollments class/section + avg att/score |
| 6 KPIs (enrolled, att, score, exams attended/missed, certificates) | LIVE | Client aggregates from rows + `computeExamStats` |
| Subject list + search | LIVE | `lmsEnrollmentsApi.myClassrooms` (+ enrollments/classrooms fallback); perf match; per-subject att |
| Attendance donut | LIVE | AY window `mySummary` + `getAll` |
| Exam summary / upcoming / recent | LIVE | `examAllItemsApi.mySchedule` |
| Strengths / improvements | LIVE | Derived from subject % |
| Exam performance bands + subject bar chart | LIVE | From subject percentages |
| Overall rank | LIVE | `overallRankLabel` |
| Subject detail analytics | LIVE | Same hook; synthetic topic/skills/rank trends like web when marks exist |
| Detail: Exam Analytics KPIs + history | LIVE | Total/Appeared/Missed + H/L/Avg (`—` when no marks; web still invents %) |
| Detail: Attendance + heatmap | LIVE | P/A/Leave/Late, AY window, days-to-75%, last-28 heat cells |
| Detail: Compare You / Avg / Highest | LIVE | From scored subject rows; no fake student % |
| Detail: AI Insights, Upcoming Exams, Upcoming & Due, Recent Activity, Quick Actions | LIVE | Holidays + homework + notices combined |

**Honest-data policy (mobile):** do not invent performance/attendance/topic fillers when marks are missing (web `utils.ts` still does). Empty states are expected for subjects like Science with N/A marks.

**Nav:** Home Subjects KPI → Subjects tab; subject card / row View → `SubjectDetails` with enrollment `class_id` key.

**QA (Eshwara):** Enrolled 6 · Att ~1.0% · Avg ~86.5% · Exams 6/6 · Certificates ≥1 · detail opens correct classroom (e.g. 4A-English).

---

## 13. Changelog summary

### Teacher workstream (baseline)

- Live APIs default; mock flag off.
- Attendance, payroll/leave (loader + no mock flash), notices, timetable, fees.
- Holidays, Library, Engagement shared modules.
- Exams full group→item→subjects/students/grades/marks/results/report-cards; school-wide classes; schedule calendar.
- Quick Actions / More cleanup; Exams no longer mock admin fixtures.
- Left mock: Assignments, Assessments, Reports, Notifications, Settings, AI (+ hidden materials/parent chat).

### Student workstream (current — up to date)

- **Dashboard (home)** LIVE — web StudentERPDashboard blocks + Today's Schedule.
- **Subject Overview + Subject Details** LIVE — web AllClassesView / ClassDetailView; honest empty charts when no marks; Exam Analytics KPIs, Attendance+heatmap, Compare, AI Insights, Upcoming & Due, Recent Activity, Quick Actions.
- **Timetable** LIVE — web PersonalWeeklyTimetable / PersonalMonthlyTimetable; weekly+monthly; FREE cells; Today’s Classes; Weekly Overview; template effective-range; **Download Timetable PDF** (`expo-print` + `expo-sharing`, lazy import).
- **Nav fix (device):** student route **`StudentTimetable`** + `useOpenStudentTimetable` (parent stack via `CommonActions`). Do not reuse teacher route name `Timetable`. Hardened `AttendanceDetailsScreen` / `StatusPill` against undefined data (device crash when wrong screen resolved).
- **Still next:** Attendance deep parity, Exams self-API polish, Fees polish.

---

*When in doubt: open the web tab first, list its `erpApi` calls, mirror paths in `erp.api.ts`, build a persona hook with empty+loader, then UI. Do not invent a second data model.*
