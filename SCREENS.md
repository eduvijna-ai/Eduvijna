# ERP Schools — Teacher Module Screen Inventory

> **Module path:** `src/erp_schools/`  
> **Status:** UI complete with mock data (no API integration yet)  
> **Reference images:** `assets/teachers_screens/`  
> **Architecture:** See `ERP_SCHOOLS_ARCHITECTURE.md`  
> **Last updated:** June 10, 2026

---

## Bottom Tab Bar (persistent — 5 items)

| Order | Tab label | Route name | Screen | Notes |
|------|-----------|------------|--------|-------|
| 1 | Home | `TeacherHome` | `dashboard/TeacherHomeScreen` | Schools teacher home (default on enter) |
| 2 | Classes | `TeacherClasses` | `classes/MyClassesScreen` | |
| 3 | **Dashboard** | `TeacherDashboard` | *(placeholder)* | **Escape hatch** — taps navigate to main app `Dashboard` tab via `navigateToAppMainTab()`; does not stay in Schools |
| 4 | Students | `TeacherStudents` | `students/StudentListScreen` | |
| 5 | More | `TeacherMore` | `settings/MoreMenuScreen` | Hub for secondary features |

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
| Entry tab | Main app `ERPSchools` tab → `SchoolsTabEntry` → `TeacherStack` |
| Who sees it | `user.role === 'instructor'` only |
| Double bottom nav | Host tab bar hidden on Schools; only `TeacherTabs` visible inside |
| Re-entry | `SchoolsTabEntry` unmounts on blur → fresh `TeacherHome` each visit |
| Exit to main app | Center **Dashboard** tab · side nav · `useMainAppNavigation()` |
| Side nav routes | Dashboard · Assessments · Analytics · ERP · Schools |

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
