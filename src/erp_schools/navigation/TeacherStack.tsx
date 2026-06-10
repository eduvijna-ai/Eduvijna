/**
 * TeacherStack — root native-stack for the Teacher persona.
 *
 * Hosts the bottom tabs plus every detail / flow screen pushed on top. This is
 * the single navigation tree for the module and is fully isolated from the
 * existing ERP navigator (no shared route names, no shared navigator instance).
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TeacherStackParamList } from '../types/navigation';
import { TEACHER_ROUTES } from './routes';
import { TeacherTabs } from './TeacherTabs';

// profile / system
import MyProfileScreen from '../screens/teacher/profile/MyProfileScreen';
import NotificationsScreen from '../screens/teacher/settings/NotificationsScreen';
import SettingsScreen from '../screens/teacher/settings/SettingsScreen';

// self attendance
import MyAttendanceScreen from '../screens/teacher/attendance/MyAttendanceScreen';
import AttendanceCalendarScreen from '../screens/teacher/attendance/AttendanceCalendarScreen';

// payroll & leave
import PayrollDashboardScreen from '../screens/teacher/payroll/PayrollDashboardScreen';
import PayslipDetailsScreen from '../screens/teacher/payroll/PayslipDetailsScreen';
import SalaryHistoryScreen from '../screens/teacher/payroll/SalaryHistoryScreen';
import LeaveDashboardScreen from '../screens/teacher/payroll/LeaveDashboardScreen';
import ApplyLeaveScreen from '../screens/teacher/payroll/ApplyLeaveScreen';
import LeaveHistoryScreen from '../screens/teacher/payroll/LeaveHistoryScreen';

// classes & students
import ClassDetailsScreen from '../screens/teacher/classes/ClassDetailsScreen';
import StudentProfileScreen from '../screens/teacher/students/StudentProfileScreen';
import StudentAttendanceScreen from '../screens/teacher/attendance/StudentAttendanceScreen';

// class attendance
import MarkAttendanceScreen from '../screens/teacher/attendance/MarkAttendanceScreen';
import AttendanceReportScreen from '../screens/teacher/attendance/AttendanceReportScreen';

// assessments
import GradeStudentsScreen from '../screens/teacher/assessments/GradeStudentsScreen';
import AssessmentListScreen from '../screens/teacher/assessments/AssessmentListScreen';
import AssessmentDetailsScreen from '../screens/teacher/assessments/AssessmentDetailsScreen';

// assignments
import AssignmentDashboardScreen from '../screens/teacher/assignments/AssignmentDashboardScreen';
import CreateAssignmentScreen from '../screens/teacher/assignments/CreateAssignmentScreen';
import AssignmentSubmissionsScreen from '../screens/teacher/assignments/AssignmentSubmissionsScreen';

// materials
import StudyMaterialScreen from '../screens/teacher/materials/StudyMaterialScreen';
import UploadMaterialScreen from '../screens/teacher/materials/UploadMaterialScreen';
import ResourceLibraryScreen from '../screens/teacher/materials/ResourceLibraryScreen';

// timetable
import TimetableScreen from '../screens/teacher/timetable/TimetableScreen';

// communication
import ParentCommunicationScreen from '../screens/teacher/communication/ParentCommunicationScreen';
import ParentChatScreen from '../screens/teacher/communication/ParentChatScreen';
import BroadcastMessageScreen from '../screens/teacher/communication/BroadcastMessageScreen';

// notices
import NoticeBoardScreen from '../screens/teacher/notices/NoticeBoardScreen';
import CreateNoticeScreen from '../screens/teacher/notices/CreateNoticeScreen';
import ScheduledNoticeScreen from '../screens/teacher/notices/ScheduledNoticeScreen';

// reports / analytics
import AttendanceAnalyticsScreen from '../screens/teacher/reports/AttendanceAnalyticsScreen';
import AssignmentAnalyticsScreen from '../screens/teacher/reports/AssignmentAnalyticsScreen';
import AssessmentAnalyticsScreen from '../screens/teacher/reports/AssessmentAnalyticsScreen';
import StudentProgressAnalyticsScreen from '../screens/teacher/reports/StudentProgressAnalyticsScreen';
import ReportsDashboardScreen from '../screens/teacher/reports/ReportsDashboardScreen';

// ai
import AITeacherAssistantScreen from '../screens/teacher/ai/AITeacherAssistantScreen';

const Stack = createNativeStackNavigator<TeacherStackParamList>();

export function TeacherStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={TEACHER_ROUTES.TABS} component={TeacherTabs} />

      <Stack.Screen name={TEACHER_ROUTES.PROFILE} component={MyProfileScreen} />
      <Stack.Screen name={TEACHER_ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
      <Stack.Screen name={TEACHER_ROUTES.SETTINGS} component={SettingsScreen} />

      <Stack.Screen name={TEACHER_ROUTES.MY_ATTENDANCE} component={MyAttendanceScreen} />
      <Stack.Screen name={TEACHER_ROUTES.ATTENDANCE_CALENDAR} component={AttendanceCalendarScreen} />

      <Stack.Screen name={TEACHER_ROUTES.PAYROLL_DASHBOARD} component={PayrollDashboardScreen} />
      <Stack.Screen name={TEACHER_ROUTES.PAYSLIP_DETAILS} component={PayslipDetailsScreen} />
      <Stack.Screen name={TEACHER_ROUTES.SALARY_HISTORY} component={SalaryHistoryScreen} />
      <Stack.Screen name={TEACHER_ROUTES.LEAVE_DASHBOARD} component={LeaveDashboardScreen} />
      <Stack.Screen name={TEACHER_ROUTES.APPLY_LEAVE} component={ApplyLeaveScreen} />
      <Stack.Screen name={TEACHER_ROUTES.LEAVE_HISTORY} component={LeaveHistoryScreen} />

      <Stack.Screen name={TEACHER_ROUTES.CLASS_DETAILS} component={ClassDetailsScreen} />
      <Stack.Screen name={TEACHER_ROUTES.STUDENT_PROFILE} component={StudentProfileScreen} />
      <Stack.Screen name={TEACHER_ROUTES.STUDENT_ATTENDANCE} component={StudentAttendanceScreen} />

      <Stack.Screen name={TEACHER_ROUTES.MARK_ATTENDANCE} component={MarkAttendanceScreen} />
      <Stack.Screen name={TEACHER_ROUTES.ATTENDANCE_REPORT} component={AttendanceReportScreen} />

      <Stack.Screen name={TEACHER_ROUTES.GRADE_STUDENTS} component={GradeStudentsScreen} />
      <Stack.Screen name={TEACHER_ROUTES.ASSESSMENT_LIST} component={AssessmentListScreen} />
      <Stack.Screen name={TEACHER_ROUTES.ASSESSMENT_DETAILS} component={AssessmentDetailsScreen} />

      <Stack.Screen name={TEACHER_ROUTES.ASSIGNMENT_DASHBOARD} component={AssignmentDashboardScreen} />
      <Stack.Screen name={TEACHER_ROUTES.CREATE_ASSIGNMENT} component={CreateAssignmentScreen} />
      <Stack.Screen name={TEACHER_ROUTES.ASSIGNMENT_SUBMISSIONS} component={AssignmentSubmissionsScreen} />

      <Stack.Screen name={TEACHER_ROUTES.STUDY_MATERIAL} component={StudyMaterialScreen} />
      <Stack.Screen name={TEACHER_ROUTES.UPLOAD_MATERIAL} component={UploadMaterialScreen} />
      <Stack.Screen name={TEACHER_ROUTES.RESOURCE_LIBRARY} component={ResourceLibraryScreen} />

      <Stack.Screen name={TEACHER_ROUTES.TIMETABLE} component={TimetableScreen} />

      <Stack.Screen name={TEACHER_ROUTES.PARENT_COMMUNICATION} component={ParentCommunicationScreen} />
      <Stack.Screen name={TEACHER_ROUTES.PARENT_CHAT} component={ParentChatScreen} />
      <Stack.Screen name={TEACHER_ROUTES.BROADCAST_MESSAGE} component={BroadcastMessageScreen} />

      <Stack.Screen name={TEACHER_ROUTES.NOTICE_BOARD} component={NoticeBoardScreen} />
      <Stack.Screen name={TEACHER_ROUTES.CREATE_NOTICE} component={CreateNoticeScreen} />
      <Stack.Screen name={TEACHER_ROUTES.SCHEDULED_NOTICE} component={ScheduledNoticeScreen} />

      <Stack.Screen name={TEACHER_ROUTES.ATTENDANCE_ANALYTICS} component={AttendanceAnalyticsScreen} />
      <Stack.Screen name={TEACHER_ROUTES.ASSIGNMENT_ANALYTICS} component={AssignmentAnalyticsScreen} />
      <Stack.Screen name={TEACHER_ROUTES.ASSESSMENT_ANALYTICS} component={AssessmentAnalyticsScreen} />
      <Stack.Screen name={TEACHER_ROUTES.STUDENT_PROGRESS_ANALYTICS} component={StudentProgressAnalyticsScreen} />
      <Stack.Screen name={TEACHER_ROUTES.REPORTS_DASHBOARD} component={ReportsDashboardScreen} />

      <Stack.Screen name={TEACHER_ROUTES.AI_ASSISTANT} component={AITeacherAssistantScreen} />
    </Stack.Navigator>
  );
}
