/**
 * Exam Schedule — web ExamsTab StudentExamSchedule + ExamSchedulePanel parity.
 * List / Calendar · group+exam filters · detail sheet · PDF · overview.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  SectionHeader,
  FilterChips,
  StatusPill,
  EmptyState,
  type ChipOption,
  type PillStatus,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';
import { useStudentExams, type StudentExamRow } from '../../../hooks/useStudentExams';

const VIEW_CHIPS: ChipOption[] = [
  { key: 'list', label: 'List' },
  { key: 'calendar', label: 'Calendar' },
];

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function statePill(state: StudentExamRow['state']): { status: PillStatus; label: string } {
  if (state === 'completed') return { status: 'submitted', label: 'Completed' };
  if (state === 'ongoing') return { status: 'active', label: 'Today' };
  return { status: 'scheduled', label: 'Upcoming' };
}

function ExamCard({
  exam,
  onPress,
  timeLabel,
  dateShort,
}: {
  exam: StudentExamRow;
  onPress: () => void;
  timeLabel: string;
  dateShort: string;
}) {
  const theme = useTeacherTheme();
  const accent = accentColors(theme.colors, exam.accent);
  const pill = statePill(exam.state);
  const parts = dateShort.split(' ');

  return (
    <SurfaceCard onPress={onPress}>
      <View style={styles.examRow}>
        <View style={[styles.dateBox, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Text style={[styles.dateDay, { color: theme.colors.primary }]}>
            {parts[0] || '—'}
          </Text>
          <Text style={[styles.dateMon, { color: theme.colors.textSecondary }]}>
            {parts[1] || ''}
          </Text>
        </View>
        <View style={[styles.examIcon, { backgroundColor: accent.bg }]}>
          <Ionicons
            name={exam.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={accent.fg}
          />
        </View>
        <View style={styles.examInfo}>
          <Text style={[styles.examSubject, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {exam.subjectName}
          </Text>
          <Text style={[styles.examName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {[exam.examName, exam.examGroupName].filter(Boolean).join(' · ')}
          </Text>
          <View style={styles.examMeta}>
            <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.examMetaText, { color: theme.colors.textSecondary }]}>
              {timeLabel}
            </Text>
          </View>
          <View style={styles.examMeta}>
            <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.examMetaText, { color: theme.colors.textSecondary }]}>
              {[exam.roomNo, exam.durationMins ? `${exam.durationMins} min` : '', exam.maxMarks ? `Max ${exam.maxMarks}` : '']
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>
        <StatusPill status={pill.status} label={pill.label} showIcon={false} />
      </View>
    </SurfaceCard>
  );
}

export default function ExamScheduleScreen() {
  const theme = useTeacherTheme();
  const { profile } = useStudentData();
  const exams = useStudentExams();
  const [exporting, setExporting] = useState(false);

  const onRefresh = useCallback(() => {
    void exams.refetch();
  }, [exams]);

  const onExport = useCallback(async () => {
    if (exporting || exams.rows.length === 0) return;
    setExporting(true);
    try {
      const { downloadStudentExamSchedulePdf } = await import(
        '../../../utils/studentExamSchedulePdf'
      );
      await downloadStudentExamSchedulePdf({
        rows: exams.rows,
        studentName: profile.name,
        classLabel: profile.className,
      });
    } finally {
      setExporting(false);
    }
  }, [exporting, exams.rows, profile.name, profile.className]);

  const groupChips: ChipOption[] = [
    { key: 'all', label: 'All Groups' },
    ...exams.groupOptions
      .filter((g) => g !== 'all')
      .slice(0, 8)
      .map((g) => ({ key: g, label: g })),
  ];

  const examChips: ChipOption[] = exams.examOptions.slice(0, 10).map((o) => ({
    key: o.id,
    label: o.label,
  }));

  const next = exams.nextExam;
  const dateShort = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });

  return (
    <TeacherScreen
      header={
        <StudentModuleHeader
          title="Exam Schedule"
          trailingIcon="refresh-outline"
          onTrailingPress={onRefresh}
          trailingAccessibilityLabel="Refresh schedule"
        />
      }
      contentStyle={styles.content}
      refreshing={exams.status === 'loading'}
      onRefresh={onRefresh}
    >
      <View style={styles.heroBlock}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>My Assessments</Text>
        <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
          Your exam schedule for your assigned class and section.
        </Text>
      </View>

      {next ? (
        <SurfaceCard style={{ backgroundColor: theme.colors.tintTeal }}>
          <Text style={[styles.nextLabel, { color: theme.colors.primary }]}>Next exam</Text>
          <Text style={[styles.nextTitle, { color: theme.colors.textPrimary }]}>
            {next.subjectName}
          </Text>
          <Text style={[styles.nextMeta, { color: theme.colors.textSecondary }]}>
            {[
              exams.formatDate(next.examDate),
              exams.timeAmPm(next.startTime),
              next.examName,
              exams.countdownLabel,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeader title="Filters" icon="options-outline" />
        <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>Exam Group</Text>
        <FilterChips
          options={groupChips}
          activeKey={exams.groupFilter}
          onChange={exams.setGroupFilter}
          size="sm"
        />
        <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>Exam</Text>
        <FilterChips
          options={examChips}
          activeKey={exams.examFilter}
          onChange={exams.setExamFilter}
          size="sm"
        />
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
            onPress={exams.resetFilters}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.colors.primary }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: exams.rows.length ? theme.colors.primary : theme.colors.surfaceAlt,
                opacity: exams.rows.length && !exporting ? 1 : 0.55,
              },
            ]}
            disabled={!exams.rows.length || exporting}
            onPress={() => void onExport()}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="download-outline" size={16} color="#fff" />
            )}
            <Text style={styles.primaryBtnText}>
              {exporting ? 'Preparing…' : 'Download Schedule'}
            </Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      <FilterChips
        options={VIEW_CHIPS}
        activeKey={exams.viewMode}
        onChange={(k) => exams.setViewMode(k as 'list' | 'calendar')}
      />

      {exams.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{exams.error}</Text>
      ) : null}

      {exams.status === 'loading' && exams.allRows.length === 0 ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 16 }} />
      ) : null}

      {/* Overview */}
      <View style={styles.kpiRow}>
        {[
          { label: 'Total', value: String(exams.overview.total) },
          { label: 'Upcoming', value: String(exams.overview.upcoming) },
          { label: 'Subjects', value: String(exams.overview.subjects) },
          { label: 'Hours', value: String(exams.overview.hours) },
        ].map((k) => (
          <View
            key={k.label}
            style={[styles.kpi, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Text style={[styles.kpiValue, { color: theme.colors.textPrimary }]}>{k.value}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>{k.label}</Text>
          </View>
        ))}
      </View>

      {exams.viewMode === 'list' ? (
        <View style={styles.section}>
          <SectionHeader title="Date Sheet" />
          {exams.rows.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No exams scheduled"
              message="Your exam timetable will appear here once papers are assigned."
            />
          ) : (
            <View style={styles.list}>
              {exams.rows.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  dateShort={dateShort(exam.examDate)}
                  timeLabel={exams.timeAmPm(exam.startTime)}
                  onPress={() => exams.setSelectedId(exam.id)}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <SurfaceCard>
          <View style={styles.calNav}>
            <TouchableOpacity style={styles.calNavBtn} onPress={() => exams.shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.calTitle, { color: theme.colors.textPrimary }]}>
              {exams.monthLabel}
            </Text>
            <TouchableOpacity style={styles.calNavBtn} onPress={() => exams.shiftMonth(1)}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.calHeader}>
            {DOW.map((d) => (
              <Text key={d} style={[styles.calDow, { color: theme.colors.textSecondary }]}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.calGrid}>
            {exams.monthCells.map((cell, idx) => {
              const has = cell.exams.length > 0;
              return (
                <TouchableOpacity
                  key={`${cell.date || 'e'}-${idx}`}
                  style={[
                    styles.calCell,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: cell.isToday
                        ? theme.colors.tintTeal
                        : has
                          ? theme.colors.tintBlue
                          : 'transparent',
                    },
                  ]}
                  disabled={!has}
                  onPress={() => has && exams.setSelectedId(cell.exams[0].id)}
                >
                  {cell.day != null ? (
                    <>
                      <Text
                        style={[
                          styles.calDay,
                          {
                            color: cell.isToday
                              ? theme.colors.primary
                              : theme.colors.textPrimary,
                            fontWeight: cell.isToday || has ? '800' : '500',
                          },
                        ]}
                      >
                        {cell.day}
                      </Text>
                      {has ? (
                        <Text
                          style={[styles.calChip, { color: theme.colors.primary }]}
                          numberOfLines={1}
                        >
                          {cell.exams[0].subjectName}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </SurfaceCard>
      )}

      <SurfaceCard>
        <SectionHeader title="Exam Guidelines" icon="shield-checkmark-outline" />
        {exams.guidelines.map((g) => (
          <View key={g} style={styles.guideRow}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={[styles.guideText, { color: theme.colors.textSecondary }]}>{g}</Text>
          </View>
        ))}
      </SurfaceCard>

      {/* Detail sheet */}
      <Modal
        visible={!!exams.selected}
        transparent
        animationType="slide"
        onRequestClose={() => exams.setSelectedId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => exams.setSelectedId(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            {exams.selected ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                  {exams.selected.subjectName}
                </Text>
                <Text style={[styles.sheetSub, { color: theme.colors.textSecondary }]}>
                  {[exams.selected.examName, exams.selected.examGroupName]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {(
                  [
                    ['Date', exams.formatDate(exams.selected.examDate)],
                    ['Time', exams.timeAmPm(exams.selected.startTime)],
                    [
                      'Duration',
                      exams.selected.durationMins
                        ? `${exams.selected.durationMins} minutes`
                        : '—',
                    ],
                    ['Venue', exams.selected.roomNo || '—'],
                    ['Class', exams.selected.className || profile.className || '—'],
                    ['Session', exams.selected.session || '—'],
                    [
                      'Max marks',
                      exams.selected.maxMarks ? String(exams.selected.maxMarks) : '—',
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <View key={label} style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      {label}
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                      {value}
                    </Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => exams.setSelectedId(null)}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 28 },
  heroBlock: { gap: 2 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  heroSub: { fontSize: 13, lineHeight: 18 },
  nextLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  nextTitle: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  nextMeta: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  chipLabel: { fontSize: 11, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  secondaryBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    alignItems: 'center',
  },
  kpiValue: { fontSize: 16, fontWeight: '800' },
  kpiLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  section: { gap: 0 },
  list: { gap: 10 },
  examRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: { fontSize: 14, fontWeight: '800' },
  dateMon: { fontSize: 10 },
  examIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  examInfo: { flex: 1, gap: 2, minWidth: 0 },
  examSubject: { fontSize: 14, fontWeight: '700' },
  examName: { fontSize: 11 },
  examMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  examMetaText: { fontSize: 11, flexShrink: 1 },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  calTitle: { fontSize: 15, fontWeight: '800' },
  calHeader: { flexDirection: 'row', marginBottom: 4 },
  calDow: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%` as unknown as number,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    alignItems: 'center',
  },
  calDay: { fontSize: 12 },
  calChip: { fontSize: 8, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  guideText: { flex: 1, fontSize: 13, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '78%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  sheetSub: { fontSize: 13, marginTop: 4, marginBottom: 14 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  detailLabel: { fontSize: 13, fontWeight: '600' },
  detailValue: { fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  closeBtn: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
