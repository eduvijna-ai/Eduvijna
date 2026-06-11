/**
 * Attendance Calendar — month view of self attendance + mark for selected date.
 * Reference: assets/teachers_screens/teachers_own_attandance_marking_screen.png
 */

import React, { useMemo, useState } from 'react';
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
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { teacherProfile, selfCalendarMarks } from '../../../data';
import type { SelfAttendanceStatus } from '../../../types/domain';

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_IN_MAY = 31;
const FIRST_WEEKDAY = 4; // 1 May 2025 = Thursday (index 4)
const SELECTED_DEFAULT = 12;

const MARK_OPTIONS: Array<{ status: SelfAttendanceStatus; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap; tone: 'success' | 'danger' | 'warning' | 'muted' }> = [
  { status: 'present', label: 'Present', sub: 'I was present', icon: 'checkmark-circle', tone: 'success' },
  { status: 'absent', label: 'Absent', sub: 'I was absent', icon: 'close-circle', tone: 'danger' },
  { status: 'late', label: 'Late', sub: 'I was late', icon: 'time', tone: 'warning' },
  { status: 'half_day', label: 'Half Day', sub: 'Half day', icon: 'contrast', tone: 'muted' },
];

export default function AttendanceCalendarScreen() {
  const theme = useTeacherTheme();
  const [selectedDay, setSelectedDay] = useState(SELECTED_DEFAULT);
  const [marked, setMarked] = useState<SelfAttendanceStatus>('present');
  const [note, setNote] = useState('');

  const toneColor = (tone: 'success' | 'danger' | 'warning' | 'muted'): string => {
    switch (tone) {
      case 'success': return theme.colors.success;
      case 'danger': return theme.colors.danger;
      case 'warning': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const markByDay = useMemo(() => {
    const map: Record<number, SelfAttendanceStatus> = {};
    selfCalendarMarks.forEach((mark) => {
      const day = Number(mark.date.split('-')[2]);
      map[day] = mark.status;
    });
    return map;
  }, []);

  const statusDotColor = (status?: SelfAttendanceStatus): string | undefined => {
    if (!status) return undefined;
    if (status === 'present') return theme.colors.success;
    if (status === 'absent') return theme.colors.danger;
    if (status === 'late') return theme.colors.warning;
    return theme.colors.textSecondary;
  };

  const cells: Array<number | null> = [
    ...Array.from({ length: FIRST_WEEKDAY }, () => null),
    ...Array.from({ length: DAYS_IN_MAY }, (_, i) => i + 1),
  ];

  const legend = [
    { label: 'Present', color: theme.colors.success },
    { label: 'Absent', color: theme.colors.danger },
    { label: 'Late', color: theme.colors.warning },
    { label: 'Half Day', color: theme.colors.textSecondary },
  ];

  return (
    <TeacherScreen
      header={<ScreenHeader title="Mark My Attendance" trailingIcon="ellipsis-horizontal" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Submit Attendance" icon="finger-print" variant="gradient" onPress={() => Alert.alert('Submitted', `Marked as ${marked} for May ${selectedDay} (demo).`)} />}
    >
      <HeroCard>
        <View style={styles.heroRow}>
          <Avatar name={teacherProfile.name} uri={teacherProfile.avatarUrl} size={52} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{teacherProfile.name}</Text>
            <View style={styles.heroRoleRow}>
              <Text style={styles.heroRole}>{teacherProfile.role}</Text>
              <View style={styles.idBadge}><Text style={styles.idBadgeText}>{teacherProfile.employeeId}</Text></View>
            </View>
          </View>
        </View>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMeta}>
            <Ionicons name="calendar-outline" size={15} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroMetaText}>Today, 12 May 2025 · Monday</Text>
          </View>
          <View style={styles.heroMeta}>
            <Ionicons name="time-outline" size={15} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroMetaText}>09:41 AM</Text>
          </View>
        </View>
      </HeroCard>

      <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>Select Date</Text>
      <SurfaceCard>
        <View style={styles.monthHeader}>
          <TouchableOpacity accessibilityLabel="Previous month"><Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} /></TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.colors.textPrimary }]}>May 2025</Text>
          <TouchableOpacity accessibilityLabel="Next month"><Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} /></TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {WEEK_LABELS.map((label) => (
            <Text key={label} style={[styles.weekLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((day, index) => {
            if (day === null) return <View key={`blank-${index}`} style={styles.cell} />;
            const selected = day === selectedDay;
            const dot = statusDotColor(markByDay[day]);
            return (
              <TouchableOpacity
                key={day}
                style={styles.cell}
                onPress={() => setSelectedDay(day)}
                accessibilityRole="button"
                accessibilityLabel={`May ${day}`}
                accessibilityState={{ selected }}
              >
                <View style={[styles.dayWrap, selected && { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.dayText, { color: selected ? '#FFFFFF' : theme.colors.textPrimary }]}>{day}</Text>
                </View>
                {dot ? <View style={[styles.dot, { backgroundColor: selected ? '#FFFFFF' : dot }]} /> : <View style={styles.dot} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={[styles.legend, { borderTopColor: theme.colors.border }]}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={{ backgroundColor: theme.colors.tintGreen }}>
        <View style={styles.selectedRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.success} />
          <Text style={[styles.selectedText, { color: theme.colors.textPrimary }]}>Selected Date: Monday, {selectedDay} May 2025</Text>
          <TouchableOpacity style={[styles.todayBtn, { borderColor: theme.colors.primary }]} onPress={() => setSelectedDay(SELECTED_DEFAULT)}>
            <Text style={[styles.todayText, { color: theme.colors.primary }]}>Today</Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>Mark Attendance</Text>
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
              <Text style={[styles.markLabel, { color: theme.colors.textPrimary }]}>{option.label}</Text>
              <Text style={[styles.markSub, { color: theme.colors.textSecondary }]}>{option.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Add Note (Optional)</Text>
      <View style={[styles.noteWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.input }]}>
        <Ionicons name="chatbox-outline" size={16} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.noteInput, { color: theme.colors.textPrimary }]}
          placeholder="Write a note…"
          placeholderTextColor={theme.colors.textSecondary}
          value={note}
          onChangeText={(text) => setNote(text.slice(0, 100))}
          maxLength={100}
        />
        <Text style={[styles.noteCount, { color: theme.colors.textSecondary }]}>{note.length}/100</Text>
      </View>

      <InfoBanner text="Your location will be captured for verification" icon="location-outline" />
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
  idBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  idBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroMetaRow: { marginTop: 14, gap: 6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroMetaText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },

  sectionLabel: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthTitle: { fontSize: 16, fontWeight: '700' },
  weekRow: { flexDirection: 'row' },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dayWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },

  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedText: { flex: 1, fontSize: 13, fontWeight: '600' },
  todayBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  todayText: { fontSize: 12, fontWeight: '700' },

  markRow: { flexDirection: 'row', gap: 10 },
  markCard: { flex: 1, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center', gap: 4 },
  markLabel: { fontSize: 13, fontWeight: '700' },
  markSub: { fontSize: 10, textAlign: 'center' },

  fieldLabel: { fontSize: 13, fontWeight: '600' },
  noteWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 48, borderWidth: StyleSheet.hairlineWidth },
  noteInput: { flex: 1, fontSize: 14, padding: 0 },
  noteCount: { fontSize: 11 },
});
