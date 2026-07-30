# ERP Schools — Mobile Guide (Teacher · Student · Admin)

> **Audience:** Agents implementing or extending **Teacher**, **Student**, or **Admin** personas in mobile `erp_schools`.  
> **Product source of truth:** Quiz-React web School ERP — `d:\eduvijna\Quiz-React\src\components\ERPManagement\`.  
> **Mobile package:** `d:\eduvijna\Eduvijna\src\erp_schools\`.  
> **Config:** `config.ts` → `USE_MOCK_DATA = false` (live APIs by default).  
> **Renamed from:** `TEACHER_ERP_GUIDE.md` (this file is the single ERP guide).  
> **Status (2026-07):** Teacher + Student core modules LIVE. **Admin Home Dashboard + School Overview + Class Overview + Attendance + Notices + Exams + Timetable + Fees + HR + Transport + Safety + Inventory + Hostel + Biometric + Form Builder + Parent Portal + Analytics + Admissions LIVE.** People still mostly fixtures.

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
| **Admin** | Dashboard · Attendance · Home · Finance · More (see `AdminTabs.tsx`) |

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
| Holidays / Library / Engagement | **LIVE** via shared screens; admin Library Dashboard KPIs LIVE |
| **Admin Home Dashboard** | **LIVE** via `useAdminDashboardData` (web `adminDashboard` parity) |
| School Overview (View Full Report) | **LIVE** — same hook; attendance / fees / admissions / ops |
| **Class Overview** | **LIVE** via `useAdminClassOverviewData` — Classes / Students / **Teachers** / My Profile |
| **Attendance** | **LIVE** via `TeacherAttendanceScreen role="admin"` — 6 tabs (Student / My / Staff / Class Report / Student Report / Settings) |
| **Notices** | **LIVE** via `NoticeBoardScreen role="admin"` — list/search/categories/CRUD (reuse teacher notices) |
| **Exams** | **LIVE** via `TeacherExamsScreen role="admin"` — 6 tabs + full group→item CRUD (reuse teacher exams) |
| **Timetable** | **LIVE** via `AdminTimetableScreen` — Templates / Weekly Schedule / Calendar (web TimetableTab management) |
| **Fees** | **LIVE** via `TeacherFeesScreen role="admin"` — 6 tabs (Structure / Assignment / Register / Demand / Collections / Receipts) |
| **HR & Payroll** | **LIVE** via `AdminHrScreen` — Leave Types / Leave Applications / Payslips |
| **Transport Management** | **LIVE** via `AdminTransportScreen` — Vehicles / Routes / Assignments |
| **Safety & Security** | **LIVE** via `AdminSafetyScreen` — Visitors / Incidents / Emergency Contacts |
| **Inventory Management** | **LIVE** via `AdminInventoryScreen` — Items / Purchase Orders / Stock Movements |
| **Hostel Management** | **LIVE** via `HostelDashboardScreen` — Rooms / Allocations / Complaints |
| **Biometric** | **LIVE** via `AdminBiometricScreen` — Devices / Enrollments / Logs |
| **Form Builder** | **LIVE** via `FormsDashboardScreen` — Templates / Responses |
| **Parent Portal** | **LIVE** via `AdminParentPortalScreen` — PTM Schedules / Appointments / Communications |
| **Analytics** | **LIVE** via `AdminAnalyticsScreen` — Report Templates / Snapshots / Widgets / School Documents |
| **Admissions Operations** | **LIVE** via `AdminAdmissionsScreen` — Enquiry / Visitors / Front Office / Incidents / Emergency |
| Most other admin screens (`useAdminData`) | **Still mock / fixtures** under `data/admin/` — verify before trusting |
| Web admin surface | Same ERP tabs as staff for many modules + school-wide people/finance/ops |

### Admin Dashboard (Home) — LIVE map

| Mobile section | Web source | APIs |
|----------------|------------|------|
| Hero + AY pill | Hero | `AcademicYearContext` + session |
| School Overview KPIs + strip | `KpiStrip` + dashboard KPIs | `erpDashboardApi`, `classOverviewApi.getKPIs` |
| Today's Alerts / Important Alerts | `ChartsRow` alerts | fees, attendance, leave, library, inventory, grievances |
| Quick Actions (11) | `QuickActions` | nav only |
| Live Attendance + Fee Collection | Classic + Charts fee/att | dashboard trend + `feeReportsApi` + staff attendance |
| Fee / Students / Admissions / Attendance cards | ClassicPanels | class KPIs, admissions status-counts, fee summary |
| Events / Exams / Holidays / Staff Leave | UpcomingEventsPanel + calendars | events, exam subjects, holidays, staff leave |
| Engagement / Safety / HR / Income | BottomPanels | grievances, visitors, payslips, fees |
| Transport / Inventory / Library / Hostel | ModuleOverviews | vehicles, routes, assignments, inventory, books, txs, hostel |

**Hook:** `hooks/useAdminDashboardData.ts` · **Meta:** `utils/adminDashboardMeta.ts`  
**Screens:** `screens/admin/dashboard/AdminHomeScreen.tsx` · `screens/admin/overview/SchoolOverviewScreen.tsx`  
Empty + `ScreenLoader` + pull-to-refresh. Charts → donuts / progress bars / metric rows / mini calendars.

### Admin Class Overview — LIVE map

Web: `ClassOverviewTab` (admin tabs: Classes · Students · **Teachers** · My Profile).  
Mobile: More → **Class Overview** (`Classes` route) · `screens/admin/academics/ClassesScreen.tsx` · `hooks/useAdminClassOverviewData.ts`

| Tab | APIs | Notes |
|-----|------|--------|
| Classes | `classOverviewApi.getAll` (+ KPIs fallback), roster for counts | Filters class/section/subject; cards: Class · Section · Subject · Teacher · Class Teacher; school-wide (no teacher_id scope) |
| Students | `studentsByUserApi.getAll` | Rich cards; tap → `AdminStudentProfile`; **+ New Student** → create modal (`studentProfilesApi.create`: user_id, admission, APAAR, DOB, gender, blood, city) |
| Teachers | `staffProfilesApi.list` → `/hr/staff` | Teaching = `designation === 'instructor'`; rich cards; tap/Edit → `AdminTeacherDetail` (Profile, Timetable, Assigned Classes, Leave, Notes, Docs, Bank, Attendance); Deactivate soft-delete |
| My Profile | `staffProfilesApi.getMyProfile` / `updateMyProfile` | Web `StaffSelfServiceTab`: Profile (edit phone/qual/exp/address), Timetable, Assigned Classes, Leave (+apply), Notes, Documents (+upload), Bank (editable) · `screens/shared/StaffSelfServiceView.tsx` |

KPIs (filter-reactive on Classes tab): distinct class+section · distinct students · distinct teacher_id (`computeClassOverviewKpis(..., isInstructor=false)`).

### Admin Attendance — LIVE map

Web: `AttendanceTab` (Student · My · Staff · Class Report · Student Report · Settings).  
Mobile: More / Home → **Attendance** (`AttendanceDashboard`) · `screens/admin/attendance/AttendanceDashboardScreen.tsx` → `TeacherAttendanceScreen role="admin"`.

| Tab | Hook / APIs | Notes |
|-----|-------------|--------|
| Student Attendance | `useTeacherAttendanceTracker` (`canEditAnyDate`, clear cycle) | Filters period/class/section/subject; KPIs; **calendar + day list** mark (P→A→L→clear); bulk + Update; subject required to edit |
| My Attendance | `useTeacherMyAttendance` | Self-mark today 1H/2H; pending admin mods Approve/Reject; period KPIs |
| Staff Attendance | `useAdminStaffAttendance` | Roster `staffProfilesApi.list`; `staffAttendanceApi` getAll/bulkUpsert/pendingApprovals; 1H/2H; pending banner; calendar/day list |
| Class Report | client aggregate `attendanceRecordsApi.getAll` | Class*/section/subject + date range; P/A/L/%/risk list |
| Student Report | `attendanceRecordsApi.studentSummary` | Search student + range; KPI cards |
| Settings | `attendanceSettingsApi` get/update/upsert | Working days, periods, type, min %, late threshold |

Teacher hub (5 tabs, today-only student mark + grid) shares the same screen without Staff Attendance.

### Admin Notices — LIVE map

Web: `NoticesTab` (Notice Board — search, category, create/edit/deactivate, pin, publish/expiry).  
Mobile: More / Home / Overview → **Announcements** · `screens/admin/communication/AnnouncementsScreen.tsx` → `NoticeBoardScreen role="admin"`.  
Create / Detail: `CreateNotice` / `NoticeDetail` on AdminStack (same teacher screens).

| Capability | Hook / APIs | Notes |
|------------|-------------|--------|
| List + KPIs | `useTeacherNotices` → `noticesApi.getAll` | On this page / Pinned / Total; search `q`; category chips = web enum |
| Categories | `NOTICE_CATEGORIES` | `general \| academic \| fee \| event \| exam \| holiday` |
| Create / Edit | `useTeacherNoticeActions` | Title*, content*, category, publish, expiry, pin |
| Detail / Deactivate | softDelete | View screen + Edit / Deactivate actions |
| Nav links | Home Notices metric, Overview Active notices, Quick Action, More → Notices | Route stays `Announcements` |

### Admin Exams — LIVE map

Web: `ExamsTab` + `ExamGroupsSubView` (Exam Groups · Exams · Schedules · Marks RO · Results RO · Report Cards).  
Mobile: More / Home → **Exams** · `screens/admin/academics/ExamsScreen.tsx` → `TeacherExamsScreen role="admin"`.  
Child routes on AdminStack (same teacher screens): CreateExamGroup, ExamGroupDetail, CreateExamItem, ExamSubjects, ExamStudents, ExamGrades, ExamMarksEntry, ExamResultsManage, ExamReportCards.

| Tab / screen | Hook / APIs | Notes |
|--------------|-------------|--------|
| Exam Groups | `useTeacherExamsData` → `examGroupsApi` | Search; create/edit/soft-delete; open detail |
| Group detail | items + grades | Add exam; Subjects / Students / Marks / Results / Grades |
| Exams | `examAllItemsApi.list` | Flat catalog; Manage Exams → Groups |
| Schedules | subjects `exam_date` | Group/exam/class filters; list + calendar |
| Marks / Results (hub) | `getTemplate` / `view` | Read-only; write via group panels |
| Report Cards | results view | Per-student breakdown |
| Data scope | `school_id` only | Already school-wide (no teacher_id) — identical admin/teacher UI |

### Admin Timetable — LIVE map

Web: `TimetableTab` management (Templates · Weekly Schedule · Calendar). Instructor personal view stays on teacher stack.  
Mobile: More / Home → **Timetable** · `screens/admin/timetable/AdminTimetableScreen.tsx` · `hooks/useAdminTimetableData.ts`

| Tab / screen | APIs | Notes |
|--------------|------|--------|
| Templates | `timetableTemplatesApi` list/create/update/softDelete | Search; Edit / Deactivate; tap → Weekly |
| Weekly Schedule | `timetableSlotsApi` + lookups | Class/section Search or template select; day chips; Add/Edit/Delete slot; Substitute modal |
| Calendar | slots + template effective range | Month nav; type filter; day chips → list; Sun-first grid |
| Create Template | form | name*, class, section, effective from/to |
| Create Slot | form | template*, day*, times*, subject/teacher/room/type |
| Lookups | `timetableLookupApi` | classes / sections / subjects / teachers |
| Substitutes | `timetableSubstituteApi` | date + substitute teacher + reason |

### Admin Fees — LIVE map

Web: `FeesTab` (Fee Structure · Fee Assignment · Fees Register · Demand Bill · Collections · Receipts).  
Mobile: More / Home → **Fee Management** (`FeeCollection`) · `screens/admin/finance/FeeCollectionScreen.tsx` → `TeacherFeesScreen role="admin"`.  
Hook: `useTeacherFeesData({ scope: 'school' })` — same finance APIs as web; school-wide classes (no teacher filter).

| Tab | APIs | Notes |
|-----|------|--------|
| Shell KPIs + 30-day trend | `feeReportsApi` summary / trend | Shared with teacher; school-wide |
| Fee Structure | `feeStructuresApi` + `feeTypesApi` | Search, class/type filters; create (multi-class) / edit / deactivate; Fee Types CRUD |
| Fee Assignment | `studentFeeAssignmentsApi` + terms | Search student, class filter; New/Edit/Terms/Remove |
| Fees Register | register report endpoints | Filters + detail sheet |
| Demand Bill | demand bill report | Month/year/class; select + notify |
| Collections | `feeCollectionsApi` | Status chips; New/Edit/Deactivate |
| Receipts | `feeReceiptsApi` | New/Edit/Deactivate; lookup collection by ID |
| Data scope | `school_id` (+ AY) | Admin = all classes; teacher hub stays class-scoped (`scope: 'teacher'`) |

### Admin HR & Payroll — LIVE map

Web: `HRTab` (Staff · Staff Attendance · Leave Types · Leave Applications · Payslips).  
Mobile: More → **HR & Payroll** (`HrPayroll`) · `screens/admin/hr/AdminHrScreen.tsx` · `hooks/useAdminHrData.ts`.

| Tab | Status | Notes |
|-----|--------|--------|
| Leave Types | **LIVE CRUD** | `leaveTypesApi` list/create/update/softDelete — name*, code, max days, paid, carry forward, description |
| Leave Applications | **LIVE CRUD + approve** | Status chips; New Apply (staff + type + dates + half-day); Edit; Approve/Reject; Del — `leaveApplicationsApi` |
| Payslips | **LIVE CRUD + PDF** | Period/month/year/dept/search filters; New/Edit/Deactivate; **Download** PDF — `payslipsApi` |
| Staff / Staff Attendance | Not in this hub | Use Class Overview → Teachers and Attendance → Staff (already LIVE) |
| Teacher self-service | Unchanged | Teacher More → Payroll & Leave (`useTeacherHrData`) remains My Leave / My Payslips |

### Admin Transport Management — LIVE map

Web: `TransportTab` (Vehicles · Routes · Assignments).  
Mobile: More / Home → **Transport Management** (`TransportDashboard`) · `screens/admin/transport/AdminTransportScreen.tsx` · `hooks/useAdminTransportData.ts`.  
Deep links: `VehicleManagement` / `RouteManagement` open the same hub on the matching tab.

| Tab | APIs | Notes |
|-----|------|--------|
| Vehicles | `vehiclesApi` list/create/update/softDelete | Search `q`; Refresh; Add/Edit modal; Deactivate; status pill `active` \| `maintenance` \| `retired`; pagination 25; fields: vehicle_number*, type (default bus), capacity (40), driver_name/phone, insurance/fitness expiry, status |
| Routes | `routesApi` list/create/update/softDelete | New/Edit modal; Deactivate; Fee/mo ₹; fields: route_name*, start/end, distance_km, vehicle_id (numeric), monthly_fee, stops JSON array, description |
| Assignments | `transportAssignmentsApi` list/create/update/softDelete | Assign Student modal; Edit/Deactivate; fields: student_id*, route_id*, pickup/drop stop, start/end date |
| Scope | `school_id` on list + update/delete query | Same soft-delete “Deactivate” as web |

### Admin Safety & Security — LIVE map

Web: `SafetySecurityTab` (Visitors) + safety resources also used from `AdmissionsTab` (Incidents · Emergency Contacts).  
APIs: `/api/v1/erp/safety/{visitors|incidents|emergency-contacts}` (not front-office).  
Mobile: More / Home → **Safety & Security** (`Safety`) · `screens/admin/safety/AdminSafetyScreen.tsx` · `hooks/useAdminSafetyData.ts`.

| Tab | APIs | Notes |
|-----|------|--------|
| Visitors | `visitorsApi` list/create/update/softDelete | Purpose filter + status filter (All / statuses / deactivated); Register/Edit modal; Deactivate; page 25; fields: visitor_name*, phone, email, purpose (default general), visiting_whom, department, vehicle_number, badge_number, status (default checked_in), remarks |
| Incidents | `incidentsApi` | Type + severity filters; Report/Edit modal; Deactivate; fields: title*, type, severity, incident_date*, location, reported_by, witnesses, involved_persons, status, description*, action_taken |
| Emergency Contacts | `emergencyContactsApi` | Contact-type filter; Add/Edit modal; Deactivate; fields: name*, role, phone*, alternate_phone, email, contact_type, is_primary |
| Enums | hook constants | `VISIT_PURPOSES` · `VISITOR_STATUSES` · `INCIDENT_TYPES` · `SEVERITIES` · `INCIDENT_STATUSES` · `CONTACT_TYPES` — same as web |
| Scope | `school_id` on list + update/delete | Soft-delete labeled “Deactivate” |

### Admin Inventory Management — LIVE map

Web: `InventoryTab` (Items · Purchase Orders · Stock Movements).  
Mobile: More / Home → **Inventory Management** (`InventoryDashboard`) · `screens/admin/inventory/AdminInventoryScreen.tsx` · `hooks/useAdminInventoryData.ts` · `utils/inventoryMeta.ts`.  
APIs: `inventoryItemsApi` · `purchaseOrdersApi` · `stockMovementsApi` (`/api/v1/erp/inventory/*`).

| Tab | APIs | Notes |
|-----|------|--------|
| Items | `inventoryItemsApi` list/create/update/softDelete | Search `q`; category filter (same 11 categories as web); Refresh; Add/Edit modal; Deactivate; stock red when ≤ min; ₹ price; pagination 25; fields: item_name*, category (default general), unit (default piece), quantity, min_stock_level (5), unit_price, location, supplier, description |
| Purchase Orders | `purchaseOrdersApi` list/create/update/softDelete | Status chips toggle (draft…cancelled — same 7 as web); + New PO; Edit/Deactivate; fields: order_number*, supplier*, status (draft), total_amount, order_date, expected_date, items JSON, remarks |
| Stock Movements | `stockMovementsApi` list/create/update/softDelete | Type chips toggle (purchase…transfer — same 6 as web); + Record Movement; Edit (item locked)/Deactivate; item picker from catalog (per_page 200); fields: item_id*, movement_type (purchase), quantity*, reference_type, remarks |
| Constants | `inventoryMeta.ts` | `ITEM_CATEGORIES` · `ITEM_UNITS` · `PO_STATUSES` · `MOVEMENT_TYPES` — mirror web InventoryTab |
| Scope | `school_id` on list + update/delete query | Soft-delete labeled “Deactivate” |

### Admin Hostel — LIVE map

Web: `HostelTab` (Rooms · Allocations · Complaints).  
Mobile: More / Home → **Hostel Management** (`HostelDashboard`) · `screens/admin/hostel/HostelDashboardScreen.tsx` · `hooks/useAdminHostelData.ts` · `utils/hostelMeta.ts`.

| Tab | APIs | Notes |
|-----|------|--------|
| Rooms | `hostelRoomsApi` list/create/update/softDelete | Refresh; Add/Edit; Deactivate if `is_active`; page size 25; fields: block, room_number*, floor, room_type, capacity, monthly_rent, status, facilities JSON |
| Allocations | `hostelAllocationsApi` + room/student lookups | Allocate Student; Edit (student/room locked); Vacate via vacate_date; Deactivate; student_id = **user_id** from `studentsByUserApi` |
| Complaints | `hostelComplaintsApi` | Status chip filter (toggle clear); New/Edit; Resolve via status + resolution_note; Deactivate (admin) |
| Enums | `hostelMeta.ts` | Room types/statuses; complaint types/priorities/statuses — same as web |
| Lookups | `studentsByUserApi` (`academic_year_id`) · rooms `per_page: 200` | Room picker filters available / under capacity |

### Admin Biometric — LIVE map

Web: `BiometricTab` (Devices · Enrollments · Logs).  
Mobile: More / Home → **Biometric** (`BiometricDashboard`) · `screens/admin/biometric/AdminBiometricScreen.tsx` · `hooks/useAdminBiometricData.ts` · `utils/biometricMeta.ts`.  
APIs: `biometricDevicesApi` · `biometricEnrollmentsApi` · `biometricLogsApi` (`/api/v1/erp/biometric/*`).

| Tab | APIs | Notes |
|-----|------|--------|
| Devices | `biometricDevicesApi` list/create/update/softDelete | Type filter (All + fingerprint/face/rfid/iris/palm/multi); + Add Device; Edit; Deactivate if `is_active`; page 25; fields: device_name*, device_type (fingerprint), serial_number*, ip_address, location, firmware_version, status (active/inactive/maintenance/faulty) |
| Enrollments | `biometricEnrollmentsApi` | Status filter (All + pending/enrolled/failed/revoked); + Enroll User; Edit; Deactivate; fields: user_id*, device_id*, biometric_type (same DEVICE_TYPES), template_data, status (pending) |
| Logs | `biometricLogsApi` | Punch-type filter (All + in/out/break_start/break_end); + Log Punch; Edit; **Delete** (hard label like web); fields: device_id*, user_id*, punch_type (in), verification_mode (fingerprint/face/rfid/pin/manual), temperature, remarks |
| Constants | `biometricMeta.ts` | `DEVICE_TYPES` · `DEVICE_STATUSES` · `ENROLL_STATUSES` · `PUNCH_TYPES` · `VERIFY_MODES` — mirror web BiometricTab |
| Scope | `school_id` on list + update/delete query | Soft-delete labeled “Deactivate” for devices/enrollments; logs use “Delete” |

### Admin Form Builder — LIVE map

Web: `FormBuilderTab` (Templates · Responses).  
Mobile: More → **Form Builder** (`FormsDashboard`) · `screens/admin/forms/FormsDashboardScreen.tsx` · `hooks/useAdminFormsData.ts` · `utils/formBuilderMeta.ts`.

| Tab | APIs | Notes |
|-----|------|--------|
| Templates | `formTemplatesApi` list/create/update/softDelete | Type + status filters (All Types / All Statuses); Create/Edit modal; Deactivate; page 25 |
| Template form | title*, description, type (default survey), fields JSON `[]`, settings JSON `{}`, status (draft), start/end date | Same as web modal |
| Responses | `formResponsesApi` list/create/update/softDelete | Template ID filter; status dropdown (UI parity with web — list API uses `form_id` only); Add/Edit; Deactivate |
| Response form | Template ID* → API `form_id`, Respondent ID*, Answers JSON `{}`; Edit-only: status / score / reviewer notes | Maps `template_id` label → `form_id` |
| Enums | `formBuilderMeta.ts` | Types: survey…other; template statuses: draft/published/closed/archived; response: submitted/reviewed/approved/rejected |

### Admin Parent Portal — LIVE map

Web: `ParentPortalTab` (PTM Schedules · Appointments · Communications).  
Mobile: More → **Parent Portal** (`ParentPortal`) · `screens/admin/parentPortal/AdminParentPortalScreen.tsx` · `hooks/useAdminParentPortalData.ts` · `utils/parentPortalMeta.ts`.  
APIs: `ptmSchedulesApi` · `ptmAppointmentsApi` · `parentCommunicationsApi` (`/api/v1/erp/parent-portal/*`).

| Tab | APIs | Notes |
|-----|------|--------|
| PTM Schedules | `ptmSchedulesApi` list/create/update/softDelete | Meeting-type filter (All Types + 7 types); + Schedule PTM; Edit/Deactivate; fields: title*, meeting_type (general), meeting_date*, start/end time, venue, status (scheduled), description; page 25 |
| Appointments | `ptmAppointmentsApi` (`/ptm-appointments`) | Status filter (booked…no_show); + Add Appointment; Edit/Deactivate; schedule picker (catalog 200); student → guardians dependency; teacher from staff; fields: schedule_id*, student_id*, parent_id*, teacher_id*, slot_time, status (booked), parent/teacher remarks |
| Communications | `parentCommunicationsApi` | Type + status filters; + New Message; Edit (reply + status when editing)/Deactivate; same student→guardian dependency; fields: student_id*, parent_id*, comm_type (message), subject*, message* |
| Lookups | `studentsByUserApi` (AY) · `staffProfilesApi` · `guardiansApi.getByStudent` | Academic year required for students; guardian warning when none on file |
| Constants | `parentPortalMeta.ts` | `MEETING_TYPES` · `PTM_STATUSES` · `APPT_STATUSES` · `COMM_TYPES` · `COMM_STATUSES` — mirror web |
| Scope | `school_id` on list + update/delete | Soft-delete labeled “Deactivate” |

### Admin Analytics — LIVE map

Web: `AnalyticsTab` (Report Templates · Snapshots · Widgets) + `SchoolDocumentsPanel`.  
Mobile: More / Home → **Analytics** (`AnalyticsDashboard`) · `screens/admin/analytics/AdminAnalyticsScreen.tsx` · `hooks/useAdminAnalyticsData.ts` · `utils/analyticsMeta.ts` · `utils/schoolDocumentsPdf.ts`.  
APIs: `reportTemplatesApi` · `reportSnapshotsApi` · `dashboardWidgetsApi` (`/api/v1/erp/analytics/report-templates|report-snapshots|dashboard-widgets`) · `schoolManagementApi` (branding) · `studentsByUserApi` · `examAllItemsApi` · `examResultsApi`.

| Tab | APIs | Notes |
|-----|------|--------|
| Report Templates | `reportTemplatesApi` | Type filter (All Types + REPORT_TYPES); + Create Template; Edit; Deactivate; page 25 |
| Template form | name*, description, report_type (custom), module, chart_type (None + CHART_TYPES), query/columns/filters JSON, is_system checkbox | Same as web modal |
| Snapshots | `reportSnapshotsApi` | Format filter (All Formats + json/pdf/csv/xlsx); + Generate Snapshot; Edit; Deactivate |
| Snapshot form | template_id, title*, format, report_data/summary/parameters JSON, file_url | Same as web |
| Widgets | `dashboardWidgetsApi` | Type filter (All Types + WIDGET_TYPES); + Add Widget; Edit; Deactivate |
| Widget form | title*, widget_type (kpi), module, config JSON, size (medium), position | Same as web |
| School Documents | print helpers + school branding | Categories: Academic Reports / Certificates / Receipt Templates; student + exam pickers; View/Print PDFs; receipts → Fees hint |
| Constants | `analyticsMeta.ts` | REPORT_TYPES · CHART_TYPES · SNAPSHOT_FORMATS · WIDGET_TYPES · WIDGET_SIZES · document catalogs |
| Scope | `school_id` on list + update/delete query | Soft-delete labeled “Deactivate”; `created_by` / `generated_by` / `user_id` from session |

### Admin Admissions Operations Desk — LIVE map

Web: `AdmissionsTab` (Admission Enquiry · Visitor Register · Front Office Desk · Incidents · Emergency Contacts).  
Mobile: More / Home → **Admissions Operations** (`AdmissionsDashboard`) · `screens/admin/admissions/AdminAdmissionsScreen.tsx` · `hooks/useAdminAdmissionsData.ts` · `utils/admissionsMeta.ts`.  
Deep links: `AdmissionApplications` → same hub.

| Tab | APIs | Notes |
|-----|------|--------|
| Admission Enquiry (Pipeline) | `admissionsApi` + `statusCounts` | **11 CRM stages**; KPIs New / Due Today / Enrolled; Stages + Board; **active-only** list (`is_active` + client filter); walk-in create (3 fields); Admission Workspace |
| Walk-in create | `POST /admissions` | Modal: applicant_name*, parent_name, parent_phone* · source Walk-in · status enquiry |
| Admission Workspace | update + phone-call-logs | Tabs Overview / Student / Parent / Timeline / Quick Edit; Log interaction; Click to call; Move to Contacted / Documents Pending / Seat Offered / Rejected; Deactivate |
| Visitor Register | `visitorsApi` | Purpose/status filters; Add Visitor (purpose, meeting with, name*, phone, ID, persons, date/in/out, status, note); remarks meta; Check-out; Deactivate |
| Front Office | `phoneCallLogsApi` · `postalDispatchApi` · `postalReceiveApi` | Shared search; Phone (incoming/outgoing); Postal Dispatch (to_title*); Postal Receive (from_title*); Edit/Deactivate; per_page 200 |
| Incidents | `incidentsApi` | Type + severity filters; Report Incident (title*, description*, date*, type general, severity medium, status reported) |
| Emergency | `emergencyContactsApi` | Contact-type filter; Add Contact (name*, phone*, type internal, primary checkbox) |
| Lookups | `academicClassesApi` · `staffProfilesApi` | Class + staff for enquiry / visitor meeting-with |
| Enums | `admissionsMeta.ts` | Pipeline stages + same front-office enums as web AdmissionsTab |
| Overlap | Safety hub | Visitors/Incidents/Emergency also on Safety — same APIs (web same) |

### Do this first (recommended order)

1. **Confirm web tabs** for admin/principal via `erpRoleScopes` + `ERPManagement.tsx`.
2. **Reuse shared LIVE modules** already on AdminStack (Holidays, Library, Engagement) — polish only if gaps vs web.
3. ~~**Exams:**~~ **Done** — teacher exams hub mounted on AdminStack (`useTeacherExamsData` group→item). Timetable management hub also **LIVE**.
4. ~~**Fees / Attendance / Notices:**~~ **Done** — Attendance, Notices, Exams, Timetable, **Fees** (admin school-wide + Structure/Receipts).
5. **People (students/teachers/parents/staff):** Map web People tabs → new hooks; do **not** seed from `data/admin/people.ts` in live mode.
6. ~~**Dashboard / School Overview:**~~ **Done** — `useAdminDashboardData`.
7. ~~**Transport:**~~ **Done** — … ~~**Analytics:**~~ **Done**. ~~**Admissions:**~~ **Done** — `AdminAdmissionsScreen` Enquiry / Visitors / Front Office / Incidents / Emergency. **People** still fixtures.

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

**Admin / Teacher:** More → Engagement → shared `EngagementHubScreen` + `CreateEngagementScreen` (web `StudentEngagementTab` parity). Students: tab hidden (same as web).

| Tab | Filters | Modal (create / edit) |
|-----|---------|------------------------|
| Councils | All Types + 8 council types | Name*, Type, Academic Year, Description, Advisor ID, Formed Date |
| Members | All Roles + 6 roles | Council ID*, Student ID*, Role, Joined Date |
| Grievances | Type + Status | Student ID*, Subject*, Description*, Type, Priority; **edit only:** Status, Resolution Note |
| Events | Type + Status | Title*, Type, Start*, End, Venue, Description, Max Participants, Status |
| Registrations | Event ID filter | **Register Student:** Event ID*, Student ID*, Attendance Marked, Remarks |
| Gallery | All Categories | Title*, Category, Media URL*, Media Type (Image/Video/Document), Description, Featured |

Enums live in `engagementMeta.ts` (must stay aligned with web). No free-text search on web or mobile. IDs are numeric (no name pickers on web either).

### 9.4 Library

Books + Transactions (student: My Issues). **Hook:** `useLibraryData` · focus refresh via stable ref. Categories list hardcoded (web same).

**Admin:** More → **Library Management** mounts shared `LibraryScreen` (Books: search + category filter + Add/Edit/Deactivate; Transactions: status chips + New/Edit/Deactivate). **Library Dashboard** is LIVE KPIs + recent activity + deep links (not fixtures). Create/Edit screens lock book/member on edit (web parity).

### 9.5 Holidays

Calendar **year** (not AY). Shared across Teacher / Student / Admin.

| Piece | Detail |
|-------|--------|
| Web | `HolidayCalendarTab` + `StudentHolidayList` (`HolidayListPanel`) |
| Hook | `useHolidayCalendarData` → `holidaysApi.list({ school_id, year, per_page: 200 })` |
| Screens | `HolidayCalendarScreen` + `CreateHolidayScreen` (`screens/shared`) |
| Filters | All / Academic Breaks / Festivals / National / Optional (client-side) |
| Types (form) | `national \| academic \| religious \| cultural \| other` |
| Sidebar | Month calendar + legend + Upcoming/Academic/Festivals/Total KPIs + Next Holiday + note |
| CRUD | Staff/admin: Add / Edit / Delete (soft); students read-only |
| Form fields | Name*, Type*, Start*, End (optional), Description, Color hex (+ presets on mobile) |
| Pagination | 10 per page (client) |

**Admin entry:** More → Holidays · Admin Home “Holiday List” → `HolidayCalendar`.

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
    useAdminData.ts                  # mostly fixtures today (people/finance screens)
    useAdminDashboardData.ts         # LIVE admin home + school overview
    useAdminClassOverviewData.ts     # LIVE admin Class Overview (4 tabs)
    useAdminHrData.ts                # LIVE admin HR leave types / apps / payslips
    useAdminTransportData.ts         # LIVE admin Transport vehicles / routes / assignments
    useAdminSafetyData.ts            # LIVE admin Safety visitors / incidents / emergency
    useAdminHostelData.ts            # LIVE admin Hostel rooms / allocations / complaints
    useAdminInventoryData.ts         # LIVE admin Inventory items / POs / movements
    useAdminBiometricData.ts         # LIVE admin Biometric devices / enrollments / logs
    useAdminFormsData.ts             # LIVE admin Form Builder templates / responses
    useAdminAdmissionsData.ts        # LIVE admin Admissions Operations Desk (5 tabs)
    useAdminParentPortalData.ts      # LIVE admin Parent Portal PTM / appointments / communications
    useAdminAnalyticsData.ts         # LIVE admin Analytics templates / snapshots / widgets
    useAdminTimetableData.ts         # LIVE admin Timetable templates / slots / calendar
    useAdminStaffAttendance.ts       # LIVE admin staff attendance tab
  screens/teacher/…  screens/student/…  screens/admin/…  screens/shared/…
  utils/
    examMeta.ts / engagementMeta.ts / libraryMeta.ts / holidayMeta.ts / hostelMeta.ts / inventoryMeta.ts / biometricMeta.ts / formBuilderMeta.ts / parentPortalMeta.ts / analyticsMeta.ts / admissionsMeta.ts
    schoolDocumentsPdf.ts            # Analytics School Documents HTML → PDF
    payslipPdf.ts / demandBillPdf.ts
    studentDashboardMeta.ts / studentSubjectsMeta.ts
    adminDashboardMeta.ts
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

1. ~~**Admin Exams**~~ **Done** — reuse teacher exam hub (group-items).
2. ~~**Admin Fees**~~ **Done** — school-wide `TeacherFeesScreen role="admin"` (+ Structure / Receipts). ~~Attendance / Announcements / Exams~~ done.
3. ~~**Admin HR & Payroll**~~ **Done** — `AdminHrScreen` Leave Types / Leave Apps / Payslips; Staff & Attendance deep-linked.
4. ~~**Admin Transport**~~ **Done** — `AdminTransportScreen` Vehicles / Routes / Assignments (web TransportTab parity).
5. ~~**Admin Safety**~~ **Done** — `AdminSafetyScreen` Visitors / Incidents / Emergency Contacts (web Safety + safety APIs).
6. ~~**Admin Hostel**~~ **Done** — `HostelDashboardScreen` Rooms / Allocations / Complaints (web HostelTab parity).
7. ~~**Admin Inventory**~~ **Done** — `AdminInventoryScreen` Items / Purchase Orders / Stock Movements (web InventoryTab parity).
8. ~~**Admin Biometric**~~ **Done** — `AdminBiometricScreen` Devices / Enrollments / Logs (web BiometricTab parity).
9. ~~**Admin Form Builder**~~ **Done** — `FormsDashboardScreen` Templates / Responses (web FormBuilderTab parity).
10. ~~**Admin Parent Portal**~~ **Done** — `AdminParentPortalScreen` PTM Schedules / Appointments / Communications (web ParentPortalTab parity).
11. ~~**Admin Analytics**~~ **Done** — `AdminAnalyticsScreen` Report Templates / Snapshots / Widgets / School Documents (web AnalyticsTab parity).
12. **Admin People** → live hooks replacing `useAdminData` slices.
13. ~~**Admin Admissions**~~ **Done** — `AdminAdmissionsScreen` full Operations Desk (web AdmissionsTab parity).
14. **Admin People** → live hooks replacing `useAdminData` slices.
15. Teacher/Student Assignments & Assessments polish (still mock/thin).
16. Always: empty+loader; never seed live UI from `data/*`.

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
- **Admin Home + School Overview LIVE** via `useAdminDashboardData` (web admin dashboard API set: KPIs, fees, attendance, admissions, events, exams, holidays, leave, engagement, safety, HR/payroll, transport/inventory/library/hostel).
- **Class Overview LIVE** via `useAdminClassOverviewData` — Classes / Students / Teachers / My Profile (web ClassOverviewTab parity; Teachers admin-only).
- **Attendance / Notices / Exams / Timetable / Fees / HR & Payroll / Transport / Safety / Hostel / Inventory / Biometric / Form Builder / Parent Portal / Analytics LIVE** — Analytics via `AdminAnalyticsScreen` + `useAdminAnalyticsData` (Templates / Snapshots / Widgets / School Documents; web AnalyticsTab parity).
- **Admissions Operations Desk LIVE** — `AdminAdmissionsScreen` + `useAdminAdmissionsData` (11-stage Admission Pipeline CRM on Enquiry + Visitors + Front Office phone/postal + Incidents + Emergency; soft Deactivate).
- Most other admin module screens still **`useAdminData` fixtures** — next major workstream (**People**).

---

*When in doubt: web tab → `erpApi` → `erp.api.ts` → hook (empty+loader) → UI. Reuse shared screens. Do not invent a second data model.*
