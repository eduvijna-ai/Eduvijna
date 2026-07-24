/**
 * Attendance Calendar — live staff self-attendance month view + mark/submit.
 * Uses staffAttendanceApi via useTeacherMyAttendance (web My Attendance parity).
 * Keeps the existing calendar UI; replaces May-2025 mock fixtures.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  HeroCard,
  SurfaceCard,
  PrimaryButton,
  InfoBanner,
  Avatar,
  ScreenLoader,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherStaffProfile } from '../../../hooks/useTeacherStaffProfile';
import {
  useTeacherMyAttendance,
  type HalfStatus,
  type StaffAttRecord,
} from '../../../hooks/useTeacherMyAttendance';
import type { SelfAttendanceStatus } from '../../../types/domain';
import { toLocalDateStr } from '../../../utils/apiHelpers';

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MARK_OPTIONS: Array<{
  status: SelfAttendanceStatus;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'success' | 'danger' | 'warning' | 'muted';
}> = [
  { status: 'present', label: 'Present', sub: 'Full day', icon: 'checkmark-circle', tone: 'success' },
  { status: 'absent', label: 'Absent', sub: 'Full day', icon: 'close-circle', tone: 'danger' },
  { status: 'late', label: 'Late', sub: 'Present + note', icon: 'time', tone: 'warning' },
  { status: 'half_day', label: 'Half Day', sub: '1st half only', icon: 'contrast', tone: 'muted' },
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function recordToMark(rec?: StaffAttRecord): SelfAttendanceStatus | undefined {
  if (!rec) return undefined;
  const s = (rec.status || '').toLowerCase();
  if (s === 'present') {
    if (/late/i.test(rec.remarks || '')) return 'late';
    return 'present';
  }
  if (s === 'absent') return 'absent';
  if (s === 'half_day' || s === 'half-day') return 'half_day';
  if (s === 'leave') return 'absent';
  // Derive from halves if status blank
  const fh = rec.firstHalf === 'present';
  const sh = rec.secondHalf === 'present';
  if (fh && sh) return /late/i.test(rec.remarks || '') ? 'late' : 'present';
  if (fh || sh) return 'half_day';
  if (!fh && !sh && (rec.firstHalf || rec.secondHalf)) return 'absent';
  return undefined;
}

function markToHalves(
  mark: SelfAttendanceStatus,
): { first: HalfStatus; second: HalfStatus; remarks?: string } {
  switch (mark) {
    case 'absent':
      return { first: 'absent', second: 'absent' };
    case 'half_day':
      return { first: 'present', second: 'absent' };
    case 'late':
      return { first: 'present', second: 'present', remarks: 'Late' };
    default:
      return { first: 'present', second: 'present' };
  }
}

function formatLongDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AttendanceCalendarScreen() {
  const theme = useTeacherTheme();
  const { profile } = useTeacherStaffProfile();
  const m = useTeacherMyAttendance();

  const today = useMemo(() => new Date(), []);
  const todayStr = m.todayStr || toLocalDateStr(today);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [marked, setMarked] = useState<SelfAttendanceStatus>('present');
  const [note, setNote] = useState('');

  // Load month view for calendar dots
  useEffect(() => {
    m.setViewPeriod('month');
  }, [m.setViewPeriod]);

  // Prefill mark when selected day / records change
  useEffect(() => {
    const rec = m.recordMap[selectedDate];
    const next = recordToMark(rec) || 'present';
    setMarked(next);
    if (rec?.remarks && !/^Late$/i.test(rec.remarks)) {
      setNote(rec.remarks.replace(/^Late\s*[·-]?\s*/i, '').trim());
    } else {
      setNote('');
    }
  }, [selectedDate, m.recordMap]);

  const daysInMonth = useMemo(
    () => new Date(m.year, m.month, 0).getDate(),
    [m.year, m.month],
  );
  const firstWeekday = useMemo(
    () => new Date(m.year, m.month - 1, 1).getDay(),
    [m.year, m.month],
  );

  const markByDay = useMemo(() => {
    const map: Record<number, SelfAttendanceStatus> = {};
    Object.values(m.recordMap).forEach((rec) => {
      if (!rec.date.startsWith(`${m.year}-${pad2(m.month)}`)) return;
      const day = Number(rec.date.slice(8, 10));
      const mark = recordToMark(rec);
      if (day && mark) map[day] = mark;
    });
    return map;
  }, [m.recordMap, m.year, m.month]);

  const cells: Array<number | null> = useMemo(
    () => [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ],
    [firstWeekday, daysInMonth],
  );

  const toneColor = (tone: 'success' | 'danger' | 'warning' | 'muted'): string => {
    switch (tone) {
      case 'success':
        return theme.colors.success;
      case 'danger':
        return theme.colors.danger;
      case 'warning':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  const statusDotColor = (status?: SelfAttendanceStatus): string | undefined => {
    if (!status) return undefined;
    if (status === 'present') return theme.colors.success;
    if (status === 'absent') return theme.colors.danger;
    if (status === 'late') return theme.colors.warning;
    return theme.colors.textSecondary;
  };

  const legend = [
    { label: 'Present', color: theme.colors.success },
    { label: 'Absent', color: theme.colors.danger },
    { label: 'Late', color: theme.colors.warning },
    { label: 'Half Day', color: theme.colors.textSecondary },
  ];

  const goPrevMonth = () => {
    if (m.month === 1) {
      m.setMonth(12);
      m.setYear(m.year - 1);
    } else {
      m.setMonth(m.month - 1);
    }
  };

  const goNextMonth = () => {
    if (m.month === 12) {
      m.setMonth(1);
      m.setYear(m.year + 1);
    } else {
      m.setMonth(m.month + 1);
    }
  };

  const jumpToday = () => {
    const now = new Date();
    m.setMonth(now.getMonth() + 1);
    m.setYear(now.getFullYear());
    setSelectedDate(todayStr);
  };

  const onSelectDay = (day: number) => {
    setSelectedDate(dateKey(m.year, m.month, day));
  };

  const onSubmit = async () => {
    if (selectedDate > todayStr) {
      Alert.alert('Future date', 'You cannot mark attendance for a future date.');
      return;
    }
    const halves = markToHalves(marked);
    const remarks =
      marked === 'late'
        ? [halves.remarks, note.trim()].filter(Boolean).join(' · ')
        : note.trim() || undefined;
    const ok = await m.submitForDate(selectedDate, halves.first, halves.second, remarks);
    if (ok) {
      Alert.alert('Submitted', `Attendance marked for ${formatLongDate(selectedDate)}.`);
    } else {
      Alert.alert('Submit failed', m.selfMsg || m.error || 'Could not submit attendance.');
    }
  };

  const nowLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }, []);

  if (m.status === 'idle' || m.status === 'loading') {
    return (
      <TeacherScreen header={<ScreenHeader title="Mark My Attendance" />}>
        <ScreenLoader message="Loading attendance…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title="Mark My Attendance" />}
      contentStyle={styles.content}
      refreshing={m.status === 'loading' || m.saving}
      onRefresh={() => void m.refetch()}
      footer={
        <PrimaryButton
          label={m.saving ? 'Submitting…' : 'Submit Attendance'}
          icon="finger-print"
          variant="gradient"
          disabled={m.saving || selectedDate > todayStr}
          onPress={() => void onSubmit()}
        />
      }
    >
      <HeroCard>
        <View style={styles.heroRow}>
          <Avatar name={profile.name} uri={profile.avatarUrl} size={52} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{profile.name}</Text>
            <View style={styles.heroRoleRow}>
              <Text style={styles.heroRole}>{profile.role}</Text>
              {profile.employeeId && profile.employeeId !== '—' ? (
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>{profile.employeeId}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMeta}>
            <Ionicons name="calendar-outline" size={15} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroMetaText}>
              Today, {formatLongDate(todayStr)}
            </Text>
          </View>
          <View style={styles.heroMeta}>
            <Ionicons name="time-outline" size={15} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroMetaText}>{nowLabel}</Text>
          </View>
        </View>
      </HeroCard>

      {m.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{m.error}</Text>
      ) : null}

      <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>Select Date</Text>
      <SurfaceCard>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={goPrevMonth} accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.colors.textPrimary }]}>
            {MONTH_NAMES[m.month - 1]} {m.year}
          </Text>
          <TouchableOpacity onPress={goNextMonth} accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {WEEK_LABELS.map((label) => (
            <Text key={label} style={[styles.weekLabel, { color: theme.colors.textSecondary }]}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((day, index) => {
            if (day === null) return <View key={`blank-${index}`} style={styles.cell} />;
            const iso = dateKey(m.year, m.month, day);
            const selected = iso === selectedDate;
            const isToday = iso === todayStr;
            const isFuture = iso > todayStr;
            const dot = statusDotColor(markByDay[day]);
            return (
              <TouchableOpacity
                key={day}
                style={styles.cell}
                onPress={() => onSelectDay(day)}
                accessibilityRole="button"
                accessibilityLabel={`${MONTH_NAMES[m.month - 1]} ${day}`}
                accessibilityState={{ selected }}
              >
                <View
                  style={[
                    styles.dayWrap,
                    selected && { backgroundColor: theme.colors.primary },
                    !selected && isToday && {
                      borderWidth: 1.5,
                      borderColor: theme.colors.primary,
                    },
                    isFuture && { opacity: 0.4 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: selected ? '#FFFFFF' : theme.colors.textPrimary },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
                {dot ? (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: selected ? '#FFFFFF' : dot },
                    ]}
                  />
                ) : (
                  <View style={styles.dot} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={[styles.legend, { borderTopColor: theme.colors.border }]}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={{ backgroundColor: theme.colors.tintGreen }}>
        <View style={styles.selectedRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.success} />
          <Text style={[styles.selectedText, { color: theme.colors.textPrimary }]}>
            Selected: {formatLongDate(selectedDate)}
          </Text>
          <TouchableOpacity
            style={[styles.todayBtn, { borderColor: theme.colors.primary }]}
            onPress={jumpToday}
          >
            <Text style={[styles.todayText, { color: theme.colors.primary }]}>Today</Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
        Mark Attendance
      </Text>
      <View style={styles.markRow}>
        {MARK_OPTIONS.map((option) => {
          const active = marked === option.status;
          const color = toneColor(option.tone);
          return (
            <TouchableOpacity
              key={option.status}
              style={[
                styles.markCard,
                theme.shadow.light,
                {
                  backgroundColor: active ? color + '18' : theme.colors.surface,
                  borderColor: active ? color : theme.colors.border,
                  borderRadius: theme.radius.card,
                },
              ]}
              onPress={() => setMarked(option.status)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
            >
              <Ionicons name={option.icon} size={22} color={color} />
              <Text style={[styles.markLabel, { color: theme.colors.textPrimary }]}>
                {option.label}
              </Text>
              <Text style={[styles.markSub, { color: theme.colors.textSecondary }]}>
                {option.sub}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Add Note (Optional)
      </Text>
      <View
        style={[
          styles.noteWrap,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.input,
          },
        ]}
      >
        <Ionicons name="chatbox-outline" size={16} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.noteInput, { color: theme.colors.textPrimary }]}
          placeholder="Write a note…"
          placeholderTextColor={theme.colors.textSecondary}
          value={note}
          onChangeText={(text) => setNote(text.slice(0, 100))}
          maxLength={100}
        />
        <Text style={[styles.noteCount, { color: theme.colors.textSecondary }]}>
          {note.length}/100
        </Text>
      </View>

      {m.recordMap[selectedDate] ? (
        <InfoBanner
          tone="info"
          text={`Existing record: ${m.recordMap[selectedDate].status} · approval ${m.recordMap[selectedDate].approvalStatus}. Submitting again will update it.`}
        />
      ) : (
        <InfoBanner
          text="Attendance is submitted for admin approval (same as web My Attendance)."
          icon="shield-checkmark-outline"
        />
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroInfo: { flex: 1, gap: 3 },
  heroName: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  heroRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroRole: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  idBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroMetaRow: { marginTop: 14, gap: 6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroMetaText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, flexShrink: 1 },

  sectionLabel: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitle: { fontSize: 16, fontWeight: '700' },
  weekRow: { flexDirection: 'row' },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  cell: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  dayWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 14, fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },

  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedText: { flex: 1, fontSize: 13, fontWeight: '600' },
  todayBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  todayText: { fontSize: 12, fontWeight: '700' },

  markRow: { flexDirection: 'row', gap: 10 },
  markCard: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 4,
  },
  markLabel: { fontSize: 13, fontWeight: '700' },
  markSub: { fontSize: 10, textAlign: 'center' },

  fieldLabel: { fontSize: 13, fontWeight: '600' },
  noteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noteInput: { flex: 1, fontSize: 14, padding: 0 },
  noteCount: { fontSize: 11 },
});
