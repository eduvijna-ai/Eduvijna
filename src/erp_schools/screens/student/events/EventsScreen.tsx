/**
 * Events — categorized upcoming & recent school events.
 * Reference: assets/student_screens/student events screen.png
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentIdentityHeader,
  IconTabs,
  SearchBar,
  SurfaceCard,
  SectionHeader,
  Badge,
  AcademicYearPill,
  type IconTab,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';
import { useStudentUIStore } from '../../../store/studentUI.store';
import type { StudentEvent } from '../../../types/student';

const TABS: IconTab[] = [
  { key: 'all', label: 'All Events', icon: 'calendar-outline' },
  { key: 'school', label: 'School Events', icon: 'business-outline' },
  { key: 'academic', label: 'Academic', icon: 'book-outline' },
  { key: 'sports', label: 'Sports', icon: 'football-outline' },
  { key: 'competition', label: 'Competitions', icon: 'trophy-outline' },
  { key: 'holiday', label: 'Holidays', icon: 'sunny-outline' },
];

function EventCard({ event }: { event: StudentEvent }) {
  const theme = useTeacherTheme();
  const accent = accentColors(theme.colors, event.accent);
  return (
    <SurfaceCard>
      <View style={styles.eventRow}>
        <View style={[styles.dateBox, { backgroundColor: accent.bg }]}>
          <Text style={[styles.dateMonth, { color: accent.fg }]}>{event.month}</Text>
          <Text style={[styles.dateDay, { color: accent.fg }]}>{event.day}</Text>
          <Text style={[styles.dateWeekday, { color: accent.fg }]}>{event.weekday}</Text>
        </View>
        <View style={[styles.eventIcon, { backgroundColor: accent.bg }]}>
          <Ionicons name={event.icon as keyof typeof Ionicons.glyphMap} size={20} color={accent.fg} />
        </View>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: theme.colors.textPrimary }]}>{event.title}</Text>
          <Badge label={event.categoryLabel} accent={event.accent} />
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{event.timeLabel}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{event.location}</Text>
          </View>
        </View>
        {event.completed ? (
          <Badge label="Completed" accent="green" />
        ) : (
          <Badge label="Upcoming" accent="orange" />
        )}
      </View>
    </SurfaceCard>
  );
}

export default function EventsScreen() {
  const { profile, events, academicYears } = useStudentData();
  const academicYear = useStudentUIStore((s) => s.academicYear);
  const setAcademicYear = useStudentUIStore((s) => s.setAcademicYear);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');

  const upcoming = useMemo(() => {
    const base = tab === 'all' ? events.upcoming : events.upcoming.filter((e) => e.category === tab);
    if (!query.trim()) return base;
    return base.filter((e) => e.title.toLowerCase().includes(query.toLowerCase()));
  }, [events.upcoming, tab, query]);

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Events"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
          admissionNo={profile.admissionNo}
          trailingIcon="calendar-outline"
          rightSlot={<AcademicYearPill value={academicYear} options={academicYears} onChange={setAcademicYear} />}
        />
      }
      contentStyle={styles.content}
    >
      <View style={styles.tabsWrap}>
        <IconTabs tabs={TABS} activeKey={tab} onChange={setTab} stacked />
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search events…" />

      <View style={styles.section}>
        <SectionHeader title="Upcoming Events" />
        <View style={styles.list}>
          {upcoming.map((event) => <EventCard key={event.id} event={event} />)}
        </View>
      </View>

      {tab === 'all' ? (
        <View style={styles.section}>
          <SectionHeader title="Recent Events" actionLabel="View All" onAction={() => undefined} />
          <View style={styles.list}>
            {events.recent.map((event) => <EventCard key={event.id} event={event} />)}
          </View>
        </View>
      ) : null}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  tabsWrap: { marginHorizontal: -16, paddingHorizontal: 16 },
  section: { gap: 0 },
  list: { gap: 12 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dateBox: { width: 46, borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
  dateMonth: { fontSize: 10, fontWeight: '700' },
  dateDay: { fontSize: 18, fontWeight: '800' },
  dateWeekday: { fontSize: 9, fontWeight: '600' },
  eventIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  eventInfo: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11 },
});
