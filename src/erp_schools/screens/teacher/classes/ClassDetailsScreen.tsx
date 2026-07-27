/**
 * Class Details — live banner, stats, actions, and roster for one class.
 * Avg attendance / score from APIs (not hardcoded mock %).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  ClassContextBanner,
  SurfaceCard,
  StatGrid,
  SectionHeader,
  QuickActionGrid,
  ListItem,
  StatusPill,
  EmptyState,
  ScreenLoader,
  type StatItem,
  type QuickAction,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useClassDetails } from '../../../hooks/useClassDetails';
import type { TeacherStackParamList } from '../../../types/navigation';
import type { AttendanceStatus } from '../../../types/domain';

const pillStatus = (status: AttendanceStatus | null): PillStatus | null => {
  if (!status) return null;
  if (status === 'half_day') return 'half_day';
  if (status === 'leave') return 'leave';
  return status;
};

export default function ClassDetailsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'ClassDetails'>>();
  const navigation = useTeacherNavigation();
  const {
    classInfo,
    roster,
    studentCount,
    periodsPerWeek,
    avgAttendance,
    avgScore,
    status,
    rosterStatus,
    error,
    refetch,
  } = useClassDetails(route.params?.classId);

  const bootLoading =
    rosterStatus === 'idle' ||
    rosterStatus === 'loading' ||
    status === 'idle' ||
    status === 'loading';

  const classId = classInfo?.id ?? route.params?.classId;

  const stats: StatItem[] = [
    {
      key: 'students',
      icon: 'people-outline',
      value: bootLoading ? '…' : studentCount,
      label: 'Students',
      accent: 'blue',
    },
    {
      key: 'periods',
      icon: 'calendar-outline',
      value: bootLoading ? '…' : periodsPerWeek,
      label: 'Periods/Week',
      accent: 'green',
    },
    {
      key: 'attendance',
      icon: 'checkbox-outline',
      value: bootLoading
        ? '…'
        : avgAttendance != null
          ? `${avgAttendance}%`
          : '—',
      label: 'Avg Attendance',
      accent: 'orange',
    },
    {
      key: 'score',
      icon: 'ribbon-outline',
      value: bootLoading ? '…' : avgScore != null ? `${avgScore}%` : '—',
      label: 'Avg Score',
      accent: 'purple',
    },
  ];

  const actions: QuickAction[] = [
    {
      key: 'attendance',
      icon: 'checkbox-outline',
      label: 'Mark Attendance',
      accent: 'teal',
      onPress: () => navigation.navigate('MarkAttendance', { classId }),
    },
    {
      key: 'timetable',
      icon: 'time-outline',
      label: 'Timetable',
      accent: 'orange',
      onPress: () => navigation.navigate('Timetable', { classId }),
    },
    // Hidden until live APIs: Grade Students, Study Material, Parents
    {
      key: 'notice',
      icon: 'megaphone-outline',
      label: 'Notice Board',
      accent: 'pink',
      onPress: () => navigation.navigate('NoticeBoard', { classId }),
    },
  ];

  if ((rosterStatus === 'idle' || rosterStatus === 'loading') && !classInfo) {
    return (
      <TeacherScreen header={<ScreenHeader title="Class Details" />}>
        <ScreenLoader message="Loading class…" />
      </TeacherScreen>
    );
  }

  if (!classInfo && rosterStatus === 'ready') {
    return (
      <TeacherScreen header={<ScreenHeader title="Class Details" />}>
        <EmptyState
          icon="school-outline"
          title="Class not found"
          message="Go back and pick a class from Class Overview."
        />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title={classInfo?.name ?? 'Class Details'}
          trailingIcon="ellipsis-horizontal"
        />
      }
      contentStyle={styles.content}
      refreshing={status === 'loading'}
      onRefresh={() => void refetch()}
    >
      {classInfo ? (
        <ClassContextBanner
          code={classInfo.code}
          name={classInfo.name}
          subject={classInfo.subject}
          room={classInfo.room}
          studentCount={studentCount}
        />
      ) : null}

      <SurfaceCard>
        <StatGrid items={stats} columns={4} />
      </SurfaceCard>

      {error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text>
      ) : null}

      <QuickActionGrid actions={actions} columns={3} />

      <View style={styles.section}>
        <SectionHeader
          title="Students"
          actionLabel="View All"
          onAction={() =>
            navigation.navigate('TeacherTabs', { screen: 'TeacherStudents' })
          }
        />
        {bootLoading ? (
          <ScreenLoader message="Loading students…" fill={false} />
        ) : roster.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No students"
            message="No students assigned to this class yet."
          />
        ) : (
          <SurfaceCard padded={false} style={styles.card}>
            {roster.slice(0, 8).map((student, index) => {
              const pill = pillStatus(student.todayStatus);
              return (
                <ListItem
                  key={student.id}
                  avatarName={student.name}
                  title={student.name}
                  subtitle={student.admissionNumber || student.rollNo}
                  divider={index < Math.min(roster.length, 8) - 1}
                  onPress={() =>
                    navigation.navigate('StudentProfile', { studentId: student.id })
                  }
                  trailing={
                    pill ? (
                      <StatusPill status={pill} showIcon={false} />
                    ) : (
                      <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>
                        Not marked
                      </Text>
                    )
                  }
                />
              );
            })}
          </SurfaceCard>
        )}
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  section: { gap: 0 },
  card: { paddingHorizontal: 14 },
});
