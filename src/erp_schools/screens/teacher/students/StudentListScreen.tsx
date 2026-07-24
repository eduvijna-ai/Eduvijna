/**
 * Students — Class Overview Students sub-view (web StudentsTab).
 * Columns / filters mirror web instructor roster.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  SurfaceCard,
  SearchBar,
  FilterChips,
  ListItem,
  EmptyState,
  ScreenLoader,
  StatGrid,
  type ChipOption,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';

export default function StudentListScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { classes, students, getOverviewKpis, refetch, status } = useTeacherData();
  const { selectedYear } = useAcademicYear();
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');

  const kpis = getOverviewKpis();
  const summary: StatItem[] = [
    { key: 'classes', icon: 'school-outline', value: kpis.classes, label: 'Classes', accent: 'green' },
    { key: 'students', icon: 'people-outline', value: kpis.students, label: 'Students', accent: 'blue' },
    { key: 'teachers', icon: 'person-outline', value: kpis.teachers, label: 'Teachers', accent: 'teal' },
  ];

  const classFilters: ChipOption[] = [
    { key: 'all', label: 'All Classes' },
    ...[...new Set(students.map((s) => s.className).filter(Boolean) as string[])]
      .sort()
      .map((name) => ({ key: name, label: name })),
  ];

  const sectionFilters: ChipOption[] = useMemo(() => {
    let rows = students;
    if (classFilter !== 'all') rows = rows.filter((s) => s.className === classFilter);
    const sections = [...new Set(rows.map((s) => s.sectionName).filter(Boolean) as string[])].sort();
    return [{ key: 'all', label: 'All Sections' }, ...sections.map((s) => ({ key: s, label: s }))];
  }, [students, classFilter]);

  const subjectFilters: ChipOption[] = useMemo(() => {
    const subjects = [
      ...new Set(
        students
          .filter((s) => classFilter === 'all' || s.className === classFilter)
          .map((s) => s.subjectName)
          .filter(Boolean) as string[],
      ),
    ].sort();
    return [{ key: 'all', label: 'All Subjects' }, ...subjects.map((s) => ({ key: s, label: s }))];
  }, [students, classFilter]);

  const genderFilters: ChipOption[] = useMemo(() => {
    const genders = [...new Set(students.map((s) => s.gender).filter(Boolean) as string[])].sort();
    return [{ key: 'all', label: 'All Genders' }, ...genders.map((g) => ({ key: g, label: g }))];
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter((student) => {
      const matchesQuery = `${student.name} ${student.rollNo} ${student.admissionNumber ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesClass = classFilter === 'all' || student.className === classFilter;
      const matchesSection = sectionFilter === 'all' || student.sectionName === sectionFilter;
      const matchesSubject = subjectFilter === 'all' || student.subjectName === subjectFilter;
      const matchesGender = genderFilter === 'all' || student.gender === genderFilter;
      return matchesQuery && matchesClass && matchesSection && matchesSubject && matchesGender;
    });
  }, [students, query, classFilter, sectionFilter, subjectFilter, genderFilter]);

  const yearLabel = selectedYear?.name?.replace(/Academic Year\s*/i, '') || '—';

  return (
    <TeacherScreen contentStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Class Overview</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Student roster with class and section filters
          </Text>
        </View>
        <View
          style={[
            styles.yearPill,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.yearLabel, { color: theme.colors.textSecondary }]}>Academic Year</Text>
          <Text style={[styles.yearValue, { color: theme.colors.textPrimary }]}>{yearLabel}</Text>
        </View>
      </View>

      <View style={styles.rail}>
        <TouchableOpacity
          style={[
            styles.railChip,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() => navigation.navigate('TeacherTabs', { screen: 'TeacherClasses' })}
        >
          <Text style={{ color: theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>
            Classes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.railChip,
            { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
          ]}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toolBtn,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
          onPress={() => void refetch()}
          accessibilityLabel="Refresh"
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={status === 'loading' ? theme.colors.primary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <SurfaceCard>
        <StatGrid items={summary} columns={3} />
      </SurfaceCard>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search name or admission no…"
      />
      <FilterChips
        options={classFilters}
        activeKey={classFilter}
        onChange={(key) => {
          setClassFilter(key);
          setSectionFilter('all');
          setSubjectFilter('all');
        }}
      />
      {sectionFilters.length > 1 ? (
        <FilterChips options={sectionFilters} activeKey={sectionFilter} onChange={setSectionFilter} />
      ) : null}
      {subjectFilters.length > 1 ? (
        <FilterChips options={subjectFilters} activeKey={subjectFilter} onChange={setSubjectFilter} />
      ) : null}
      {genderFilters.length > 1 ? (
        <FilterChips options={genderFilters} activeKey={genderFilter} onChange={setGenderFilter} />
      ) : null}

      <Text style={[styles.recordCount, { color: theme.colors.textSecondary }]}>
        {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
        {classes.length ? ` · ${classes.length} class assignment${classes.length !== 1 ? 's' : ''}` : ''}
      </Text>

      <SurfaceCard padded={false} style={styles.listCard}>
        {status === 'idle' || status === 'loading' ? (
          <ScreenLoader message="Loading students…" fill={false} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No students found"
            message="Try a different search or class filter."
          />
        ) : (
          filtered.map((student, index) => {
            const adm = student.admissionNumber || student.rollNo || '—';
            const gender = student.gender || '—';
            const cls = student.className || student.classCode || '—';
            const sec = student.sectionName || '—';
            const subj = student.subjectName || '—';
            return (
              <ListItem
                key={`${student.id}-${student.classId}-${student.sectionId}-${student.subjectName}-${index}`}
                avatarName={student.name}
                avatarUrl={student.avatarUrl}
                title={student.name}
                subtitle={`${adm}  ·  ${gender}  ·  ${cls} ${sec}${
                  student.subjectName ? `  ·  ${subj}` : ''
                }`}
                divider={index < filtered.length - 1}
                onPress={() => navigation.navigate('StudentProfile', { studentId: student.id })}
                trailing={
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('StudentProfile', {
                        studentId: student.id,
                        openEdit: true,
                      })
                    }
                    hitSlop={8}
                  >
                    <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '700' }}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                }
              />
            );
          })
        )}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleLeft: { flex: 1, paddingRight: 8 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  yearPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  yearLabel: { fontSize: 10 },
  yearValue: { fontSize: 13, fontWeight: '700' },
  rail: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  railChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toolBtn: {
    width: 40,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  recordCount: { fontSize: 12 },
  listCard: { paddingHorizontal: 14 },
});
