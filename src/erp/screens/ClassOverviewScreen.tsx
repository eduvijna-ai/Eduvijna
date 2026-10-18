/**
 * Class Overview Screen — web ClassOverviewTab parity.
 * Sub-tabs: Classes | Students | Teachers
 *
 * KPIs use the same sources as the lists:
 * - Classes: distinct class+section from class-overview assignment rows
 * - Students: distinct profile/user from students-by-user (not student_count sums)
 * - Teachers: distinct teacher_id/name on assignment rows (staff directory is the Teachers tab)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import {
  classOverviewApi,
  studentsByUserApi,
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
import { resolvePersonDisplayName } from '../utils/personDisplayName';
import { pickNumber, pickString, safeList } from '../../erp_schools/utils/apiHelpers';

const TABS = [
  { key: 'classes', label: 'Classes' },
  { key: 'students', label: 'Students' },
  { key: 'teachers', label: 'Teachers' },
];

const PER_PAGE = 25;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export default function ClassOverviewScreen() {
  const { schoolId } = useErpRole();
  const { selectedYearId } = useAcademicYear();
  const [activeTab, setActiveTab] = useState('classes');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [classes, setClasses] = useState<Record<string, unknown>[]>([]);
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [teachers, setTeachers] = useState<Record<string, unknown>[]>([]);
  const [studentPage, setStudentPage] = useState(1);
  const [teacherPage, setTeacherPage] = useState(1);

  const baseParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 500 };
    if (schoolId) params.school_id = schoolId;
    if (selectedYearId) params.academic_year_id = selectedYearId;
    return params;
  }, [schoolId, selectedYearId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [classRaw, rosterRaw, staffRaw] = await Promise.all([
        classOverviewApi.getAll(baseParams).catch(() => null),
        studentsByUserApi.getAll(baseParams).catch(() => null),
        staffProfilesApi.list({
          school_id: schoolId,
          per_page: 200,
        }).catch(() => null),
      ]);
      setClasses(safeList<Record<string, unknown>>(classRaw));
      setStudents(safeList<Record<string, unknown>>(rosterRaw));
      setTeachers(safeList<Record<string, unknown>>(staffRaw));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [baseParams, schoolId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setSearch('');
    setStudentPage(1);
    setTeacherPage(1);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadAll();
  };

  const kpis = useMemo(() => {
    const classSectionPairs = new Set(
      classes
        .map((r) => {
          const classId = pickNumber(r.class_id);
          if (!classId) return '';
          const sectionId = r.section_id != null ? pickNumber(r.section_id) : '';
          return `${classId}|${sectionId}`;
        })
        .filter(Boolean),
    );

    const studentIds = new Set<string>();
    students.forEach((s) => {
      const profileId = s.profile_id != null ? pickNumber(s.profile_id) : 0;
      if (profileId > 0) {
        studentIds.add(`p:${profileId}`);
        return;
      }
      const userId = s.user_id != null ? pickNumber(s.user_id) : 0;
      if (userId > 0) studentIds.add(`u:${userId}`);
    });

    const teacherKeys = new Set(
      classes
        .map((r) => {
          const tid = r.teacher_id != null ? pickNumber(r.teacher_id) : 0;
          if (tid > 0) return `id:${tid}`;
          const name = pickString(r.teacher_name, r.teacherName);
          return name ? `n:${name}` : '';
        })
        .filter(Boolean),
    );

    return {
      classes: classSectionPairs.size || classes.length,
      students: studentIds.size,
      teachers: teacherKeys.size,
    };
  }, [classes, students]);

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => {
      const hay = `${pickString(c.class_name)} ${pickString(c.section_name)} ${pickString(c.subject_name)} ${pickString(c.teacher_name)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [classes, search]);

  const dedupedStudents = useMemo(() => {
    const seen = new Set<string>();
    const out: Record<string, unknown>[] = [];
    students.forEach((s) => {
      const profileId = s.profile_id != null ? pickNumber(s.profile_id) : null;
      const classId = s.class_id != null ? pickNumber(s.class_id) : '';
      const sectionId = s.section_id != null ? pickNumber(s.section_id) : '';
      const key =
        profileId != null && profileId > 0
          ? `${profileId}|${classId}|${sectionId}`
          : `row:${pickString(s.user_id, s.id, String(out.length))}|${classId}|${sectionId}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(s);
    });
    return out;
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dedupedStudents;
    return dedupedStudents.filter((s) => {
      const name = resolvePersonDisplayName(s, 'Student').toLowerCase();
      const hay = `${name} ${pickString(s.admission_number)} ${pickString(s.class_name)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [dedupedStudents, search]);

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const name = resolvePersonDisplayName(t, 'Staff').toLowerCase();
      const hay = `${name} ${pickString(t.department)} ${pickString(t.designation)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [teachers, search]);

  const pagedStudents = filteredStudents.slice(
    (studentPage - 1) * PER_PAGE,
    studentPage * PER_PAGE,
  );
  const pagedTeachers = filteredTeachers.slice(
    (teacherPage - 1) * PER_PAGE,
    teacherPage * PER_PAGE,
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <View style={styles.kpiRow}>
        <KpiCard label="Classes" value={kpis.classes} color={COLORS.primary} />
        <KpiCard label="Students" value={kpis.students} color="#8b5cf6" />
        <KpiCard label="Teachers" value={kpis.teachers} color="#10b981" />
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

        {!loading && activeTab === 'classes' && (
          <>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search class…" />
            <SectionHeader
              title={`${filteredClasses.length} assignment${filteredClasses.length === 1 ? '' : 's'}`}
            />
            {filteredClasses.length === 0 ? (
              <EmptyState />
            ) : (
              filteredClasses.map((c, i) => (
                <ListRow
                  key={pickString(c.id, `class-${i}`)}
                  title={`${pickString(c.class_name, 'Class')} ${
                    pickString(c.section_name) ? `- ${pickString(c.section_name)}` : ''
                  }`}
                  subtitle={`${pickNumber(c.student_count)} students · ${
                    pickString(c.teacher_name) || 'No teacher'
                  }`}
                  badge={pickString(c.subject_name) || undefined}
                  badgeColor="#8b5cf6"
                />
              ))
            )}
          </>
        )}

        {!loading && activeTab === 'students' && (
          <>
            <SectionHeader
              title={`${filteredStudents.length} Student${filteredStudents.length === 1 ? '' : 's'}`}
            />
            {pagedStudents.length === 0 ? (
              <EmptyState />
            ) : (
              pagedStudents.map((s, i) => {
                const row = asRecord(s);
                const title = resolvePersonDisplayName(
                  row,
                  'Student',
                  row.profile_id ?? row.user_id ?? row.id,
                );
                const admission = pickString(row.admission_number);
                const className = pickString(row.class_name);
                return (
                  <ListRow
                    key={pickString(row.profile_id, row.user_id, row.id, `stu-${i}`)}
                    title={title}
                    subtitle={`${className}${admission ? ` · ${admission}` : ''}`}
                    badge={pickString(row.gender) || undefined}
                    badgeColor={COLORS.primary}
                  />
                );
              })
            )}
            <Pagination
              page={studentPage}
              total={filteredStudents.length}
              perPage={PER_PAGE}
              onPrev={() => setStudentPage((p) => Math.max(1, p - 1))}
              onNext={() =>
                setStudentPage((p) =>
                  p * PER_PAGE < filteredStudents.length ? p + 1 : p,
                )
              }
            />
          </>
        )}

        {!loading && activeTab === 'teachers' && (
          <>
            <SectionHeader
              title={`${filteredTeachers.length} Staff`}
            />
            {pagedTeachers.length === 0 ? (
              <EmptyState />
            ) : (
              pagedTeachers.map((t, i) => {
                const row = asRecord(t);
                const title = resolvePersonDisplayName(
                  row,
                  'Staff',
                  row.id ?? row.user_id,
                );
                return (
                  <ListRow
                    key={pickString(row.id, row.user_id, `staff-${i}`)}
                    title={title}
                    subtitle={`${pickString(row.department)}${
                      pickString(row.designation) ? ` · ${pickString(row.designation)}` : ''
                    }`}
                    badge={pickString(row.employment_type) || undefined}
                    badgeColor="#6366f1"
                  />
                );
              })
            )}
            <Pagination
              page={teacherPage}
              total={filteredTeachers.length}
              perPage={PER_PAGE}
              onPrev={() => setTeacherPage((p) => Math.max(1, p - 1))}
              onNext={() =>
                setTeacherPage((p) =>
                  p * PER_PAGE < filteredTeachers.length ? p + 1 : p,
                )
              }
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
