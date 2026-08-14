/** More — navigation hub for all teacher features + account actions. */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@core/hooks/useAuth';
import {
  TeacherScreen,
  SurfaceCard,
  SectionHeader,
  ListItem,
  Avatar,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherStaffProfile } from '../../../hooks/useTeacherStaffProfile';
import type { TeacherStackParamList } from '../../../types/navigation';

interface MenuLink {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: 'teal' | 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'red';
  route: keyof TeacherStackParamList;
}

interface MenuSection {
  title: string;
  links: MenuLink[];
}

const SECTIONS: MenuSection[] = [
  {
    title: 'Attendance & Payroll',
    links: [
      { label: 'Student Attendance', icon: 'checkbox-outline', accent: 'teal', route: 'MarkAttendance' },
      { label: 'My Attendance', icon: 'finger-print-outline', accent: 'blue', route: 'MyAttendance' },
      { label: 'Attendance Calendar', icon: 'calendar-outline', accent: 'purple', route: 'AttendanceCalendar' },
      { label: 'Payroll & Leave', icon: 'wallet-outline', accent: 'green', route: 'PayrollDashboard' },
    ],
  },
  {
    title: 'Academics',
    links: [
      { label: 'Assignments', icon: 'document-text-outline', accent: 'blue', route: 'AssignmentDashboard' },
      { label: 'Assessments', icon: 'ribbon-outline', accent: 'orange', route: 'AssessmentList' },
      { label: 'Exams', icon: 'school-outline', accent: 'blue', route: 'Exams' },
      { label: 'Library', icon: 'library-outline', accent: 'purple', route: 'Library' },
      // Hidden until live APIs: Study Material
      { label: 'Timetable', icon: 'time-outline', accent: 'green', route: 'Timetable' },
      { label: 'Fee Management', icon: 'cash-outline', accent: 'red', route: 'TeacherFees' },
      { label: 'Reports', icon: 'bar-chart-outline', accent: 'red', route: 'ReportsDashboard' },
    ],
  },
  {
    title: 'Communication',
    links: [
      // Hidden until live APIs: Parent Communication
      { label: 'Notice Board', icon: 'megaphone-outline', accent: 'pink', route: 'NoticeBoard' },
    ],
  },
  {
    title: 'Insights',
    links: [
      { label: 'AI Teacher Assistant', icon: 'sparkles-outline', accent: 'purple', route: 'AITeacherAssistant' },
      { label: 'Student Progress', icon: 'trending-up-outline', accent: 'green', route: 'StudentProgressAnalytics' },
      { label: 'Engagement', icon: 'heart-outline', accent: 'pink', route: 'Engagement' },
      { label: 'Holidays', icon: 'calendar-outline', accent: 'orange', route: 'HolidayCalendar' },
    ],
  },
];

export default function MoreMenuScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const auth = useAuth();
  const { profile, status } = useTeacherStaffProfile();

  const go = (link: MenuLink) => {
    switch (link.route) {
      case 'StudyMaterial':
        navigation.navigate('StudyMaterial', {});
        break;
      case 'Timetable':
        navigation.navigate('Timetable', {});
        break;
      case 'AssessmentList':
        navigation.navigate('AssessmentList', {});
        break;
      case 'ResourceLibrary':
        navigation.navigate('ResourceLibrary');
        break;
      case 'Library':
        navigation.navigate('Library');
        break;
      case 'Engagement':
        navigation.navigate('Engagement');
        break;
      case 'Exams':
        navigation.navigate('Exams');
        break;
      case 'ParentCommunication':
        navigation.navigate('ParentCommunication', {});
        break;
      case 'NoticeBoard':
        navigation.navigate('NoticeBoard', {});
        break;
      case 'TeacherFees':
        navigation.navigate('TeacherFees');
        break;
      case 'TeacherAttendance':
        navigation.navigate('TeacherAttendance', {});
        break;
      case 'MarkAttendance':
        navigation.navigate('MarkAttendance', {});
        break;
      case 'MyAttendance':
        navigation.navigate('TeacherAttendance', { tab: 'my-attendance' });
        break;
      default:
        navigation.navigate(link.route as 'MyAttendance');
    }
  };

  const roleLine = [profile.role, profile.employeeId !== '—' ? profile.employeeId : null]
    .filter(Boolean)
    .join(' • ');

  return (
    <TeacherScreen contentStyle={styles.content}>
      <SurfaceCard onPress={() => navigation.navigate('Profile')}>
        <View style={styles.profileRow}>
          {status === 'loading' ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Avatar name={profile.name} uri={profile.avatarUrl} size={56} />
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>
              {profile.name}
            </Text>
            <Text style={[styles.profileRole, { color: theme.colors.textSecondary }]}>
              {roleLine || 'Instructor'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </View>
      </SurfaceCard>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <SectionHeader title={section.title} />
          <SurfaceCard padded={false} style={styles.menuCard}>
            {section.links.map((link, index) => (
              <ListItem
                key={link.label}
                icon={link.icon}
                iconAccent={link.accent}
                title={link.label}
                divider={index < section.links.length - 1}
                showChevron
                onPress={() =>
                  link.label === 'Payroll & Leave'
                    ? navigation.navigate('PayrollDashboard')
                    : go(link)
                }
              />
            ))}
          </SurfaceCard>
        </View>
      ))}

      <View style={styles.section}>
        <SectionHeader title="Account" />
        <SurfaceCard padded={false} style={styles.menuCard}>
          <ListItem
            icon="notifications-outline"
            iconAccent="orange"
            title="Notifications"
            showChevron
            onPress={() => navigation.navigate('Notifications')}
          />
          <ListItem
            icon="settings-outline"
            iconAccent="teal"
            title="Settings"
            showChevron
            onPress={() => navigation.navigate('Settings')}
          />
          <ListItem
            icon="log-out-outline"
            iconAccent="red"
            title="Sign Out"
            divider={false}
            onPress={() => {
              void auth.logout();
            }}
          />
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileRole: { fontSize: 13, marginTop: 2 },
  section: { gap: 0 },
  menuCard: { paddingHorizontal: 14 },
});
