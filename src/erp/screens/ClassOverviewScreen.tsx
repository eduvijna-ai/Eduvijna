/**
 * Class Overview Screen — web ClassOverviewTab parity.
 * Sub-tabs: Classes | Students | Teachers
 *
 * Per-section errors (never present failure as empty/zero).
 * Server pagination drained until total reached (no silent 500/200 caps).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
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
const API_PAGE_SIZE = 100;

type SectionKey = 'classes' | 'students' | 'teachers';
type SectionState = 'idle' | 'loading' | 'ready' | 'error';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function extractErrorMessage(err: unknown): string {
  const e = err as { message?: string; response?: { data?: { detail?: unknown; message?: string } } };
  const detail = e?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (e?.response?.data?.message) return String(e.response.data.message);
  if (e?.message) return e.message;
  return 'Request failed';
}

async function fetchAllPages(
  loader: (page: number, perPage: number) => Promise<unknown>,
): Promise<{ rows: Record<string, unknown>[]; total: number | null }> {
  let page = 1;
  let rows: Record<string, unknown>[] = [];
  let reportedTotal: number | null = null;
  const maxPages = 50;
  while (page <= maxPages) {
    const data = await loader(page, API_PAGE_SIZE);
    const obj = asRecord(data);
    if (obj.total != null && Number.isFinite(Number(obj.total))) {
      reportedTotal = Number(obj.total);
    }
    const pageRows = safeList<Record<string, unknown>>(data);
    rows = rows.concat(pageRows);
    if (pageRows.length === 0) break;
    if (reportedTotal != null && rows.length >= reportedTotal) break;
    if (pageRows.length < API_PAGE_SIZE) break;
    page += 1;
  }
  return { rows, total: reportedTotal ?? rows.length };
}

function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ClassOverviewScreen() {
  const { schoolId } = useErpRole();
  const { selectedYearId } = useAcademicYear();
  const [activeTab, setActiveTab] = useState('classes');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [classes, setClasses] = useState<Record<string, unknown>[]>([]);
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [teachers, setTeachers] = useState<Record<string, unknown>[]>([]);
  const [studentTotal, setStudentTotal] = useState<number | null>(null);
  const [teacherTotal, setTeacherTotal] = useState<number | null>(null);
  const [studentPage, setStudentPage] = useState(1);
  const [teacherPage, setTeacherPage] = useState(1);

  const [sectionState, setSectionState] = useState<Record<SectionKey, SectionState>>({
    classes: 'idle',
    students: 'idle',
    teachers: 'idle',
  });
  const [sectionError, setSectionError] = useState<Record<SectionKey, string | null>>({
    classes: null,
    students: null,
    teachers: null,
  });

  const loadGenRef = useRef(0);

  const baseParams = useMemo(() => {
    const params: Record<string, string | number> = {};
    if (schoolId) params.school_id = schoolId;
    if (selectedYearId) params.academic_year_id = selectedYearId;
    return params;
  }, [schoolId, selectedYearId]);

  const setSection = useCallback((key: SectionKey, state: SectionState, error: string | null = null) => {
    setSectionState((prev) => ({ ...prev, [key]: state }));
    setSectionError((prev) => ({ ...prev, [key]: error }));
  }, []);

  const loadClasses = useCallback(
    async (gen: number) => {
      setSection('classes', 'loading');
      try {
        const { rows } = await fetchAllPages((page, perPage) =>
          classOverviewApi.getAll({ ...baseParams, page, per_page: perPage }),
        );
        if (gen !== loadGenRef.current) return;
        setClasses(rows);
        setSection('classes', 'ready');
      } catch (e) {
        if (gen !== loadGenRef.current) return;
        setClasses([]);
        setSection('classes', 'error', extractErrorMessage(e));
      }
    },
    [baseParams, setSection],
  );

  const loadStudents = useCallback(
    async (gen: number) => {
      setSection('students', 'loading');
      try {
        const { rows, total } = await fetchAllPages((page, perPage) =>
          studentsByUserApi.getAll({ ...baseParams, page, per_page: perPage }),
        );
        if (gen !== loadGenRef.current) return;
        setStudents(rows);
        setStudentTotal(total);
        setSection('students', 'ready');
      } catch (e) {
        if (gen !== loadGenRef.current) return;
        setStudents([]);
        setStudentTotal(null);
        setSection('students', 'error', extractErrorMessage(e));
      }
    },
    [baseParams, setSection],
  );

  const loadTeachers = useCallback(
    async (gen: number) => {
      setSection('teachers', 'loading');
      try {
        const { rows, total } = await fetchAllPages((page, perPage) =>
          staffProfilesApi.list({
            school_id: schoolId,
            page,
            per_page: perPage,
          }),
        );
        if (gen !== loadGenRef.current) return;
        setTeachers(rows);
        setTeacherTotal(total);
        setSection('teachers', 'ready');
      } catch (e) {
        if (gen !== loadGenRef.current) return;
        setTeachers([]);
        setTeacherTotal(null);
        setSection('teachers', 'error', extractErrorMessage(e));
      }
    },
    [schoolId, setSection],
  );

  const loadAll = useCallback(
    async (isRefresh = false) => {
      const gen = ++loadGenRef.current;
      if (isRefresh) setRefreshing(true);
      await Promise.all([loadClasses(gen), loadStudents(gen), loadTeachers(gen)]);
      if (gen === loadGenRef.current) setRefreshing(false);
    },
    [loadClasses, loadStudents, loadTeachers],
  );

  useEffect(() => {
    void loadAll(false);
  }, [loadAll]);

  useEffect(() => {
    setSearch('');
    setStudentPage(1);
    setTeacherPage(1);
  }, [activeTab]);

  const kpis = useMemo(() => {
    const classesOk = sectionState.classes === 'ready';
    const studentsOk = sectionState.students === 'ready';
    const teachersOk = sectionState.teachers === 'ready';

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
      classes: classesOk ? classSectionPairs.size || classes.length : null,
      students: studentsOk ? studentIds.size : null,
      teachers: classesOk ? teacherKeys.size : null,
      staffDirectory: teachersOk ? teacherTotal ?? teachers.length : null,
    };
  }, [classes, students, teachers, teacherTotal, sectionState]);

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

  const anyLoading =
    sectionState.classes === 'loading' ||
    sectionState.students === 'loading' ||
    sectionState.teachers === 'loading';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <View style={styles.kpiRow}>
        <KpiCard
          label="Classes"
          value={kpis.classes == null ? '—' : kpis.classes}
          color={COLORS.primary}
        />
        <KpiCard
          label="Students"
          value={kpis.students == null ? '—' : kpis.students}
          color="#8b5cf6"
        />
        <KpiCard
          label="Teachers"
          value={kpis.teachers == null ? '—' : kpis.teachers}
          color="#10b981"
        />
      </View>
      {sectionState.teachers === 'ready' && kpis.staffDirectory != null ? (
        <Text style={styles.kpiHint}>
          Staff directory: {kpis.staffDirectory} (Teachers KPI = assignment teachers)
        </Text>
      ) : null}
      {sectionState.classes === 'error' || sectionState.students === 'error' ? (
        <Text style={styles.kpiHintWarn}>
          Some overview data failed to load — KPIs show — until that section succeeds.
        </Text>
      ) : null}

      {activeTab !== 'classes' && (
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={activeTab === 'students' ? 'Search students…' : 'Search teachers…'}
        />
      )}

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadAll(true)} />
        }
      >
        {anyLoading && !refreshing ? <LoadingState /> : null}

        {activeTab === 'classes' && (
          <>
            {sectionState.classes === 'error' ? (
              <SectionError
                message={sectionError.classes || 'Failed to load classes'}
                onRetry={() => {
                  const gen = ++loadGenRef.current;
                  void loadClasses(gen);
                }}
              />
            ) : sectionState.classes === 'ready' ? (
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
            ) : null}
          </>
        )}

        {activeTab === 'students' && (
          <>
            {sectionState.students === 'error' ? (
              <SectionError
                message={sectionError.students || 'Failed to load students'}
                onRetry={() => {
                  const gen = ++loadGenRef.current;
                  void loadStudents(gen);
                }}
              />
            ) : sectionState.students === 'ready' ? (
              <>
                <SectionHeader
                  title={`${filteredStudents.length} Student${filteredStudents.length === 1 ? '' : 's'}${
                    studentTotal != null && studentTotal !== filteredStudents.length
                      ? ` · server total ${studentTotal}`
                      : ''
                  }`}
                />
                {pagedStudents.length === 0 ? (
                  <EmptyState />
                ) : (
                  pagedStudents.map((s, i) => {
                    const row = asRecord(s);
                    const title = resolvePersonDisplayName(
                      row,
                      'Student',
                      (row.profile_id ?? row.user_id ?? row.id) as string | number | null | undefined,
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
            ) : null}
          </>
        )}

        {activeTab === 'teachers' && (
          <>
            {sectionState.teachers === 'error' ? (
              <SectionError
                message={sectionError.teachers || 'Failed to load staff'}
                onRetry={() => {
                  const gen = ++loadGenRef.current;
                  void loadTeachers(gen);
                }}
              />
            ) : sectionState.teachers === 'ready' ? (
              <>
                <SectionHeader
                  title={`${filteredTeachers.length} Staff${
                    teacherTotal != null ? ` · total ${teacherTotal}` : ''
                  }`}
                />
                {pagedTeachers.length === 0 ? (
                  <EmptyState />
                ) : (
                  pagedTeachers.map((t, i) => {
                    const row = asRecord(t);
                    const title = resolvePersonDisplayName(
                      row,
                      'Staff',
                      (row.id ?? row.user_id) as string | number | null | undefined,
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
            ) : null}
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
  kpiHint: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    fontSize: 11,
    color: COLORS.gray[500],
  },
  kpiHintWarn: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    fontSize: 11,
    color: '#b45309',
  },
  errorBox: {
    margin: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 10,
  },
  errorText: { color: '#991B1B', fontSize: 13 },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
