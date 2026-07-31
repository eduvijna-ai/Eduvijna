/**
 * Class Overview — admin school-wide Class Management (web ClassOverviewTab).
 * Tabs: Classes | Students | Teachers | My Profile
 * Classes / Students mirror teacher Class Overview; Teachers is admin-only.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staffProfilesApi, studentProfilesApi } from '@core/api/erp.api';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  StatGrid,
  SearchBar,
  FilterChips,
  EmptyState,
  ScreenLoader,
  PrimaryButton,
  InfoBanner,
  Avatar,
  type ChipOption,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors, type AccentKey } from '../../../theme/accents';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useAdminClassOverviewData } from '../../../hooks/useAdminClassOverviewData';
import { useSchoolsSession } from '../../../hooks/useSchoolsSession';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import type { AdminStackParamList } from '../../../types/navigation';
import type { ClassInfo, StudentInfo } from '../../../types/domain';
import { extractErrorMessage } from '../../../utils/apiHelpers';
import {
  apaarDigitsOnly,
  formatApaarId,
  isValidApaarId,
  normalizeApaarId,
} from '../../../utils/apaarId';
import StaffSelfServiceView from '../../shared/StaffSelfServiceView';

type SubTab = 'classes' | 'students' | 'teachers' | 'my_profile';
type StaffCategory = 'teaching' | 'non_teaching';

const TAB_META: Record<SubTab, { label: string; subtitle: string }> = {
  classes: {
    label: 'Classes',
    subtitle: 'Class, section, subject, and teacher assignments.',
  },
  students: {
    label: 'Students',
    subtitle: 'Student roster with class and section filters.',
  },
  teachers: {
    label: 'Teachers',
    subtitle: 'Teaching staff directory and assignments.',
  },
  my_profile: {
    label: 'My Profile',
    subtitle: 'Your staff profile and self-service details.',
  },
};

export default function ClassesScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const route = useRoute<RouteProp<AdminStackParamList, 'Classes'>>();
  const { selectedYear } = useAcademicYear();
  const data = useAdminClassOverviewData();
  const initialTab = route.params?.initialTab;
  const [tab, setTab] = useState<SubTab>(
    initialTab === 'students' || initialTab === 'teachers' || initialTab === 'classes'
      ? initialTab
      : 'classes',
  );
  const [kpiFilters, setKpiFilters] = useState<{
    className?: string;
    sectionName?: string;
    subjectName?: string;
  }>({});
  const onKpiFiltersChange = useCallback(
    (f: { className?: string; sectionName?: string; subjectName?: string }) => {
      setKpiFilters(f);
    },
    [],
  );

  const yearLabel = selectedYear?.name?.replace(/Academic Year\s*/i, '') || '—';
  const kpis = data.getOverviewKpis(tab === 'classes' ? kpiFilters : undefined);
  const summary: StatItem[] = [
    { key: 'classes', icon: 'school-outline', value: kpis.classes, label: 'Classes', accent: 'green' },
    { key: 'students', icon: 'people-outline', value: kpis.students, label: 'Students', accent: 'blue' },
    { key: 'teachers', icon: 'person-outline', value: kpis.teachers, label: 'Teachers', accent: 'teal' },
  ];

  return (
    <TeacherScreen
      header={<ScreenHeader title="Class Overview" showBack />}
      contentStyle={styles.content}
      refreshing={data.refreshing}
      onRefresh={() => void data.refetch()}
    >
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Class Management</Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Class Overview</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {TAB_META[tab].subtitle}
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

      {!data.hasAcademicYear ? (
        <InfoBanner
          text="Select an academic year to load class overview data."
        />
      ) : null}

      <SurfaceCard>
        <StatGrid items={summary} columns={3} />
      </SurfaceCard>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {(Object.keys(TAB_META) as SubTab[]).map((key) => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.railChip,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setTab(key)}
            >
              <Text
                style={{
                  color: active ? '#fff' : theme.colors.textSecondary,
                  fontWeight: '700',
                  fontSize: 12,
                }}
              >
                {TAB_META[key].label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[
            styles.toolBtn,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
          onPress={() => void data.refetch()}
          accessibilityLabel="Refresh"
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={data.status === 'loading' ? theme.colors.primary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </ScrollView>

      {data.status === 'idle' || data.status === 'loading' ? (
        <ScreenLoader message="Loading class overview…" fill={false} />
      ) : data.error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn’t load class overview"
          message={data.error}
          ctaLabel="Retry"
          onCtaPress={() => void data.refetch()}
        />
      ) : tab === 'classes' ? (
        <ClassesTab
          classes={data.classes}
          onFiltersChange={onKpiFiltersChange}
          onStudentsTab={() => setTab('students')}
          onAttendance={() => navigation.navigate('AttendanceDashboard')}
        />
      ) : tab === 'students' ? (
        <StudentsTab
          students={data.students}
          classesCount={data.classes.length}
          onRefetch={data.refetch}
        />
      ) : tab === 'teachers' ? (
        <TeachersTab
          teaching={data.teachingStaff}
          nonTeaching={data.nonTeachingStaff}
          classRows={data.classes}
          onRefetch={data.refetch}
        />
      ) : (
        <MyProfileTab classRows={data.classes} />
      )}
    </TeacherScreen>
  );
}

/* ─── Classes tab ─────────────────────────────────────────────────────────── */

function ClassesTab({
  classes,
  onFiltersChange,
  onStudentsTab,
  onAttendance,
}: {
  classes: ClassInfo[];
  onFiltersChange: (f: {
    className?: string;
    sectionName?: string;
    subjectName?: string;
  }) => void;
  onStudentsTab: () => void;
  onAttendance: () => void;
}) {
  const theme = useTeacherTheme();
  const [query, setQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    onFiltersChange({
      className: filterClass || undefined,
      sectionName: filterSection || undefined,
      subjectName: filterSubject || undefined,
    });
  }, [filterClass, filterSection, filterSubject, onFiltersChange]);

  const classOptions = useMemo(
    () => [...new Set(classes.map((c) => c.className).filter(Boolean) as string[])].sort(),
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

  const hasFilters = Boolean(filterClass || filterSection || filterSubject);

  return (
    <View style={styles.tabBody}>
      <View style={styles.toolsRow}>
        <View style={styles.searchFlex}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search classes…" />
        </View>
        <TouchableOpacity
          style={[
            styles.toolBtn,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
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
          onPress={() => setSortAsc((v) => !v)}
        >
          <Ionicons name="swap-vertical-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.sortText, { color: theme.colors.textSecondary }]}>Sort</Text>
        </TouchableOpacity>
      </View>

      {hasFilters ? (
        <View style={styles.activeFilters}>
          {filterClass ? (
            <FilterChip label={`Class: ${filterClass}`} onClear={() => setFilterClass('')} />
          ) : null}
          {filterSection ? (
            <FilterChip label={`Section: ${filterSection}`} onClear={() => setFilterSection('')} />
          ) : null}
          {filterSubject ? (
            <FilterChip label={`Subject: ${filterSubject}`} onClear={() => setFilterSubject('')} />
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

      {filtered.length === 0 ? (
        <EmptyState
          icon="easel-outline"
          title="No class assignments"
          message="Try a different filter or academic year."
        />
      ) : (
        filtered.map((classInfo, index) => (
          <ClassCard
            key={`${classInfo.classId ?? classInfo.id}-${classInfo.sectionId ?? 'x'}-${classInfo.subjectId ?? classInfo.subject}-${index}`}
            classInfo={classInfo}
            onStudents={onStudentsTab}
            onAttendance={onAttendance}
          />
        ))
      )}

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
    </View>
  );
}

function ClassCard({
  classInfo,
  onStudents,
  onAttendance,
}: {
  classInfo: ClassInfo;
  onStudents: () => void;
  onAttendance: () => void;
}) {
  const theme = useTeacherTheme();
  const accent = accentColors(theme.colors, classInfo.accent);
  const classLabel = classInfo.className || classInfo.name;

  return (
    <SurfaceCard padded={false} style={styles.classCard}>
      <View style={styles.classTop}>
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
            {classInfo.studentCount} students
            {classInfo.periodsPerWeek > 0 ? ` · ${classInfo.periodsPerWeek} periods/wk` : ''}
          </Text>
        </View>
      </View>
      <View style={[styles.classFooter, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.footerAction} onPress={onStudents}>
          <Ionicons name="people-outline" size={15} color={theme.colors.success} />
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerAction} onPress={onAttendance}>
          <Ionicons name="checkbox-outline" size={15} color={theme.colors.info} />
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>Attendance</Text>
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

/* ─── Students tab ────────────────────────────────────────────────────────── */

function StudentsTab({
  students,
  classesCount,
  onRefetch,
}: {
  students: ReturnType<typeof useAdminClassOverviewData>['students'];
  classesCount: number;
  onRefetch: () => void | Promise<void>;
}) {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const { schoolId } = useSchoolsSession();
  const { selectedYearId } = useAcademicYear();
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [apaarId, setApaarId] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [city, setCity] = useState('');

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

  const filtered = useMemo(
    () =>
      students.filter((student) => {
        const matchesQuery = `${student.name} ${student.rollNo} ${student.admissionNumber ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesClass = classFilter === 'all' || student.className === classFilter;
        const matchesSection = sectionFilter === 'all' || student.sectionName === sectionFilter;
        const matchesSubject = subjectFilter === 'all' || student.subjectName === subjectFilter;
        const matchesGender = genderFilter === 'all' || student.gender === genderFilter;
        return matchesQuery && matchesClass && matchesSection && matchesSubject && matchesGender;
      }),
    [students, query, classFilter, sectionFilter, subjectFilter, genderFilter],
  );

  const openProfile = (student: StudentInfo, openEdit = false) => {
    navigation.navigate('AdminStudentProfile', { studentId: student.id, openEdit });
  };

  const resetCreateForm = () => {
    setUserId('');
    setAdmissionNumber('');
    setApaarId('');
    setDob('');
    setGender('');
    setBloodGroup('');
    setCity('');
  };

  const openCreate = () => {
    resetCreateForm();
    setShowCreate(true);
  };

  const handleCreate = async () => {
    const uid = Number(userId.trim());
    if (!userId.trim() || Number.isNaN(uid) || uid <= 0) {
      Alert.alert('Required', 'User ID is required');
      return;
    }
    if (apaarId && !isValidApaarId(apaarId)) {
      Alert.alert('Invalid APAAR ID', 'APAAR ID must be exactly 12 digits (XXXX-XXXX-XXXX)');
      return;
    }
    if (schoolId == null) {
      Alert.alert('Error', 'School not selected');
      return;
    }
    setSaving(true);
    try {
      await studentProfilesApi.create(
        {
          user_id: uid,
          school_id: schoolId,
          admission_number: admissionNumber.trim() || undefined,
          apaar_id: normalizeApaarId(apaarId) || undefined,
          date_of_birth: dob.trim() || undefined,
          gender: gender || undefined,
          blood_group: bloodGroup.trim() || undefined,
          city: city.trim() || undefined,
        },
        selectedYearId ?? undefined,
      );
      setShowCreate(false);
      resetCreateForm();
      await onRefetch();
      Alert.alert('Saved', 'Student profile created.');
    } catch (e) {
      Alert.alert('Save failed', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.tabBody}>
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

      <View style={styles.studentsHeader}>
        <Text style={[styles.recordCount, { color: theme.colors.textSecondary }]}>
          {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
          {classesCount ? ` · ${classesCount} assignments` : ''}
        </Text>
        <PrimaryButton
          label="+ New Student"
          size="compact"
          onPress={openCreate}
        />
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No students found"
          message="Try a different search or class filter."
        />
      ) : (
        filtered.map((student, index) => {
          const adm = student.admissionNumber || student.rollNo || '—';
          const genderLabel = student.gender || '';
          const cls = student.className || student.classCode || '—';
          const sec = student.sectionName || '';
          const classLabel = [cls, sec].filter(Boolean).join(' ');
          const genderAccent: AccentKey =
            genderLabel.toLowerCase() === 'female'
              ? 'pink'
              : genderLabel.toLowerCase() === 'male'
                ? 'blue'
                : 'teal';
          const accents: AccentKey[] = ['teal', 'blue', 'green', 'orange', 'purple', 'pink'];
          const cardAccent = accents[index % accents.length];
          const tint = accentColors(theme.colors, cardAccent);

          return (
            <SurfaceCard
              key={`${student.id}-${student.classId}-${student.sectionId}-${index}`}
              padded={false}
              style={styles.studentCard}
            >
              <TouchableOpacity
                style={styles.studentCardBody}
                onPress={() => openProfile(student)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Open profile for ${student.name}`}
              >
                <View style={[styles.studentAccentBar, { backgroundColor: tint.fg }]} />
                <View style={styles.studentCardInner}>
                  <Avatar name={student.name} uri={student.avatarUrl} size={52} accent={cardAccent} />
                  <View style={styles.studentInfo}>
                    <Text style={[styles.studentName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {student.name}
                    </Text>
                    <Text style={[styles.studentAdm, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      Adm · {adm}
                    </Text>
                    <View style={styles.studentChips}>
                      {genderLabel ? (
                        <View
                          style={[
                            styles.miniChip,
                            { backgroundColor: accentColors(theme.colors, genderAccent).bg },
                          ]}
                        >
                          <Text
                            style={{
                              color: accentColors(theme.colors, genderAccent).fg,
                              fontSize: 10,
                              fontWeight: '700',
                            }}
                          >
                            {genderLabel}
                          </Text>
                        </View>
                      ) : null}
                      <View style={[styles.miniChip, { backgroundColor: theme.colors.tintTeal }]}>
                        <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: '700' }}>
                          {classLabel || '—'}
                        </Text>
                      </View>
                      {student.subjectName ? (
                        <View
                          style={[styles.miniChip, { backgroundColor: theme.colors.surfaceAlt }]}
                        >
                          <Text
                            style={{
                              color: theme.colors.textSecondary,
                              fontSize: 10,
                              fontWeight: '600',
                            }}
                            numberOfLines={1}
                          >
                            {student.subjectName}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>
              <View style={[styles.studentCardFooter, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={styles.studentFooterBtn}
                  onPress={() => openProfile(student)}
                >
                  <Ionicons name="person-outline" size={15} color={theme.colors.primary} />
                  <Text style={[styles.studentFooterText, { color: theme.colors.textSecondary }]}>
                    View Profile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.studentFooterBtn}
                  onPress={() => openProfile(student, true)}
                >
                  <Ionicons name="create-outline" size={15} color={theme.colors.info} />
                  <Text style={[styles.studentFooterText, { color: theme.colors.textSecondary }]}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>
            </SurfaceCard>
          );
        })
      )}

      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => !saving && setShowCreate(false)}
      >
        <KeyboardAvoidingView
          style={styles.createBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.createDim} onPress={() => !saving && setShowCreate(false)} />
          <View style={[styles.createSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.createHeader}>
              <Text style={[styles.createTitle, { color: theme.colors.textPrimary }]}>
                Create Student Profile
              </Text>
              <TouchableOpacity onPress={() => !saving && setShowCreate(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.createForm}
            >
              <Text style={[styles.createLabel, { color: theme.colors.textSecondary }]}>
                User ID *
              </Text>
              <TextInput
                value={userId}
                onChangeText={setUserId}
                keyboardType="number-pad"
                placeholder="User ID"
                placeholderTextColor={theme.colors.textSecondary}
                style={[
                  styles.createInput,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.background,
                  },
                ]}
              />

              <Text style={[styles.createLabel, { color: theme.colors.textSecondary }]}>
                Admission Number
              </Text>
              <TextInput
                value={admissionNumber}
                onChangeText={setAdmissionNumber}
                placeholder="Admission number"
                placeholderTextColor={theme.colors.textSecondary}
                style={[
                  styles.createInput,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.background,
                  },
                ]}
              />

              <Text style={[styles.createLabel, { color: theme.colors.textSecondary }]}>
                APAAR ID
              </Text>
              <TextInput
                value={formatApaarId(apaarId)}
                onChangeText={(t) => setApaarId(apaarDigitsOnly(t))}
                keyboardType="number-pad"
                maxLength={14}
                placeholder="XXXX-XXXX-XXXX"
                placeholderTextColor={theme.colors.textSecondary}
                style={[
                  styles.createInput,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.background,
                    letterSpacing: 0.5,
                  },
                ]}
              />

              <Text style={[styles.createLabel, { color: theme.colors.textSecondary }]}>
                Date of Birth
              </Text>
              <TextInput
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
                style={[
                  styles.createInput,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.background,
                  },
                ]}
              />

              <Text style={[styles.createLabel, { color: theme.colors.textSecondary }]}>Gender</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female', 'Other'].map((g) => {
                  const active = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderChip,
                        {
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                          backgroundColor: active ? theme.colors.primary : theme.colors.background,
                        },
                      ]}
                      onPress={() => setGender(active ? '' : g)}
                    >
                      <Text
                        style={{
                          color: active ? '#fff' : theme.colors.textPrimary,
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.createLabel, { color: theme.colors.textSecondary }]}>
                Blood Group
              </Text>
              <TextInput
                value={bloodGroup}
                onChangeText={setBloodGroup}
                placeholder="e.g. O+"
                placeholderTextColor={theme.colors.textSecondary}
                style={[
                  styles.createInput,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.background,
                  },
                ]}
              />

              <Text style={[styles.createLabel, { color: theme.colors.textSecondary }]}>City</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor={theme.colors.textSecondary}
                style={[
                  styles.createInput,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.background,
                  },
                ]}
              />

              <View style={styles.createActions}>
                <PrimaryButton
                  label={saving ? 'Saving…' : 'Save'}
                  onPress={() => void handleCreate()}
                  disabled={saving}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  label="Cancel"
                  variant="outline"
                  onPress={() => setShowCreate(false)}
                  disabled={saving}
                  style={{ flex: 1 }}
                />
              </View>
              {saving ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 8 }} />
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ─── Teachers tab (admin-only) ───────────────────────────────────────────── */

function TeachersTab({
  teaching,
  nonTeaching,
  classRows,
  onRefetch,
}: {
  teaching: ReturnType<typeof useAdminClassOverviewData>['teachingStaff'];
  nonTeaching: ReturnType<typeof useAdminClassOverviewData>['nonTeachingStaff'];
  classRows: ClassInfo[];
  onRefetch: () => void | Promise<void>;
}) {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const { schoolId } = useSchoolsSession();
  const [category, setCategory] = useState<StaffCategory>('teaching');
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [desigFilter, setDesigFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const source = category === 'teaching' ? teaching : nonTeaching;

  const deptFilters: ChipOption[] = useMemo(() => {
    const deps = [...new Set(source.map((s) => s.department).filter((d) => d && d !== '—'))].sort();
    return [{ key: 'all', label: 'All Depts' }, ...deps.map((d) => ({ key: d, label: d }))];
  }, [source]);

  const desigFilters: ChipOption[] = useMemo(() => {
    const des = [...new Set(source.map((s) => s.designation).filter((d) => d && d !== '—'))].sort();
    return [{ key: 'all', label: 'All Roles' }, ...des.map((d) => ({ key: d, label: d }))];
  }, [source]);

  const typeFilters: ChipOption[] = useMemo(() => {
    const types = [
      ...new Set(source.map((s) => s.employmentType).filter((t) => t && t !== '—')),
    ].sort();
    return [{ key: 'all', label: 'All Types' }, ...types.map((t) => ({ key: t, label: t }))];
  }, [source]);

  const filtered = useMemo(
    () =>
      source.filter((s) => {
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q ||
          `${s.name} ${s.employeeId} ${s.email} ${s.designation}`.toLowerCase().includes(q);
        const matchesDept = deptFilter === 'all' || s.department === deptFilter;
        const matchesDesig = desigFilter === 'all' || s.designation === desigFilter;
        const matchesType = typeFilter === 'all' || s.employmentType === typeFilter;
        return matchesQuery && matchesDept && matchesDesig && matchesType;
      }),
    [source, query, deptFilter, desigFilter, typeFilter],
  );

  const assignedSubjects = (userId: number | null, name: string) => {
    const rows = classRows.filter(
      (c) =>
        (userId != null && c.teacherId === userId) ||
        (name && c.teacherName?.toLowerCase() === name.toLowerCase()),
    );
    return rows.slice(0, 3).map((r) => r.subject).filter(Boolean);
  };

  const openDetail = (staffId: string, openEdit = false) => {
    navigation.navigate('AdminTeacherDetail', { staffId, openEdit });
  };

  const onDeactivate = (member: (typeof source)[number]) => {
    if (member.profileId == null) {
      Alert.alert('Unavailable', 'Staff profile id is missing.');
      return;
    }
    Alert.alert('Deactivate staff?', `Deactivate ${member.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await staffProfilesApi.softDelete(member.profileId!, schoolId ?? undefined);
              await onRefetch();
            } catch (e) {
              Alert.alert('Failed', extractErrorMessage(e));
            }
          })();
        },
      },
    ]);
  };

  return (
    <View style={styles.tabBody}>
      <View style={styles.categoryRow}>
        {(['teaching', 'non_teaching'] as StaffCategory[]).map((key) => {
          const active = category === key;
          const count = key === 'teaching' ? teaching.length : nonTeaching.length;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => {
                setCategory(key);
                setDeptFilter('all');
                setDesigFilter('all');
                setTypeFilter('all');
              }}
            >
              <Text
                style={{
                  color: active ? '#fff' : theme.colors.textSecondary,
                  fontWeight: '700',
                  fontSize: 12,
                }}
              >
                {key === 'teaching' ? 'Teaching' : 'Non-Teaching'} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search name or employee ID…" />
      {deptFilters.length > 1 ? (
        <FilterChips options={deptFilters} activeKey={deptFilter} onChange={setDeptFilter} />
      ) : null}
      {desigFilters.length > 1 ? (
        <FilterChips options={desigFilters} activeKey={desigFilter} onChange={setDesigFilter} />
      ) : null}
      {typeFilters.length > 1 ? (
        <FilterChips options={typeFilters} activeKey={typeFilter} onChange={setTypeFilter} />
      ) : null}

      <View style={styles.studentsHeader}>
        <Text style={[styles.recordCount, { color: theme.colors.textSecondary }]}>
          {filtered.length} staff found
        </Text>
        <PrimaryButton
          label="Manage"
          size="compact"
          variant="outline"
          onPress={() => navigation.navigate('TeacherManagement')}
        />
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No staff found"
          message="Try a different filter or category."
        />
      ) : (
        filtered.map((member, index) => {
          const subjects = assignedSubjects(member.userId, member.name);
          const accents: AccentKey[] = ['teal', 'blue', 'green', 'orange', 'purple', 'pink'];
          const cardAccent = accents[index % accents.length];
          const tint = accentColors(theme.colors, cardAccent);
          const active = member.status === 'active' || member.isActive;

          return (
            <SurfaceCard
              key={`${member.id}-${index}`}
              padded={false}
              style={styles.studentCard}
            >
              <TouchableOpacity
                style={styles.studentCardBody}
                onPress={() => openDetail(member.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Open profile for ${member.name}`}
              >
                <View style={[styles.studentAccentBar, { backgroundColor: tint.fg }]} />
                <View style={styles.studentCardInner}>
                  <Avatar name={member.name} uri={member.avatarUrl} size={52} accent={cardAccent} />
                  <View style={styles.studentInfo}>
                    <Text
                      style={[styles.studentName, { color: theme.colors.info }]}
                      numberOfLines={1}
                    >
                      {member.name}
                    </Text>
                    <Text
                      style={[styles.studentAdm, { color: theme.colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {member.employeeId !== '—' ? member.employeeId : `ID · ${member.profileId ?? member.id}`}
                      {' · '}
                      {member.designation}
                    </Text>
                    <View style={styles.studentChips}>
                      {member.employmentType && member.employmentType !== '—' ? (
                        <View
                          style={[
                            styles.miniChip,
                            { backgroundColor: accentColors(theme.colors, 'purple').bg },
                          ]}
                        >
                          <Text
                            style={{
                              color: accentColors(theme.colors, 'purple').fg,
                              fontSize: 10,
                              fontWeight: '700',
                            }}
                            numberOfLines={1}
                          >
                            {member.employmentType}
                          </Text>
                        </View>
                      ) : null}
                      <View
                        style={[
                          styles.miniChip,
                          {
                            backgroundColor: accentColors(theme.colors, active ? 'green' : 'red')
                              .bg,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: accentColors(theme.colors, active ? 'green' : 'red').fg,
                            fontSize: 10,
                            fontWeight: '700',
                          }}
                        >
                          {active ? 'active' : 'inactive'}
                        </Text>
                      </View>
                      {subjects.slice(0, 2).map((sub) => (
                        <View
                          key={sub}
                          style={[styles.miniChip, { backgroundColor: theme.colors.surfaceAlt }]}
                        >
                          <Text
                            style={{
                              color: theme.colors.textSecondary,
                              fontSize: 10,
                              fontWeight: '600',
                            }}
                            numberOfLines={1}
                          >
                            {sub}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>
              <View style={[styles.studentCardFooter, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={styles.studentFooterBtn}
                  onPress={() => openDetail(member.id)}
                >
                  <Ionicons name="person-outline" size={15} color={theme.colors.primary} />
                  <Text style={[styles.studentFooterText, { color: theme.colors.textSecondary }]}>
                    View
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.studentFooterBtn}
                  onPress={() => openDetail(member.id, true)}
                >
                  <Ionicons name="create-outline" size={15} color={theme.colors.info} />
                  <Text style={[styles.studentFooterText, { color: theme.colors.textSecondary }]}>
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.studentFooterBtn}
                  onPress={() => onDeactivate(member)}
                >
                  <Ionicons name="close-circle-outline" size={15} color={theme.colors.danger} />
                  <Text style={[styles.studentFooterText, { color: theme.colors.textSecondary }]}>
                    Deactivate
                  </Text>
                </TouchableOpacity>
              </View>
            </SurfaceCard>
          );
        })
      )}
    </View>
  );
}

/* ─── My Profile tab (web StaffSelfServiceTab) ────────────────────────────── */

function MyProfileTab({ classRows }: { classRows: ClassInfo[] }) {
  return <StaffSelfServiceView classRows={classRows} />;
}

/* ─── Shared filter bits ──────────────────────────────────────────────────── */

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
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

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleLeft: { flex: 1, paddingRight: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  subtitle: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  yearPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  yearLabel: { fontSize: 10 },
  yearValue: { fontSize: 13, fontWeight: '700' },

  rail: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  railChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabBody: { gap: 12 },
  toolsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchFlex: { flex: 1 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  sortText: { fontSize: 12, fontWeight: '600' },
  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recordCount: { fontSize: 12 },

  classCard: { overflow: 'hidden' },
  classTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  classBadge: {
    width: 52,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  classBadgeText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  classInfo: { flex: 1, gap: 2 },
  className: { fontSize: 15, fontWeight: '700' },
  classMeta: { fontSize: 12, lineHeight: 17 },
  classFooter: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  footerAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: { fontSize: 11, fontWeight: '600' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
    maxHeight: '75%',
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  filterBlock: { gap: 8 },
  filterLabel: { fontSize: 12, fontWeight: '600' },
  filterChips: { gap: 8 },
  filterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  listCard: { overflow: 'hidden' },
  studentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  studentCard: { overflow: 'hidden', marginBottom: 2 },
  studentCardBody: { flexDirection: 'row' },
  studentAccentBar: { width: 4 },
  studentCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  studentInfo: { flex: 1, gap: 4 },
  studentName: { fontSize: 15, fontWeight: '800' },
  studentAdm: { fontSize: 12 },
  studentChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  miniChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 140,
  },
  studentCardFooter: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  studentFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  studentFooterText: { fontSize: 11, fontWeight: '600' },

  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryChip: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },

  createBackdrop: { flex: 1, justifyContent: 'flex-end' },
  createDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  createSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  createHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
  },
  createTitle: { fontSize: 17, fontWeight: '800' },
  createForm: { paddingHorizontal: 18, paddingBottom: 20, gap: 6 },
  createLabel: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  createInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  genderChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
