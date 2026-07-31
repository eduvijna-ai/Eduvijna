/**
 * Attendance Details — daily log + monthly breakdown (live data).
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  TeacherScreen,
  StudentModuleHeader,
  SegmentedControl,
  SurfaceCard,
  SectionHeader,
  ProgressBar,
  StatusPill,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentAttendance, type AttStatusKey } from '../../../hooks/useStudentAttendance';
import type { StudentStackParamList } from '../../../types/navigation';

const TABS = [
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
];

const PILL: Record<AttStatusKey, PillStatus> = {
  present: 'present',
  absent: 'absent',
  late: 'late',
  leave: 'leave',
};

export default function AttendanceDetailsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<StudentStackParamList, 'AttendanceDetails'>>();
  const att = useStudentAttendance();
  const [tab, setTab] = useState(route.params?.mode === 'monthly' ? 'monthly' : 'daily');

  const monthly = useMemo(() => {
    const map = new Map<string, { present: number; total: number; label: string }>();
    att.dailyRows.forEach((r) => {
      const key = r.date.slice(0, 7);
      if (!key) return;
      const bucket = map.get(key) || {
        present: 0,
        total: 0,
        label: new Date(`${key}-01T12:00:00`).toLocaleDateString('en-IN', {
          month: 'long',
          year: 'numeric',
        }),
      };
      bucket.total += 1;
      if (r.status === 'present' || r.status === 'late') bucket.present += 1;
      map.set(key, bucket);
    });
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, v]) => ({
        ...v,
        percent: v.total ? Math.round((v.present / v.total) * 100) : 0,
      }));
  }, [att.dailyRows]);

  return (
    <TeacherScreen
      header={<StudentModuleHeader title="Attendance Details" />}
      contentStyle={styles.content}
      refreshing={att.status === 'loading'}
      onRefresh={() => void att.refetch()}
    >
      <SegmentedControl segments={TABS} activeKey={tab} onChange={setTab} />

      {tab === 'daily' ? (
        <View style={styles.section}>
          <SectionHeader title="Daily Log" icon="list-outline" />
          <SurfaceCard padded={false} style={styles.listCard}>
            {att.dailyRows.length === 0 ? (
              <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                No attendance records yet.
              </Text>
            ) : (
              att.dailyRows.map((day, index) => (
                <View
                  key={day.id}
                  style={[
                    styles.row,
                    index < att.dailyRows.length - 1 && {
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={[styles.dateBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Text style={[styles.dateDay, { color: theme.colors.textPrimary }]}>
                      {day.date.slice(8, 10) || '—'}
                    </Text>
                    <Text style={[styles.dateMonth, { color: theme.colors.textSecondary }]}>
                      {day.date.slice(5, 7)}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.weekday, { color: theme.colors.textPrimary }]}>
                      {day.subject}
                    </Text>
                    <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
                      {day.date} · {day.dayLabel}
                      {day.remarks !== '—' ? ` · ${day.remarks}` : ''}
                    </Text>
                  </View>
                  <StatusPill status={PILL[day.status]} />
                </View>
              ))
            )}
          </SurfaceCard>
        </View>
      ) : (
        <View style={styles.section}>
          <SectionHeader title="Monthly Breakdown" icon="calendar-outline" />
          <SurfaceCard style={styles.monthCard}>
            {monthly.length === 0 ? (
              <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                No monthly data in this range.
              </Text>
            ) : (
              monthly.map((m) => (
                <View key={m.label} style={styles.monthRow}>
                  <View style={styles.monthHead}>
                    <Text style={[styles.monthName, { color: theme.colors.textPrimary }]}>
                      {m.label}
                    </Text>
                    <Text style={[styles.monthPct, { color: theme.colors.textSecondary }]}>
                      {m.present}/{m.total} · {m.percent}%
                    </Text>
                  </View>
                  <ProgressBar
                    percent={m.percent}
                    height={8}
                    color={
                      m.percent >= 90
                        ? theme.colors.success
                        : m.percent >= att.minRequired
                          ? theme.colors.primary
                          : theme.colors.warning
                    }
                  />
                </View>
              ))
            )}
          </SurfaceCard>
          <SurfaceCard style={[styles.tipCard, { backgroundColor: theme.colors.tintTeal }]}>
            <Ionicons
              name={att.metrics.pct >= att.minRequired ? 'trending-up' : 'alert-circle'}
              size={18}
              color={
                att.metrics.pct >= att.minRequired ? theme.colors.success : theme.colors.danger
              }
            />
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Overall {att.metrics.pct}% vs required {att.minRequired}%. Present + late count as
              attended.
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
  dateBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  empty: { fontSize: 13, paddingVertical: 16, paddingHorizontal: 4 },
});
