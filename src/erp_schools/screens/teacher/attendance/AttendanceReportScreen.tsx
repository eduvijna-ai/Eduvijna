/** Attendance Report — class attendance breakdown + low-attendance students. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  ClassContextBanner,
  SurfaceCard,
  DonutChart,
  ListItem,
  Badge,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { attendanceReportBuckets } from '../../../data';
import type { TeacherStackParamList } from '../../../types/navigation';

export default function AttendanceReportScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'AttendanceReport'>>();
  const { getClassById, getRoster } = useTeacherData();
  const classInfo = getClassById(route.params?.classId);
  const roster = getRoster(classInfo?.code ?? '8-A');
  const lowAttendance = [...roster].sort((a, b) => (a.attendancePercent ?? 0) - (b.attendancePercent ?? 0)).slice(0, 5);

  return (
    <TeacherScreen header={<ScreenHeader title="Attendance Report" trailingIcon="download-outline" />} contentStyle={styles.content}>
      {classInfo ? (
        <ClassContextBanner code={classInfo.code} name={classInfo.name} subject={classInfo.subject} room={classInfo.room} studentCount={classInfo.studentCount} />
      ) : null}

      <SurfaceCard>
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>This Month</Text>
        <View style={styles.row}>
          <DonutChart size={130} strokeWidth={16} centerValue="92%" centerLabel="Average"
            segments={[
              { value: 91, color: theme.colors.success },
              { value: 6, color: theme.colors.warning },
              { value: 3, color: theme.colors.danger },
            ]}
          />
          <View style={styles.legend}>
            {attendanceReportBuckets.map((bucket) => {
              const color = bucket.status === 'present' ? theme.colors.success : bucket.status === 'late' ? theme.colors.warning : theme.colors.danger;
              return (
                <View key={bucket.status} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>{bucket.label}</Text>
                  <Text style={[styles.legendValue, { color: theme.colors.textPrimary }]}>{bucket.count} ({bucket.percent}%)</Text>
                </View>
              );
            })}
          </View>
        </View>
      </SurfaceCard>

      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Needs Attention</Text>
      <SurfaceCard padded={false} style={styles.card}>
        {lowAttendance.map((student, index) => (
          <ListItem
            key={student.id}
            avatarName={student.name}
            title={student.name}
            subtitle={student.rollNo}
            divider={index < lowAttendance.length - 1}
            trailing={<Badge label={`${student.attendancePercent}%`} accent={(student.attendancePercent ?? 0) < 80 ? 'red' : 'orange'} />}
          />
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  legendLabel: { flex: 1, fontSize: 13 },
  legendValue: { fontSize: 13, fontWeight: '700' },
  card: { paddingHorizontal: 14 },
});
