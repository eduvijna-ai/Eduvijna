/**
 * Attendance Details — full daily log + monthly breakdown.
 * Reference: assets/student_screens/student attendance screen.png (Daily/Monthly tabs)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  TeacherScreen,
  StudentIdentityHeader,
  SegmentedControl,
  SurfaceCard,
  SectionHeader,
  ProgressBar,
  StatusPill,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';
import type { StudentStackParamList } from '../../../types/navigation';
import type { StudentAttendanceStatus } from '../../../types/student';

const TABS = [
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
];

const PILL: Record<StudentAttendanceStatus, PillStatus> = {
  present: 'present',
  absent: 'absent',
  late: 'late',
  leave: 'leave',
};

const MONTHLY = [
  { month: 'April', percent: 88, present: 21, total: 24 },
  { month: 'March', percent: 88, present: 22, total: 25 },
  { month: 'February', percent: 92, present: 23, total: 25 },
  { month: 'January', percent: 87, present: 20, total: 23 },
];

export default function AttendanceDetailsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<StudentStackParamList, 'AttendanceDetails'>>();
  const { profile, attendance } = useStudentData();
  const [tab, setTab] = useState<string>(route.params?.mode ?? 'daily');

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Attendance Details"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
        />
      }
      contentStyle={styles.content}
    >
      <SegmentedControl segments={TABS} activeKey={tab} onChange={setTab} />

      {tab === 'daily' ? (
        <View style={styles.section}>
          <SectionHeader title="Daily Log" icon="list-outline" />
          <SurfaceCard padded={false} style={styles.listCard}>
            {attendance.recent.map((day, index) => (
              <View
                key={day.id}
                style={[
                  styles.row,
                  index < attendance.recent.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={[styles.dateBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <Text style={[styles.dateDay, { color: theme.colors.textPrimary }]}>{day.day}</Text>
                  <Text style={[styles.dateMonth, { color: theme.colors.textSecondary }]}>{day.month}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={[styles.weekday, { color: theme.colors.textPrimary }]}>{day.weekday}</Text>
                  {day.note ? <Text style={[styles.note, { color: theme.colors.textSecondary }]}>{day.note}</Text> : null}
                </View>
                <StatusPill status={PILL[day.status]} />
              </View>
            ))}
          </SurfaceCard>
        </View>
      ) : (
        <View style={styles.section}>
          <SectionHeader title="Monthly Breakdown" icon="calendar-outline" />
          <SurfaceCard style={styles.monthCard}>
            {MONTHLY.map((m) => (
              <View key={m.month} style={styles.monthRow}>
                <View style={styles.monthHead}>
                  <Text style={[styles.monthName, { color: theme.colors.textPrimary }]}>{m.month}</Text>
                  <Text style={[styles.monthPct, { color: theme.colors.textSecondary }]}>
                    {m.present}/{m.total} • {m.percent}%
                  </Text>
                </View>
                <ProgressBar
                  percent={m.percent}
                  height={8}
                  color={m.percent >= 90 ? theme.colors.success : m.percent >= 75 ? theme.colors.primary : theme.colors.warning}
                />
              </View>
            ))}
          </SurfaceCard>
          <SurfaceCard style={[styles.tipCard, { backgroundColor: theme.colors.tintGreen }]}>
            <Ionicons name="trending-up" size={18} color={theme.colors.success} />
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Your attendance is consistently above the 75% requirement. Keep it up!
            </Text>
          </SurfaceCard>
        </View>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  section: { gap: 0 },
  listCard: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dateBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 15, fontWeight: '700' },
  dateMonth: { fontSize: 10 },
  info: { flex: 1, gap: 2 },
  weekday: { fontSize: 14, fontWeight: '700' },
  note: { fontSize: 12 },
  monthCard: { gap: 16 },
  monthRow: { gap: 8 },
  monthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthName: { fontSize: 14, fontWeight: '700' },
  monthPct: { fontSize: 12, fontWeight: '600' },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
