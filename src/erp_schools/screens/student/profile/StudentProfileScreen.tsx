/**
 * Student Profile — identity, KPIs, personal details and quick links.
 * screens.md "Student Profile" (also a bottom tab).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  ListItem,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentData } from '../../../hooks/useStudentData';

export default function StudentProfileScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const { profile } = useStudentData();

  const stats: StatItem[] = [
    { key: 'att', icon: 'calendar-outline', value: `${profile.attendancePercent}%`, label: 'Attendance', accent: 'teal' },
    { key: 'marks', icon: 'bar-chart-outline', value: `${profile.averageMarks}%`, label: 'Avg Marks', accent: 'green' },
    { key: 'rank', icon: 'podium-outline', value: `#${profile.classRank}`, label: 'Class Rank', accent: 'orange' },
  ];

  const details: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'calendar-clear-outline', label: 'Date of Birth', value: profile.dateOfBirth },
    { icon: 'water-outline', label: 'Blood Group', value: profile.bloodGroup },
    { icon: 'mail-outline', label: 'Email', value: profile.email },
    { icon: 'call-outline', label: 'Phone', value: profile.phone },
    { icon: 'people-outline', label: 'Guardian', value: profile.guardianName },
    { icon: 'location-outline', label: 'Address', value: profile.address },
  ];

  return (
    <TeacherScreen
      header={
        <StudentModuleHeader
          title="My Profile"
          showBack={false}
          trailingIcon="create-outline"
        />
      }
      contentStyle={styles.content}
    >
      <StatGrid items={stats} columns={3} variant="tinted" />

      <View style={styles.section}>
        <SectionHeader title="Personal Details" />
        <SurfaceCard style={styles.detailsCard}>
          {details.map((detail, index) => (
            <View
              key={detail.label}
              style={[
                styles.detailRow,
                index < details.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Ionicons name={detail.icon} size={18} color={theme.colors.primary} />
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{detail.label}</Text>
              <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]} numberOfLines={2}>{detail.value}</Text>
            </View>
          ))}
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Quick Links" />
        <SurfaceCard padded={false} style={styles.listCard}>
          <ListItem icon="calendar-outline" iconAccent="teal" title="Attendance" showChevron onPress={() => navigation.navigate('Attendance')} />
          <ListItem icon="bar-chart-outline" iconAccent="green" title="Marks Report" showChevron onPress={() => navigation.navigate('MarksReport')} />
          <ListItem icon="wallet-outline" iconAccent="orange" title="My Fees" showChevron onPress={() => navigation.navigate('FeeDashboard')} />
          <ListItem icon="settings-outline" iconAccent="blue" title="Settings" divider={false} showChevron onPress={() => navigation.navigate('StudentSettings')} />
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  section: { gap: 0 },
  detailsCard: { gap: 0 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  detailLabel: { width: 96, fontSize: 13 },
  detailValue: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  listCard: { paddingHorizontal: 14 },
});
