# ADMIN_INFORMATION_ARCHITECTURE.md — ERP Schools Admin IA

> Organizes the admin feature set (from `SCREENS.md` + `assets/admin_screens/`) into logical groups optimized for **mobile**. The dashboard is built around **grouped actions**, not a flat list. Navigation obeys the existing ERP-Schools convention (5-item bar, center = Home escape).

## Design goals
- **≤5 bottom tabs** (DESIGN.md). Center tab is the host **Home** escape (consistency with Teacher/Student).
- **Grouped, action-first dashboard** — admins have many modules; surface the top 8 actions + alerts, hide the long tail in a **More** hub and per-group hubs.
- **Minimal cognitive load** — every destination reachable in ≤3 taps.

## Bottom tab bar (persistent)
| # | Tab | Route | Screen | Icon |
|---|-----|-------|--------|------|
| 1 | **Dashboard** | `AdminHome` | `dashboard/AdminHomeScreen` | speedometer |
| 2 | People | `AdminPeople` | `people/PeopleHubScreen` | people |
| 3 | **Home** | `AdminMainDashboard` | placeholder → host Home (`navigateToAppMainTab`) | home |
| 4 | Finance | `AdminFinance` | `finance/FinanceDashboardScreen` | wallet |
| 5 | More | `AdminMore` | `settings/MoreMenuScreen` | grid |

## Feature groups → screens

### Academic
- Academic Overview — `AcademicOverviewScreen`
- Classes — `ClassesScreen`
- Exams — `ExamsScreen`
- Academic Reports — `AcademicReportsScreen`

### People
- Student Management — `StudentManagementScreen`
- Teacher Management — `TeacherManagementScreen`
- Parent Management — `ParentManagementScreen`
- Staff Management — `StaffManagementScreen`
- User Roles — `UserRolesScreen`
- Permissions — `PermissionsScreen`

### Admissions
- Admissions Dashboard — `AdmissionsDashboardScreen`
- Admission Applications — `AdmissionApplicationsScreen`
- Approval Workflow — `ApprovalWorkflowScreen`

### Operations
- Attendance Dashboard — `AttendanceDashboardScreen`
- Library Dashboard — `LibraryDashboardScreen`
- Book Management — `BookManagementScreen`
- Transport Dashboard — `TransportDashboardScreen`
- Vehicle Management — `VehicleManagementScreen`
- Route Management — `RouteManagementScreen`
- Hostel Dashboard — `HostelDashboardScreen`
- Inventory Dashboard — `InventoryDashboardScreen`

### Finance
- Finance Dashboard — `FinanceDashboardScreen` (tab)
- Fee Collection — `FeeCollectionScreen`
- Revenue Analytics — `RevenueAnalyticsScreen`
- Expense Analytics — `ExpenseAnalyticsScreen`

### Insights & Communication
- School Overview (full report) — `SchoolOverviewScreen`
- Reports Dashboard — `ReportsDashboardScreen`
- Announcements — `AnnouncementsScreen`
- Notifications — `NotificationsScreen`

### System
- Admin Profile — `AdminProfileScreen`
- Settings — `SettingsScreen`

## Dashboard (`AdminHomeScreen`) information layout
1. **Welcome hero** — greeting + school + AY.
2. **School Overview card** (overlap) — 4 KPIs + mini secondary row → `SchoolOverviewScreen`.
3. **Today's Alerts** — 2×2 tappable alert cards.
4. **Quick Actions** (4-col, 8 tiles) — Students, Teachers, Classes, Exams, Fees, Announcements, Reports, Settings.
5. **Live Attendance** + **Fee Collection** (donuts) + **AI Insights** (list).
6. **Pending Approvals** → `ApprovalWorkflowScreen`; **Upcoming Events**.
7. **AI Assistant** CTA.

## Navigation map (tap depth)
```
AdminTabs
├── Dashboard (AdminHome)
│     ├─ View Full Report → SchoolOverview
│     ├─ Alerts → Attendance/Students/Fee/Approval screens
│     ├─ Quick Actions → Students/Teachers/Classes/Exams/Fees/Announcements/Reports/Settings
│     └─ Pending Approvals → ApprovalWorkflow
├── People (PeopleHub)
│     └─ Student / Teacher / Parent / Staff Management · User Roles · Permissions
├── Home → host app (escape)
├── Finance (FinanceDashboard)
│     └─ Fee Collection · Revenue Analytics · Expense Analytics
└── More (MoreMenu)
      ├─ Academic: Academic Overview · Classes · Exams · Academic Reports
      ├─ Admissions: Admissions Dashboard · Applications · Approval Workflow
      ├─ Operations: Attendance · Library · Book Mgmt · Transport · Vehicles · Routes · Hostel · Inventory
      ├─ Insights: School Overview · Reports · Announcements
      └─ Account: Profile · Notifications · Settings · Switch to App Home · Sign Out
```

All routes are `Admin*`-prefixed in `adminRoutes.ts` (tabs) or unique stack names, guaranteeing **zero collisions** with Teacher (`Teacher*`), Student (`Student*`), existing ERP (`ERP*`), or host tabs.
