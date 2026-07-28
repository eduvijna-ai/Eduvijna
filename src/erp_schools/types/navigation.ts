/**
 * ERP Schools — Navigation param lists.
 *
 * All route names are unique to this module (Teacher*-prefixed where ambiguous)
 * so there are zero collisions with the existing ERP stack (ERP*) or the main
 * app tabs (Dashboard/Assessments/…).
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

/** Bottom-tab routes (the persistent 5-item bar). */
export type TeacherTabParamList = {
  TeacherHome: undefined;
  TeacherClasses: undefined;
  TeacherDashboard: undefined;
  TeacherStudents: undefined;
  TeacherMore: undefined;
};

/** Root stack: tabs + every detail/flow screen pushed on top. */
export type TeacherStackParamList = {
  TeacherTabs: NavigatorScreenParams<TeacherTabParamList> | undefined;

  // profile / system
  Profile: undefined;
  Notifications: undefined;
  Settings: undefined;

  // self attendance
  MyAttendance: undefined;
  AttendanceCalendar: undefined;

  // payroll & leave
  PayrollDashboard: undefined;
  PayslipDetails: { payslipId: string };
  SalaryHistory: undefined;
  LeaveDashboard: undefined;
  ApplyLeave: { leaveId?: number };
  LeaveHistory: undefined;

  // classes & students
  ClassDetails: { classId: string };
  StudentProfile: { studentId: string; openEdit?: boolean };
  StudentAttendance: { studentId: string };

  // class attendance
  MarkAttendance: { classId?: string };
  AttendanceReport: { classId?: string };
  TeacherAttendance: { classId?: string; tab?: string };

  // assessments
  GradeStudents: { classId?: string };
  AssessmentList: { classId?: string };
  AssessmentDetails: { assessmentId: string };
  Exams: undefined;

  // exams (web ExamsTab / ExamGroupsSubView parity)
  CreateExamGroup: { groupId?: number };
  ExamGroupDetail: { groupId: number };
  CreateExamItem: { groupId: number; itemId?: number };
  ExamSubjects: { groupId: number; itemId: number };
  ExamStudents: { groupId: number; itemId: number };
  ExamGrades: { groupId: number };
  ExamMarksEntry: { groupId: number; itemId: number };
  ExamResultsManage: { groupId: number; itemId: number };
  ExamReportCards: { itemId: number; groupId: number; examName?: string };

  // assignments
  AssignmentDashboard: undefined;
  CreateAssignment: undefined;
  AssignmentSubmissions: { assignmentId: string };

  // materials
  StudyMaterial: { classId?: string };
  UploadMaterial: undefined;
  ResourceLibrary: undefined;

  // library (web LibraryTab parity)
  Library: undefined;
  CreateBook: { bookId?: number };
  CreateLibraryTransaction: { transactionId?: number };

  // timetable
  Timetable: { classId?: string };

  // communication
  ParentCommunication: { classId?: string };
  ParentChat: { conversationId: string };
  BroadcastMessage: undefined;

  // notices (web NoticesTab parity)
  NoticeBoard: { classId?: string };
  CreateNotice: { noticeId?: number };
  NoticeDetail: { noticeId: number };
  /** @deprecated mock — kept for future; not linked from Notice Board UI */
  ScheduledNotice: undefined;

  // reports / analytics
  AttendanceAnalytics: undefined;
  AssignmentAnalytics: undefined;
  AssessmentAnalytics: undefined;
  StudentProgressAnalytics: undefined;
  ReportsDashboard: undefined;

  // ai
  AITeacherAssistant: undefined;

  HolidayCalendar: undefined;
  CreateHoliday: { holidayId?: number };

  // engagement (web StudentEngagementTab parity)
  Engagement: undefined;
  CreateEngagement: {
    kind: 'councils' | 'members' | 'grievances' | 'events' | 'registrations' | 'gallery';
    recordId?: number;
  };

  // fees (web Fees tab — instructor)
  TeacherFees: undefined;
};

/** Student bottom-tab routes (the persistent 5-item bar). */
export type StudentTabParamList = {
  StudentHome: undefined;
  StudentAcademics: undefined;
  StudentDashboard: undefined;
  StudentTimetableTab: undefined;
  StudentMore: undefined;
};

/** Student root stack: tabs + every detail/flow screen pushed on top. */
export type StudentStackParamList = {
  StudentTabs: NavigatorScreenParams<StudentTabParamList> | undefined;

  // academics
  SubjectDetails: { subjectId: string }; // enrollment class_id key
  MarksReport: undefined;
  ProgressReport: undefined;

  // attendance
  Attendance: undefined;
  AttendanceDetails: { mode?: 'daily' | 'monthly' };

  // assignments
  Assignments: undefined;
  AssignmentDetails: { assignmentId: string };
  AssignmentSubmission: { assignmentId: string };
  AssignmentPerformance: undefined;

  // timetable & exams
  StudentTimetable: undefined;
  ExamSchedule: undefined;
  ExamResults: undefined;

  // fees, library, notices, events
  FeeDashboard: undefined;
  Library: undefined;
  Notices: undefined;
  Events: undefined;

  // ai
  AITutor: undefined;
  AIPracticeTest: undefined;
  AIQuiz: { topic?: string };

  // profile / system
  StudentProfile: undefined;
  StudentNotifications: undefined;
  StudentSettings: undefined;

  HolidayCalendar: undefined;
  CreateHoliday: { holidayId?: number };

  // library (web LibraryTab parity — replaces mock student library UI)
  Library: undefined;
  CreateBook: { bookId?: number };
  CreateLibraryTransaction: { transactionId?: number };
};

/** Admin bottom-tab routes (the persistent 5-item bar). */
export type AdminTabParamList = {
  AdminHome: undefined;
  AdminPeople: undefined;
  AdminMainDashboard: undefined;
  AdminFinance: undefined;
  AdminMore: undefined;
};

/** Admin root stack: tabs + every detail/flow screen pushed on top. */
export type AdminStackParamList = {
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;

  // insights / overview
  SchoolOverview: undefined;
  ReportsDashboard: undefined;
  AcademicReports: undefined;

  // people
  StudentManagement: undefined;
  TeacherManagement: undefined;
  ParentManagement: undefined;
  StaffManagement: undefined;
  UserRoles: undefined;
  Permissions: undefined;

  // academics
  AcademicOverview: undefined;
  Classes: undefined;
  Exams: undefined;

  // admissions
  AdmissionsDashboard: undefined;
  AdmissionApplications: undefined;
  ApprovalWorkflow: undefined;

  // operations
  AttendanceDashboard: undefined;
  LibraryDashboard: undefined;
  BookManagement: undefined;
  TransportDashboard: undefined;
  VehicleManagement: undefined;
  RouteManagement: undefined;
  HostelDashboard: undefined;
  InventoryDashboard: undefined;

  // finance
  FeeCollection: undefined;
  RevenueAnalytics: undefined;
  ExpenseAnalytics: undefined;

  // communication
  Announcements: undefined;

  // library (web LibraryTab parity)
  Library: undefined;
  CreateBook: { bookId?: number };
  CreateLibraryTransaction: { transactionId?: number };

  // calendar
  HolidayCalendar: undefined;
  CreateHoliday: { holidayId?: number };

  // engagement (web StudentEngagementTab parity)
  Engagement: undefined;
  CreateEngagement: {
    kind: 'councils' | 'members' | 'grievances' | 'events' | 'registrations' | 'gallery';
    recordId?: number;
  };

  // profile / system
  AdminProfile: undefined;
  AdminNotifications: undefined;
  AdminSettings: undefined;
};
