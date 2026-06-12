/**
 * Classes — class directory with syllabus progress + class overview stats.
 * Reference: assets/admin_screens/admin classes screen.png
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  SearchBar,
  SegmentedControl,
  ProgressBar,
  StatGrid,
  Badge,
  EmptyState,
  PrimaryButton,
  type Segment,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminData } from '../../../hooks/useAdminData';
import { accentColors } from '../../../theme/accents';

const SEGMENTS: Segment[] = [
  { key: 'classes', label: 'My Classes' },
  { key: 'timetable', label: 'Timetable' },
];

export default function ClassesScreen() {
  const theme = useTeacherTheme();
  const { classes } = useAdminData();
  const [segment, setSegment] = useState('classes');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => classes.list.filter((c) => `${c.subject} ${c.grade} ${c.teacher}`.toLowerCase().includes(query.toLowerCase())),
    [classes.list, query],
  );

  return (
    <TeacherScreen
      header={<ScreenHeader title="Classes" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Add / Join Class" icon="add" onPress={() => undefined} />}
    >
      <SegmentedControl segments={SEGMENTS} activeKey={segment} onChange={setSegment} />

      {segment === 'classes' ? (
        <>
          <View style={styles.searchWrap}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search classes…" />
          </View>

          {filtered.length === 0 ? (
            <EmptyState icon="easel-outline" title="No classes found" message="Try a different search." />
          ) : (
            filtered.map((cls) => {
              const accent = accentColors(theme.colors, cls.accent);
              return (
                <SurfaceCard key={cls.id} style={styles.classCard}>
                  <View style={styles.classRow}>
                    <View style={[styles.classIcon, { backgroundColor: accent.bg }]}>
                      <Ionicons name={cls.icon} size={22} color={accent.fg} />
                    </View>
                    <View style={styles.classInfo}>
                      <Text style={[styles.classSubject, { color: theme.colors.textPrimary }]}>{cls.subject}</Text>
                      <Text style={[styles.classMeta, { color: theme.colors.textSecondary }]}>Grade {cls.grade} • {cls.room}</Text>
                      <Text style={[styles.classMeta, { color: theme.colors.textSecondary }]}>{cls.teacher}</Text>
                      <Text style={[styles.classMeta, { color: theme.colors.textSecondary }]}>{cls.timeLabel}</Text>
                    </View>
                    <Badge label={cls.grade} accent={cls.accent} />
                  </View>
                  <View style={styles.syllabusRow}>
                    <Text style={[styles.syllabusLabel, { color: theme.colors.textSecondary }]}>Syllabus Completed</Text>
                    <Text style={[styles.syllabusValue, { color: theme.colors.textPrimary }]}>{cls.syllabusPercent}%</Text>
                  </View>
                  <ProgressBar percent={cls.syllabusPercent} color={accent.fg} />
                </SurfaceCard>
              );
            })
          )}

          <View>
            <SectionHeader title="Class Overview" />
            <StatGrid items={classes.overviewKpis} columns={4} variant="tinted" />
          </View>
        </>
      ) : (
        <SurfaceCard>
          <EmptyState icon="calendar-outline" title="Class Timetable" message="Weekly timetable view across all classes." />
        </SurfaceCard>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  searchWrap: { flexDirection: 'row' },
  classCard: { gap: 10 },
  classRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  classIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  classInfo: { flex: 1, gap: 2 },
  classSubject: { fontSize: 16, fontWeight: '700' },
  classMeta: { fontSize: 12 },
  syllabusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  syllabusLabel: { fontSize: 12 },
  syllabusValue: { fontSize: 13, fontWeight: '700' },
});
