/**
 * My Classes — assigned class list with summary + per-class actions.
 * Reference: assets/teachers_screens/teachers_classes_screen.png
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  SurfaceCard,
  StatGrid,
  SearchBar,
  InfoBanner,
  PrimaryButton,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors } from '../../../theme/accents';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import type { ClassInfo } from '../../../types/domain';

export default function MyClassesScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { classes, classesSummary } = useTeacherData();
  const [query, setQuery] = useState('');

  const summary: StatItem[] = [
    { key: 'assigned', icon: 'people-outline', value: classesSummary.classesAssigned, label: 'Classes Assigned', accent: 'green' },
    { key: 'students', icon: 'person-outline', value: classesSummary.totalStudents, label: 'Total Students', accent: 'blue' },
    { key: 'subjects', icon: 'book-outline', value: classesSummary.subjectsTeaching, label: 'Subjects Teaching', accent: 'purple' },
    { key: 'periods', icon: 'calendar-outline', value: classesSummary.weeklyPeriods, label: 'Weekly Periods', accent: 'orange' },
  ];

  const filtered = useMemo(
    () => classes.filter((c) => `${c.name} ${c.subject} ${c.room}`.toLowerCase().includes(query.toLowerCase())),
    [classes, query],
  );

  return (
    <TeacherScreen contentStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>My Classes</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Manage and view your assigned classes</Text>
        </View>
        <View style={[styles.yearPill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.yearLabel, { color: theme.colors.textSecondary }]}>Academic Year</Text>
          <Text style={[styles.yearValue, { color: theme.colors.textPrimary }]}>2024 – 25</Text>
        </View>
      </View>

      <SurfaceCard>
        <StatGrid items={summary} columns={4} />
      </SurfaceCard>

      <View style={styles.toolsRow}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search classes…" />
        <TouchableOpacity style={[styles.toolBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]} accessibilityLabel="Filter">
          <Ionicons name="funnel-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sortBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]} accessibilityLabel="Sort">
          <Ionicons name="swap-vertical-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.sortText, { color: theme.colors.textSecondary }]}>Sort</Text>
        </TouchableOpacity>
      </View>

      {filtered.map((classInfo) => (
        <ClassCard key={classInfo.id} classInfo={classInfo} onOpen={() => navigation.navigate('ClassDetails', { classId: classInfo.id })} onStudents={() => navigation.navigate('ClassDetails', { classId: classInfo.id })} onAttendance={() => navigation.navigate('MarkAttendance', { classId: classInfo.id })} onTimetable={() => navigation.navigate('Timetable', { classId: classInfo.id })} />
      ))}

      <SurfaceCard style={styles.requestCard}>
        <View style={styles.requestRow}>
          <View style={[styles.requestIcon, { backgroundColor: theme.colors.tintTeal }]}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.requestText}>
            <Text style={[styles.requestTitle, { color: theme.colors.textPrimary }]}>Need to add or request a class?</Text>
            <Text style={[styles.requestSub, { color: theme.colors.textSecondary }]}>Contact your admin to get a new class assigned.</Text>
          </View>
          <PrimaryButton label="Request Class" variant="outline" onPress={() => undefined} style={styles.requestBtn} />
        </View>
      </SurfaceCard>

      <InfoBanner tone="tip" text="Tap a class to view details, students, attendance and timetable." />
    </TeacherScreen>
  );
}

function ClassCard({
  classInfo,
  onOpen,
  onStudents,
  onAttendance,
  onTimetable,
}: {
  classInfo: ClassInfo;
  onOpen: () => void;
  onStudents: () => void;
  onAttendance: () => void;
  onTimetable: () => void;
}) {
  const theme = useTeacherTheme();
  const accent = accentColors(theme.colors, classInfo.accent);

  const footerActions = [
    { key: 'students', icon: 'people-outline' as const, label: 'View Students', onPress: onStudents, color: theme.colors.success },
    { key: 'attendance', icon: 'checkbox-outline' as const, label: 'Mark Attendance', onPress: onAttendance, color: theme.colors.info },
    { key: 'timetable', icon: 'calendar-outline' as const, label: 'Class Timetable', onPress: onTimetable, color: theme.colors.onTintPurple },
  ];

  return (
    <SurfaceCard padded={false} style={styles.classCard}>
      <TouchableOpacity style={styles.classTop} onPress={onOpen} activeOpacity={0.8}>
        <View style={[styles.classBadge, { backgroundColor: accent.bg }]}>
          <Text style={[styles.classBadgeText, { color: accent.fg }]}>{classInfo.code}</Text>
        </View>
        <View style={styles.classInfo}>
          <Text style={[styles.className, { color: theme.colors.textPrimary }]}>{classInfo.name}</Text>
          <Text style={[styles.classMeta, { color: theme.colors.textSecondary }]}>{classInfo.subject}</Text>
          <Text style={[styles.classMeta, { color: theme.colors.textSecondary }]}>{classInfo.room}</Text>
        </View>
        <View style={styles.classStats}>
          <View style={styles.classStat}>
            <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.classStatValue, { color: theme.colors.textPrimary }]}>{classInfo.studentCount}</Text>
            <Text style={[styles.classStatLabel, { color: theme.colors.textSecondary }]}>Students</Text>
          </View>
          <View style={styles.classStat}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.classStatValue, { color: theme.colors.textPrimary }]}>{classInfo.periodsPerWeek}</Text>
            <Text style={[styles.classStatLabel, { color: theme.colors.textSecondary }]}>Periods/Week</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <View style={[styles.classFooter, { borderTopColor: theme.colors.border }]}>
        {footerActions.map((action) => (
          <TouchableOpacity key={action.key} style={styles.footerAction} onPress={action.onPress} accessibilityLabel={action.label}>
            <Ionicons name={action.icon} size={15} color={action.color} />
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleLeft: { flex: 1 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  yearPill: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  yearLabel: { fontSize: 10 },
  yearValue: { fontSize: 13, fontWeight: '700' },

  toolsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolBtn: { width: 46, height: 46, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 46, paddingHorizontal: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  sortText: { fontSize: 13, fontWeight: '600' },

  classCard: { overflow: 'hidden' },
  classTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  classBadge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  classBadgeText: { fontSize: 14, fontWeight: '800' },
  classInfo: { flex: 1, gap: 1 },
  className: { fontSize: 15, fontWeight: '700' },
  classMeta: { fontSize: 12 },
  classStats: { flexDirection: 'row', gap: 14 },
  classStat: { alignItems: 'center' },
  classStatValue: { fontSize: 14, fontWeight: '700' },
  classStatLabel: { fontSize: 9 },
  classFooter: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  footerAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11 },
  footerText: { fontSize: 11, fontWeight: '500' },

  requestCard: {},
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  requestText: { flex: 1 },
  requestTitle: { fontSize: 13, fontWeight: '700' },
  requestSub: { fontSize: 11, marginTop: 2 },
  requestBtn: { height: 40, paddingHorizontal: 12 },
});
