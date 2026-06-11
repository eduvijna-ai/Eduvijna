/**
 * Exam Schedule — upcoming exam datesheet with subject, time and venue.
 * Derived from the academics/exam domain (screens.md "Exam Schedule").
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentIdentityHeader,
  SegmentedControl,
  SurfaceCard,
  SectionHeader,
  StatusPill,
  InfoBanner,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentData } from '../../../hooks/useStudentData';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

export default function ExamScheduleScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const { profile, exams } = useStudentData();
  const [tab, setTab] = useState('upcoming');

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Exam Schedule"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
          trailingIcon="calendar-outline"
        />
      }
      contentStyle={styles.content}
    >
      <SegmentedControl segments={TABS} activeKey={tab} onChange={setTab} />

      <InfoBanner tone="tip" icon="alarm-outline" title="Periodic Test - I starts in 6 days" text="Make sure to review the datesheet and prepare subject-wise." />

      {tab === 'upcoming' ? (
        <View style={styles.section}>
          <SectionHeader title="Date Sheet" actionLabel="Results" onAction={() => navigation.navigate('ExamResults')} />
          <View style={styles.list}>
            {exams.schedule.map((exam) => {
              const accent = accentColors(theme.colors, exam.accent);
              return (
                <SurfaceCard key={exam.id}>
                  <View style={styles.examRow}>
                    <View style={[styles.dateBox, { backgroundColor: theme.colors.surfaceAlt }]}>
                      <Text style={[styles.dateDay, { color: theme.colors.primary }]}>{exam.dateLabel.split(' ')[0]}</Text>
                      <Text style={[styles.dateMon, { color: theme.colors.textSecondary }]}>{exam.dateLabel.split(' ')[1]}</Text>
                    </View>
                    <View style={[styles.examIcon, { backgroundColor: accent.bg }]}>
                      <Ionicons name={exam.icon as keyof typeof Ionicons.glyphMap} size={20} color={accent.fg} />
                    </View>
                    <View style={styles.examInfo}>
                      <Text style={[styles.examSubject, { color: theme.colors.textPrimary }]}>{exam.subject}</Text>
                      <View style={styles.examMeta}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                        <Text style={[styles.examMetaText, { color: theme.colors.textSecondary }]}>{exam.timeLabel}</Text>
                      </View>
                      <View style={styles.examMeta}>
                        <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                        <Text style={[styles.examMetaText, { color: theme.colors.textSecondary }]}>{exam.room} • {exam.durationLabel}</Text>
                      </View>
                    </View>
                    <StatusPill status="scheduled" label="Upcoming" showIcon={false} />
                  </View>
                </SurfaceCard>
              );
            })}
          </View>
        </View>
      ) : (
        <SurfaceCard onPress={() => navigation.navigate('ExamResults')}>
          <View style={styles.resultLink}>
            <View style={[styles.resultIcon, { backgroundColor: theme.colors.tintGreen }]}>
              <Ionicons name="ribbon-outline" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.resultInfo}>
              <Text style={[styles.resultTitle, { color: theme.colors.textPrimary }]}>Periodic Test - I Results</Text>
              <Text style={[styles.resultSub, { color: theme.colors.textSecondary }]}>Published • Tap to view detailed results</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </SurfaceCard>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  section: { gap: 0 },
  list: { gap: 12 },
  examRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 16, fontWeight: '800' },
  dateMon: { fontSize: 10 },
  examIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  examInfo: { flex: 1, gap: 2 },
  examSubject: { fontSize: 14, fontWeight: '700' },
  examMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  examMetaText: { fontSize: 11 },
  resultLink: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: '700' },
  resultSub: { fontSize: 12, marginTop: 2 },
});
