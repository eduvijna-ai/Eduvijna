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
import TeacherManagementScreen from '../screens/admin/people/TeacherManagementScreen';
import ParentManagementScreen from '../screens/admin/people/ParentManagementScreen';
import StaffManagementScreen from '../screens/admin/people/StaffManagementScreen';
import UserRolesScreen from '../screens/admin/people/UserRolesScreen';
import PermissionsScreen from '../screens/admin/people/PermissionsScreen';

// academics
import AcademicOverviewScreen from '../screens/admin/academics/AcademicOverviewScreen';
import ClassesScreen from '../screens/admin/academics/ClassesScreen';
import ExamsScreen from '../screens/admin/academics/ExamsScreen';

// admissions
import AdmissionsDashboardScreen from '../screens/admin/admissions/AdmissionsDashboardScreen';
import AdmissionApplicationsScreen from '../screens/admin/admissions/AdmissionApplicationsScreen';
import ApprovalWorkflowScreen from '../screens/admin/admissions/ApprovalWorkflowScreen';

// operations
import AttendanceDashboardScreen from '../screens/admin/attendance/AttendanceDashboardScreen';
import LibraryDashboardScreen from '../screens/admin/library/LibraryDashboardScreen';
import BookManagementScreen from '../screens/admin/library/BookManagementScreen';
import TransportDashboardScreen from '../screens/admin/transport/TransportDashboardScreen';
import VehicleManagementScreen from '../screens/admin/transport/VehicleManagementScreen';
import RouteManagementScreen from '../screens/admin/transport/RouteManagementScreen';
import HostelDashboardScreen from '../screens/admin/hostel/HostelDashboardScreen';
import InventoryDashboardScreen from '../screens/admin/inventory/InventoryDashboardScreen';

// finance
import FeeCollectionScreen from '../screens/admin/finance/FeeCollectionScreen';
import RevenueAnalyticsScreen from '../screens/admin/finance/RevenueAnalyticsScreen';
import ExpenseAnalyticsScreen from '../screens/admin/finance/ExpenseAnalyticsScreen';

// communication
import AnnouncementsScreen from '../screens/admin/communication/AnnouncementsScreen';

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
      <Stack.Screen name={ADMIN_ROUTES.TEACHER_MANAGEMENT} component={TeacherManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.PARENT_MANAGEMENT} component={ParentManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.STAFF_MANAGEMENT} component={StaffManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.USER_ROLES} component={UserRolesScreen} />
      <Stack.Screen name={ADMIN_ROUTES.PERMISSIONS} component={PermissionsScreen} />

      <Stack.Screen name={ADMIN_ROUTES.ACADEMIC_OVERVIEW} component={AcademicOverviewScreen} />
      <Stack.Screen name={ADMIN_ROUTES.CLASSES} component={ClassesScreen} />
      <Stack.Screen name={ADMIN_ROUTES.EXAMS} component={ExamsScreen} />

      <Stack.Screen name={ADMIN_ROUTES.ADMISSIONS_DASHBOARD} component={AdmissionsDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.ADMISSION_APPLICATIONS} component={AdmissionApplicationsScreen} />
      <Stack.Screen name={ADMIN_ROUTES.APPROVAL_WORKFLOW} component={ApprovalWorkflowScreen} />

      <Stack.Screen name={ADMIN_ROUTES.ATTENDANCE_DASHBOARD} component={AttendanceDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.LIBRARY_DASHBOARD} component={LibraryDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.BOOK_MANAGEMENT} component={BookManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.TRANSPORT_DASHBOARD} component={TransportDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.VEHICLE_MANAGEMENT} component={VehicleManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.ROUTE_MANAGEMENT} component={RouteManagementScreen} />
      <Stack.Screen name={ADMIN_ROUTES.HOSTEL_DASHBOARD} component={HostelDashboardScreen} />
      <Stack.Screen name={ADMIN_ROUTES.INVENTORY_DASHBOARD} component={InventoryDashboardScreen} />

      <Stack.Screen name={ADMIN_ROUTES.FEE_COLLECTION} component={FeeCollectionScreen} />
      <Stack.Screen name={ADMIN_ROUTES.REVENUE_ANALYTICS} component={RevenueAnalyticsScreen} />
      <Stack.Screen name={ADMIN_ROUTES.EXPENSE_ANALYTICS} component={ExpenseAnalyticsScreen} />

      <Stack.Screen name={ADMIN_ROUTES.ANNOUNCEMENTS} component={AnnouncementsScreen} />

      <Stack.Screen name={ADMIN_ROUTES.PROFILE} component={AdminProfileScreen} />
      <Stack.Screen name={ADMIN_ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
      <Stack.Screen name={ADMIN_ROUTES.SETTINGS} component={SettingsScreen} />
    </Stack.Navigator>
  );
}
