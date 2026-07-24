/**
 * Admin route-name constants. Importing these avoids magic strings at call sites
 * and keeps route names collision-free with the Teacher stack (Teacher*), the
 * Student stack (Student*), the existing ERP navigator (ERP*) and the host tabs.
 */

export const ADMIN_TABS = {
  HOME: 'AdminHome',
  PEOPLE: 'AdminPeople',
  DASHBOARD: 'AdminMainDashboard',
  FINANCE: 'AdminFinance',
  MORE: 'AdminMore',
} as const;

export const ADMIN_ROUTES = {
  TABS: 'AdminTabs',

  SCHOOL_OVERVIEW: 'SchoolOverview',
  REPORTS_DASHBOARD: 'ReportsDashboard',
  ACADEMIC_REPORTS: 'AcademicReports',

  STUDENT_MANAGEMENT: 'StudentManagement',
  TEACHER_MANAGEMENT: 'TeacherManagement',
  PARENT_MANAGEMENT: 'ParentManagement',
  STAFF_MANAGEMENT: 'StaffManagement',
  USER_ROLES: 'UserRoles',
  PERMISSIONS: 'Permissions',

  ACADEMIC_OVERVIEW: 'AcademicOverview',
  CLASSES: 'Classes',
  EXAMS: 'Exams',

  ADMISSIONS_DASHBOARD: 'AdmissionsDashboard',
  ADMISSION_APPLICATIONS: 'AdmissionApplications',
  APPROVAL_WORKFLOW: 'ApprovalWorkflow',

  ATTENDANCE_DASHBOARD: 'AttendanceDashboard',
  LIBRARY_DASHBOARD: 'LibraryDashboard',
  BOOK_MANAGEMENT: 'BookManagement',
  LIBRARY: 'Library',
  CREATE_BOOK: 'CreateBook',
  CREATE_LIBRARY_TRANSACTION: 'CreateLibraryTransaction',
  ENGAGEMENT: 'Engagement',
  CREATE_ENGAGEMENT: 'CreateEngagement',
  TRANSPORT_DASHBOARD: 'TransportDashboard',
  VEHICLE_MANAGEMENT: 'VehicleManagement',
  ROUTE_MANAGEMENT: 'RouteManagement',
  HOSTEL_DASHBOARD: 'HostelDashboard',
  INVENTORY_DASHBOARD: 'InventoryDashboard',

  FEE_COLLECTION: 'FeeCollection',
  REVENUE_ANALYTICS: 'RevenueAnalytics',
  EXPENSE_ANALYTICS: 'ExpenseAnalytics',

  ANNOUNCEMENTS: 'Announcements',

  HOLIDAY_CALENDAR: 'HolidayCalendar',
  CREATE_HOLIDAY: 'CreateHoliday',

  PROFILE: 'AdminProfile',
  NOTIFICATIONS: 'AdminNotifications',
  SETTINGS: 'AdminSettings',
} as const;
