/**
 * Timetable — day selector + period-by-period schedule with break rows.
 * Reference: assets/student_screens/student timetable screen.png
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentIdentityHeader,
  SurfaceCard,
  AcademicYearPill,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';
import { useStudentUIStore } from '../../../store/studentUI.store';
import type { TimetableSlot } from '../../../types/student';

export default function TimetableScreen() {
  const theme = useTeacherTheme();
  const { profile, timetable, academicYears } = useStudentData();
  const academicYear = useStudentUIStore((s) => s.academicYear);
  const setAcademicYear = useStudentUIStore((s) => s.setAcademicYear);
  const [activeDay, setActiveDay] = useState(timetable.week.find((d) => d.isToday)?.key ?? timetable.week[0].key);

  const day = timetable.week.find((d) => d.key === activeDay) ?? timetable.week[0];

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Time Table"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
          trailingIcon="calendar-outline"
          rightSlot={<AcademicYearPill value={academicYear} options={academicYears} onChange={setAcademicYear} />}
        />
      }
      contentStyle={styles.content}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
        {timetable.week.map((d) => {
          const active = d.key === activeDay;
          return (
            <TouchableOpacity
              key={d.key}
              style={[
                styles.dayChip,
                { borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? theme.colors.primary : theme.colors.surface },
              ]}
              onPress={() => setActiveDay(d.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${d.weekday} ${d.dateLabel}`}
            >
              <Text style={[styles.dayWeekday, { color: active ? '#FFFFFF' : theme.colors.textPrimary }]}>{d.weekday}</Text>
              <Text style={[styles.dayDate, { color: active ? 'rgba(255,255,255,0.85)' : theme.colors.textSecondary }]}>{d.dateLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <SurfaceCard style={[styles.timingCard, { backgroundColor: theme.colors.tintBlue }]}>
        <View style={styles.timingRow}>
          <Ionicons name="time-outline" size={18} color={theme.colors.info} />
          <View style={styles.timingInfo}>
            <Text style={[styles.timingTitle, { color: theme.colors.textPrimary }]}>School Timing: {timetable.timing.range}</Text>
            <Text style={[styles.timingSub, { color: theme.colors.textSecondary }]}>Total Periods: {timetable.timing.totalPeriods}</Text>
          </View>
          <Text style={[styles.timingLink, { color: theme.colors.info }]}>View Timing Rules ›</Text>
        </View>
      </SurfaceCard>

      <SurfaceCard padded={false} style={styles.scheduleCard}>
        {day.slots.map((slot, index) => (
          <SlotRow key={slot.id} slot={slot} last={index === day.slots.length - 1} />
        ))}
      </SurfaceCard>

      <View style={styles.footerNote}>
        <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>Timetable is subject to change. Please check regularly for updates.</Text>
      </View>
    </TeacherScreen>
  );
}

function SlotRow({ slot, last }: { slot: TimetableSlot; last: boolean }) {
  const theme = useTeacherTheme();
  const border = last ? {} : { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth };

  if (slot.kind === 'break') {
    return (
      <View style={[styles.breakRow, { backgroundColor: theme.colors.tintGreen }, border]}>
        <Ionicons name={(slot.icon ?? 'cafe-outline') as keyof typeof Ionicons.glyphMap} size={16} color={theme.colors.success} />
        <Text style={[styles.breakTime, { color: theme.colors.success }]}>{slot.startTime} - {slot.endTime}</Text>
        <Text style={[styles.breakLabel, { color: theme.colors.success }]}>{slot.topic}</Text>
      </View>
    );
  }

  const accent = accentColors(theme.colors, slot.accent ?? 'teal');
  return (
    <View style={[styles.slotRow, border]}>
      <View style={[styles.periodNo, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Text style={[styles.periodNoText, { color: theme.colors.textPrimary }]}>{slot.periodNo}</Text>
      </View>
      <Text style={[styles.slotTime, { color: theme.colors.textSecondary }]}>{slot.startTime}{'\n'}{slot.endTime}</Text>
      <View style={[styles.slotIcon, { backgroundColor: accent.bg }]}>
        <Ionicons name={(slot.icon ?? 'book-outline') as keyof typeof Ionicons.glyphMap} size={16} color={accent.fg} />
      </View>
      <View style={styles.slotInfo}>
        <Text style={[styles.slotSubject, { color: theme.colors.textPrimary }]} numberOfLines={1}>{slot.subject}</Text>
        <Text style={[styles.slotTopic, { color: theme.colors.textSecondary }]} numberOfLines={1}>{slot.topic}</Text>
        <Text style={[styles.slotTeacher, { color: theme.colors.textSecondary }]} numberOfLines={1}>{slot.teacher} • {slot.room}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  daysRow: { gap: 8, paddingRight: 16 },
  dayChip: { width: 64, paddingVertical: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 2 },
  dayWeekday: { fontSize: 13, fontWeight: '700' },
  dayDate: { fontSize: 10 },
  timingCard: { paddingVertical: 12 },
  timingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timingInfo: { flex: 1 },
  timingTitle: { fontSize: 13, fontWeight: '700' },
  timingSub: { fontSize: 12, marginTop: 1 },
  timingLink: { fontSize: 11, fontWeight: '600' },
  scheduleCard: { overflow: 'hidden' },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12 },
  periodNo: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  periodNoText: { fontSize: 12, fontWeight: '700' },
  slotTime: { width: 56, fontSize: 10, lineHeight: 14 },
  slotIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  slotInfo: { flex: 1, gap: 1 },
  slotSubject: { fontSize: 13, fontWeight: '700' },
  slotTopic: { fontSize: 11 },
  slotTeacher: { fontSize: 10 },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  breakTime: { fontSize: 11, fontWeight: '700' },
  breakLabel: { fontSize: 12, fontWeight: '600' },
  footerNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  footerText: { flex: 1, fontSize: 11, lineHeight: 15 },
});
