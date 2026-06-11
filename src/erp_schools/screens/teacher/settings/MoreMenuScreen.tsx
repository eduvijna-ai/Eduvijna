/** More — navigation hub for all teacher features + account actions. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
import type { TeacherStackParamList } from '../../../types/navigation';
import { teacherProfile } from '../../../data';

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
      { label: 'My Attendance', icon: 'finger-print-outline', accent: 'teal', route: 'MyAttendance' },
      { label: 'Attendance Calendar', icon: 'calendar-outline', accent: 'blue', route: 'AttendanceCalendar' },
      { label: 'Payroll & Leave', icon: 'wallet-outline', accent: 'green' },
    ] as MenuLink[],
  },
  {
    title: 'Academics',
    links: [
      { label: 'Assignments', icon: 'document-text-outline', accent: 'blue', route: 'AssignmentDashboard' },
      { label: 'Assessments', icon: 'ribbon-outline', accent: 'orange', route: 'AssessmentList' },
      { label: 'Study Material', icon: 'book-outline', accent: 'purple', route: 'StudyMaterial' },
      { label: 'Timetable', icon: 'time-outline', accent: 'green', route: 'Timetable' },
      { label: 'Reports', icon: 'bar-chart-outline', accent: 'red', route: 'ReportsDashboard' },
    ] as MenuLink[],
  },
  {
    title: 'Communication',
    links: [
      { label: 'Parent Communication', icon: 'chatbubbles-outline', accent: 'teal', route: 'ParentCommunication' },
      { label: 'Notice Board', icon: 'megaphone-outline', accent: 'pink', route: 'NoticeBoard' },
    ] as MenuLink[],
  },
  {
    title: 'Insights',
    links: [
      { label: 'AI Teacher Assistant', icon: 'sparkles-outline', accent: 'purple', route: 'AITeacherAssistant' },
      { label: 'Student Progress', icon: 'trending-up-outline', accent: 'green', route: 'StudentProgressAnalytics' },
    ] as MenuLink[],
  },
];

export default function MoreMenuScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const auth = useAuth();
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
      case 'ParentCommunication':
        navigation.navigate('ParentCommunication', {});
        break;
      case 'NoticeBoard':
        navigation.navigate('NoticeBoard', {});
        break;
      default:
        navigation.navigate(link.route as 'MyAttendance');
    }
  };

  return (
    <TeacherScreen contentStyle={styles.content}>
      <SurfaceCard onPress={() => navigation.navigate('Profile')}>
        <View style={styles.profileRow}>
          <Avatar name={teacherProfile.name} uri={teacherProfile.avatarUrl} size={56} />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>{teacherProfile.name}</Text>
            <Text style={[styles.profileRole, { color: theme.colors.textSecondary }]}>{teacherProfile.role} • {teacherProfile.employeeId}</Text>
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
                onPress={() => (link.label === 'Payroll & Leave' ? navigation.navigate('PayrollDashboard') : go(link))}
              />
            ))}
          </SurfaceCard>
        </View>
      ))}

      <View style={styles.section}>
        <SectionHeader title="Account" />
        <SurfaceCard padded={false} style={styles.menuCard}>
          <ListItem icon="notifications-outline" iconAccent="orange" title="Notifications" showChevron onPress={() => navigation.navigate('Notifications')} />
          <ListItem icon="settings-outline" iconAccent="teal" title="Settings" showChevron onPress={() => navigation.navigate('Settings')} />
          <ListItem
            icon="log-out-outline"
            iconAccent="red"
            title="Sign Out"
            divider={false}
            onPress={() => { void auth.logout(); }}
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
