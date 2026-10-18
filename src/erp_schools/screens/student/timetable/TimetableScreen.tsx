/**
 * Student Timetable — web TimetableTab PersonalWeeklyTimetable parity.
 * Data: myStudentTimetable + templates effective-range filter.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  SectionHeader,
  FilterChips,
  EmptyState,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors } from '../../../theme/accents';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import { STUDENT_TABS } from '../../../navigation/studentRoutes';
import {
  useStudentTimetable,
  fmtSlotTime,
  slotAccent,
  type StudentTimetableSlot,
} from '../../../hooks/useStudentTimetable';

const VIEW_CHIPS: ChipOption[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

function teacherRoomLabel(slot: StudentTimetableSlot): string {
  const teacher = slot.teacherName || 'Teacher not assigned';
  const room = slot.room || 'Room not assigned';
  return `${teacher} · ${room}`;
}

export default function TimetableScreen() {
  const theme = useTeacherTheme();
  const route = useRoute();
  const isTab = route.name === STUDENT_TABS.TIMETABLE;
  const { selectedYear } = useAcademicYear();
  const tt = useStudentTimetable();
  const [downloading, setDownloading] = useState(false);

  const refetchRef = useRef(tt.refetch);
  refetchRef.current = tt.refetch;
  const onRefresh = useCallback(() => {
    void refetchRef.current();
  }, []);

  const onDownload = useCallback(async () => {
    if (!tt.hasSlots || downloading) return;
    setDownloading(true);
    try {
      const { downloadStudentTimetablePdf } = await import('../../../utils/studentTimetablePdf');
      await downloadStudentTimetablePdf({
        weekLabel: tt.weekLabel,
        periodRows: tt.periodRows,
        slotMap: tt.slotMap,
        totalPeriods: tt.weekVisibleCount,
        scheduledDays: tt.teachingDays,
        todayClasses: tt.todayPeriodCount,
      });
    } finally {
      setDownloading(false);
    }
  }, [
    downloading,
    tt.hasSlots,
    tt.weekLabel,
    tt.periodRows,
    tt.slotMap,
    tt.weekVisibleCount,
    tt.teachingDays,
    tt.todayPeriodCount,
  ]);

  return (
    <TeacherScreen
      header={
        <StudentModuleHeader
          title="Timetable"
          showBack={!isTab}
          trailingIcon="refresh-outline"
          onTrailingPress={onRefresh}
          trailingAccessibilityLabel="Refresh timetable"
        />
      }
      contentStyle={styles.content}
      refreshing={tt.status === 'loading'}
      onRefresh={onRefresh}
    >
      <View style={styles.heroBlock}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>My Schedule</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Your weekly class schedule, teachers, rooms, and today&apos;s lessons.
        </Text>
        {selectedYear?.name ? (
          <Text style={[styles.ayHint, { color: theme.colors.textSecondary }]}>
            Academic Year · {selectedYear.name.replace(/Academic Year\s*/i, '')}
          </Text>
        ) : null}
        <View style={[styles.badge, { backgroundColor: theme.colors.tintTeal }]}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          <Text style={[styles.badgeText, { color: theme.colors.primary }]}>{tt.weekLabel}</Text>
        </View>
      </View>

      <FilterChips
        options={VIEW_CHIPS}
        activeKey={tt.viewMode}
        onChange={(k) => tt.setViewMode(k as 'weekly' | 'monthly')}
      />

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
          onPress={onRefresh}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
          <Text style={[styles.secondaryBtnText, { color: theme.colors.primary }]}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: tt.hasSlots ? theme.colors.primary : theme.colors.surfaceAlt,
              opacity: tt.hasSlots && !downloading ? 1 : 0.55,
            },
          ]}
          onPress={() => void onDownload()}
          disabled={!tt.hasSlots || downloading}
          activeOpacity={0.85}
        >
          {downloading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="download-outline" size={16} color="#FFFFFF" />
          )}
          <Text style={styles.primaryBtnText}>
            {downloading ? 'Preparing…' : 'Download Timetable'}
          </Text>
        </TouchableOpacity>
      </View>

      {tt.viewMode === 'weekly' ? (
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={[
              styles.navBtn,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            ]}
            onPress={() => tt.setWeekOffset((v) => v - 1)}
            accessibilityLabel="Previous week"
          >
            <Ionicons name="chevron-back" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.weekPill,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            ]}
            onPress={() => tt.setWeekOffset(0)}
          >
            <Ionicons name="calendar-outline" size={15} color={theme.colors.primary} />
            <Text style={[styles.weekText, { color: theme.colors.textPrimary }]}>
              {tt.weekLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navBtn,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            ]}
            onPress={() => tt.setWeekOffset((v) => v + 1)}
            accessibilityLabel="Next week"
          >
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={[
              styles.navBtn,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            ]}
            onPress={() =>
              tt.setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
            }
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.weekPill,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            ]}
            onPress={() => tt.setMonthDate(new Date())}
          >
            <Ionicons name="calendar-outline" size={15} color={theme.colors.primary} />
            <Text style={[styles.weekText, { color: theme.colors.textPrimary }]}>
              {tt.monthLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navBtn,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            ]}
            onPress={() =>
              tt.setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
            }
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {!tt.isCurrentWeek && tt.viewMode === 'weekly' ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          Recurring weekly schedule
        </Text>
      ) : null}

      {tt.status === 'loading' && !tt.hasSlots ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : null}
      {tt.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{tt.error}</Text>
      ) : null}

      {tt.viewMode === 'weekly' ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysRow}
          >
            {tt.weekDays.map((day) => {
              if (!day) return null;
              const active = day.key === tt.selectedDay;
              const highlight = day.isToday;
              return (
                <TouchableOpacity
                  key={String(day.key)}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : highlight
                          ? theme.colors.tintTeal
                          : theme.colors.surface,
                      borderColor:
                        active || highlight ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => tt.setSelectedDay(day.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      { color: active ? '#FFFFFF' : theme.colors.textPrimary },
                    ]}
                  >
                    {day.label}
                  </Text>
                  <Text
                    style={[
                      styles.dayDate,
                      {
                        color: active
                          ? 'rgba(255,255,255,0.9)'
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {day.dateLabel}
                    {day.isToday ? ' · Today' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <SurfaceCard padded={false} style={styles.tableCard}>
            <View style={[styles.tableHead, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={[styles.headPeriod, { color: theme.colors.textSecondary }]}>
                Period / Time
              </Text>
              <Text style={[styles.headDay, { color: theme.colors.textPrimary }]}>
                {tt.selectedChip
                  ? `${tt.selectedChip.full}${tt.selectedChip.isToday ? ' · TODAY' : ''} · ${tt.selectedChip.dateLabel}`
                  : ''}
              </Text>
            </View>

            {!tt.hasSlots ? (
              <EmptyState
                icon="calendar-outline"
                title="No timetable slots"
                message="No timetable slots are assigned yet."
              />
            ) : tt.selectedDayEntries.length === 0 ? (
              <View style={styles.emptyDay}>
                <Ionicons name="cafe-outline" size={28} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No periods scheduled for this day.
                </Text>
              </View>
            ) : (
              tt.selectedDayEntries.map((entry) =>
                entry.kind === 'free' ? (
                  <FreeRow
                    key={`free-${entry.period}`}
                    period={entry.period}
                    start={entry.start}
                    end={entry.end}
                  />
                ) : (
                  <SlotRow key={entry.slot.id} slot={entry.slot} />
                ),
              )
            )}
          </SurfaceCard>
        </>
      ) : (
        <SurfaceCard>
          <SectionHeader title={tt.monthLabel} />
          <View style={styles.monthHeader}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <Text key={d} style={[styles.monthDow, { color: theme.colors.textSecondary }]}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.monthGrid}>
            {tt.monthCells.map((cell, index) => (
              <View
                key={`m-${index}`}
                style={[
                  styles.monthCell,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: cell.isToday
                      ? theme.colors.tintTeal
                      : theme.colors.surfaceAlt,
                  },
                ]}
              >
                {cell.day != null ? (
                  <>
                    <Text
                      style={[
                        styles.monthDayNum,
                        {
                          color: cell.isToday
                            ? theme.colors.primary
                            : theme.colors.textPrimary,
                          fontWeight: cell.isToday ? '800' : '600',
                        },
                      ]}
                    >
                      {cell.day}
                    </Text>
                    {cell.slots.slice(0, 2).map((s) => (
                      <Text
                        key={s.id}
                        numberOfLines={1}
                        style={[styles.monthSlot, { color: theme.colors.textSecondary }]}
                      >
                        {s.subjectName}
                      </Text>
                    ))}
                    {cell.slots.length > 2 ? (
                      <Text style={{ fontSize: 9, color: theme.colors.primary }}>
                        +{cell.slots.length - 2}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            ))}
          </View>
        </SurfaceCard>
      )}

      <SurfaceCard>
        <SectionHeader title="Today's Classes" />
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}
        </Text>
        {tt.todayIndex > 5 || tt.todaySlots.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, paddingVertical: 8 }}>
            No classes scheduled today.
          </Text>
        ) : (
          tt.todaySlots.map((slot) => {
            const accent = accentColors(theme.colors, slotAccent(slot.slotType));
            return (
              <View
                key={`today-${slot.id}`}
                style={[styles.todayRow, { borderBottomColor: theme.colors.border }]}
              >
                <Text style={[styles.todayTime, { color: theme.colors.textSecondary }]}>
                  {fmtSlotTime(slot.startTime)}
                </Text>
                <View style={[styles.todayBar, { borderLeftColor: accent.fg }]}>
                  <Text style={[styles.todaySubject, { color: theme.colors.textPrimary }]}>
                    {slot.subjectName}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {teacherRoomLabel(slot)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </SurfaceCard>

      <SurfaceCard style={{ marginBottom: 24 }}>
        <SectionHeader title="Weekly Overview" />
        {(
          [
            ['Total periods', tt.weekVisibleCount],
            ['Scheduled days', tt.teachingDays],
            ["Today's classes", tt.todayPeriodCount],
          ] as const
        ).map(([label, value]) => (
          <View
            key={label}
            style={[styles.overviewRow, { borderBottomColor: theme.colors.border }]}
          >
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{label}</Text>
            <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 14 }}>
              {value}
            </Text>
          </View>
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

function FreeRow({
  period,
  start,
  end,
}: {
  period: number;
  start?: string;
  end?: string;
}) {
  const theme = useTeacherTheme();
  return (
    <View style={[styles.periodRow, { borderTopColor: theme.colors.border }]}>
      <View style={styles.periodMeta}>
        <Text style={[styles.periodNo, { color: theme.colors.textPrimary }]}>
          P{period > 0 ? period : '—'}
        </Text>
        <Text style={[styles.periodTime, { color: theme.colors.textSecondary }]}>
          {fmtSlotTime(start)}
        </Text>
        <Text style={[styles.periodTime, { color: theme.colors.textSecondary }]}>
          {fmtSlotTime(end)}
        </Text>
      </View>
      <View style={[styles.freeCard, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Text style={{ color: theme.colors.textSecondary, fontWeight: '700', letterSpacing: 0.5 }}>
          FREE
        </Text>
      </View>
    </View>
  );
}

function SlotRow({ slot }: { slot: StudentTimetableSlot }) {
  const theme = useTeacherTheme();
  const accent = accentColors(theme.colors, slotAccent(slot.slotType));
  return (
    <View style={[styles.periodRow, { borderTopColor: theme.colors.border }]}>
      <View style={styles.periodMeta}>
        <Text style={[styles.periodNo, { color: theme.colors.textPrimary }]}>
          P{slot.periodNumber > 0 ? slot.periodNumber : '—'}
        </Text>
        <Text style={[styles.periodTime, { color: theme.colors.textSecondary }]}>
          {fmtSlotTime(slot.startTime)}
        </Text>
        <Text style={[styles.periodTime, { color: theme.colors.textSecondary }]}>
          {fmtSlotTime(slot.endTime)}
        </Text>
      </View>
      <View
        style={[
          styles.periodCard,
          { backgroundColor: accent.bg, borderLeftColor: accent.fg },
        ]}
      >
        <View style={styles.periodInfo}>
          <Text style={[styles.periodSubject, { color: accent.fg }]}>{slot.subjectName}</Text>
          <Text style={[styles.periodTopic, { color: theme.colors.textSecondary }]}>
            {slot.teacherName || 'Teacher not assigned'}
          </Text>
          <Text style={[styles.periodRoom, { color: theme.colors.textSecondary }]}>
            {slot.room || 'Room not assigned'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 28 },
  heroBlock: { gap: 4 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  ayHint: { fontSize: 12, marginTop: 2 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
  },
  weekText: { fontSize: 13, fontWeight: '700' },

  daysRow: { gap: 8, paddingVertical: 2 },
  dayChip: {
    minWidth: 72,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dayLabel: { fontSize: 12, fontWeight: '700' },
  dayDate: { fontSize: 10, marginTop: 2 },

  tableCard: { overflow: 'hidden' },
  tableHead: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, gap: 8 },
  headPeriod: { width: 78, fontSize: 11, fontWeight: '700' },
  headDay: { flex: 1, fontSize: 12, fontWeight: '700' },

  periodRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  periodMeta: { width: 78, paddingVertical: 12, paddingHorizontal: 10, gap: 1 },
  periodNo: { fontSize: 13, fontWeight: '700' },
  periodTime: { fontSize: 10 },
  periodCard: {
    flex: 1,
    margin: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  freeCard: {
    flex: 1,
    margin: 8,
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodInfo: { flex: 1, gap: 2 },
  periodSubject: { fontSize: 14, fontWeight: '800' },
  periodTopic: { fontSize: 12 },
  periodRoom: { fontSize: 11, marginTop: 2 },

  emptyDay: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyText: { fontSize: 13 },

  todayRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  todayTime: { width: 64, fontSize: 11, fontWeight: '700' },
  todayBar: { flex: 1, borderLeftWidth: 3, paddingLeft: 10 },
  todaySubject: { fontSize: 13, fontWeight: '800' },

  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  monthHeader: { flexDirection: 'row', marginBottom: 6 },
  monthDow: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: {
    width: `${100 / 7}%` as unknown as number,
    minHeight: 58,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
  },
  monthDayNum: { fontSize: 11 },
  monthSlot: { fontSize: 9, marginTop: 1 },
});
