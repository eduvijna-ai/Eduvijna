/**
 * Class Overview Screen
 * Sub-tabs: Classes | Students | Teachers
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import {
  classOverviewApi,
  studentProfilesApi,
  staffProfilesApi,
} from '../../core/api/erp.api';
import {
  COLORS,
  SubTabBar,
  SearchBar,
  KpiCard,
  SectionHeader,
  ListRow,
  LoadingState,
  EmptyState,
  Pagination,
} from '../components/common';
import { useErpRole } from '../hooks/useErpRole';
import { useAcademicYear } from '../contexts/AcademicYearContext';

const TABS = [
  { key: 'classes', label: 'Classes' },
  { key: 'students', label: 'Students' },
  { key: 'teachers', label: 'Teachers' },
];

export default function ClassOverviewScreen() {
  const { schoolId } = useErpRole();
  const { selectedYearId } = useAcademicYear();
  const [activeTab, setActiveTab] = useState('classes');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Classes
  const [classes, setClasses] = useState<any[]>([]);
  const [classKpis, setClassKpis] = useState<any[]>([]);

  // Students
  const [students, setStudents] = useState<any[]>([]);
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotal, setStudentTotal] = useState(0);
  const PER_PAGE = 25;

  // Teachers
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherTotal, setTeacherTotal] = useState(0);

  const baseParams = schoolId ? { school_id: schoolId } : {};

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const yearParams = selectedYearId ? { ...baseParams, academic_year_id: selectedYearId } : baseParams;
      const [rows, kpis] = await Promise.all([
        classOverviewApi.getAll(yearParams),
        classOverviewApi.getKPIs(yearParams),
      ]);
      setClasses(rows?.items ?? rows ?? []);
      setClassKpis(kpis?.items ?? kpis ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, selectedYearId]);

  const loadStudents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await studentProfilesApi.list({
        ...baseParams,
        page,
        per_page: PER_PAGE,
        q: search || undefined,
      });
      setStudents(data?.items ?? data ?? []);
      setStudentTotal(data?.total ?? (data?.items?.length ?? 0));
      setStudentPage(page);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, search]);

  const loadTeachers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await staffProfilesApi.list({
        ...baseParams,
        page,
        per_page: PER_PAGE,
        q: search || undefined,
      });
      setTeachers(data?.items ?? data ?? []);
      setTeacherTotal(data?.total ?? (data?.items?.length ?? 0));
      setTeacherPage(page);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, search]);

  useEffect(() => {
    setSearch('');
    if (activeTab === 'classes') loadClasses();
    else if (activeTab === 'students') loadStudents(1);
    else if (activeTab === 'teachers') loadTeachers(1);
  }, [activeTab]);

  // Re-search on debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === 'students') loadStudents(1);
      else if (activeTab === 'teachers') loadTeachers(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'classes') loadClasses();
    else if (activeTab === 'students') loadStudents(studentPage);
    else if (activeTab === 'teachers') loadTeachers(teacherPage);
  };

  // Compute KPIs from class rows
  const totalStudents = classKpis.reduce((s, r) => s + (r.student_count ?? 0), 0);
  const totalClasses = classKpis.length;
  const teacherSet = new Set(classKpis.flatMap((r) => (r.teacher_name ? [r.teacher_name] : [])));

  const filteredClasses = classes.filter(
    (c) =>
      !search ||
      c.class_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.section_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* KPI row always visible */}
      <View style={styles.kpiRow}>
        <KpiCard label="Classes" value={totalClasses} color={COLORS.primary} />
        <KpiCard label="Students" value={totalStudents} color="#8b5cf6" />
        <KpiCard label="Teachers" value={teacherSet.size} color="#10b981" />
      </View>

      {activeTab !== 'classes' && (
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={activeTab === 'students' ? 'Search students…' : 'Search teachers…'}
        />
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && <LoadingState />}

        {/* ── CLASSES TAB ── */}
        {!loading && activeTab === 'classes' && (
          <>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search class…" />
            <SectionHeader title={`${filteredClasses.length} Classes`} />
            {filteredClasses.length === 0 ? (
              <EmptyState />
            ) : (
              filteredClasses.map((c, i) => (
                <ListRow
                  key={c.id ?? i}
                  title={`${c.class_name} ${c.section_name ? `- ${c.section_name}` : ''}`}
                  subtitle={`${c.student_count ?? 0} students · ${c.teacher_name ?? 'No teacher'}`}
                  badge={c.subject_name}
                  badgeColor="#8b5cf6"
                />
              ))
            )}
          </>
        )}

        {/* ── STUDENTS TAB ── */}
        {!loading && activeTab === 'students' && (
          <>
            <SectionHeader title={`${studentTotal} Students`} />
            {students.length === 0 ? (
              <EmptyState />
            ) : (
              students.map((s) => (
                <ListRow
                  key={s.id}
                  title={s.full_name ?? s.name ?? `Student #${s.id}`}
                  subtitle={`${s.class_name ?? ''} ${s.admission_number ? `· ${s.admission_number}` : ''}`}
                  badge={s.gender}
                  badgeColor={COLORS.primary}
                />
              ))
            )}
            <Pagination
              page={studentPage}
              total={studentTotal}
              perPage={PER_PAGE}
              onPrev={() => loadStudents(studentPage - 1)}
              onNext={() => loadStudents(studentPage + 1)}
            />
          </>
        )}

        {/* ── TEACHERS TAB ── */}
        {!loading && activeTab === 'teachers' && (
          <>
            <SectionHeader title={`${teacherTotal} Staff`} />
            {teachers.length === 0 ? (
              <EmptyState />
            ) : (
              teachers.map((t) => (
                <ListRow
                  key={t.id}
                  title={t.full_name ?? t.name ?? `Staff #${t.id}`}
                  subtitle={`${t.department ?? ''} ${t.designation ? `· ${t.designation}` : ''}`}
                  badge={t.employment_type}
                  badgeColor="#6366f1"
                />
              ))
            )}
            <Pagination
              page={teacherPage}
              total={teacherTotal}
              perPage={PER_PAGE}
              onPrev={() => loadTeachers(teacherPage - 1)}
              onNext={() => loadTeachers(teacherPage + 1)}
            />
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
});
