/**
 * AdminStack — root native-stack for the Admin persona.
 *
 * Hosts the bottom tabs plus every detail / flow screen pushed on top. Fully
 * isolated from the Teacher/Student stacks and the existing ERP navigator (no
 * shared route names, no shared navigator instance).
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../types/navigation';
import { ADMIN_ROUTES } from './adminRoutes';
import { AdminTabs } from './AdminTabs';

// insights / overview
import SchoolOverviewScreen from '../screens/admin/overview/SchoolOverviewScreen';
import ReportsDashboardScreen from '../screens/admin/reports/ReportsDashboardScreen';
import AcademicReportsScreen from '../screens/admin/academics/AcademicReportsScreen';

// people
import StudentManagementScreen from '../screens/admin/people/StudentManagementScreen';
import AdminStudentProfileScreen from '../screens/admin/people/AdminStudentProfileScreen';
import AdminTeacherDetailScreen from '../screens/admin/people/AdminTeacherDetailScreen';
import TeacherManagementScreen from '../screens/admin/people/TeacherManagementScreen';
import ParentManagementScreen from '../screens/admin/people/ParentManagementScreen';
import StaffManagementScreen from '../screens/admin/people/StaffManagementScreen';
import UserRolesScreen from '../screens/admin/people/UserRolesScreen';
import PermissionsScreen from '../screens/admin/people/PermissionsScreen';

// academics
import AcademicOverviewScreen from '../screens/admin/academics/AcademicOverviewScreen';
import ClassesScreen from '../screens/admin/academics/ClassesScreen';
import ExamsScreen from '../screens/admin/academics/ExamsScreen';
import CreateExamGroupScreen from '../screens/teacher/exams/CreateExamGroupScreen';
import ExamGroupDetailScreen from '../screens/teacher/exams/ExamGroupDetailScreen';
import CreateExamItemScreen from '../screens/teacher/exams/CreateExamItemScreen';
import ExamSubjectsScreen from '../screens/teacher/exams/ExamSubjectsScreen';
import ExamStudentsScreen from '../screens/teacher/exams/ExamStudentsScreen';
import ExamGradesScreen from '../screens/teacher/exams/ExamGradesScreen';
import ExamMarksEntryScreen from '../screens/teacher/exams/ExamMarksEntryScreen';
import ExamResultsManageScreen from '../screens/teacher/exams/ExamResultsManageScreen';
import ExamReportCardsScreen from '../screens/teacher/exams/ExamReportCardsScreen';
import AdminTimetableScreen from '../screens/admin/timetable/AdminTimetableScreen';
import CreateTimetableTemplateScreen from '../screens/admin/timetable/CreateTimetableTemplateScreen';
import CreateTimetableSlotScreen from '../screens/admin/timetable/CreateTimetableSlotScreen';

// admissions
import AdmissionsDashboardScreen from '../screens/admin/admissions/AdmissionsDashboardScreen';
import AdmissionApplicationsScreen from '../screens/admin/admissions/AdmissionApplicationsScreen';
import ApprovalWorkflowScreen from '../screens/admin/admissions/ApprovalWorkflowScreen';

// operations
import AttendanceDashboardScreen from '../screens/admin/attendance/AttendanceDashboardScreen';
import AttendanceCalendarScreen from '../screens/teacher/attendance/AttendanceCalendarScreen';
import LibraryDashboardScreen from '../screens/admin/library/LibraryDashboardScreen';
import TransportDashboardScreen from '../screens/admin/transport/TransportDashboardScreen';
import VehicleManagementScreen from '../screens/admin/transport/VehicleManagementScreen';
import RouteManagementScreen from '../screens/admin/transport/RouteManagementScreen';
import AdminSafetyScreen from '../screens/admin/safety/AdminSafetyScreen';
import HostelDashboardScreen from '../screens/admin/hostel/HostelDashboardScreen';
import InventoryDashboardScreen from '../screens/admin/inventory/InventoryDashboardScreen';
import AdminBiometricScreen from '../screens/admin/biometric/AdminBiometricScreen';
import FormsDashboardScreen from '../screens/admin/forms/FormsDashboardScreen';
import AdminParentPortalScreen from '../screens/admin/parentPortal/AdminParentPortalScreen';
import AdminAnalyticsScreen from '../screens/admin/analytics/AdminAnalyticsScreen';

// finance
import FeeCollectionScreen from '../screens/admin/finance/FeeCollectionScreen';
import RevenueAnalyticsScreen from '../screens/admin/finance/RevenueAnalyticsScreen';
import ExpenseAnalyticsScreen from '../screens/admin/finance/ExpenseAnalyticsScreen';
import AdminHrScreen from '../screens/admin/hr/AdminHrScreen';

// communication
import AnnouncementsScreen from '../screens/admin/communication/AnnouncementsScreen';
import CreateNoticeScreen from '../screens/teacher/notices/CreateNoticeScreen';
import NoticeDetailScreen from '../screens/teacher/notices/NoticeDetailScreen';
import HolidayCalendarScreen from '../screens/shared/HolidayCalendarScreen';
import CreateHolidayScreen from '../screens/shared/CreateHolidayScreen';
import LibraryScreen from '../screens/shared/LibraryScreen';
import CreateBookScreen from '../screens/shared/CreateBookScreen';
import CreateLibraryTransactionScreen from '../screens/shared/CreateLibraryTransactionScreen';
import EngagementHubScreen from '../screens/shared/EngagementHubScreen';
import CreateEngagementScreen from '../screens/shared/CreateEngagementScreen';

// profile / system
import AdminProfileScreen from '../screens/admin/profile/AdminProfileScreen';
import NotificationsScreen from '../screens/admin/settings/NotificationsScreen';
import SettingsScreen from '../screens/admin/settings/SettingsScreen';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ADMIN_ROUTES.TABS} component={AdminTabs} />

      <Stack.Screen name={ADMIN_ROUTES.SCHOOL_OVERVIEW} component={SchoolOverviewScreen} />
      <Stack.Screen name={ADMIN_ROUTES.REPORTS_DASHBOARD} component={ReportsDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.ACADEMIC_REPORTS} component={AcademicReportsScreen} />

      <Stack.Screen name={ADMIN_ROUTES.STUDENT_MANAGEMENT} component={StudentManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.ADMIN_STUDENT_PROFILE} component={AdminStudentProfileScreen} />
      <Stack.Screen name={ADMIN_ROUTES.ADMIN_TEACHER_DETAIL} component={AdminTeacherDetailScreen} />
      <Stack.Screen name={ADMIN_ROUTES.TEACHER_MANAGEMENT} component={TeacherManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.PARENT_MANAGEMENT} component={ParentManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.STAFF_MANAGEMENT} component={StaffManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.USER_ROLES} component={UserRolesScreen} />
      <Stack.Screen name={ADMIN_ROUTES.PERMISSIONS} component={PermissionsScreen} />

      <Stack.Screen name={ADMIN_ROUTES.ACADEMIC_OVERVIEW} component={AcademicOverviewScreen} />
      <Stack.Screen name={ADMIN_ROUTES.CLASSES} component={ClassesScreen} />
      <Stack.Screen name={ADMIN_ROUTES.EXAMS} component={ExamsScreen} />
      <Stack.Screen name={ADMIN_ROUTES.CREATE_EXAM_GROUP} component={CreateExamGroupScreen} />
      <Stack.Screen name={ADMIN_ROUTES.EXAM_GROUP_DETAIL} component={ExamGroupDetailScreen} />
      <Stack.Screen name={ADMIN_ROUTES.CREATE_EXAM_ITEM} component={CreateExamItemScreen} />
      <Stack.Screen name={ADMIN_ROUTES.EXAM_SUBJECTS} component={ExamSubjectsScreen} />
      <Stack.Screen name={ADMIN_ROUTES.EXAM_STUDENTS} component={ExamStudentsScreen} />
      <Stack.Screen name={ADMIN_ROUTES.EXAM_GRADES} component={ExamGradesScreen} />
      <Stack.Screen name={ADMIN_ROUTES.EXAM_MARKS_ENTRY} component={ExamMarksEntryScreen} />
      <Stack.Screen name={ADMIN_ROUTES.EXAM_RESULTS_MANAGE} component={ExamResultsManageScreen} />
      <Stack.Screen name={ADMIN_ROUTES.EXAM_REPORT_CARDS} component={ExamReportCardsScreen} />

      <Stack.Screen name={ADMIN_ROUTES.TIMETABLE} component={AdminTimetableScreen} />
      <Stack.Screen
        name={ADMIN_ROUTES.CREATE_TIMETABLE_TEMPLATE}
        component={CreateTimetableTemplateScreen}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.CREATE_TIMETABLE_SLOT}
        component={CreateTimetableSlotScreen}
      />

      <Stack.Screen name={ADMIN_ROUTES.ADMISSIONS_DASHBOARD} component={AdmissionsDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.ADMISSION_APPLICATIONS} component={AdmissionApplicationsScreen} />
      <Stack.Screen name={ADMIN_ROUTES.APPROVAL_WORKFLOW} component={ApprovalWorkflowScreen} />

      <Stack.Screen name={ADMIN_ROUTES.ATTENDANCE_DASHBOARD} component={AttendanceDashboardScreen} />
      <Stack.Screen
        name={ADMIN_ROUTES.ATTENDANCE_CALENDAR}
        component={AttendanceCalendarScreen}
      />
      <Stack.Screen name={ADMIN_ROUTES.LIBRARY_DASHBOARD} component={LibraryDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.BOOK_MANAGEMENT} component={LibraryScreen} />
      <Stack.Screen name={ADMIN_ROUTES.LIBRARY} component={LibraryScreen} />
      <Stack.Screen name={ADMIN_ROUTES.CREATE_BOOK} component={CreateBookScreen} />
      <Stack.Screen
        name={ADMIN_ROUTES.CREATE_LIBRARY_TRANSACTION}
        component={CreateLibraryTransactionScreen}
      />
      <Stack.Screen name={ADMIN_ROUTES.TRANSPORT_DASHBOARD} component={TransportDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.VEHICLE_MANAGEMENT} component={VehicleManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.ROUTE_MANAGEMENT} component={RouteManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.SAFETY} component={AdminSafetyScreen} />
      <Stack.Screen name={ADMIN_ROUTES.HOSTEL_DASHBOARD} component={HostelDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.INVENTORY_DASHBOARD} component={InventoryDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.BIOMETRIC_DASHBOARD} component={AdminBiometricScreen} />
      <Stack.Screen name={ADMIN_ROUTES.FORMS_DASHBOARD} component={FormsDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.PARENT_PORTAL} component={AdminParentPortalScreen} />
      <Stack.Screen name={ADMIN_ROUTES.ANALYTICS_DASHBOARD} component={AdminAnalyticsScreen} />

      <Stack.Screen name={ADMIN_ROUTES.FEE_COLLECTION} component={FeeCollectionScreen} />
      <Stack.Screen name={ADMIN_ROUTES.REVENUE_ANALYTICS} component={RevenueAnalyticsScreen} />
      <Stack.Screen name={ADMIN_ROUTES.EXPENSE_ANALYTICS} component={ExpenseAnalyticsScreen} />
      <Stack.Screen name={ADMIN_ROUTES.HR_PAYROLL} component={AdminHrScreen} />

      <Stack.Screen name={ADMIN_ROUTES.ANNOUNCEMENTS} component={AnnouncementsScreen} />
      <Stack.Screen name={ADMIN_ROUTES.CREATE_NOTICE} component={CreateNoticeScreen} />
      <Stack.Screen name={ADMIN_ROUTES.NOTICE_DETAIL} component={NoticeDetailScreen} />
      <Stack.Screen name={ADMIN_ROUTES.HOLIDAY_CALENDAR} component={HolidayCalendarScreen} />
      <Stack.Screen name={ADMIN_ROUTES.CREATE_HOLIDAY} component={CreateHolidayScreen} />
      <Stack.Screen name={ADMIN_ROUTES.ENGAGEMENT} component={EngagementHubScreen} />
      <Stack.Screen name={ADMIN_ROUTES.CREATE_ENGAGEMENT} component={CreateEngagementScreen} />

      <Stack.Screen name={ADMIN_ROUTES.PROFILE} component={AdminProfileScreen} />
      <Stack.Screen name={ADMIN_ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
      <Stack.Screen name={ADMIN_ROUTES.SETTINGS} component={SettingsScreen} />
    </Stack.Navigator>
  );
}
