/** Student List — searchable, class-filterable roster (Students tab). */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  TeacherTopBar,
  SurfaceCard,
  SearchBar,
  FilterChips,
  ListItem,
  StatusPill,
  EmptyState,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { teacherProfile, notifications } from '../../../data';
import type { AttendanceStatus } from '../../../types/domain';

export default function StudentListScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { classes, students } = useTeacherData();
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  const unread = notifications.filter((n) => !n.read).length;

  const filters: ChipOption[] = [
    { key: 'all', label: 'All Classes' },
    ...classes.map((c) => ({ key: c.code, label: c.name })),
  ];

  const filtered = useMemo(() => {
    return students.filter((student) => {
      const matchesQuery = `${student.name} ${student.rollNo}`.toLowerCase().includes(query.toLowerCase());
      const matchesClass = classFilter === 'all' || student.classCode === classFilter;
      return matchesQuery && matchesClass;
    });
  }, [students, query, classFilter]);

  const pillStatus = (status?: AttendanceStatus) => (status === 'half_day' ? 'leave' : (status ?? 'present'));

  return (
    <TeacherScreen
      header={
        <TeacherTopBar
          userName={teacherProfile.name}
          notificationCount={unread}
          onPressNotifications={() => navigation.navigate('Notifications')}
          onPressProfile={() => navigation.navigate('Profile')}
        />
      }
      contentStyle={styles.content}
    >
      <View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Students</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{filtered.length} students across your classes</Text>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search students…" />
      <FilterChips options={filters} activeKey={classFilter} onChange={setClassFilter} />

      <SurfaceCard padded={false} style={styles.listCard}>
        {filtered.length === 0 ? (
          <EmptyState icon="people-outline" title="No students found" message="Try a different search or class filter." />
        ) : (
          filtered.map((student, index) => (
            <ListItem
              key={student.id}
              avatarName={student.name}
              avatarUrl={student.avatarUrl}
              title={student.name}
              subtitle={`${student.rollNo}  •  Class ${student.classCode}`}
              divider={index < filtered.length - 1}
              onPress={() => navigation.navigate('StudentProfile', { studentId: student.id })}
              trailing={<StatusPill status={pillStatus(student.attendanceStatus)} showIcon={false} />}
            />
          ))
        )}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  listCard: { paddingHorizontal: 14 },
});
