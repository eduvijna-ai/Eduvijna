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
  ApplyLeave: undefined;
  LeaveHistory: undefined;

  // classes & students
  ClassDetails: { classId: string };
  StudentProfile: { studentId: string };
  StudentAttendance: { studentId: string };

  // class attendance
  MarkAttendance: { classId: string };
  AttendanceReport: { classId: string };

  // assessments
  GradeStudents: { classId?: string };
  AssessmentList: { classId?: string };
  AssessmentDetails: { assessmentId: string };

  // assignments
  AssignmentDashboard: undefined;
  CreateAssignment: undefined;
  AssignmentSubmissions: { assignmentId: string };

  // materials
  StudyMaterial: { classId?: string };
  UploadMaterial: undefined;
  ResourceLibrary: undefined;

  // timetable
  Timetable: { classId?: string };

  // communication
  ParentCommunication: { classId?: string };
  ParentChat: { conversationId: string };
  BroadcastMessage: undefined;

  // notices
  NoticeBoard: { classId?: string };
  CreateNotice: { scope?: 'class' | 'group' | 'school' };
  ScheduledNotice: undefined;

  // reports / analytics
  AttendanceAnalytics: undefined;
  AssignmentAnalytics: undefined;
  AssessmentAnalytics: undefined;
  StudentProgressAnalytics: undefined;
  ReportsDashboard: undefined;

  // ai
  AITeacherAssistant: undefined;
};

/** Student bottom-tab routes (the persistent 5-item bar). */
export type StudentTabParamList = {
  StudentHome: undefined;
  StudentAcademics: undefined;
  StudentDashboard: undefined;
  StudentAITest: undefined;
  StudentMore: undefined;
};

/** Student root stack: tabs + every detail/flow screen pushed on top. */
export type StudentStackParamList = {
  StudentTabs: NavigatorScreenParams<StudentTabParamList> | undefined;

  // academics
  SubjectDetails: { subjectId: string };
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
  Timetable: undefined;
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
};
