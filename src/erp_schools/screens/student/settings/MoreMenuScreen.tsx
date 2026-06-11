/** More — navigation hub for all student features + account actions. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@core/hooks/useAuth';
import {
  TeacherScreen,
  SurfaceCard,
  SectionHeader,
  ListItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useMainAppNavigation } from '../../../hooks/useMainAppNavigation';
import { useStudentData } from '../../../hooks/useStudentData';
import type { StudentStackParamList } from '../../../types/navigation';
import type { AccentKey } from '../../../theme/accents';

interface MenuLink {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: AccentKey;
  route: keyof StudentStackParamList;
}

interface MenuSection {
  title: string;
  links: MenuLink[];
}

const SECTIONS: MenuSection[] = [
  {
    title: 'Academics',
    links: [
      { label: 'Marks Report', icon: 'bar-chart-outline', accent: 'green', route: 'MarksReport' },
      { label: 'Progress Report', icon: 'trending-up-outline', accent: 'teal', route: 'ProgressReport' },
      { label: 'Exam Schedule', icon: 'calendar-number-outline', accent: 'blue', route: 'ExamSchedule' },
      { label: 'Exam Results', icon: 'ribbon-outline', accent: 'orange', route: 'ExamResults' },
      { label: 'Timetable', icon: 'time-outline', accent: 'purple', route: 'Timetable' },
    ],
  },
  {
    title: 'Activities',
    links: [
      { label: 'Library', icon: 'book-outline', accent: 'blue', route: 'Library' },
      { label: 'Events', icon: 'calendar-outline', accent: 'pink', route: 'Events' },
      { label: 'Fee Details', icon: 'wallet-outline', accent: 'green', route: 'FeeDashboard' },
    ],
  },
  {
    title: 'Learning',
    links: [
      { label: 'AI Tutor', icon: 'sparkles-outline', accent: 'purple', route: 'AITutor' },
      { label: 'AI Practice Test', icon: 'create-outline', accent: 'teal', route: 'AIPracticeTest' },
    ],
  },
];

export default function MoreMenuScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const { goToMainDashboard } = useMainAppNavigation();
  const { profile } = useStudentData();
  const auth = useAuth();

  return (
    <TeacherScreen contentStyle={styles.content}>
      <SurfaceCard onPress={() => navigation.navigate('StudentProfile')}>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>AK</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>{profile.name}</Text>
            <Text style={[styles.profileRole, { color: theme.colors.textSecondary }]}>{profile.className} • Roll No. {profile.rollNo}</Text>
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
                onPress={() => navigation.navigate(link.route as 'MarksReport')}
              />
            ))}
          </SurfaceCard>
        </View>
      ))}

      <View style={styles.section}>
        <SectionHeader title="Account" />
        <SurfaceCard padded={false} style={styles.menuCard}>
          <ListItem icon="notifications-outline" iconAccent="orange" title="Notifications" showChevron onPress={() => navigation.navigate('StudentNotifications')} />
          <ListItem icon="settings-outline" iconAccent="teal" title="Settings" showChevron onPress={() => navigation.navigate('StudentSettings')} />
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
