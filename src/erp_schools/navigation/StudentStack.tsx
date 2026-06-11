/**
 * StudentStack — root native-stack for the Student persona.
 *
 * Hosts the bottom tabs plus every detail / flow screen pushed on top. Fully
 * isolated from the Teacher stack and the existing ERP navigator (no shared
 * route names, no shared navigator instance).
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StudentStackParamList } from '../types/navigation';
import { STUDENT_ROUTES } from './studentRoutes';
import { StudentTabs } from './StudentTabs';

// academics
import SubjectDetailsScreen from '../screens/student/academics/SubjectDetailsScreen';
import MarksReportScreen from '../screens/student/academics/MarksReportScreen';
import ProgressReportScreen from '../screens/student/academics/ProgressReportScreen';

// attendance
import AttendanceScreen from '../screens/student/attendance/AttendanceScreen';
import AttendanceDetailsScreen from '../screens/student/attendance/AttendanceDetailsScreen';

// assignments
import AssignmentsScreen from '../screens/student/assignments/AssignmentsScreen';
import AssignmentDetailsScreen from '../screens/student/assignments/AssignmentDetailsScreen';
import AssignmentSubmissionScreen from '../screens/student/assignments/AssignmentSubmissionScreen';
import AssignmentPerformanceScreen from '../screens/student/assignments/AssignmentPerformanceScreen';

// timetable & exams
import TimetableScreen from '../screens/student/timetable/TimetableScreen';
import ExamScheduleScreen from '../screens/student/exams/ExamScheduleScreen';
import ExamResultsScreen from '../screens/student/exams/ExamResultsScreen';

// fees, library, events
import FeeDashboardScreen from '../screens/student/fees/FeeDashboardScreen';
import LibraryScreen from '../screens/student/library/LibraryScreen';
import NoticesScreen from '../screens/student/notices/NoticesScreen';
import EventsScreen from '../screens/student/events/EventsScreen';

// ai
import AITutorScreen from '../screens/student/ai/AITutorScreen';
import AIPracticeTestScreen from '../screens/student/ai/AIPracticeTestScreen';
import AIQuizScreen from '../screens/student/ai/AIQuizScreen';

// profile / system
import StudentProfileScreen from '../screens/student/profile/StudentProfileScreen';
import NotificationsScreen from '../screens/student/settings/NotificationsScreen';
import SettingsScreen from '../screens/student/settings/SettingsScreen';

const Stack = createNativeStackNavigator<StudentStackParamList>();

export function StudentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={STUDENT_ROUTES.TABS} component={StudentTabs} />

      <Stack.Screen name={STUDENT_ROUTES.SUBJECT_DETAILS} component={SubjectDetailsScreen} />
      <Stack.Screen name={STUDENT_ROUTES.MARKS_REPORT} component={MarksReportScreen} />
      <Stack.Screen name={STUDENT_ROUTES.PROGRESS_REPORT} component={ProgressReportScreen} />

      <Stack.Screen name={STUDENT_ROUTES.ATTENDANCE} component={AttendanceScreen} />
      <Stack.Screen name={STUDENT_ROUTES.ATTENDANCE_DETAILS} component={AttendanceDetailsScreen} />

      <Stack.Screen name={STUDENT_ROUTES.ASSIGNMENTS} component={AssignmentsScreen} />
      <Stack.Screen name={STUDENT_ROUTES.ASSIGNMENT_DETAILS} component={AssignmentDetailsScreen} />
      <Stack.Screen name={STUDENT_ROUTES.ASSIGNMENT_SUBMISSION} component={AssignmentSubmissionScreen} />
      <Stack.Screen name={STUDENT_ROUTES.ASSIGNMENT_PERFORMANCE} component={AssignmentPerformanceScreen} />

      <Stack.Screen name={STUDENT_ROUTES.TIMETABLE} component={TimetableScreen} />
      <Stack.Screen name={STUDENT_ROUTES.EXAM_SCHEDULE} component={ExamScheduleScreen} />
      <Stack.Screen name={STUDENT_ROUTES.EXAM_RESULTS} component={ExamResultsScreen} />

      <Stack.Screen name={STUDENT_ROUTES.FEE_DASHBOARD} component={FeeDashboardScreen} />
      <Stack.Screen name={STUDENT_ROUTES.LIBRARY} component={LibraryScreen} />
      <Stack.Screen name={STUDENT_ROUTES.NOTICES} component={NoticesScreen} />
      <Stack.Screen name={STUDENT_ROUTES.EVENTS} component={EventsScreen} />

      <Stack.Screen name={STUDENT_ROUTES.AI_TUTOR} component={AITutorScreen} />
      <Stack.Screen name={STUDENT_ROUTES.AI_PRACTICE_TEST} component={AIPracticeTestScreen} />
      <Stack.Screen name={STUDENT_ROUTES.AI_QUIZ} component={AIQuizScreen} />

      <Stack.Screen name={STUDENT_ROUTES.PROFILE} component={StudentProfileScreen} />
      <Stack.Screen name={STUDENT_ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
      <Stack.Screen name={STUDENT_ROUTES.SETTINGS} component={SettingsScreen} />
    </Stack.Navigator>
  );
}
