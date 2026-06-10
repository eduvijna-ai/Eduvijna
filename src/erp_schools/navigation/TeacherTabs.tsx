/**
 * TeacherTabs — the persistent 5-item bottom tab bar for the Teacher persona.
 *
 * Isolated from the existing ERP/app navigators: all route names are
 * Teacher*-prefixed (see TeacherTabParamList) so there are no collisions.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { APP_MAIN_TABS } from '@mobile/navigation/appRoutes';
import { navigateToAppMainTab } from '@mobile/navigation/navigateToAppMainTab';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import type { TeacherTabParamList } from '../types/navigation';
import { TEACHER_TABS } from './routes';

import TeacherHomeScreen from '../screens/teacher/dashboard/TeacherHomeScreen';
import MyClassesScreen from '../screens/teacher/classes/MyClassesScreen';
import MainDashboardTabPlaceholder from '../screens/teacher/dashboard/MainDashboardTabPlaceholder';
import StudentListScreen from '../screens/teacher/students/StudentListScreen';
import MoreMenuScreen from '../screens/teacher/settings/MoreMenuScreen';

const Tab = createBottomTabNavigator<TeacherTabParamList>();

const ICONS: Record<keyof TeacherTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  TeacherHome: { active: 'home', inactive: 'home-outline' },
  TeacherClasses: { active: 'easel', inactive: 'easel-outline' },
  TeacherDashboard: { active: 'speedometer', inactive: 'speedometer-outline' },
  TeacherStudents: { active: 'people', inactive: 'people-outline' },
  TeacherMore: { active: 'grid', inactive: 'grid-outline' },
};

export function TeacherTabs() {
  const theme = useTeacherTheme();

  return (
    <Tab.Navigator
      initialRouteName={TEACHER_TABS.HOME}
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
          const icon = ICONS[route.name];
          return <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name={TEACHER_TABS.HOME} component={TeacherHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name={TEACHER_TABS.CLASSES} component={MyClassesScreen} options={{ title: 'Classes' }} />
      <Tab.Screen
        name={TEACHER_TABS.DASHBOARD}
        component={MainDashboardTabPlaceholder}
        options={{ title: 'Dashboard' }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            navigateToAppMainTab(APP_MAIN_TABS.DASHBOARD);
          },
        }}
      />
      <Tab.Screen name={TEACHER_TABS.STUDENTS} component={StudentListScreen} options={{ title: 'Students' }} />
      <Tab.Screen name={TEACHER_TABS.MORE} component={MoreMenuScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}
