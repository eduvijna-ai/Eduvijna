/**
 * Admin route-name constants. Importing these avoids magic strings at call sites
 * and keeps route names collision-free with the Teacher stack (Teacher*), the
 * Student stack (Student*), the existing ERP navigator (ERP*) and the host tabs.
 */

export const ADMIN_TABS = {
  HOME: 'AdminHome',
  ATTENDANCE: 'AdminAttendance',
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
  ADMIN_STUDENT_PROFILE: 'AdminStudentProfile',
  ADMIN_TEACHER_DETAIL: 'AdminTeacherDetail',
  TEACHER_MANAGEMENT: 'TeacherManagement',
  PARENT_MANAGEMENT: 'ParentManagement',
  STAFF_MANAGEMENT: 'StaffManagement',
  USER_ROLES: 'UserRoles',
  PERMISSIONS: 'Permissions',

  ACADEMIC_OVERVIEW: 'AcademicOverview',
  CLASSES: 'Classes',
  EXAMS: 'Exams',
  CREATE_EXAM_GROUP: 'CreateExamGroup',
  EXAM_GROUP_DETAIL: 'ExamGroupDetail',
  CREATE_EXAM_ITEM: 'CreateExamItem',
  EXAM_SUBJECTS: 'ExamSubjects',
  EXAM_STUDENTS: 'ExamStudents',
  EXAM_GRADES: 'ExamGrades',
  EXAM_MARKS_ENTRY: 'ExamMarksEntry',
  EXAM_RESULTS_MANAGE: 'ExamResultsManage',
  EXAM_REPORT_CARDS: 'ExamReportCards',

  TIMETABLE: 'Timetable',
  CREATE_TIMETABLE_TEMPLATE: 'CreateTimetableTemplate',
  CREATE_TIMETABLE_SLOT: 'CreateTimetableSlot',

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
  SAFETY: 'Safety',
  HOSTEL_DASHBOARD: 'HostelDashboard',
  INVENTORY_DASHBOARD: 'InventoryDashboard',
  BIOMETRIC_DASHBOARD: 'BiometricDashboard',
  FORMS_DASHBOARD: 'FormsDashboard',
  PARENT_PORTAL: 'ParentPortal',
  ANALYTICS_DASHBOARD: 'AnalyticsDashboard',

  FEE_COLLECTION: 'FeeCollection',
  REVENUE_ANALYTICS: 'RevenueAnalytics',
  EXPENSE_ANALYTICS: 'ExpenseAnalytics',
  HR_PAYROLL: 'HrPayroll',

  ANNOUNCEMENTS: 'Announcements',
  CREATE_NOTICE: 'CreateNotice',
  NOTICE_DETAIL: 'NoticeDetail',

  HOLIDAY_CALENDAR: 'HolidayCalendar',
  CREATE_HOLIDAY: 'CreateHoliday',

  PROFILE: 'AdminProfile',
  NOTIFICATIONS: 'AdminNotifications',
  SETTINGS: 'AdminSettings',
} as const;
