/** Student Attendance — per-student attendance summary + recent records. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  ListItem,
  StatusPill,
  Avatar,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { selfCalendarMarks } from '../../../data';
import type { TeacherStackParamList } from '../../../types/navigation';
import type { SelfAttendanceStatus } from '../../../types/domain';

const STATUS_TO_PILL: Record<SelfAttendanceStatus, 'present' | 'absent' | 'late' | 'half_day'> = {
  present: 'present',
  absent: 'absent',
  late: 'late',
  half_day: 'half_day',
};

export default function StudentAttendanceScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'StudentAttendance'>>();
  const { getStudentById } = useTeacherData();
  const student = getStudentById(route.params?.studentId);

  const summary = [
    { key: 'present', label: 'Present', value: 8, color: theme.colors.success },
    { key: 'absent', label: 'Absent', value: 1, color: theme.colors.danger },
    { key: 'late', label: 'Late', value: 1, color: theme.colors.warning },
    { key: 'half', label: 'Half Day', value: 1, color: theme.colors.textSecondary },
  ];

  return (
    <TeacherScreen header={<ScreenHeader title="Student Attendance" />} contentStyle={styles.content}>
      <SurfaceCard>
        <View style={styles.head}>
          <Avatar name={student?.name ?? 'Student'} size={44} />
          <View style={styles.headInfo}>
            <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{student?.name}</Text>
            <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>{student?.rollNo} • Class {student?.classCode}</Text>
          </View>
        </View>
        <View style={[styles.summaryRow, { borderTopColor: theme.colors.border }]}>
          {summary.map((item) => (
            <View key={item.key} style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Recent Records</Text>
      <SurfaceCard padded={false} style={styles.card}>
        {[...selfCalendarMarks].reverse().map((mark, index) => (
          <ListItem
            key={mark.date}
            icon="calendar-outline"
            iconAccent="teal"
            title={new Date(mark.date).toDateString()}
            divider={index < selfCalendarMarks.length - 1}
            trailing={<StatusPill status={STATUS_TO_PILL[mark.status]} />}
          />
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 },
  headInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 11 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  card: { paddingHorizontal: 14 },
});
