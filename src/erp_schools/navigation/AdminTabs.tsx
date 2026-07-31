/**
 * AdminTabs — the persistent 5-item bottom tab bar for the Admin persona.
 *
 * Isolated from the Teacher/Student tabs and the host/ERP navigators: all route
 * names are Admin*-prefixed (see AdminTabParamList) so there are no collisions.
 * Tabs: Dashboard · Attendance · Home (main app escape) · Finance · More.
 *
 * People hub removed from tabs (still fixture/mock) — live Class Overview /
 * Student & Teacher flows remain under More / stack.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { APP_MAIN_TABS } from '@mobile/navigation/appRoutes';
import { navigateToAppMainTab } from '@mobile/navigation/navigateToAppMainTab';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import type { AdminTabParamList } from '../types/navigation';
import { ADMIN_TABS } from './adminRoutes';

import AdminHomeScreen from '../screens/admin/dashboard/AdminHomeScreen';
import TeacherAttendanceScreen from '../screens/teacher/attendance/TeacherAttendanceScreen';
import MainDashboardTabPlaceholder from '../screens/teacher/dashboard/MainDashboardTabPlaceholder';
import FinanceDashboardScreen from '../screens/admin/finance/FinanceDashboardScreen';
import MoreMenuScreen from '../screens/admin/settings/MoreMenuScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();

function AdminAttendanceTab() {
  return <TeacherAttendanceScreen role="admin" showBack={false} />;
}

const ICONS: Record<
  keyof AdminTabParamList,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  AdminHome: { active: 'speedometer', inactive: 'speedometer-outline' },
  AdminAttendance: { active: 'checkbox', inactive: 'checkbox-outline' },
  AdminMainDashboard: { active: 'home', inactive: 'home-outline' },
  AdminFinance: { active: 'wallet', inactive: 'wallet-outline' },
  AdminMore: { active: 'grid', inactive: 'grid-outline' },
};

export function AdminTabs() {
  const theme = useTeacherTheme();

  return (
    <Tab.Navigator
      initialRouteName={ADMIN_TABS.HOME}
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
          return (
            <Ionicons
              name={focused ? icon.active : icon.inactive}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name={ADMIN_TABS.HOME}
        component={AdminHomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name={ADMIN_TABS.ATTENDANCE}
        component={AdminAttendanceTab}
        options={{ title: 'Attendance' }}
      />
      <Tab.Screen
        name={ADMIN_TABS.DASHBOARD}
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
        name={ADMIN_TABS.FINANCE}
        component={FinanceDashboardScreen}
        options={{ title: 'Finance' }}
      />
      <Tab.Screen
        name={ADMIN_TABS.MORE}
        component={MoreMenuScreen}
        options={{ title: 'More' }}
      />
    </Tab.Navigator>
  );
}
