/** More — navigation hub for all admin modules + account actions. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@core/hooks/useAuth';
import { TeacherScreen, SurfaceCard, SectionHeader, ListItem } from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useMainAppNavigation } from '../../../hooks/useMainAppNavigation';
import { useAdminData } from '../../../hooks/useAdminData';
import type { AdminStackParamList } from '../../../types/navigation';
import type { AccentKey } from '../../../theme/accents';

interface MenuLink {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: AccentKey;
  route: keyof AdminStackParamList;
}

interface MenuSection {
  title: string;
  links: MenuLink[];
}

const SECTIONS: MenuSection[] = [
  {
    title: 'Academic',
    links: [
      { label: 'Academic Overview', icon: 'school-outline', accent: 'teal', route: 'AcademicOverview' },
      { label: 'Classes', icon: 'easel-outline', accent: 'blue', route: 'Classes' },
      { label: 'Exams', icon: 'clipboard-outline', accent: 'orange', route: 'Exams' },
      { label: 'Academic Reports', icon: 'bar-chart-outline', accent: 'purple', route: 'AcademicReports' },
    ],
  },
  {
    title: 'Admissions',
    links: [
      { label: 'Admissions Dashboard', icon: 'person-add-outline', accent: 'green', route: 'AdmissionsDashboard' },
      { label: 'Admission Applications', icon: 'document-text-outline', accent: 'teal', route: 'AdmissionApplications' },
      { label: 'Approval Workflow', icon: 'checkmark-done-outline', accent: 'blue', route: 'ApprovalWorkflow' },
    ],
  },
  {
    title: 'Operations',
    links: [
      { label: 'Attendance Dashboard', icon: 'stats-chart-outline', accent: 'teal', route: 'AttendanceDashboard' },
      { label: 'Library Dashboard', icon: 'library-outline', accent: 'orange', route: 'LibraryDashboard' },
      { label: 'Book Management', icon: 'book-outline', accent: 'blue', route: 'BookManagement' },
      { label: 'Transport Dashboard', icon: 'bus-outline', accent: 'green', route: 'TransportDashboard' },
      { label: 'Vehicle Management', icon: 'car-outline', accent: 'purple', route: 'VehicleManagement' },
      { label: 'Route Management', icon: 'map-outline', accent: 'pink', route: 'RouteManagement' },
      { label: 'Hostel Dashboard', icon: 'bed-outline', accent: 'orange', route: 'HostelDashboard' },
      { label: 'Inventory Dashboard', icon: 'cube-outline', accent: 'teal', route: 'InventoryDashboard' },
    ],
  },
  {
    title: 'Insights',
    links: [
      { label: 'School Overview', icon: 'business-outline', accent: 'teal', route: 'SchoolOverview' },
      { label: 'Reports Dashboard', icon: 'document-text-outline', accent: 'blue', route: 'ReportsDashboard' },
      { label: 'Announcements', icon: 'megaphone-outline', accent: 'pink', route: 'Announcements' },
    ],
  },
];

export default function MoreMenuScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const { goToMainDashboard } = useMainAppNavigation();
  const { profile } = useAdminData();
  const auth = useAuth();

  const initials = profile.name.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <TeacherScreen contentStyle={styles.content}>
      <SurfaceCard onPress={() => navigation.navigate('AdminProfile')}>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>{profile.name}</Text>
            <Text style={[styles.profileRole, { color: theme.colors.textSecondary }]}>{profile.role}</Text>
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
                onPress={() => navigation.navigate(link.route as 'AcademicOverview')}
              />
            ))}
          </SurfaceCard>
        </View>
      ))}

      <View style={styles.section}>
        <SectionHeader title="Account" />
        <SurfaceCard padded={false} style={styles.menuCard}>
          <ListItem icon="notifications-outline" iconAccent="orange" title="Notifications" showChevron onPress={() => navigation.navigate('AdminNotifications')} />
          <ListItem icon="settings-outline" iconAccent="teal" title="Settings" showChevron onPress={() => navigation.navigate('AdminSettings')} />
          <ListItem icon="home-outline" iconAccent="blue" title="Switch to App Home" showChevron onPress={goToMainDashboard} />
          <ListItem icon="log-out-outline" iconAccent="red" title="Sign Out" divider={false} onPress={() => { void auth.logout(); }} />
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileRole: { fontSize: 13, marginTop: 2 },
  section: { gap: 0 },
  menuCard: { paddingHorizontal: 14 },
});
