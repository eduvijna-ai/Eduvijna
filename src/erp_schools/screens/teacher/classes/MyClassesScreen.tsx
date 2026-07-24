/**
 * My Classes — Class Overview Classes sub-view (web ClassOverviewTab).
 * Rail: Classes | Students only (My Profile lives under More → Profile).
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  SurfaceCard,
  StatGrid,
  SearchBar,
  InfoBanner,
  PrimaryButton,
  ScreenLoader,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors } from '../../../theme/accents';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import type { ClassInfo } from '../../../types/domain';

export default function MyClassesScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { classes, getOverviewKpis, refetch, status } = useTeacherData();
  const { selectedYear } = useAcademicYear();
  const [query, setQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  const kpis = useMemo(
    () =>
      getOverviewKpis({
        className: filterClass || undefined,
        sectionName: filterSection || undefined,
        subjectName: filterSubject || undefined,
      }),
    [getOverviewKpis, filterClass, filterSection, filterSubject],
  );

  // Web Class Overview KPITiles: Classes / Students / Teachers
  const summary: StatItem[] = [
    { key: 'classes', icon: 'school-outline', value: kpis.classes, label: 'Classes', accent: 'green' },
    { key: 'students', icon: 'people-outline', value: kpis.students, label: 'Students', accent: 'blue' },
    { key: 'teachers', icon: 'person-outline', value: kpis.teachers, label: 'Teachers', accent: 'teal' },
  ];

  const classOptions = useMemo(
    () =>
      [...new Set(classes.map((c) => c.className).filter(Boolean) as string[])].sort(),
    [classes],
  );
  const sectionOptions = useMemo(() => {
    let rows = classes;
    if (filterClass) rows = rows.filter((c) => c.className === filterClass);
    return [...new Set(rows.map((c) => c.sectionName).filter(Boolean) as string[])].sort();
  }, [classes, filterClass]);
  const subjectOptions = useMemo(() => {
    let rows = classes;
    if (filterClass) rows = rows.filter((c) => c.className === filterClass);
    if (filterSection) rows = rows.filter((c) => c.sectionName === filterSection);
    return [...new Set(rows.map((c) => c.subject).filter(Boolean))].sort();
  }, [classes, filterClass, filterSection]);

  const filtered = useMemo(() => {
    let rows = classes;
    if (filterClass) rows = rows.filter((c) => c.className === filterClass);
    if (filterSection) rows = rows.filter((c) => c.sectionName === filterSection);
    if (filterSubject) rows = rows.filter((c) => c.subject === filterSubject);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) =>
        `${c.className ?? ''} ${c.sectionName ?? ''} ${c.subject} ${c.teacherName ?? ''} ${c.classTeacherName ?? ''}`
          .toLowerCase()
          .includes(q),
      );
    }
    return [...rows].sort((a, b) => {
      const cmp =
        (a.className ?? '').localeCompare(b.className ?? '') ||
        (a.sectionName ?? '').localeCompare(b.sectionName ?? '') ||
        a.subject.localeCompare(b.subject);
      return sortAsc ? cmp : -cmp;
    });
  }, [classes, filterClass, filterSection, filterSubject, query, sortAsc]);

  const yearLabel = selectedYear?.name?.replace(/Academic Year\s*/i, '') || '—';
  const hasFilters = Boolean(filterClass || filterSection || filterSubject);

  return (
    <TeacherScreen contentStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Class Overview</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Class, section, subject, and teacher assignments
          </Text>
        </View>
        <View
          style={[
            styles.yearPill,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.yearLabel, { color: theme.colors.textSecondary }]}>
            Academic Year
          </Text>
          <Text style={[styles.yearValue, { color: theme.colors.textPrimary }]}>{yearLabel}</Text>
        </View>
      </View>

      <View style={styles.rail}>
        <TouchableOpacity
          style={[
            styles.railChip,
            {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.primary,
            },
          ]}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Classes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.railChip,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() => navigation.navigate('TeacherTabs', { screen: 'TeacherStudents' })}
        >
          <Text style={{ color: theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>
            Students
          </Text>
        </TouchableOpacity>
      </View>

      <SurfaceCard>
        <StatGrid items={summary} columns={3} />
      </SurfaceCard>

      <View style={styles.toolsRow}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search classes…" />
        <TouchableOpacity
          style={[
            styles.toolBtn,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
          accessibilityLabel="Filter"
          onPress={() => setFiltersOpen(true)}
        >
          <Ionicons
            name="funnel-outline"
            size={18}
            color={hasFilters ? theme.colors.primary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortBtn,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
          accessibilityLabel="Sort"
          onPress={() => setSortAsc((v) => !v)}
        >
          <Ionicons name="swap-vertical-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.sortText, { color: theme.colors.textSecondary }]}>Sort</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toolBtn,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
          accessibilityLabel="Refresh"
          onPress={() => void refetch()}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={status === 'loading' ? theme.colors.primary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {hasFilters ? (
        <View style={styles.activeFilters}>
          {filterClass ? <Chip label={`Class: ${filterClass}`} onClear={() => setFilterClass('')} /> : null}
          {filterSection ? (
            <Chip label={`Section: ${filterSection}`} onClear={() => setFilterSection('')} />
          ) : null}
          {filterSubject ? (
            <Chip label={`Subject: ${filterSubject}`} onClear={() => setFilterSubject('')} />
          ) : null}
          <TouchableOpacity
            onPress={() => {
              setFilterClass('');
              setFilterSection('');
              setFilterSubject('');
            }}
          >
            <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '600' }}>
              Clear filters
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={[styles.recordCount, { color: theme.colors.textSecondary }]}>
        {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
      </Text>

      {status === 'idle' || status === 'loading' ? (
        <ScreenLoader message="Loading classes…" fill={false} />
      ) : (
        filtered.map((classInfo, index) => (
        <ClassCard
          key={`${classInfo.classId ?? classInfo.id}-${classInfo.sectionId ?? 'x'}-${classInfo.subjectId ?? classInfo.subject}-${index}`}
          classInfo={classInfo}
          onOpen={() => navigation.navigate('ClassDetails', { classId: classInfo.id })}
          onStudents={() => navigation.navigate('TeacherTabs', { screen: 'TeacherStudents' })}
          onAttendance={() => navigation.navigate('MarkAttendance', { classId: classInfo.id })}
          onTimetable={() => navigation.navigate('Timetable', { classId: classInfo.id })}
        />
        ))
      )}

      <SurfaceCard style={styles.requestCard}>
        <View style={styles.requestRow}>
          <View style={[styles.requestIcon, { backgroundColor: theme.colors.tintTeal }]}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.requestText}>
            <Text style={[styles.requestTitle, { color: theme.colors.textPrimary }]}>
              Need to add or request a class?
            </Text>
            <Text style={[styles.requestSub, { color: theme.colors.textSecondary }]}>
              Contact your admin to get a new class assigned.
            </Text>
          </View>
          <PrimaryButton
            label="Request Class"
            variant="outline"
            onPress={() => undefined}
            style={styles.requestBtn}
          />
        </View>
      </SurfaceCard>

      <InfoBanner
        tone="tip"
        text="Tap a class to view details, students, attendance and timetable."
      />

      <Modal visible={filtersOpen} transparent animationType="fade" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFiltersOpen(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              Filter by class / section / subject
            </Text>
            <FilterSelect label="Class" value={filterClass} options={classOptions} onChange={setFilterClass} />
            <FilterSelect
              label="Section"
              value={filterSection}
              options={sectionOptions}
              onChange={setFilterSection}
            />
            <FilterSelect
              label="Subject"
              value={filterSubject}
              options={subjectOptions}
              onChange={setFilterSubject}
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                label="Clear"
                variant="outline"
                onPress={() => {
                  setFilterClass('');
                  setFilterSection('');
                  setFilterSubject('');
                }}
                style={{ flex: 1 }}
              />
              <PrimaryButton label="Apply" onPress={() => setFiltersOpen(false)} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </TeacherScreen>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  const theme = useTeacherTheme();
  return (
    <TouchableOpacity
      onPress={onClear}
      style={[styles.chip, { backgroundColor: theme.colors.tintTeal, borderColor: theme.colors.primary }]}
    >
      <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '600' }}>{label} ×</Text>
    </TouchableOpacity>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.filterBlock}>
      <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              borderColor: !value ? theme.colors.primary : theme.colors.border,
              backgroundColor: !value ? theme.colors.tintTeal : theme.colors.background,
            },
          ]}
          onPress={() => onChange('')}
        >
          <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '600' }}>All</Text>
        </TouchableOpacity>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.filterChip,
                {
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                  backgroundColor: active ? theme.colors.tintTeal : theme.colors.background,
                },
              ]}
              onPress={() => onChange(opt)}
            >
              <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
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
  const classLabel = classInfo.className || classInfo.name;
  const sectionLabel = classInfo.sectionName || '—';

  const footerActions = [
    {
      key: 'students',
      icon: 'people-outline' as const,
      label: 'View Students',
      onPress: onStudents,
      color: theme.colors.success,
    },
    {
      key: 'attendance',
      icon: 'checkbox-outline' as const,
      label: 'Mark Attendance',
      onPress: onAttendance,
      color: theme.colors.info,
    },
    {
      key: 'timetable',
      icon: 'calendar-outline' as const,
      label: 'Class Timetable',
      onPress: onTimetable,
      color: theme.colors.onTintPurple,
    },
  ];

  return (
    <SurfaceCard padded={false} style={styles.classCard}>
      <TouchableOpacity style={styles.classTop} onPress={onOpen} activeOpacity={0.8}>
        <View style={[styles.classBadge, { backgroundColor: accent.bg }]}>
          <Text style={[styles.classBadgeText, { color: accent.fg }]} numberOfLines={2}>
            {classInfo.code}
          </Text>
        </View>
        <View style={styles.classInfo}>
          <Text style={[styles.className, { color: theme.colors.textPrimary }]}>
            {classLabel}
            {classInfo.sectionName ? ` · ${classInfo.sectionName}` : ''}
          </Text>
          {/* Web table columns: Class / Section / Subject / Teacher / Class Teacher */}
          <Text style={[styles.classMeta, { color: theme.colors.textSecondary }]}>
            Subject: {classInfo.subject || '—'}
          </Text>
          <Text style={[styles.classMeta, { color: theme.colors.textSecondary }]}>
            Teacher: {classInfo.teacherName || '—'}
          </Text>
          <Text
            style={[
              styles.classMeta,
              {
                color: classInfo.classTeacherName
                  ? theme.colors.success
                  : theme.colors.textSecondary,
                fontWeight: classInfo.classTeacherName ? '600' : '400',
              },
            ]}
          >
            Class teacher: {classInfo.classTeacherName || '—'}
          </Text>
          <Text style={[styles.classMeta, { color: theme.colors.textSecondary }]}>
            Section: {sectionLabel} · {classInfo.studentCount} students
            {classInfo.periodsPerWeek > 0 ? ` · ${classInfo.periodsPerWeek} periods/wk` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <View style={[styles.classFooter, { borderTopColor: theme.colors.border }]}>
        {footerActions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={styles.footerAction}
            onPress={action.onPress}
            accessibilityLabel={action.label}
          >
            <Ionicons name={action.icon} size={15} color={action.color} />
            <Text
              style={[styles.footerText, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
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
  rail: { flexDirection: 'row', gap: 8 },
  railChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toolsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolBtn: {
    width: 42,
    height: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sortText: { fontSize: 13, fontWeight: '600' },
  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recordCount: { fontSize: 12, marginTop: -4 },
  classCard: { overflow: 'hidden' },
  classTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  classBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  classBadgeText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  classInfo: { flex: 1, gap: 2 },
  className: { fontSize: 15, fontWeight: '700' },
  classMeta: { fontSize: 12 },
  classFooter: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  footerAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
  },
  footerText: { fontSize: 11, fontWeight: '500' },
  requestCard: {},
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestText: { flex: 1 },
  requestTitle: { fontSize: 13, fontWeight: '700' },
  requestSub: { fontSize: 11, marginTop: 2 },
  requestBtn: { height: 40, paddingHorizontal: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 12,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  filterBlock: { gap: 8 },
  filterLabel: { fontSize: 12, fontWeight: '600' },
  filterChips: { gap: 8, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
