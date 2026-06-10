/** Class Details — class banner, stats, quick actions and roster preview. */

import React from 'react';
import { View, StyleSheet } from 'react-native';
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
  type StatItem,
  type QuickAction,
} from '../../../components';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import type { TeacherStackParamList } from '../../../types/navigation';
import type { AttendanceStatus } from '../../../types/domain';

export default function ClassDetailsScreen() {
  const route = useRoute<RouteProp<TeacherStackParamList, 'ClassDetails'>>();
  const navigation = useTeacherNavigation();
  const { getClassById, getRoster } = useTeacherData();
  const classInfo = getClassById(route.params?.classId);
  const roster = getRoster(classInfo?.code ?? '8-A');
  const classId = classInfo?.id ?? route.params.classId;

  const stats: StatItem[] = [
    { key: 'students', icon: 'people-outline', value: classInfo?.studentCount ?? 0, label: 'Students', accent: 'blue' },
    { key: 'periods', icon: 'calendar-outline', value: classInfo?.periodsPerWeek ?? 0, label: 'Periods/Week', accent: 'green' },
    { key: 'attendance', icon: 'checkbox-outline', value: '92%', label: 'Avg Attendance', accent: 'orange' },
    { key: 'score', icon: 'ribbon-outline', value: '78%', label: 'Avg Score', accent: 'purple' },
  ];

  const actions: QuickAction[] = [
    { key: 'attendance', icon: 'checkbox-outline', label: 'Mark Attendance', accent: 'teal', onPress: () => navigation.navigate('MarkAttendance', { classId }) },
    { key: 'timetable', icon: 'time-outline', label: 'Timetable', accent: 'orange', onPress: () => navigation.navigate('Timetable', { classId: classInfo?.id }) },
    { key: 'grade', icon: 'ribbon-outline', label: 'Grade Students', accent: 'green', onPress: () => navigation.navigate('GradeStudents', { classId: classInfo?.id }) },
    { key: 'material', icon: 'book-outline', label: 'Study Material', accent: 'purple', onPress: () => navigation.navigate('StudyMaterial', { classId: classInfo?.id }) },
    { key: 'notice', icon: 'megaphone-outline', label: 'Notice Board', accent: 'pink', onPress: () => navigation.navigate('NoticeBoard', { classId: classInfo?.id }) },
    { key: 'parents', icon: 'chatbubbles-outline', label: 'Parents', accent: 'blue', onPress: () => navigation.navigate('ParentCommunication', { classId: classInfo?.id }) },
  ];

  const pillStatus = (status?: AttendanceStatus) => (status === 'half_day' ? 'leave' : (status ?? 'present'));

  return (
    <TeacherScreen header={<ScreenHeader title={classInfo?.name ?? 'Class Details'} trailingIcon="ellipsis-horizontal" />} contentStyle={styles.content}>
      {classInfo ? (
        <ClassContextBanner code={classInfo.code} name={classInfo.name} subject={classInfo.subject} room={classInfo.room} studentCount={classInfo.studentCount} />
      ) : null}

      <SurfaceCard>
        <StatGrid items={stats} columns={4} />
      </SurfaceCard>

      <QuickActionGrid actions={actions} columns={3} />

      <View style={styles.section}>
        <SectionHeader title="Students" actionLabel="View All" onAction={() => navigation.navigate('TeacherTabs', { screen: 'TeacherStudents' })} />
        <SurfaceCard padded={false} style={styles.card}>
          {roster.slice(0, 8).map((student, index) => (
            <ListItem
              key={student.id}
              avatarName={student.name}
              title={student.name}
              subtitle={student.rollNo}
              divider={index < 7}
              onPress={() => navigation.navigate('StudentProfile', { studentId: student.id })}
              trailing={<StatusPill status={pillStatus(student.attendanceStatus)} showIcon={false} />}
            />
          ))}
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  section: { gap: 0 },
  card: { paddingHorizontal: 14 },
});
