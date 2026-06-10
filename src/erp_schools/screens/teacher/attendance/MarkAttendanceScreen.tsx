/**
 * Mark Attendance — per-class roster status marking.
 * Reference: assets/teachers_screens/teacher_students_attandance_marking_screen.png
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  ClassContextBanner,
  SurfaceCard,
  SearchBar,
  Avatar,
  PrimaryButton,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherData } from '../../../hooks/useTeacherData';
import type { TeacherStackParamList } from '../../../types/navigation';
import type { AttendanceStatus } from '../../../types/domain';

const STATUS_ORDER: AttendanceStatus[] = ['present', 'absent', 'late', 'leave'];

const STATUS_META: Record<AttendanceStatus, { label: string; icon: keyof typeof Ionicons.glyphMap; tone: 'success' | 'danger' | 'warning' | 'muted' }> = {
  present: { label: 'Present', icon: 'checkmark-circle', tone: 'success' },
  absent: { label: 'Absent', icon: 'close-circle', tone: 'danger' },
  late: { label: 'Late', icon: 'time', tone: 'warning' },
  leave: { label: 'Leave', icon: 'remove-circle', tone: 'muted' },
  half_day: { label: 'Half Day', icon: 'contrast', tone: 'muted' },
};

export default function MarkAttendanceScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'MarkAttendance'>>();
  const { getClassById, getRoster } = useTeacherData();
  const classInfo = getClassById(route.params?.classId);
  const roster = getRoster(classInfo?.code ?? '8-A');

  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(roster.map((s) => [s.id, s.attendanceStatus === 'half_day' ? 'present' : (s.attendanceStatus ?? 'present')])),
  );

  const toneColor = (tone: 'success' | 'danger' | 'warning' | 'muted'): string => {
    switch (tone) {
      case 'success': return theme.colors.success;
      case 'danger': return theme.colors.danger;
      case 'warning': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const counts = useMemo(() => {
    const base = { present: 0, absent: 0, late: 0, leave: 0 } as Record<AttendanceStatus, number>;
    Object.values(statuses).forEach((status) => { base[status] = (base[status] ?? 0) + 1; });
    return base;
  }, [statuses]);

  const filtered = useMemo(
    () => roster.filter((s) => `${s.name} ${s.rollNo}`.toLowerCase().includes(query.toLowerCase())),
    [roster, query],
  );

  const cycleStatus = (studentId: string) => {
    setStatuses((prev) => {
      const current = prev[studentId] ?? 'present';
      const next = STATUS_ORDER[(STATUS_ORDER.indexOf(current) + 1) % STATUS_ORDER.length];
      return { ...prev, [studentId]: next };
    });
  };

  const markAll = (status: AttendanceStatus) => {
    setStatuses(Object.fromEntries(roster.map((s) => [s.id, status])));
  };

  const summary = [
    { key: 'present', label: 'Present', value: counts.present, icon: 'checkmark-circle' as const, color: theme.colors.success },
    { key: 'absent', label: 'Absent', value: counts.absent, icon: 'close-circle' as const, color: theme.colors.danger },
    { key: 'late', label: 'Late', value: counts.late, icon: 'time' as const, color: theme.colors.warning },
    { key: 'leave', label: 'Leave', value: counts.leave, icon: 'remove-circle' as const, color: theme.colors.textSecondary },
  ];

  return (
    <TeacherScreen
      header={<ScreenHeader title="Mark Attendance" trailingIcon="ellipsis-horizontal" onTrailingPress={() => markAll('present')} />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Save Attendance" icon="save-outline" onPress={() => Alert.alert('Attendance saved', 'Attendance has been recorded (demo).')} />}
    >
      {classInfo ? (
        <ClassContextBanner
          code={classInfo.code}
          name={classInfo.name}
          subject={classInfo.subject}
          room={classInfo.room}
          timeLabel="09:20 AM – 10:05 AM"
        />
      ) : null}

      <SurfaceCard>
        <View style={styles.dateRow}>
          <View style={styles.dateLeft}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.dateText, { color: theme.colors.textPrimary }]}>Today, 12 May 2025</Text>
            <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Total Students</Text>
            <View style={[styles.totalPill, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={[styles.totalValue, { color: theme.colors.textPrimary }]}>{roster.length}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.summaryRow, { borderTopColor: theme.colors.border }]}>
          {summary.map((item) => (
            <View key={item.key} style={styles.summaryItem}>
              <Ionicons name={item.icon} size={20} color={item.color} />
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>{item.value}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <View style={styles.toolsRow}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search students…" />
        <TouchableOpacity style={[styles.toolBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]} accessibilityLabel="Filter">
          <Ionicons name="funnel-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.markAllBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]} onPress={() => markAll('present')} accessibilityLabel="Mark all present">
          <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark All</Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <SurfaceCard padded={false} style={styles.tableCard}>
        <View style={[styles.tableHead, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Text style={[styles.colIndex, styles.headText, { color: theme.colors.textSecondary }]}>#</Text>
          <Text style={[styles.headText, { color: theme.colors.textSecondary, flex: 1 }]}>Student Name</Text>
          <Text style={[styles.headText, { color: theme.colors.textSecondary }]}>Status</Text>
        </View>
        {filtered.map((student, index) => {
          const status = statuses[student.id] ?? 'present';
          const meta = STATUS_META[status];
          const color = toneColor(meta.tone);
          return (
            <View key={student.id} style={[styles.tableRow, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.colIndex, { color: theme.colors.textSecondary }]}>{index + 1}</Text>
              <View style={styles.studentCell}>
                <Avatar name={student.name} size={36} />
                <View>
                  <Text style={[styles.studentName, { color: theme.colors.textPrimary }]}>{student.name}</Text>
                  <Text style={[styles.studentRoll, { color: theme.colors.textSecondary }]}>{student.rollNo}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.statusPill, { backgroundColor: color + '22' }]}
                onPress={() => cycleStatus(student.id)}
                accessibilityRole="button"
                accessibilityLabel={`${student.name} status ${meta.label}, tap to change`}
              >
                <Ionicons name={meta.icon} size={14} color={color} />
                <Text style={[styles.statusText, { color }]}>{meta.label}</Text>
                <Ionicons name="chevron-down" size={12} color={color} />
              </TouchableOpacity>
            </View>
          );
        })}
      </SurfaceCard>

      <View style={styles.legend}>
        {summary.map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  dateLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 14, fontWeight: '700' },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalLabel: { fontSize: 12 },
  totalPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  totalValue: { fontSize: 13, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 11 },

  toolsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolBtn: { width: 46, height: 46, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 46, paddingHorizontal: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  markAllText: { fontSize: 13, fontWeight: '700' },

  tableCard: { overflow: 'hidden' },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
  headText: { fontSize: 12, fontWeight: '700' },
  colIndex: { width: 20, fontSize: 13 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  studentCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  studentName: { fontSize: 14, fontWeight: '600' },
  studentRoll: { fontSize: 11 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700' },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingVertical: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
});
