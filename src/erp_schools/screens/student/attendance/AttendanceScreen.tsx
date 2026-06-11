/**
 * Attendance — overview buckets, trend and recent days with section tabs.
 * Reference: assets/student_screens/student attendance screen.png
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentIdentityHeader,
  SegmentedControl,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  BarChart,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentData } from '../../../hooks/useStudentData';
import type { StudentAttendanceStatus } from '../../../types/student';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'term', label: 'Term Wise' },
];

const STATUS_META: Record<StudentAttendanceStatus, { icon: keyof typeof Ionicons.glyphMap; color: 'success' | 'danger' | 'warning' | 'primary' }> = {
  present: { icon: 'checkmark-circle', color: 'success' },
  absent: { icon: 'close-circle', color: 'danger' },
  late: { icon: 'time', color: 'warning' },
  leave: { icon: 'remove-circle', color: 'primary' },
};

export default function AttendanceScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const { profile, attendance } = useStudentData();
  const [tab, setTab] = useState('overview');

  const buckets: StatItem[] = attendance.buckets.map((bucket) => ({
    key: bucket.key,
    icon: bucket.icon as StatItem['icon'],
    value: bucket.value,
    label: `${bucket.label}\n${bucket.sublabel}`,
    accent: bucket.accent,
  }));

  const trend = attendance.trend.map((point) => ({ label: point.label, value: point.percent }));
  const recent = tab === 'overview' ? attendance.recent.slice(0, 4) : attendance.recent;

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Attendance"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
          trailingIcon="calendar-outline"
          rightSlot={
            <View style={[styles.kpiBox, { backgroundColor: theme.colors.tintTeal }]}>
              <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>{attendance.overallPercent}%</Text>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Overall{'\n'}Attendance</Text>
            </View>
          }
        />
      }
      contentStyle={styles.content}
    >
      <SegmentedControl segments={TABS} activeKey={tab} onChange={setTab} />

      <SurfaceCard>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Attendance Overview</Text>
          <View style={[styles.rangePill, { borderColor: theme.colors.border }]}>
            <Text style={[styles.rangeText, { color: theme.colors.textSecondary }]}>This Term</Text>
            <Ionicons name="chevron-down" size={13} color={theme.colors.textSecondary} />
          </View>
        </View>
        <StatGrid items={buckets} columns={4} variant="tinted" />
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Attendance Trend" />
        <SurfaceCard>
          <BarChart data={trend} barColor={theme.colors.primary} />
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Recent Attendance"
          actionLabel={tab === 'overview' ? 'View All' : undefined}
          onAction={tab === 'overview' ? () => navigation.navigate('AttendanceDetails', { mode: 'daily' }) : undefined}
        />
        <SurfaceCard padded={false} style={styles.listCard}>
          {recent.map((day, index) => {
            const meta = STATUS_META[day.status];
            const color = meta.color === 'primary' ? theme.colors.primary : theme.colors[meta.color];
            return (
              <View
                key={day.id}
                style={[
                  styles.dayRow,
                  index < recent.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={[styles.dateBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <Text style={[styles.dateDay, { color: theme.colors.textPrimary }]}>{day.day}</Text>
                  <Text style={[styles.dateMonth, { color: theme.colors.textSecondary }]}>{day.month}</Text>
                </View>
                <Ionicons name={meta.icon} size={22} color={color} />
                <View style={styles.dayInfo}>
                  <Text style={[styles.dayStatus, { color: theme.colors.textPrimary }]}>
                    {day.status.charAt(0).toUpperCase() + day.status.slice(1)}
                  </Text>
                  <Text style={[styles.dayWeekday, { color: theme.colors.textSecondary }]}>
                    {day.weekday}{day.note ? ` • ${day.note}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
              </View>
            );
          })}
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  kpiBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  kpiValue: { fontSize: 17, fontWeight: '800' },
  kpiLabel: { fontSize: 10, textAlign: 'center', marginTop: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  rangePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  rangeText: { fontSize: 12, fontWeight: '600' },
  section: { gap: 0 },
  listCard: { paddingHorizontal: 14 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dateBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 15, fontWeight: '700' },
  dateMonth: { fontSize: 10 },
  dayInfo: { flex: 1, gap: 2 },
  dayStatus: { fontSize: 14, fontWeight: '700' },
  dayWeekday: { fontSize: 12 },
});
