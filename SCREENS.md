# ERP Schools — Screen Inventory (Teacher + Student)

> **Module path:** `src/erp_schools/`  
> **Status:** Teacher + Student UI complete with mock data (no API integration yet)  
> **Reference images:** `assets/teachers_screens/` · `assets/student_screens/`  
> **Architecture:** See `SKILLS.md` §8, `STUDENT_MODULE_ANALYSIS.md`  
> **Last updated:** June 11, 2026

---

## Naming convention (June 2026)

| UI label | Meaning | Route / screen |
|----------|---------|----------------|
| **Home** | Main app dashboard | Host tab `Dashboard` · side nav · persona center escape tab |
| **Dashboard** | ERP Schools module home | `TeacherHome` / `StudentHome` in persona tab bars |

---

## Teacher — Bottom Tab Bar (persistent — 5 items)

| Order | Tab label | Route name | Screen | Icon |
|------|-----------|------------|--------|------|
| 1 | **Dashboard** | `TeacherHome` | `dashboard/TeacherHomeScreen` | speedometer |
| 2 | Classes | `TeacherClasses` | `classes/MyClassesScreen` | easel |
| 3 | **Home** | `TeacherDashboard` | *(placeholder)* | home — **escape** to main app Home tab via `navigateToAppMainTab()` |
| 4 | Students | `TeacherStudents` | `students/StudentListScreen` | people |
| 5 | More | `TeacherMore` | `settings/MoreMenuScreen` | grid |

**Removed from tabs (June 2026):** `TeacherReports` — Reports is now a **stack screen** and a **More menu** item (see below).

---

## Teacher Home (`TeacherHomeScreen`)

**File:** `screens/teacher/dashboard/TeacherHomeScreen.tsx`  
**Reference:** `assets/teachers_screens/teachers_home screen.png`

| Section | Content |
|---------|---------|
| Top bar | Hamburger (side nav) · EduVijna logo · notifications badge · profile avatar |
| Welcome hero | Full-width solid teal (`primary`), rounded top corners, logo watermark |
| Welcome line | Single line, mixed weight: `Welcome,` (medium) + name (bold) + 👋 |
| Overview card | White card overlapping hero (~72px); 4 metrics with dividers |
| Quick Actions | 4×2 grid (8 actions) |
| Today's Schedule | Timeline list with room chips |
| Recent Announcements | List with NEW badges |

**Quick Actions (8):** Take Attendance · Create Assignment · Grade Students · Study Material · Class Timetable · Notice Board · Reports · Parent Communication

---

## More Menu (`MoreMenuScreen`)

**File:** `screens/teacher/settings/MoreMenuScreen.tsx`

| Section | Links |
|---------|-------|
| Profile card | Tap → Profile |
| Attendance & Payroll | My Attendance · Attendance Calendar · Payroll & Leave |
| **Academics** | Assignments · Assessments · Study Material · Timetable · **Reports** |
| Communication | Parent Communication · Notice Board |
| Insights | AI Teacher Assistant · Student Progress |
| Account | Notifications · Settings · Sign Out |

---

## Stack Screens (pushed on top of tabs)

### Profile & system
| Screen | File |
|--------|------|
| My Profile | `profile/MyProfileScreen.tsx` |
| Notifications | `settings/NotificationsScreen.tsx` |
| Settings | `settings/SettingsScreen.tsx` |

### Self attendance
| Screen | File |
|--------|------|
| My Attendance | `attendance/MyAttendanceScreen.tsx` |
| Attendance Calendar | `attendance/AttendanceCalendarScreen.tsx` |

### Payroll & leave
| Screen | File |
|--------|------|
| Leave Dashboard | `payroll/LeaveDashboardScreen.tsx` |
| Apply Leave | `payroll/ApplyLeaveScreen.tsx` |
| Leave History | `payroll/LeaveHistoryScreen.tsx` |
| Payroll Dashboard | `payroll/PayrollDashboardScreen.tsx` |
| Payslip Details | `payroll/PayslipDetailsScreen.tsx` |
| Salary History | `payroll/SalaryHistoryScreen.tsx` |

### Classes & students
| Screen | File |
|--------|------|
| My Classes | `classes/MyClassesScreen.tsx` *(also a tab)* |
| Class Details | `classes/ClassDetailsScreen.tsx` |
| Student List | `students/StudentListScreen.tsx` *(also a tab)* |
| Student Profile | `students/StudentProfileScreen.tsx` |
| Student Attendance | `attendance/StudentAttendanceScreen.tsx` |

### Class attendance
| Screen | File |
|--------|------|
| Mark Attendance | `attendance/MarkAttendanceScreen.tsx` |
| Attendance Report | `attendance/AttendanceReportScreen.tsx` |

### Assessments & assignments
| Screen | File |
|--------|------|
| Grade Students | `assessments/GradeStudentsScreen.tsx` |
| Assessment List | `assessments/AssessmentListScreen.tsx` |
| Assessment Details | `assessments/AssessmentDetailsScreen.tsx` |
| Assignment Dashboard | `assignments/AssignmentDashboardScreen.tsx` |
| Create Assignment | `assignments/CreateAssignmentScreen.tsx` |
| Assignment Submissions | `assignments/AssignmentSubmissionsScreen.tsx` |

### Materials & timetable
| Screen | File |
|--------|------|
| Study Material | `materials/StudyMaterialScreen.tsx` |
| Upload Material | `materials/UploadMaterialScreen.tsx` |
| Resource Library | `materials/ResourceLibraryScreen.tsx` |
| Timetable | `timetable/TimetableScreen.tsx` |

### Communication & notices
| Screen | File |
|--------|------|
| Parent Communication | `communication/ParentCommunicationScreen.tsx` |
| Parent Chat | `communication/ParentChatScreen.tsx` |
| Broadcast Message | `communication/BroadcastMessageScreen.tsx` |
| Notice Board | `notices/NoticeBoardScreen.tsx` |
| Create Notice | `notices/CreateNoticeScreen.tsx` |
| Scheduled Notice | `notices/ScheduledNoticeScreen.tsx` |

### Reports & analytics
| Screen | File | Access |
|--------|------|--------|
| Reports Dashboard | `reports/ReportsDashboardScreen.tsx` | Home quick action · More → Academics → Reports |
| Attendance Analytics | `reports/AttendanceAnalyticsScreen.tsx` | From Reports / Insights |
| Assignment Analytics | `reports/AssignmentAnalyticsScreen.tsx` | From Reports |
| Assessment Analytics | `reports/AssessmentAnalyticsScreen.tsx` | From Reports |
| Student Progress Analytics | `reports/StudentProgressAnalyticsScreen.tsx` | More → Insights |

### AI
| Screen | File |
|--------|------|
| AI Teacher Assistant | `ai/AITeacherAssistantScreen.tsx` |

---

## Class-Scoped Screens (use `ClassContextBanner`)

These screens show the teal **class header card** at the top when a class context is available:

- Study Material · Timetable · Reports Dashboard · Parent Communication · Notice Board  
- Mark Attendance · Attendance Report · Class Details  

**Component:** `components/ClassContextBanner.tsx` — solid teal card, white code badge, subject/room/student meta, book watermark.

---

## Host App Integration (mobile)

| Concern | Implementation |
|---------|----------------|
| Entry tab | Main app `ERPSchools` tab → `SchoolsTabEntry` → persona stack |
| Persona routing | `useTeacherSession().persona` — `student` → `StudentStack`, else → `TeacherStack` |
| Who sees Schools tab | `role === 'instructor'` **or** `role === 'student'` **or** `role_id === 4` |
| Main app Home tab | Label **Home**, icon home; route name remains `Dashboard` |
| Double bottom nav | Host tab bar hidden on Schools; only persona tab bar visible inside |
| Re-entry | `SchoolsTabEntry` unmounts on blur → fresh module home each visit |
| Exit to main app | Persona center **Home** tab · side nav **Home** · `useMainAppNavigation()` |
| Side nav routes | Analytics · Assessments · **Home** · ERP · Schools |

---

## Screen Checklist (original inventory — all implemented)

- [x] Teacher Home (Overview · Quick Actions · Schedule · Announcements)
- [x] My Profile
- [x] My Attendance · Attendance Calendar
- [x] Leave Dashboard · Apply Leave · Leave History
- [x] Payroll Dashboard · Payslip Details · Salary History
- [x] My Classes · Class Details
- [x] Student List · Student Profile · Student Attendance
- [x] Mark Attendance · Attendance Report
- [x] Grade Students · Assessment List · Assessment Details
- [x] Assignment Dashboard · Create Assignment · Assignment Submissions
- [x] Study Material · Upload Material · Resource Library
- [x] Timetable
- [x] Parent Communication · Parent Chat · Broadcast Message
- [x] Notice Board · Create Notice · Scheduled Notice
- [x] Reports Dashboard · Attendance/Assignment/Assessment/Student Progress Analytics
- [x] AI Teacher Assistant
- [x] Notifications · Settings

---

## Student — Bottom Tab Bar (persistent — 5 items)

| Order | Tab label | Route name | Screen | Icon |
|------|-----------|------------|--------|------|
| 1 | **Dashboard** | `StudentHome` | `dashboard/StudentHomeScreen` | speedometer |
| 2 | Academics | `StudentAcademics` | `academics/AcademicsScreen` | school |
| 3 | **Home** | `StudentDashboard` | *(placeholder)* | home — **escape** to main app Home tab |
| 4 | AI Test | `StudentAITest` | `ai/AITutorScreen` | sparkles |
| 5 | More | `StudentMore` | `settings/MoreMenuScreen` | grid |

**Removed from tabs (June 2026):** `StudentUpdates` (Notices) — now stack screen `Notices`; Profile moved to stack + More menu.

---

## Student Home (`StudentHomeScreen`)

**File:** `screens/student/dashboard/StudentHomeScreen.tsx`  
**Reference:** `assets/student_screens/student or parent home screen.png`

| Section | Content |
|---------|---------|
| Welcome hero | Solid teal strip, logo watermark, "Hello, {name} 👋" |
| Identity card | Avatar, name, class, roll chip, View Profile → stack `StudentProfile` |
| Stats row | Attendance % · Avg Marks % · Class Rank |
| Progress banner | Full-width: star + "Good Progress · Keep it up!" (below stats, not inline) |
| Quick Access | 8 tiles: Attendance, Assignments, Marks, Timetable, Fee Details, Notices, Events, Library |
| Today's Schedule | Timeline with status pills |
| Recent Announcements | List with NEW badges → View All → `Notices` |
| AI Learning Assistant | Card → `AITutor` stack or AI Test tab |

---

## Student More Menu (`MoreMenuScreen`)

**File:** `screens/student/settings/MoreMenuScreen.tsx`

| Section | Links |
|---------|-------|
| Profile card | Tap → `StudentProfile` |
| Academics | Marks Report · Progress Report · Exam Schedule · Exam Results · Timetable |
| Activities | Library · Events · Fee Details |
| Learning | AI Tutor · AI Practice Test |
| Account | Notifications · Settings · Switch to App Home · Sign Out |

---

## Student Stack Screens (pushed on top of tabs)

### Profile & system
| Screen | File |
|--------|------|
| Student Profile | `profile/StudentProfileScreen.tsx` |
| Notifications | `settings/NotificationsScreen.tsx` |
| Settings | `settings/SettingsScreen.tsx` |

### Attendance
| Screen | File |
|--------|------|
| Attendance | `attendance/AttendanceScreen.tsx` |
| Attendance Details | `attendance/AttendanceDetailsScreen.tsx` |

### Academics
| Screen | File |
|--------|------|
| Academics | `academics/AcademicsScreen.tsx` *(also a tab)* |
| Subject Details | `academics/SubjectDetailsScreen.tsx` |
| Marks Report | `academics/MarksReportScreen.tsx` |
| Progress Report | `academics/ProgressReportScreen.tsx` |

### Assignments
| Screen | File |
|--------|------|
| Assignments | `assignments/AssignmentsScreen.tsx` |
| Assignment Details | `assignments/AssignmentDetailsScreen.tsx` |
| Assignment Submission | `assignments/AssignmentSubmissionScreen.tsx` |
| Assignment Performance | `assignments/AssignmentPerformanceScreen.tsx` |

### Timetable & exams
| Screen | File |
|--------|------|
| Timetable | `timetable/TimetableScreen.tsx` |
| Exam Schedule | `exams/ExamScheduleScreen.tsx` |
| Exam Results | `exams/ExamResultsScreen.tsx` |

### Fees, library, notices, events
| Screen | File |
|--------|------|
| Fee Dashboard | `fees/FeeDashboardScreen.tsx` |
| Library | `library/LibraryScreen.tsx` |
| Notices | `notices/NoticesScreen.tsx` |
| Events | `events/EventsScreen.tsx` |

### AI
| Screen | File |
|--------|------|
| AI Tutor | `ai/AITutorScreen.tsx` *(also AI Test tab)* |
| AI Practice Test | `ai/AIPracticeTestScreen.tsx` |
| AI Quiz | `ai/AIQuizScreen.tsx` |

---

## Student Screens Using `StudentIdentityHeader`

Attendance · Academics · Subject Details · Marks Report · Progress Report · Assignments flows · Timetable · Exam Schedule · Exam Results · Fee Dashboard · Library · Notices · Events

**Component:** `components/StudentIdentityHeader.tsx` — teal banner, back navigation, overlapping identity card, optional `AcademicYearPill`.

---

## Student Module Checklist (all implemented — June 2026)

- [x] Student Home (hero · identity · stats · progress banner · quick access · schedule · announcements · AI card)
- [x] Student Profile · Notifications · Settings · More Menu
- [x] Attendance · Attendance Details
- [x] Academics · Subject Details · Marks Report · Progress Report
- [x] Assignments · Assignment Details · Submission · Performance
- [x] Timetable · Exam Schedule · Exam Results
- [x] Fee Dashboard · Library · Notices · Events
- [x] AI Tutor · AI Practice Test · AI Quiz
- [x] StudentStack + StudentTabs navigation
- [x] Role-based Schools routing (student persona)
- [x] Shared components: StudentIdentityHeader, IconTabs, AcademicYearPill

**Pending (future):** API integration via `useStudentData` seam · Parent persona · live AI backend
