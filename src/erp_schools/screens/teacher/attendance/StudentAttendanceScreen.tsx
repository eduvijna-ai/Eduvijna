/**
 * Student Attendance — live current-week history for one student
 * (opened from Student Profile → Attendance History).
 */

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
  EmptyState,
  ScreenLoader,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherData } from '../../../hooks/useTeacherData';
import {
  useStudentAttendanceHistory,
  type StudentAttStatus,
} from '../../../hooks/useStudentAttendanceHistory';
import type { TeacherStackParamList } from '../../../types/navigation';

const STATUS_TO_PILL: Record<StudentAttStatus, PillStatus> = {
  present: 'present',
  absent: 'absent',
  late: 'late',
  half_day: 'half_day',
  excused: 'leave',
};

function formatRecordDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function StudentAttendanceScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'StudentAttendance'>>();
  const { status: rosterStatus } = useTeacherData();
  const { student, weekRange, records, summary, status, error, refetch } =
    useStudentAttendanceHistory(route.params?.studentId);

  const rosterLoading = rosterStatus === 'idle' || rosterStatus === 'loading';
  const attLoading = status === 'idle' || status === 'loading';

  const summaryItems = [
    { key: 'present', label: 'Present', value: summary.present, color: theme.colors.success },
    { key: 'absent', label: 'Absent', value: summary.absent, color: theme.colors.danger },
    { key: 'late', label: 'Late', value: summary.late, color: theme.colors.warning },
    {
      key: 'half',
      label: 'Half Day',
      value: summary.halfDay,
      color: theme.colors.textSecondary,
    },
  ];

  const classLabel = [student?.className || student?.classCode, student?.sectionName]
    .filter(Boolean)
    .join(' ');

  if (rosterLoading && !student) {
    return (
      <TeacherScreen header={<ScreenHeader title="Student Attendance" />}>
        <ScreenLoader message="Loading student…" />
      </TeacherScreen>
    );
  }

  if (!rosterLoading && !student) {
    return (
      <TeacherScreen header={<ScreenHeader title="Student Attendance" />}>
        <EmptyState
          icon="person-outline"
          title="Student not found"
          message="Go back and open Attendance History from a student profile."
        />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title="Student Attendance" />}
      contentStyle={styles.content}
      refreshing={status === 'loading'}
      onRefresh={() => void refetch()}
    >
      <SurfaceCard>
        <View style={styles.head}>
          <Avatar name={student?.name ?? 'Student'} uri={student?.avatarUrl} size={44} />
          <View style={styles.headInfo}>
            <Text style={[styles.name, { color: theme.colors.textPrimary }]}>
              {student?.name ?? 'Student'}
            </Text>
            <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>
              {student?.admissionNumber || student?.rollNo || '—'}
              {classLabel ? ` · ${classLabel}` : ''}
            </Text>
            <Text style={[styles.weekHint, { color: theme.colors.primary }]}>
              This week · {weekRange.label}
            </Text>
          </View>
        </View>
        {attLoading ? (
          <ScreenLoader message="Loading this week’s attendance…" fill={false} />
        ) : (
          <>
            <View style={[styles.summaryRow, { borderTopColor: theme.colors.border }]}>
              {summaryItems.map((item) => (
                <View key={item.key} style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
            {summary.percentage != null ? (
              <Text style={[styles.pctLine, { color: theme.colors.textSecondary }]}>
                Attendance this week: {summary.percentage}%
              </Text>
            ) : null}
          </>
        )}
      </SurfaceCard>

      {error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
        This Week’s Records
      </Text>

      {attLoading ? (
        <ScreenLoader message="Fetching records…" fill={false} />
      ) : records.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No attendance this week"
          message="No records found for this student in the current week."
        />
      ) : (
        <SurfaceCard padded={false} style={styles.card}>
          {records.map((mark, index) => (
            <ListItem
              key={mark.id}
              icon="calendar-outline"
              iconAccent="teal"
              title={formatRecordDate(mark.date)}
              subtitle={mark.subjectName || mark.remarks}
              divider={index < records.length - 1}
              trailing={<StatusPill status={STATUS_TO_PILL[mark.status]} />}
            />
          ))}
        </SurfaceCard>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 },
  headInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 1 },
  weekHint: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 11 },
  pctLine: { fontSize: 12, textAlign: 'center', marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  card: { paddingHorizontal: 14 },
});
