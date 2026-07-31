# ERP Schools — Mobile Source of Truth

> **Audience:** Agents and engineers implementing or extending **Teacher**, **Student**, or **Admin** in mobile `erp_schools`.  
> **This file is the source of truth** for design patterns, code structure, API integration, module status, and remaining plan.  
> **Product / web parity:** Quiz-React School ERP — `d:\eduvijna\Quiz-React\src\components\ERPManagement\`.  
> **Mobile package:** `d:\eduvijna\Eduvijna\src\erp_schools\`.  
> **Config:** `config.ts` → `USE_MOCK_DATA = false` (live `/api/v1/erp/*` by default).  
> **App design system:** `d:\eduvijna\Eduvijna\DESIGN.md` (brand, type, spacing) + `erp_schools/theme/*`.  
> **Status (2026-07-30):** Teacher + Student core **LIVE**. Admin ops modules **LIVE** (Home, Overview, Class Overview, Attendance, Notices, Exams, Timetable, Fees, HR, Transport, Safety, Inventory, Hostel, Biometric, Forms, Parent Portal, Analytics, Admissions). **Still fixtures:** Admin People directory, Finance tab overview, Academic Overview / Reports Dashboard. Teacher Assignments / Assessments / AI still mock.

---

## 1. How to use this doc

| If you need… | Go to |
|--------------|--------|
| Auth → persona → stacks / tabs | §2 |
| Design system (visual + UX rules) | §3 |
| Data / code / API integration patterns | §4 |
| Web ↔ mobile parity rules | §5 |
| Teacher LIVE / MOCK map | §6 |
| Student LIVE / MOCK + nav | §7 |
| Shared screens (reuse first) | §8 |
| Admin playbook + module maps | §9 |
| API catalog (`erp.api.ts`) | §10 |
| Module deep-dives | §11 |
| Footguns | §12 |
| File index | §13 |
| Remaining plan | §14 |
| Changelog | §15 |

**Golden rule:** Open the web tab first → list its `erpApi` calls → mirror paths in `erp.api.ts` → persona hook with **empty arrays + loader** → UI. Do not invent a second data model. Prefer `screens/shared/*` when UI is 80%+ identical.

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
| Live vs mock | `config.ts` → `USE_MOCK_DATA` |
| API client | `src/core/api/erp.api.ts` |
| Academic year | `contexts/AcademicYearContext.tsx` |
| Shared UI | `components/` + `theme/` |

### Bottom tabs by persona

| Persona | Tabs (L→R) | Notes |
|---------|------------|--------|
| **Teacher** | Dashboard · Classes · Home (→ main app) · Students · More | |
| **Student** | Dashboard · Subjects · Home · **Timetable** · More | AI Test tab removed |
| **Admin** | Dashboard · **Attendance** · Home · Finance · More | People tab replaced by Attendance (LIVE). Class Overview lives under More |

Stack screens push on top of tabs for detail flows. Keep **route names unique across personas** (e.g. student `StudentTimetable` ≠ teacher `Timetable`).

### Admin More menu (exact)

Source: `screens/admin/settings/MoreMenuScreen.tsx`

| Section | Items → routes |
|---------|----------------|
| Academic | Academic Overview → `AcademicOverview` · Class Overview → `Classes` · Exams · Timetable · Academic Reports |
| Admissions | Admissions Operations → `AdmissionsDashboard` |
| Operations | Attendance Dashboard · Library Management → `Library` · Transport · Safety · Hostel · Inventory · Biometric · Form Builder |
| Finance | Fee Management → `FeeCollection` |
| People Operations | HR & Payroll · Parent Portal |
| Insights | School Overview · Analytics · Reports Dashboard · Notices → `Announcements` · Engagement · Holidays |
| Account | Notifications · Settings · Switch to App Home · Sign Out |

Profile card → `AdminProfile`.

---

## 3. Design system (visual + UX)

### Brand & tokens

Canonical brand lives in repo-root **`DESIGN.md`**. ERP maps those tokens in:

| Asset | Path |
|-------|------|
| Tokens | `theme/tokens.ts` |
| Accents | `theme/accents.ts` — `teal \| blue \| green \| orange \| purple \| pink \| red` |
| Theme hook | `theme/useTeacherTheme.ts` (ThemeContext + ERP palettes) |
| Fonts | Poppins via `src/theme/fonts.ts` (app-wide) |

| Token | Value |
|-------|--------|
| Primary | `#0B5563` |
| Secondary | `#0F6D7A` |
| Accent | `#12B3C7` |
| Success / Warning / Danger | `#22C55E` / `#F59E0B` / `#EF4444` |
| Background / Surface / Border | `#F8FAFC` / `#FFFFFF` / `#E2E8F0` |
| Text primary / secondary | `#0F172A` / `#64748B` |

### UX principles (mobile ERP)

1. **Mobile-first** — one job per screen; no dense web tables as grids of columns.
2. **Role-based chrome** — staff: `TeacherScreen` + `ScreenHeader`; student: `StudentModuleHeader` (identity + **Academic Year pill**).
3. **Web heroes → compact** eyebrow + subtitle; not full marketing heroes.
4. **Dense tables →** `ListItem` / tinted cards; master-detail → list → stack detail.
5. **Filters:** `SelectField` / `SearchBar` / `SegmentedControl` / `FilterChips` / chips.
6. **CTAs:** `PrimaryButton` — `size="compact"` inline; default full-width in footers.
7. **Metrics:** `StatGrid` / `StatCard` (tinted overview tiles). Support optional `onPress` for navigation.
8. **Charts:** Prefer `DonutChart` / `BarChart` / progress bars / mini calendars over heavy web charts.
9. **Empty / loading / error** — always explicit (`ScreenLoader`, `EmptyState`). Never flash fixtures in live mode.
10. **Soft delete** — confirm → DELETE → refetch; label **“Deactivate”** when soft (unless web uses hard Delete, e.g. biometric logs).

### Admin Home UX notes (current)

- School Overview KPI cards are **pressable**:
  - Total Students → `Classes` `{ initialTab: 'students' }`
  - Total Staff → `Classes` `{ initialTab: 'teachers' }`
  - Total Classes → `Classes` `{ initialTab: 'classes' }`
  - Attendance Today → `AttendanceDashboard`
- Same wiring on `SchoolOverviewScreen`.
- **EduVijna AI Assistant** banner removed from Admin Home (do not re-add without product ask).

### Shared components (prefer these)

Barrel: `components/index.ts` — `TeacherScreen`, `ScreenHeader`, `StudentModuleHeader`, `AcademicYearPill`, `SurfaceCard`, `SectionHeader`, `StatGrid`/`StatCard`, `QuickActionGrid`, `ListItem`, `Avatar`, `Badge`/`StatusPill`, `SearchBar`, `FilterChips`, `SegmentedControl`, `PrimaryButton`, `ProgressBar`, `DonutChart`, `BarChart`, `EmptyState`, `ScreenLoader`, `InfoBanner`, `FormField`/`TextField`/`SelectField`, …

Do **not** invent one-off cards when an existing component fits.

---

## 4. Data / code / API integration patterns

### Data flow

```
Screen
  → persona / shared hook
    → @core/api/erp.api.*   (when USE_MOCK_DATA === false)
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
| Academic year | Prefer `AcademicYearContext` / `selectedYearId` when web sends `academic_year_id` |
| Empty while loading | **Empty arrays + `ScreenLoader`** — never seed live mode with `data/*` fixtures |
| Mock mode | `USE_MOCK_DATA === true` → fixtures under `data/` / `data/admin/` / `data/student/` |

**Do not** call `useAdminData()` from teacher/student screens → admin APIs can **403** → axios may **force logout** (`src/core/api/config.ts`).

### Implementation checklist (every new / live module)

1. Confirm web tab in Quiz-React (`tabs/*` + `erpApi.ts`).
2. Mirror endpoints in `src/core/api/erp.api.ts` (same path + query params).
3. Add / extend persona hook: live branch starts **empty + loader**.
4. Put enums / labels in `utils/*Meta.ts` (keep aligned with web).
5. Build UI with shared components; stack routes in persona `*Routes` + `*Stack` + `types/navigation.ts`.
6. Wire More / tab / Home deep links.
7. Update **this guide** (§6–9 status + §14 plan + §15 changelog).

### Mappers

| File | Maps |
|------|------|
| `mappers/teacher.ts` | Class overview → classes/students; KPIs; schedule; notices; attendance; dues |
| `mappers/student.ts` | Roster→profile; attendance; notices/events; timetable; exams; assignments; fees; library |
| `mappers/admin.ts` | Admin profile; dashboard KPIs; directory people; fee records; announcements; leave→approvals |

Domain shaping also lives in `utils/*Meta.ts` and PDF helpers (`*Pdf.ts`).

---

## 5. Web ↔ mobile principles

| Topic | Web | Mobile |
|--------|-----|--------|
| Module shell | `ERPManagement` tab | More / tabs + stack |
| Sub-tabs | `ERPCompactSubTabs` | Chips / `SegmentedControl` / Icon tabs |
| CRUD | Modals | Create/edit screens **or** RN Modals (match existing hub pattern) |
| Class filters (Exams) | `academicClassesApi` school-wide | Same — **not** teacher-assigned classes only |
| Student Exams | `mySchedule` only | Same — no staff Marks/Results/Report Cards |
| Shared modules | Same APIs when tab visible | Prefer `screens/shared/*` |

**Web folders:**

- Tabs: `Quiz-React/src/components/ERPManagement/tabs/`
- Student dashboard: `…/StudentERPDashboard.tsx`
- APIs: `Quiz-React/src/services/erpApi.ts`
- Role tabs: `Quiz-React/src/utils/erpRoleScopes.ts`

---

## 6. Teacher — LIVE vs MOCK

### LIVE

| Module | Entry | Hook |
|--------|--------|------|
| Home / Dashboard | Tab | `useTeacherData`, `useTeacherHrData`, `useTeacherStaffProfile` |
| Classes + details | Tab / stack | `useTeacherData`, `useClassDetails` |
| Students + profile | Tab / stack | `useTeacherData` + `useTeacherStudentActions` |
| Attendance (my / mark / calendar) | More / stack | `useTeacherAttendanceTracker`, `useTeacherMyAttendance`, `useTeacherAttendanceActions` |
| Payroll / Leave / Payslips | More + Home | `useTeacherHrData` (empty init in live — no mock flash) |
| Notices | More | `useTeacherNotices` / `useTeacherNoticeActions` |
| Timetable | More | `useTeacherTimetable` |
| Fee Management | More | `useTeacherFeesData` (`scope: 'teacher'`) |
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

### Teacher More (sections)

Attendance & Payroll · Academics (Assignments, Assessments, Exams, Library, Timetable, Fees, Reports) · Communication (Notice Board) · Insights (AI, Student Progress, Engagement, Holidays) · Account.

---

## 7. Student — LIVE vs MOCK + navigation

### Tabs

`StudentHome` · `StudentAcademics` (Subjects) · Home (main app) · **`StudentTimetableTab`** · `StudentMore`

- Timetable tab mounts `TimetableScreen` with `showBack={false}`.
- Stack route `StudentTimetable` kept for deep links; prefer `useOpenStudentTimetable()` → tabs.
- AI Test tab **removed**; Learning section **removed** from More.
- Dashboard identity card: **Academic Year pill**, not Profile button. Profile via More card.

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
| AI Tutor / Practice / Quiz | Hardcoded — removed from More + tabs; stack still registered |
| Settings | Local toggles only |
| Old `screens/student/library/*` | Unused — More uses shared Library |

### Student chrome conventions

- Every module screen: `StudentModuleHeader` (identity + AY pill).
- PDF exports: `expo-print` + `expo-sharing` (timetable, attendance, exam schedule, fee receipts).
- Never invent exam % / topic / skills fillers when marks missing.

---

## 8. Shared screens (reuse for Admin)

| Screen | Hook | Teacher | Student | Admin |
|--------|------|---------|---------|-------|
| `HolidayCalendarScreen` (+ Create) | `useHolidayCalendarData` | CRUD | Read-only | CRUD |
| `LibraryScreen` (+ Create Book/Tx) | `useLibraryData` | CRUD | Books + My Issues | CRUD (`Library` / Book Management) |
| `EngagementHubScreen` (+ Create) | `useEngagementData` | CRUD | Hidden on web | CRUD |
| `StaffSelfServiceView` | staff profile APIs | — | — | Class Overview → My Profile |
| `StudentProfileView` | student APIs | teacher profile | — | Admin student profile |

`canManage = !isStudent` (staff create screens alert + goBack if student).

**Admin already reuses** Holidays, Library, Engagement, teacher Exams hub, teacher Fees hub, teacher Attendance hub, teacher Notices.

---

## 9. Admin playbook — start here

### Current state (summary)

| Area | Status |
|------|--------|
| `AdminStack` + `AdminTabs` + More menu | Wired |
| Holidays / Library / Engagement | **LIVE** via shared screens; Library Dashboard KPIs LIVE |
| Admin Home + School Overview | **LIVE** — `useAdminDashboardData`; KPI cards navigate to Class Overview / Attendance |
| Class Overview | **LIVE** — Classes / Students / Teachers / My Profile (`useAdminClassOverviewData`) |
| Attendance (tab + More + Home) | **LIVE** — `TeacherAttendanceScreen role="admin"` |
| Notices / Exams / Timetable / Fees | **LIVE** (reuse teacher hubs where noted) |
| HR / Transport / Safety / Inventory / Hostel / Biometric / Forms / Parent Portal / Analytics / Admissions | **LIVE** |
| **People directory** (Student/Teacher/Parent/Staff management, Roles, Permissions) | **Fixtures** via `useAdminData` — **≠** Class Overview |
| **Finance tab** (`FinanceDashboard`) + Revenue / Expense analytics | **Fixtures** via `useAdminData` |
| Academic Overview / Academic Reports / Reports Dashboard | **Fixtures** / thin |
| ApprovalWorkflow | Fixture admissions slice |

**Clarify:** Class Overview (LIVE people *ops* — roster + teachers + self-service) is **not** the same as People hub screens under `screens/admin/people/*` (still fixtures).

### Admin Dashboard (Home) — LIVE map

| Mobile section | Web source | APIs |
|----------------|------------|------|
| Hero + AY pill | Hero | `AcademicYearContext` + session |
| School Overview KPIs + strip | `KpiStrip` + dashboard KPIs | `erpDashboardApi`, `classOverviewApi.getKPIs` |
| Today's Alerts / Important Alerts | ChartsRow alerts | fees, attendance, leave, library, inventory, grievances |
| Quick Actions | QuickActions | nav only |
| Live Attendance + Fee Collection | Classic + Charts | dashboard trend + `feeReportsApi` + staff attendance |
| Fee / Students / Admissions / Attendance cards | ClassicPanels | class KPIs, admissions status-counts, fee summary |
| Events / Exams / Holidays / Staff Leave | Upcoming + calendars | events, exam subjects, holidays, staff leave |
| Engagement / Safety / HR / Income | BottomPanels | grievances, visitors, payslips, fees |
| Transport / Inventory / Library / Hostel | ModuleOverviews | vehicles, routes, assignments, inventory, books, txs, hostel |

**Hook:** `hooks/useAdminDashboardData.ts` · **Meta:** `utils/adminDashboardMeta.ts`  
**Screens:** `AdminHomeScreen.tsx` · `SchoolOverviewScreen.tsx`  
Empty + `ScreenLoader` + pull-to-refresh. No AI Assistant CTA.

### Admin Class Overview — LIVE map

Web: `ClassOverviewTab` (Classes · Students · **Teachers** · My Profile).  
Mobile: More → **Class Overview** (`Classes`) · `ClassesScreen.tsx` · `useAdminClassOverviewData.ts`  
Route params: `Classes: { initialTab?: 'classes' | 'students' | 'teachers' }`.

| Tab | APIs | Notes |
|-----|------|--------|
| Classes | `classOverviewApi.getAll` (+ KPIs fallback) | Filters; school-wide (no teacher_id scope) |
| Students | `studentsByUserApi.getAll` | Cards → `AdminStudentProfile`; + New Student modal |
| Teachers | `staffProfilesApi.list` → `/hr/staff` | Teaching = `designation === 'instructor'`; → `AdminTeacherDetail` |
| My Profile | `staffProfilesApi.getMyProfile` / update | `StaffSelfServiceView` |

### Admin Attendance — LIVE map

Web: `AttendanceTab` (Student · My · Staff · Class Report · Student Report · Settings).  
Mobile: **Attendance tab** + More/Home → `AttendanceDashboard` → `TeacherAttendanceScreen role="admin"`.

| Tab | Hook / APIs | Notes |
|-----|-------------|--------|
| Student Attendance | `useTeacherAttendanceTracker` | Calendar + day list; P→A→L→clear; subject required |
| My Attendance | `useTeacherMyAttendance` | Self-mark 1H/2H; pending Approve/Reject |
| Staff Attendance | `useAdminStaffAttendance` | Roster + `staffAttendanceApi` |
| Class Report | `attendanceRecordsApi.getAll` | Aggregate by class/section/subject + range |
| Student Report | `attendanceRecordsApi.studentSummary` | Search + range |
| Settings | `attendanceSettingsApi` | Working days, periods, thresholds |

Teacher hub shares the same screen without Staff Attendance (5 tabs).

### Admin Notices — LIVE map

`Announcements` → `NoticeBoardScreen role="admin"`. Create/Detail on AdminStack.  
Hooks: `useTeacherNotices` / `useTeacherNoticeActions` → `noticesApi`.  
Categories: `general | academic | fee | event | exam | holiday`.

### Admin Exams — LIVE map

`Exams` → `TeacherExamsScreen role="admin"` + child exam routes on AdminStack.  
Hook: `useTeacherExamsData`. School-wide (`school_id` only). Hierarchy: ExamGroup → ExamItem → Subjects / Students / Marks / Results; Grades; Report Cards.

### Admin Timetable — LIVE map

`AdminTimetableScreen` + create template/slot screens · `useAdminTimetableData`.  
Tabs: Templates · Weekly Schedule · Calendar. APIs: `timetableTemplatesApi` · `timetableSlotsApi` · `timetableLookupApi` · `timetableSubstituteApi`.

### Admin Fees — LIVE map

`FeeCollection` → `TeacherFeesScreen role="admin"` · `useTeacherFeesData({ scope: 'school' })`.  
Tabs: Structure · Assignment · Register · Demand Bill · Collections · Receipts.

### Admin HR & Payroll — LIVE map

`AdminHrScreen` · `useAdminHrData` — Leave Types · Leave Applications · Payslips (+ PDF).  
Staff directory / staff attendance: Class Overview Teachers + Attendance Staff tab (already LIVE).  
Teacher self-service: More → Payroll & Leave (`useTeacherHrData`).

### Admin Transport — LIVE map

`AdminTransportScreen` · `useAdminTransportData` — Vehicles · Routes · Assignments. Soft Deactivate.

### Admin Safety — LIVE map

`AdminSafetyScreen` · `useAdminSafetyData` — Visitors · Incidents · Emergency Contacts (`/api/v1/erp/safety/*`).

### Admin Inventory — LIVE map

`AdminInventoryScreen` · `useAdminInventoryData` · `inventoryMeta.ts` — Items · Purchase Orders · Stock Movements.

### Admin Hostel — LIVE map

`HostelDashboardScreen` · `useAdminHostelData` · `hostelMeta.ts` — Rooms · Allocations · Complaints.

### Admin Biometric — LIVE map

`AdminBiometricScreen` · `useAdminBiometricData` · `biometricMeta.ts` — Devices · Enrollments · Logs (logs: hard Delete like web).

### Admin Form Builder — LIVE map

`FormsDashboardScreen` · `useAdminFormsData` · `formBuilderMeta.ts` — Templates · Responses.

### Admin Parent Portal — LIVE map

`AdminParentPortalScreen` · `useAdminParentPortalData` · `parentPortalMeta.ts` — PTM Schedules · Appointments (`/ptm-appointments`) · Communications.

### Admin Analytics — LIVE map

`AdminAnalyticsScreen` · `useAdminAnalyticsData` · `analyticsMeta.ts` · `schoolDocumentsPdf.ts` — Templates · Snapshots · Widgets · School Documents.

### Admin Admissions Operations Desk — LIVE map

`AdminAdmissionsScreen` · `useAdminAdmissionsData` · `admissionsMeta.ts` — Enquiry (11-stage CRM) · Visitors · Front Office · Incidents · Emergency. Soft Deactivate. Overlaps Safety APIs (same as web).

### Admin-specific rules

| Rule | Why |
|------|-----|
| Admin **may** call broader APIs | Unlike teacher/student |
| Prefer exam **group-items** model | Not legacy gradebook / competitive ClassManagement exams |
| Soft-delete + `school_id` | Same as teacher |
| Don’t break shared `canManage` | Students stay read-only on holidays/library writes |
| Isolate route names | `Admin*` prefixes in `adminRoutes.ts` / `AdminStackParamList` |
| `useAdminData` is fixture-shaped | Scaffolding only — **replace per module** when going live |

### Web tabs for admin parity

Confirm with `ROLE_ERP_TABS`: Dashboard, Classes, Attendance, Exams, Timetable, Fees, Library, Holidays, Engagement, Notices, plus admin-only People / Admissions / Finance analytics / Ops.

---

## 10. API catalog (`src/core/api/erp.api.ts`)

Base: `https://eduapi.eduvijna.com` — paths under `/api/v1/erp/…` unless noted. Always mirror web `erpApi.ts`.

| Domain | Export objects | Path pattern |
|--------|----------------|--------------|
| **SIS** | `studentsByUserApi`, `classOverviewApi`, `studentProfilesApi`, `guardiansApi`, `medicalApi`, `documentsApi`, `uploadApi`, `classesApi` | `/api/v1/erp/sis/…` |
| **Academic** | `academicClassesApi`, `coursesApi`, `batchesApi`, `academicTermsApi`, `erpAcademicYearsApi` | `/api/v1/erp/academic/…` |
| **Attendance** | `attendanceSettingsApi`, `attendanceRecordsApi` | `/api/v1/erp/attendance/…` |
| **Staff attendance** | `staffAttendanceApi` | `/api/v1/erp/staff-attendance/…` |
| **Notices** | `noticesApi` | `/api/v1/erp/notices` |
| **Dashboard** | `erpDashboardApi` | `/api/v1/erp/dashboard` |
| **Admissions / front office** | `admissionsApi`, `phoneCallLogsApi`, `postalDispatchApi`, `postalReceiveApi` | `/api/v1/erp/admissions/…`, `…/front-office/…` |
| **Safety** | `visitorsApi`, `incidentsApi`, `emergencyContactsApi` | `/api/v1/erp/safety/…` |
| **Exams** | `examGroupsApi`, `examGroupItemsApi`, `examSubjectsApi`, `examGradesApi`, `examStudentsApi`, `examSectionsApi`, `examAllItemsApi`, `examsApi`, `examSchedulesApi`, `examMarksApi`, `examResultsApi` | `/api/v1/erp/exams/…` |
| **Timetable** | `timetableTemplatesApi`, `timetableSlotsApi`, `timetableLookupApi`, `timetableSubstituteApi` | `/api/v1/erp/timetable/…` |
| **LMS** | `lmsEnrollmentsApi`, `classManagementSubjectsApi`, `lmsClassroomsApi`, `assignmentsApi`, `submissionsApi` | `/api/v1/erp/lms/…` |
| **Fees / Finance** | `feeTypesApi`, `feeStructuresApi`, `feeCollectionsApi`, `feeReceiptsApi`, `feePaymentPlansApi`, `feeReportsApi`, `studentsLookupApi`, `studentFeeAssignmentsApi`, `studentFeesApi`, `feeTermSchedulesApi`, `demandBillApi`, `feeNotificationsApi` | `/api/v1/erp/finance/…` |
| **HR** | `staffProfilesApi`, `leaveTypesApi`, `leaveApplicationsApi`, `payslipsApi` | `/api/v1/erp/hr/…` |
| **Library** | `booksApi`, `libraryTransactionsApi` | `/api/v1/erp/library/…` |
| **Transport** | `vehiclesApi`, `routesApi`, `transportAssignmentsApi` | `/api/v1/erp/transport/…` |
| **Hostel** | `hostelRoomsApi`, `hostelAllocationsApi`, `hostelComplaintsApi` | `/api/v1/erp/hostel/…` |
| **Inventory** | `inventoryItemsApi`, `purchaseOrdersApi`, `stockMovementsApi` | `/api/v1/erp/inventory/…` |
| **Engagement** | `studentCouncilsApi`, `councilMembersApi`, `studentGrievancesApi`, `eventsApi`, `eventRegistrationsApi`, `galleryApi` | `/api/v1/erp/engagement/…` |
| **Parent portal** | `ptmSchedulesApi`, `ptmAppointmentsApi`, `parentCommunicationsApi` | `/api/v1/erp/parent-portal/…` |
| **Biometric** | `biometricDevicesApi`, `biometricEnrollmentsApi`, `biometricLogsApi` | `/api/v1/erp/biometric/…` |
| **Analytics** | `reportTemplatesApi`, `reportSnapshotsApi`, `dashboardWidgetsApi` | `/api/v1/erp/analytics/…` |
| **Holidays** | `holidaysApi` | `/api/v1/erp/holidays` |
| **Form builder** | `formTemplatesApi`, `formResponsesApi` | `/api/v1/erp/form-builder/…` |
| **School branding** | `schoolManagementApi` | `/api/v1/school-management/…` |
| **Quiz nav** | `quizNavItemsApi` | `/api/v1/quiz-navigation-items` |

Common: `school_id` on list/update/delete; soft-delete = DELETE labeled “Deactivate” in UI.

---

## 11. Module deep-dives

### 11.1 Exams — staff (Teacher; reuse for Admin)

**Hierarchy:** ExamGroup → ExamItem → Subjects (papers) / Students / Marks / Results; Grades on group; Report Cards from results.

**Hub tabs:** Groups | Exams | Schedules | Marks (RO) | Results (RO) | Report Cards  
**Screens:** `screens/teacher/exams/*` · **Hook:** `useTeacherExamsData` · **Meta:** `examMeta.ts`

**APIs:** `examGroupsApi` · `examGroupItemsApi` · `examSubjectsApi` · `examStudentsApi` · `examGradesApi` · `examMarksApi` · `examResultsApi` · `examAllItemsApi.list` · `academicClassesApi.list` · `examSectionsApi.list`

Schedules = derived from exam subjects’ `exam_date` (not legacy `/schedules`). Class filter = school-wide academic classes.

### 11.2 Exams — student

Schedule-only: `useStudentExams` → `mySchedule` + optional `mySubjectPerformance`. No staff mark entry.

### 11.3 Engagement

Tabs: Councils | Members | Grievances | Events | Registrations | Gallery  
**Hook:** `useEngagementData` · APIs: `/api/v1/erp/engagement/*` · soft deactivate · `per_page: 25`  
Enums in `engagementMeta.ts`. Students: tab hidden (same as web).

### 11.4 Library

Books + Transactions (student: My Issues). **Hook:** `useLibraryData`. Categories hardcoded (web same).  
Admin: More → Library Management; Home Library “View” → Library Dashboard (LIVE KPIs).

### 11.5 Holidays

Calendar **year** (not AY). Shared Teacher / Student / Admin.  
**Hook:** `useHolidayCalendarData` → `holidaysApi.list({ school_id, year, per_page: 200 })`.  
Staff/admin CRUD; students read-only.

### 11.6 Teacher Payroll / Leave

**Hook:** `useTeacherHrData` — live mode must start **empty** + loader (no mock flash).

### 11.7 Student modules (summary)

| Module | Web | Mobile hook / screen |
|--------|-----|----------------------|
| Dashboard | `StudentERPDashboard` | `useStudentData` · `StudentHomeScreen` |
| Subjects | `studentClassesOverview` | `useStudentSubjectsData` |
| Timetable | `TimetableTab` personal | `useStudentTimetable` · tab `StudentTimetableTab` |
| Attendance | `StudentAttendancePanel` | `useStudentAttendance` + PDF |
| Fees | `FeesTab` student views | `useStudentFeesData` + receipt PDF |
| Exams | `StudentExamSchedule` | `useStudentExams` + schedule PDF |
| Library / Holidays | shared tabs | shared screens |

When changing a student module, re-read that screen’s hook header comment + web tab.

---

## 12. Known footguns

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
12. **Class Overview ≠ People hub** — don’t treat fixture People screens as LIVE roster management.
13. **Parent portal appointments** path is `/ptm-appointments` (not `/appointments`).

---

## 13. Key file index

```
src/erp_schools/
  ERP_GUIDE.md                       # this file — SoT
  config.ts                          # USE_MOCK_DATA
  navigation/
    SchoolsTabEntry.tsx
    TeacherStack.tsx / TeacherTabs.tsx / routes.ts
    StudentStack.tsx / StudentTabs.tsx / studentRoutes.ts
    AdminStack.tsx / AdminTabs.tsx / adminRoutes.ts
  hooks/
    useSchoolsSession.ts / useTeacherSession.ts
    useTeacherData.ts / useTeacherHrData.ts / useTeacherExamsData.ts
    useTeacherNotices.ts / useTeacherTimetable.ts / useTeacherFeesData.ts
    useTeacherAttendanceTracker.ts / useTeacherMyAttendance.ts
    useLibraryData.ts / useEngagementData.ts / useHolidayCalendarData.ts
    useStudentData.ts / useStudentSubjectsData.ts / useStudentTimetable.ts
    useOpenStudentTimetable.ts / useStudentAttendance.ts
    useStudentFeesData.ts / useStudentExams.ts
    useAdminData.ts                  # fixtures for remaining People/Finance/Reports
    useAdminDashboardData.ts         # LIVE admin home + school overview
    useAdminClassOverviewData.ts     # LIVE Class Overview (4 tabs)
    useAdminHrData.ts / useAdminTransportData.ts / useAdminSafetyData.ts
    useAdminHostelData.ts / useAdminInventoryData.ts / useAdminBiometricData.ts
    useAdminFormsData.ts / useAdminAdmissionsData.ts
    useAdminParentPortalData.ts / useAdminAnalyticsData.ts
    useAdminTimetableData.ts / useAdminStaffAttendance.ts
  screens/teacher/…  screens/student/…  screens/admin/…  screens/shared/…
  mappers/ teacher.ts · student.ts · admin.ts
  utils/
    examMeta.ts / engagementMeta.ts / libraryMeta.ts / holidayMeta.ts
    hostelMeta.ts / inventoryMeta.ts / biometricMeta.ts / formBuilderMeta.ts
    parentPortalMeta.ts / analyticsMeta.ts / admissionsMeta.ts / timetableMeta.ts
    schoolDocumentsPdf.ts / payslipPdf.ts / demandBillPdf.ts
    student*Pdf.ts / adminDashboardMeta.ts
    erpRoleScopes.ts / apiHelpers.ts
  components/  theme/  contexts/AcademicYearContext.tsx
  data/                              # fixtures only when USE_MOCK_DATA
src/core/api/erp.api.ts
DESIGN.md                            # app-wide brand / type / spacing
```

---

## 14. Plan — remaining work

### Done

- Teacher core LIVE (attendance, HR, notices, timetable, fees, exams, shared Holidays/Library/Engagement).
- Student core LIVE (dashboard, subjects, timetable tab, attendance, fees, exams schedule, library, holidays) + chrome (AY pill; AI removed from More/tabs).
- Admin: Home + School Overview, Class Overview, Attendance (incl. bottom tab), Notices, Exams, Timetable, Fees, HR, Transport, Safety, Hostel, Inventory, Biometric, Form Builder, Parent Portal, Analytics, Admissions.
- Admin Home: KPI card navigation to Class Overview / Attendance; AI Assistant banner removed.

### Next (priority)

1. **Admin People** — live hooks replacing `useAdminData` slices for Student/Teacher/Parent/Staff management, User Roles, Permissions. Do **not** seed from `data/admin/people.ts` in live mode. (Class Overview already covers roster/teachers ops.)
2. **Admin Finance tab** — replace fixture `FinanceDashboard` / Revenue / Expense analytics with live fee/report APIs (Fee Management hub is already LIVE via More).
3. **Academic Overview / Academic Reports / Reports Dashboard** — live or remove from More until ready.
4. **Teacher/Student Assignments & Assessments** polish (still mock/thin).
5. Always: empty + loader; never seed live UI from `data/*`; update this guide when a module flips LIVE.

---

## 15. Changelog summary

### Teacher

- Live default; attendance, payroll/leave (no mock flash), notices, timetable, fees.
- Shared Holidays, Library, Engagement.
- Exams full group→item→subjects/students/grades/marks/results/report-cards; school-wide classes.
- Left mock: Assignments, Assessments, Reports, Notifications, Settings, AI (+ hidden materials/parent chat).

### Student

- Dashboard, Subjects, Timetable (tab), Attendance, Fees, Exam Schedule, Library, Holidays — **LIVE**.
- StudentModuleHeader + Academic Year everywhere; AI Learning/More + AI Test tab removed.
- Honest analytics; PDFs for timetable / attendance / exams / fee receipts.
- Thin/orphan: Marks/Progress reports, Assignments, AI stack routes.

### Admin

- Stack + More wired; Holidays / Library / Engagement **LIVE** shared.
- **Home + School Overview LIVE**; KPI cards navigate to Class Overview tabs / Attendance; AI CTA removed.
- **Class Overview LIVE** (Classes / Students / Teachers / My Profile).
- **Attendance tab LIVE** (replaced fixture People tab).
- **Notices / Exams / Timetable / Fees / HR / Transport / Safety / Hostel / Inventory / Biometric / Forms / Parent Portal / Analytics / Admissions LIVE**.
- Remaining fixtures: **People directory**, **Finance tab overview**, Academic Overview / Reports Dashboard.

---

*When in doubt: web tab → `erpApi` → `erp.api.ts` → hook (empty+loader) → UI → update this guide. Reuse shared screens. Do not invent a second data model.*
