/**
 * Teacher Exams hub — web ExamsTab parity.
 * Tabs: Exam Groups | Exams | Schedules | Marks | Results | Report Cards
 * Uses only exam APIs (never useAdminData).
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  ListItem,
  EmptyState,
  ScreenLoader,
  PrimaryButton,
  Badge,
  SelectField,
  SearchBar,
  SegmentedControl,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherExamsData } from '../../../hooks/useTeacherExamsData';
import {
  EXAM_TABS,
  formatExamDateLabel,
  formatExamTime,
  statusTone,
  type ExamTabKey,
} from '../../../utils/examMeta';
import type { TeacherStackParamList } from '../../../types/navigation';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
} from '../../../utils/apiHelpers';

type Nav = NativeStackNavigationProp<TeacherStackParamList>;

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export type TeacherExamsProps = {
  /** Admin: Assessment hero branding (web Exams tab). */
  role?: 'teacher' | 'admin';
};

export default function TeacherExamsScreen({ role = 'teacher' }: TeacherExamsProps) {
  const isAdmin = role === 'admin';
  const theme = useTeacherTheme();
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<ExamTabKey>('groups');
  const exams = useTeacherExamsData(tab);
  const [pulling, setPulling] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [scheduleView, setScheduleView] = useState<'list' | 'calendar'>('list');
  const [monthDate, setMonthDate] = useState(() => new Date());

  // Read-only marks/results filters
  const [roExamId, setRoExamId] = useState('');
  const [roClassId, setRoClassId] = useState('');
  const [roSectionId, setRoSectionId] = useState('');
  const [roLoading, setRoLoading] = useState(false);
  const [roError, setRoError] = useState<string | null>(null);
  const [marksTemplate, setMarksTemplate] = useState<{
    subjects: Record<string, unknown>[];
    students: Record<string, unknown>[];
  } | null>(null);
  const [resultsView, setResultsView] = useState<Record<string, unknown> | null>(null);

  const refetchRef = useRef(exams.refetch);
  refetchRef.current = exams.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchRef.current();
    }, []),
  );

  const onPull = useCallback(async () => {
    setPulling(true);
    try {
      await exams.refetch();
    } finally {
      setPulling(false);
    }
  }, [exams.refetch]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exams.groups;
    return exams.groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.examType.toLowerCase().includes(q),
    );
  }, [exams.groups, search]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exams.allItems.filter((i) => {
      if (q) {
        const hay = `${i.name} ${i.groupName} ${i.session}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [exams.allItems, search]);

  const filteredSchedules = useMemo(() => {
    return exams.schedules.filter((s) => {
      if (filterGroup && s.groupName !== filterGroup) return false;
      if (filterExam && String(s.itemId) !== filterExam) return false;
      if (filterClass && String(s.classId) !== filterClass) return false;
      return true;
    });
  }, [exams.schedules, filterGroup, filterExam, filterClass]);

  const scheduleStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = filteredSchedules.filter((s) => s.date >= today).length;
    const subjects = new Set(filteredSchedules.map((s) => s.subjectName)).size;
    const hours = filteredSchedules.reduce((acc, s) => acc + (s.durationMins || 0), 0) / 60;
    return {
      total: filteredSchedules.length,
      upcoming,
      subjects,
      hours: Math.round(hours * 10) / 10,
    };
  }, [filteredSchedules]);

  const classOptions = useMemo(() => {
    // Prefer school-wide academic classes (web Marks/Results parity).
    // Fall back to unique class names from schedules when lookups are empty.
    if (exams.schoolClasses.length > 0) {
      return [
        { label: 'All Classes', value: '' },
        ...exams.schoolClasses.map((c) => ({
          label: c.name,
          value: String(c.id),
        })),
      ];
    }
    const fromSched = Array.from(
      new Map(
        exams.schedules
          .filter((s) => s.classId > 0)
          .map((s) => [String(s.classId), s.className || `Class ${s.classId}`]),
      ).entries(),
    );
    return [
      { label: 'All Classes', value: '' },
      ...fromSched.map(([value, label]) => ({ label, value })),
    ];
  }, [exams.schoolClasses, exams.schedules]);

  const sectionOptions = useMemo(
    () => [
      { label: 'All Sections', value: '' },
      ...exams.schoolSections.map((s) => ({
        label: s.name,
        value: String(s.id),
      })),
    ],
    [exams.schoolSections],
  );

  const examFilterOptions = useMemo(
    () => [
      { label: 'All Exams', value: '' },
      ...exams.allItems.map((i) => ({
        label: `${i.name}${i.groupName ? ` · ${i.groupName}` : ''}`,
        value: String(i.id),
      })),
    ],
    [exams.allItems],
  );

  const examSelectOptions = useMemo(
    () => [
      { label: 'Select exam…', value: '' },
      ...exams.allItems.map((i) => ({
        label: `${i.name}${i.groupName ? ` · ${i.groupName}` : ''}`,
        value: String(i.id),
      })),
    ],
    [exams.allItems],
  );

  const scheduleByDate = useMemo(() => {
    const map = new Map<string, typeof filteredSchedules>();
    filteredSchedules.forEach((s) => {
      if (!s.date) return;
      const list = map.get(s.date) || [];
      list.push(s);
      map.set(s.date, list);
    });
    return map;
  }, [filteredSchedules]);

  const calendarCells = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7; // Monday-first like web
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.ceil((startPad + daysInMonth) / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) => {
      const day = index - startPad + 1;
      if (day < 1 || day > daysInMonth) return null;
      return day;
    });
  }, [monthDate]);

  const todayKey = useMemo(() => {
    const n = new Date();
    return dateKey(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }, []);

  const groupOptions = useMemo(() => {
    const names = Array.from(new Set(exams.schedules.map((s) => s.groupName).filter(Boolean)));
    return [
      { label: 'All Groups', value: '' },
      ...names.map((n) => ({ label: n, value: n })),
    ];
  }, [exams.schedules]);

  const onDeactivateGroup = (id: number, name: string) => {
    Alert.alert('Deactivate?', `Deactivate “${name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const ok = await exams.deactivateGroup(id);
            if (!ok) Alert.alert('Failed', exams.error || 'Could not deactivate.');
          })();
        },
      },
    ]);
  };

  const loadReadOnlyMarks = async () => {
    if (!roExamId) {
      Alert.alert('Required', 'Select an exam.');
      return;
    }
    setRoLoading(true);
    setRoError(null);
    setMarksTemplate(null);
    try {
      const filters: { class_id?: number; section_id?: number } = {};
      if (roClassId) filters.class_id = Number(roClassId);
      if (roSectionId) filters.section_id = Number(roSectionId);
      const data = (await exams.apis.marks.getTemplate(
        Number(roExamId),
        filters,
      )) as Record<string, unknown>;
      setMarksTemplate({
        subjects: safeList(data.subjects ?? data),
        students: safeList(data.students),
      });
    } catch (e) {
      setRoError(extractErrorMessage(e));
    } finally {
      setRoLoading(false);
    }
  };

  const loadReadOnlyResults = async () => {
    if (!roExamId) {
      Alert.alert('Required', 'Select an exam.');
      return;
    }
    setRoLoading(true);
    setRoError(null);
    setResultsView(null);
    try {
      const filters: { class_id?: number; section_id?: number } = {};
      if (roClassId) filters.class_id = Number(roClassId);
      if (roSectionId) filters.section_id = Number(roSectionId);
      const data = (await exams.apis.results.view(
        Number(roExamId),
        filters,
      )) as Record<string, unknown>;
      setResultsView(data);
    } catch (e) {
      setRoError(extractErrorMessage(e));
    } finally {
      setRoLoading(false);
    }
  };

  if (exams.loading && exams.groups.length === 0 && exams.allItems.length === 0 && tab !== 'marks' && tab !== 'results') {
    return (
      <TeacherScreen header={<ScreenHeader title="Exams" />}>
        <ScreenLoader message="Loading exams…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Exams"
          trailingIcon={tab === 'groups' ? 'add' : undefined}
          onTrailingPress={
            tab === 'groups'
              ? () => navigation.navigate('CreateExamGroup', {})
              : undefined
          }
        />
      }
      contentStyle={styles.content}
      refreshing={pulling}
      onRefresh={() => void onPull()}
      footer={
        tab === 'groups' ? (
          <PrimaryButton
            label="New Exam Group"
            icon="add-circle-outline"
            variant="gradient"
            onPress={() => navigation.navigate('CreateExamGroup', {})}
          />
        ) : tab === 'exams' ? (
          <PrimaryButton
            label="Manage Exams"
            icon="folder-outline"
            onPress={() => setTab('groups')}
          />
        ) : undefined
      }
    >
      <View
        style={[
          styles.heroCard,
          { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.heroTop}>
          <View style={[styles.pill, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.pillText, { color: theme.colors.textPrimary }]}>Assessment</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.pillText, { color: theme.colors.textPrimary }]}>School ERP</Text>
          </View>
        </View>
        <Text style={[styles.heroTitle, { color: theme.colors.textPrimary, fontSize: isAdmin ? 22 : 18 }]}>
          Exams
        </Text>
        <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
          Manage exam groups, schedules, marks entry, and published results.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {EXAM_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tabChip,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => {
                setTab(t.key);
                setSearch('');
                setMarksTemplate(null);
                setResultsView(null);
                setRoError(null);
              }}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={active ? '#fff' : theme.colors.textSecondary}
              />
              <Text
                style={{
                  color: active ? '#fff' : theme.colors.textPrimary,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {exams.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{exams.error}</Text>
      ) : null}

      {tab === 'groups' ? (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search groups…" />
          {filteredGroups.length === 0 ? (
            <EmptyState
              icon="folder-outline"
              title="No exam groups"
              message="Create a group to start adding exams."
              ctaLabel="New Exam Group"
              onCtaPress={() => navigation.navigate('CreateExamGroup', {})}
            />
          ) : (
            <SurfaceCard padded={false} style={styles.listCard}>
              {filteredGroups.map((g, index) => (
                <ListItem
                  key={g.id}
                  icon="folder-outline"
                  iconAccent={statusTone(g.status)}
                  title={g.name}
                  subtitle={`${g.examType} · ${g.examCount} exam${g.examCount === 1 ? '' : 's'}`}
                  divider={index < filteredGroups.length - 1}
                  onPress={() =>
                    navigation.navigate('ExamGroupDetail', { groupId: g.id })
                  }
                  trailing={
                    <View style={styles.trailing}>
                      <Badge label={g.status} accent={statusTone(g.status)} />
                      <TouchableOpacity
                        onPress={() => onDeactivateGroup(g.id, g.name)}
                        hitSlop={8}
                      >
                        <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '700' }}>
                          Deactivate
                        </Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              ))}
            </SurfaceCard>
          )}
        </>
      ) : null}

      {tab === 'exams' ? (
        <>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by exam, group or session…"
          />
          {filteredItems.length === 0 ? (
            <EmptyState
              icon="school-outline"
              title="No exams"
              message="Add exams from an exam group."
              ctaLabel="Go to Exam Groups"
              onCtaPress={() => setTab('groups')}
            />
          ) : (
            <SurfaceCard padded={false} style={styles.listCard}>
              {filteredItems.map((item, index) => (
                <ListItem
                  key={item.id}
                  icon="school-outline"
                  iconAccent={item.isPublished ? 'green' : 'orange'}
                  title={item.name}
                  subtitle={`${item.groupName || 'Group'}${item.session ? ` · Session ${item.session}` : ''}`}
                  divider={index < filteredItems.length - 1}
                  onPress={() =>
                    navigation.navigate('ExamGroupDetail', { groupId: item.groupId })
                  }
                  trailing={
                    <View style={styles.trailing}>
                      <Badge
                        label={item.isPublished ? 'Published' : 'Draft'}
                        accent={item.isPublished ? 'green' : 'orange'}
                      />
                      <Badge
                        label={item.isResultPublished ? 'Result published' : 'Not published'}
                        accent={item.isResultPublished ? 'green' : 'orange'}
                      />
                    </View>
                  }
                />
              ))}
            </SurfaceCard>
          )}
        </>
      ) : null}

      {tab === 'schedules' ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Exam Schedule
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
            View school-wide exam dates, venues, and subject papers.
          </Text>
          <SelectField options={groupOptions} value={filterGroup} onChange={setFilterGroup} />
          <SelectField
            options={examFilterOptions}
            value={filterExam}
            onChange={setFilterExam}
          />
          <SelectField options={classOptions} value={filterClass} onChange={setFilterClass} />

          <SegmentedControl
            segments={[
              { key: 'list', label: 'List View', icon: 'list-outline' },
              { key: 'calendar', label: 'Calendar View', icon: 'calendar-outline' },
            ]}
            activeKey={scheduleView}
            onChange={(k) => setScheduleView(k as 'list' | 'calendar')}
          />

          <View style={styles.statRow}>
            <StatTile label="Total" value={String(scheduleStats.total).padStart(2, '0')} bg={theme.colors.tintBlue} fg={theme.colors.onTintBlue} />
            <StatTile label="Upcoming" value={String(scheduleStats.upcoming).padStart(2, '0')} bg={theme.colors.tintGreen} fg={theme.colors.onTintGreen} />
            <StatTile label="Subjects" value={String(scheduleStats.subjects).padStart(2, '0')} bg={theme.colors.tintOrange} fg={theme.colors.onTintOrange} />
            <StatTile label="Hours" value={String(scheduleStats.hours).padStart(2, '0')} bg={theme.colors.tintTeal} fg={theme.colors.onTintTeal} />
          </View>

          {scheduleView === 'calendar' ? (
            <SurfaceCard style={styles.calCard}>
              <View style={styles.calNav}>
                <TouchableOpacity
                  onPress={() =>
                    setMonthDate(
                      new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1),
                    )
                  }
                  hitSlop={8}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMonthDate(new Date())}>
                  <Text style={{ color: theme.colors.textPrimary, fontWeight: '800', fontSize: 14 }}>
                    {MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setMonthDate(
                      new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1),
                    )
                  }
                  hitSlop={8}
                >
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.calWeekRow}>
                {WEEK_LABELS.map((d) => (
                  <Text
                    key={d}
                    style={[styles.calWeekLabel, { color: theme.colors.textSecondary }]}
                  >
                    {d}
                  </Text>
                ))}
              </View>
              <View style={styles.calGrid}>
                {calendarCells.map((day, index) => {
                  const key = day
                    ? dateKey(monthDate.getFullYear(), monthDate.getMonth() + 1, day)
                    : '';
                  const dayItems = day ? scheduleByDate.get(key) || [] : [];
                  const isToday = key === todayKey;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.calCell,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: !day
                            ? theme.colors.surfaceAlt
                            : isToday
                              ? theme.colors.tintBlue
                              : theme.colors.surface,
                        },
                      ]}
                    >
                      {day ? (
                        <>
                          <View
                            style={[
                              styles.calDayNum,
                              isToday && { backgroundColor: theme.colors.primary },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '800',
                                color: isToday ? '#fff' : theme.colors.textPrimary,
                              }}
                            >
                              {day}
                            </Text>
                          </View>
                          {dayItems.slice(0, 2).map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              onPress={() =>
                                item.groupId
                                  ? navigation.navigate('ExamGroupDetail', {
                                      groupId: item.groupId,
                                    })
                                  : undefined
                              }
                              style={[
                                styles.calEvent,
                                { backgroundColor: theme.colors.tintTeal },
                              ]}
                            >
                              <Text
                                numberOfLines={1}
                                style={{
                                  fontSize: 9,
                                  fontWeight: '800',
                                  color: theme.colors.onTintTeal,
                                }}
                              >
                                {item.subjectName}
                              </Text>
                            </TouchableOpacity>
                          ))}
                          {dayItems.length > 2 ? (
                            <Text
                              style={{
                                fontSize: 9,
                                color: theme.colors.textSecondary,
                                fontWeight: '600',
                              }}
                            >
                              +{dayItems.length - 2}
                            </Text>
                          ) : null}
                        </>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </SurfaceCard>
          ) : filteredSchedules.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No scheduled papers"
              message="Add exam dates on subjects inside an exam group."
            />
          ) : (
            filteredSchedules.map((s) => (
              <SurfaceCard key={s.id} style={styles.schedCard}>
                <View style={styles.schedTop}>
                  <View style={[styles.dateChip, { backgroundColor: theme.colors.tintBlue }]}>
                    <Text style={{ color: theme.colors.onTintBlue, fontWeight: '800', fontSize: 16 }}>
                      {s.date.slice(8, 10) || '—'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 }}>
                      {s.subjectName}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {s.className} · {s.examName}
                      {s.groupName ? `, ${s.groupName}` : ''}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {formatExamDateLabel(s.date)}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {formatExamTime(s.startTime, s.durationMins)} · {s.venue} ·{' '}
                      {s.durationMins ? `${s.durationMins} min` : '—'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    s.groupId
                      ? navigation.navigate('ExamGroupDetail', { groupId: s.groupId })
                      : undefined
                  }
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
                    View Details
                  </Text>
                </TouchableOpacity>
              </SurfaceCard>
            ))
          )}

          <View style={[styles.notice, { backgroundColor: theme.colors.tintOrange }]}>
            <Text style={{ color: theme.colors.onTintOrange, fontSize: 12, lineHeight: 17 }}>
              Important: Arrive at least 30 minutes before the exam start time and carry your school
              ID card.
            </Text>
          </View>
        </>
      ) : null}

      {tab === 'marks' || tab === 'results' ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            {tab === 'marks' ? 'Marks (view)' : 'Results (view)'}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            {tab === 'marks'
              ? 'Read-only template grid. Enter marks from an exam group → Marks.'
              : 'Read-only results. Generate / publish from an exam group → Result.'}
          </Text>
          <SelectField
            options={examSelectOptions}
            value={roExamId}
            onChange={setRoExamId}
            placeholder="Select exam"
          />
          <SelectField
            options={classOptions}
            value={roClassId}
            onChange={(v) => {
              setRoClassId(v);
              setRoSectionId('');
            }}
          />
          <SelectField options={sectionOptions} value={roSectionId} onChange={setRoSectionId} />
          <PrimaryButton
            label={roLoading ? 'Loading…' : tab === 'marks' ? 'Load Marks' : 'Load Results'}
            disabled={roLoading || !roExamId}
            onPress={() =>
              void (tab === 'marks' ? loadReadOnlyMarks() : loadReadOnlyResults())
            }
          />
          {roError ? (
            <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{roError}</Text>
          ) : null}

          {tab === 'marks' && marksTemplate ? (
            <SurfaceCard>
              <Text style={{ fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 }}>
                {marksTemplate.students.length} students · {marksTemplate.subjects.length} subjects
              </Text>
              {marksTemplate.students.slice(0, 40).map((stu) => (
                <View
                  key={String(stu.student_id)}
                  style={[styles.roRow, { borderBottomColor: theme.colors.border }]}
                >
                  <Text style={{ color: theme.colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                    {pickString(stu.student_name, `Student #${pickNumber(stu.student_id)}`)}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                    {pickString(stu.admission_number)}
                    {pickString(stu.roll_number) ? ` · Roll ${pickString(stu.roll_number)}` : ''}
                  </Text>
                </View>
              ))}
              {marksTemplate.students.length > 40 ? (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 6 }}>
                  Showing first 40 of {marksTemplate.students.length}
                </Text>
              ) : null}
            </SurfaceCard>
          ) : null}

          {tab === 'results' && resultsView ? (
            <>
              <View style={styles.statRow}>
                <StatTile label="Pass" value={String(pickNumber(resultsView.pass_count))} bg={theme.colors.tintGreen} fg={theme.colors.onTintGreen} />
                <StatTile label="Fail" value={String(pickNumber(resultsView.fail_count))} bg={theme.colors.tintRed} fg={theme.colors.onTintRed} />
                <StatTile label="Absent" value={String(pickNumber(resultsView.absent_count))} bg={theme.colors.tintOrange} fg={theme.colors.onTintOrange} />
                <StatTile
                  label="Avg %"
                  value={
                    resultsView.class_avg != null
                      ? String(Math.round(Number(resultsView.class_avg)))
                      : '—'
                  }
                  bg={theme.colors.tintBlue}
                  fg={theme.colors.onTintBlue}
                />
              </View>
              {!resultsView.generated ? (
                <EmptyState
                  icon="trophy-outline"
                  title="Results not generated"
                  message="Open the exam from Exam Groups to generate results."
                />
              ) : (
                <SurfaceCard padded={false} style={styles.listCard}>
                  {safeList<Record<string, unknown>>(resultsView.items).map((row, index, arr) => (
                    <ListItem
                      key={`${pickNumber(row.student_id)}-${index}`}
                      icon="person-outline"
                      iconAccent={statusTone(pickString(row.result_status))}
                      title={pickString(row.student_name, `Student #${pickNumber(row.student_id)}`)}
                      subtitle={`${pickNumber(row.total_marks)}/${pickNumber(row.max_total_marks)} · ${pickNumber(row.percentage)}%${pickString(row.grade) ? ` · ${pickString(row.grade)}` : ''}`}
                      divider={index < arr.length - 1}
                      trailing={
                        <Badge
                          label={pickString(row.result_status, '—')}
                          accent={statusTone(pickString(row.result_status))}
                        />
                      }
                    />
                  ))}
                </SurfaceCard>
              )}
            </>
          ) : null}
        </>
      ) : null}

      {tab === 'documents' ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Report Cards
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
            Pick an exam to open report cards / result documents for students.
          </Text>
          {exams.allItems.length === 0 ? (
            <EmptyState icon="document-text-outline" title="No exams" message="Create an exam first." />
          ) : (
            <SurfaceCard padded={false} style={styles.listCard}>
              {exams.allItems.map((item, index) => (
                <ListItem
                  key={item.id}
                  icon="document-text-outline"
                  iconAccent="teal"
                  title={item.name}
                  subtitle={item.groupName || 'Exam group'}
                  divider={index < exams.allItems.length - 1}
                  showChevron
                  onPress={() =>
                    navigation.navigate('ExamReportCards', {
                      itemId: item.id,
                      groupId: item.groupId,
                      examName: item.name,
                    })
                  }
                />
              ))}
            </SurfaceCard>
          )}
        </>
      ) : null}
    </TeacherScreen>
  );
}

function StatTile({
  label,
  value,
  bg,
  fg,
}: {
  label: string;
  value: string;
  bg: string;
  fg: string;
}) {
  return (
    <View style={[styles.statTile, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontWeight: '800', fontSize: 16 }}>{value}</Text>
      <Text style={{ color: fg, fontSize: 10, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  heroCard: {
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '600' },
  heroTitle: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  heroSub: { fontSize: 13, lineHeight: 18 },
  tabsRow: { gap: 8, paddingVertical: 2 },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listCard: { paddingHorizontal: 14 },
  trailing: { alignItems: 'flex-end', gap: 4, maxWidth: 140 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statTile: {
    flexGrow: 1,
    minWidth: '22%',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  schedCard: { gap: 10 },
  schedTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dateChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { borderRadius: 12, padding: 12 },
  roRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  calCard: { gap: 10 },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calWeekRow: { flexDirection: 'row' },
  calWeekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    minHeight: 64,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 2,
  },
  calDayNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calEvent: {
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
});
