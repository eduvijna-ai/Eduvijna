/**
 * StudentTabs — the persistent 5-item bottom tab bar for the Student persona.
 *
 * Isolated from the Teacher tabs and the host/ERP navigators: all route names
 * are Student*-prefixed (see StudentTabParamList) so there are no collisions.
 * Tabs: Dashboard · Subjects · Home (main app) · Timetable · More.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { APP_MAIN_TABS } from '@mobile/navigation/appRoutes';
import { navigateToAppMainTab } from '@mobile/navigation/navigateToAppMainTab';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import type { StudentTabParamList } from '../types/navigation';
import { STUDENT_TABS } from './studentRoutes';

import StudentHomeScreen from '../screens/student/dashboard/StudentHomeScreen';
import AcademicsScreen from '../screens/student/academics/AcademicsScreen';
import MainDashboardTabPlaceholder from '../screens/teacher/dashboard/MainDashboardTabPlaceholder';
import TimetableScreen from '../screens/student/timetable/TimetableScreen';
import MoreMenuScreen from '../screens/student/settings/MoreMenuScreen';

const Tab = createBottomTabNavigator<StudentTabParamList>();

const ICONS: Record<keyof StudentTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  StudentHome: { active: 'speedometer', inactive: 'speedometer-outline' },
  StudentAcademics: { active: 'school', inactive: 'school-outline' },
  StudentDashboard: { active: 'home', inactive: 'home-outline' },
  StudentTimetableTab: { active: 'time', inactive: 'time-outline' },
  StudentMore: { active: 'grid', inactive: 'grid-outline' },
};

export function StudentTabs() {
  const theme = useTeacherTheme();

  return (
    <Tab.Navigator
      initialRouteName={STUDENT_TABS.HOME}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icon = ICONS[route.name as keyof typeof ICONS];
          if (!icon) return null;
          return <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name={STUDENT_TABS.HOME} component={StudentHomeScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name={STUDENT_TABS.ACADEMICS} component={AcademicsScreen} options={{ title: 'Subjects' }} />
      <Tab.Screen
        name={STUDENT_TABS.DASHBOARD}
        component={MainDashboardTabPlaceholder}
        options={{ title: 'Home' }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            navigateToAppMainTab(APP_MAIN_TABS.DASHBOARD);
          },
        }}
      />
      <Tab.Screen
        name={STUDENT_TABS.TIMETABLE}
        component={TimetableScreen}
        options={{ title: 'Timetable' }}
      />
      <Tab.Screen name={STUDENT_TABS.MORE} component={MoreMenuScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}
