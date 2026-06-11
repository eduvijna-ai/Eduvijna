/**
 * Class Timetable — weekday period schedule.
 * Reference: assets/teachers_screens/teachers_class_timetable.png
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  ClassContextBanner,
  SurfaceCard,
  InfoBanner,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors } from '../../../theme/accents';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { weekDays, timetableByDay } from '../../../data';
import type { TeacherStackParamList } from '../../../types/navigation';
import type { TimetableEntry } from '../../../types/domain';

export default function TimetableScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'Timetable'>>();
  const { getClassById } = useTeacherData();
  const classInfo = getClassById(route.params?.classId);
  const [activeDay, setActiveDay] = useState('mon');

  const entries = timetableByDay[activeDay] ?? [];
  const activeLabel = weekDays.find((d) => d.key === activeDay);

  return (
    <TeacherScreen
      header={<ScreenHeader title="Class Timetable" trailingIcon="ellipsis-horizontal" />}
      contentStyle={styles.content}
    >
      {classInfo ? (
        <ClassContextBanner code={classInfo.code} name={classInfo.name} subject={classInfo.subject} room={classInfo.room} studentCount={classInfo.studentCount} />
      ) : null}

      <View style={styles.rangeRow}>
        <TouchableOpacity style={[styles.rangePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Ionicons name="calendar-outline" size={15} color={theme.colors.primary} />
          <Text style={[styles.rangeText, { color: theme.colors.textPrimary }]}>12 – 18 May 2025</Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Ionicons name="funnel-outline" size={15} color={theme.colors.textSecondary} />
          <Text style={[styles.filterText, { color: theme.colors.textSecondary }]}>Filters</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.daysRow}>
        {weekDays.map((day) => {
          const active = day.key === activeDay;
          return (
            <TouchableOpacity
              key={day.key}
              style={[styles.dayChip, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border }]}
              onPress={() => setActiveDay(day.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.dayLabel, { color: active ? '#FFFFFF' : theme.colors.textPrimary }]}>{day.label}</Text>
              <Text style={[styles.dayDate, { color: active ? 'rgba(255,255,255,0.85)' : theme.colors.textSecondary }]}>{day.date}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SurfaceCard padded={false} style={styles.tableCard}>
        <View style={[styles.tableHead, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Text style={[styles.headPeriod, { color: theme.colors.textSecondary }]}>Period / Time</Text>
          <Text style={[styles.headDay, { color: theme.colors.textPrimary }]}>{activeLabel ? `${activeLabel.label === 'Mon' ? 'Monday' : activeLabel.label}, ${activeLabel.date} 2025` : ''}</Text>
        </View>
        {entries.length === 0 ? (
          <View style={styles.emptyDay}>
            <Ionicons name="cafe-outline" size={28} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No periods scheduled for this day.</Text>
          </View>
        ) : (
          entries.map((entry) => <TimetableRow key={entry.id} entry={entry} />)
        )}
      </SurfaceCard>

      <InfoBanner title="Note" text={'Timetable is effective from 1 May 2025.\nPlease check regularly for updates.'} />
    </TeacherScreen>
  );
}

function TimetableRow({ entry }: { entry: TimetableEntry }) {
  const theme = useTeacherTheme();

  if (entry.kind === 'break') {
    return (
      <View style={[styles.breakRow, { backgroundColor: theme.colors.tintOrange }]}>
        <View style={styles.breakLeft}>
          <Ionicons name={(entry.iconName as keyof typeof Ionicons.glyphMap) ?? 'cafe-outline'} size={16} color={theme.colors.warning} />
          <Text style={[styles.breakText, { color: theme.colors.textPrimary }]}>{entry.subject}</Text>
        </View>
        <Text style={[styles.breakTime, { color: theme.colors.textSecondary }]}>{entry.startTime} - {entry.endTime}</Text>
      </View>
    );
  }

  const accent = accentColors(theme.colors, entry.accent ?? 'teal');
  return (
    <View style={[styles.periodRow, { borderTopColor: theme.colors.border }]}>
      <View style={styles.periodMeta}>
        <Text style={[styles.periodNo, { color: theme.colors.textPrimary }]}>{entry.periodNo}</Text>
        <Text style={[styles.periodTime, { color: theme.colors.textSecondary }]}>{entry.startTime}</Text>
        <Text style={[styles.periodTime, { color: theme.colors.textSecondary }]}>- {entry.endTime}</Text>
      </View>
      <View style={[styles.periodCard, { backgroundColor: accent.bg }]}>
        <View style={[styles.periodIcon, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name={(entry.iconName as keyof typeof Ionicons.glyphMap) ?? 'book-outline'} size={18} color={accent.fg} />
        </View>
        <View style={styles.periodInfo}>
          <Text style={[styles.periodSubject, { color: theme.colors.textPrimary }]}>{entry.subject}</Text>
          {entry.topic ? <Text style={[styles.periodTopic, { color: theme.colors.textSecondary }]}>{entry.topic}</Text> : null}
        </View>
        {entry.room ? <Text style={[styles.periodRoom, { color: theme.colors.textSecondary }]}>{entry.room}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rangePill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 40, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  rangeText: { fontSize: 13, fontWeight: '600' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  filterText: { fontSize: 13, fontWeight: '600' },

  daysRow: { flexDirection: 'row', gap: 6 },
  dayChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  dayLabel: { fontSize: 12, fontWeight: '700' },
  dayDate: { fontSize: 10, marginTop: 2 },

  tableCard: { overflow: 'hidden' },
  tableHead: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12 },
  headPeriod: { width: 90, fontSize: 12, fontWeight: '700' },
  headDay: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'center' },

  periodRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  periodMeta: { width: 90, paddingVertical: 12, paddingHorizontal: 10, gap: 1 },
  periodNo: { fontSize: 13, fontWeight: '700' },
  periodTime: { fontSize: 10 },
  periodCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, margin: 8, padding: 10, borderRadius: 12 },
  periodIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  periodInfo: { flex: 1 },
  periodSubject: { fontSize: 14, fontWeight: '700' },
  periodTopic: { fontSize: 12, marginTop: 1 },
  periodRoom: { fontSize: 11, fontWeight: '500' },

  breakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: 8, marginVertical: 4, borderRadius: 10 },
  breakLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakText: { fontSize: 13, fontWeight: '700' },
  breakTime: { fontSize: 11 },

  emptyDay: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyText: { fontSize: 13 },
});
