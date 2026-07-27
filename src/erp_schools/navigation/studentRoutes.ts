/**
 * Student route-name constants. Importing these avoids magic strings at call
 * sites and keeps route names collision-free with the Teacher stack (Teacher*),
 * the existing ERP navigator (ERP*) and the host app tabs.
 */

export const STUDENT_TABS = {
  HOME: 'StudentHome',
  ACADEMICS: 'StudentAcademics',
  DASHBOARD: 'StudentDashboard',
  AI_TEST: 'StudentAITest',
  MORE: 'StudentMore',
} as const;

export const STUDENT_ROUTES = {
  TABS: 'StudentTabs',

  SUBJECT_DETAILS: 'SubjectDetails',
  MARKS_REPORT: 'MarksReport',
  PROGRESS_REPORT: 'ProgressReport',

  ATTENDANCE: 'Attendance',
  ATTENDANCE_DETAILS: 'AttendanceDetails',

  ASSIGNMENTS: 'Assignments',
  ASSIGNMENT_DETAILS: 'AssignmentDetails',
  ASSIGNMENT_SUBMISSION: 'AssignmentSubmission',
  ASSIGNMENT_PERFORMANCE: 'AssignmentPerformance',

  /** Unique vs teacher stack `Timetable` — avoids cross-navigator collisions on device. */
  TIMETABLE: 'StudentTimetable',
  EXAM_SCHEDULE: 'ExamSchedule',
  EXAM_RESULTS: 'ExamResults',

  FEE_DASHBOARD: 'FeeDashboard',
  LIBRARY: 'Library',
  NOTICES: 'Notices',
  EVENTS: 'Events',

  AI_TUTOR: 'AITutor',
  AI_PRACTICE_TEST: 'AIPracticeTest',
  AI_QUIZ: 'AIQuiz',

  PROFILE: 'StudentProfile',
  NOTIFICATIONS: 'StudentNotifications',
  SETTINGS: 'StudentSettings',
  HOLIDAY_CALENDAR: 'HolidayCalendar',
  CREATE_HOLIDAY: 'CreateHoliday',
  CREATE_BOOK: 'CreateBook',
  CREATE_LIBRARY_TRANSACTION: 'CreateLibraryTransaction',
} as const;
