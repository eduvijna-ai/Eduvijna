/**
 * ERP Navigator
 * Stack navigator for all ERP sub-screens.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@context/ThemeContext';
import { AcademicYearProvider } from '../contexts/AcademicYearContext';
import { useErpRole } from '../hooks/useErpRole';

import ERPMainScreen from '../screens/ERPMainScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ClassOverviewScreen from '../screens/ClassOverviewScreen';
import AcademicSetupScreen from '../screens/AcademicSetupScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import NoticesScreen from '../screens/NoticesScreen';
import AdmissionsScreen from '../screens/AdmissionsScreen';
import ExamsScreen from '../screens/ExamsScreen';
import TimetableScreen from '../screens/TimetableScreen';
import FeesScreen from '../screens/FeesScreen';
import HRScreen from '../screens/HRScreen';
import LibraryScreen from '../screens/LibraryScreen';
import TransportScreen from '../screens/TransportScreen';
import HostelScreen from '../screens/HostelScreen';
import InventoryScreen from '../screens/InventoryScreen';
import EngagementScreen from '../screens/EngagementScreen';
import SafetyScreen from '../screens/SafetyScreen';
import ParentPortalScreen from '../screens/ParentPortalScreen';
import HolidayCalendarScreen from '../screens/HolidayCalendarScreen';
import LMSScreen from '../screens/LMSScreen';
import FormsScreen from '../screens/FormsScreen';
import BiometricScreen from '../screens/BiometricScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

export type ERPStackParamList = {
  ERPMain: undefined;
  ERPDashboard: undefined;
  ERPClassOverview: undefined;
  ERPAcademicSetup: undefined;
  ERPAttendance: undefined;
  ERPNotices: undefined;
  ERPAdmissions: undefined;
  ERPExams: undefined;
  ERPTimetable: undefined;
  ERPFees: undefined;
  ERPHR: undefined;
  ERPLibrary: undefined;
  ERPTransport: undefined;
  ERPHostel: undefined;
  ERPInventory: undefined;
  ERPEngagement: undefined;
  ERPSafety: undefined;
  ERPParentPortal: undefined;
  ERPHolidayCalendar: undefined;
  ERPLMS: undefined;
  ERPForms: undefined;
  ERPBiometric: undefined;
  ERPAnalytics: undefined;
};

const Stack = createNativeStackNavigator<ERPStackParamList>();

export default function ERPNavigator() {
  const { theme } = useTheme();
  const { schoolId } = useErpRole();

  return (
    <AcademicYearProvider schoolId={schoolId}>
    <Stack.Navigator
      initialRouteName="ERPMain"
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: theme.colors.cardBackground,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: theme.colors.text,
        },
        headerTintColor: theme.colors.text,
        headerBackTitleVisible: false,
        headerTopInsetEnabled: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="ERPMain" component={ERPMainScreen} />
      <Stack.Screen
        name="ERPDashboard"
        component={DashboardScreen}
        options={{ headerShown: true, title: 'ERP Dashboard' }}
      />
      <Stack.Screen
        name="ERPClassOverview"
        component={ClassOverviewScreen}
        options={{ headerShown: true, title: 'Class Overview' }}
      />
      <Stack.Screen
        name="ERPAcademicSetup"
        component={AcademicSetupScreen}
        options={{ headerShown: true, title: 'Academic Setup' }}
      />
      <Stack.Screen
        name="ERPAttendance"
        component={AttendanceScreen}
        options={{ headerShown: false, title: 'Attendance' }}
      />
      <Stack.Screen
        name="ERPNotices"
        component={NoticesScreen}
        options={{ headerShown: true, title: 'Notices' }}
      />
      <Stack.Screen
        name="ERPAdmissions"
        component={AdmissionsScreen}
        options={{ headerShown: true, title: 'Admissions' }}
      />
      <Stack.Screen
        name="ERPExams"
        component={ExamsScreen}
        options={{ headerShown: true, title: 'Exams' }}
      />
      <Stack.Screen
        name="ERPTimetable"
        component={TimetableScreen}
        options={{ headerShown: true, title: 'Timetable' }}
      />
      <Stack.Screen
        name="ERPFees"
        component={FeesScreen}
        options={{ headerShown: true, title: 'Fees' }}
      />
      <Stack.Screen
        name="ERPHR"
        component={HRScreen}
        options={{ headerShown: true, title: 'HR & Payroll' }}
      />
      <Stack.Screen
        name="ERPLibrary"
        component={LibraryScreen}
        options={{ headerShown: true, title: 'Library' }}
      />
      <Stack.Screen
        name="ERPTransport"
        component={TransportScreen}
        options={{ headerShown: true, title: 'Transport' }}
      />
      <Stack.Screen
        name="ERPHostel"
        component={HostelScreen}
        options={{ headerShown: true, title: 'Hostel' }}
      />
      <Stack.Screen
        name="ERPInventory"
        component={InventoryScreen}
        options={{ headerShown: true, title: 'Inventory' }}
      />
      <Stack.Screen
        name="ERPEngagement"
        component={EngagementScreen}
        options={{ headerShown: true, title: 'Engagement' }}
      />
      <Stack.Screen
        name="ERPSafety"
        component={SafetyScreen}
        options={{ headerShown: true, title: 'Safety & Security' }}
      />
      <Stack.Screen
        name="ERPParentPortal"
        component={ParentPortalScreen}
        options={{ headerShown: true, title: 'Parent Portal' }}
      />
      <Stack.Screen
        name="ERPHolidayCalendar"
        component={HolidayCalendarScreen}
        options={{ headerShown: true, title: 'Holiday Calendar' }}
      />
      <Stack.Screen
        name="ERPLMS"
        component={LMSScreen}
        options={{ headerShown: true, title: 'LMS' }}
      />
      <Stack.Screen
        name="ERPForms"
        component={FormsScreen}
        options={{ headerShown: true, title: 'Forms' }}
      />
      <Stack.Screen
        name="ERPBiometric"
        component={BiometricScreen}
        options={{ headerShown: true, title: 'Biometric' }}
      />
      <Stack.Screen
        name="ERPAnalytics"
        component={AnalyticsScreen}
        options={{ headerShown: true, title: 'Analytics' }}
      />
    </Stack.Navigator>
    </AcademicYearProvider>
  );
}
