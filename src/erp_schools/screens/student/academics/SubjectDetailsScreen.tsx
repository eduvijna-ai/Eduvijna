/**
 * Subject Details — per-subject detailed report: grade summary, assessment
 * breakdown and assessment-wise details.
 * Reference: assets/student_screens/student academic marks page of subtab detailed report screen.png
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  TeacherScreen,
  StudentIdentityHeader,
  SurfaceCard,
  SectionHeader,
  ListItem,
  Badge,
  InfoBanner,
  AcademicYearPill,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';
import { useStudentUIStore } from '../../../store/studentUI.store';
import type { StudentStackParamList } from '../../../types/navigation';

export default function SubjectDetailsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<StudentStackParamList, 'SubjectDetails'>>();
  const { profile, academics, academicYears, getSubjectById } = useStudentData();
  const academicYear = useStudentUIStore((s) => s.academicYear);
  const setAcademicYear = useStudentUIStore((s) => s.setAcademicYear);

  const subject = getSubjectById(route.params?.subjectId);
  const summary = academics.detailedReportSummary;
  const accent = subject ? accentColors(theme.colors, subject.accent) : accentColors(theme.colors, 'teal');

  const tiles = [
    { key: 'total', label: 'Total Marks', value: `${summary.totalMarks} /${summary.outOf}`, color: theme.colors.info },
    { key: 'pct', label: 'Percentage', value: `${summary.percentage}%`, color: theme.colors.info },
    { key: 'grade', label: 'Grade', value: summary.grade, color: theme.colors.success },
    { key: 'avg', label: 'Class Average', value: `${summary.classAverage}%`, color: theme.colors.textPrimary },
    { key: 'high', label: 'Highest in Class', value: `${summary.highestInClass}%`, color: theme.colors.textPrimary },
  ];

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Academics"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
          trailingIcon="calendar-outline"
          rightSlot={<AcademicYearPill value={academicYear} options={academicYears} onChange={setAcademicYear} />}
        />
      }
      contentStyle={styles.content}
    >
      <SurfaceCard>
        <View style={styles.subjectHead}>
          <View style={[styles.subjectIcon, { backgroundColor: accent.bg }]}>
            <Ionicons name={(subject?.icon ?? 'book-outline') as keyof typeof Ionicons.glyphMap} size={22} color={accent.fg} />
          </View>
          <View style={styles.subjectInfo}>
            <Text style={[styles.subjectName, { color: theme.colors.textPrimary }]}>{subject?.subject ?? 'Subject'}</Text>
            <View style={styles.gradeRow}>
              <Text style={[styles.gradeLead, { color: theme.colors.textSecondary }]}>Overall Grade</Text>
              <Badge label={subject?.grade ?? 'A'} accent="green" />
            </View>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.tilesCard}>
        <View style={styles.tilesRow}>
          {tiles.map((tile, index) => (
            <React.Fragment key={tile.key}>
              {index > 0 ? <View style={[styles.tileDivider, { backgroundColor: theme.colors.border }]} /> : null}
              <View style={styles.tile}>
                <Text style={[styles.tileValue, { color: tile.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{tile.value}</Text>
                <Text style={[styles.tileLabel, { color: theme.colors.textSecondary }]} numberOfLines={2}>{tile.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Assessment Breakdown" />
        <SurfaceCard>
          {academics.assessmentBreakdown.map((row, index) => (
            <View
              key={row.type}
              style={[
                styles.breakRow,
                index < academics.assessmentBreakdown.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={[styles.breakType, { color: theme.colors.textPrimary }]} numberOfLines={1}>{row.type}</Text>
              <Text style={[styles.breakCell, { color: theme.colors.textSecondary }]}>{row.obtained}/{row.maxMarks}</Text>
              <Text style={[styles.breakCell, { color: theme.colors.textSecondary }]}>{row.percent}%</Text>
              <View style={styles.breakGrade}><Badge label={row.grade} accent={row.percent >= 90 ? 'green' : 'blue'} /></View>
            </View>
          ))}
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Assessment Wise Details" />
        <SurfaceCard padded={false} style={styles.listCard}>
          {academics.assessmentDetails.map((item, index) => (
            <ListItem
              key={item.id}
              icon={item.icon as keyof typeof Ionicons.glyphMap}
              iconAccent={item.accent}
              title={item.title}
              subtitle={`${item.type} • ${item.percent}%`}
              divider={index < academics.assessmentDetails.length - 1}
              trailing={
                <View style={styles.detailTrailing}>
                  <Text style={[styles.detailMarks, { color: theme.colors.info }]}>{item.obtained} / {item.maxMarks}</Text>
                  <Badge label={item.grade} accent={item.percent >= 90 ? 'green' : 'blue'} />
                </View>
              }
            />
          ))}
        </SurfaceCard>
      </View>

      <InfoBanner tone="tip" icon="star" title="Great job, Aarav! 🎉" text={`You have a strong understanding of ${subject?.subject ?? 'this subject'}. Keep practicing to improve even more!`} />
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  subjectHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  subjectInfo: { flex: 1, gap: 4 },
  subjectName: { fontSize: 18, fontWeight: '700' },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gradeLead: { fontSize: 13 },
  tilesCard: { paddingVertical: 14 },
  tilesRow: { flexDirection: 'row', alignItems: 'stretch' },
  tile: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  tileDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  tileValue: { fontSize: 15, fontWeight: '800' },
  tileLabel: { fontSize: 9, textAlign: 'center', lineHeight: 12 },
  section: { gap: 0 },
  breakRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  breakType: { flex: 1, fontSize: 13, fontWeight: '600' },
  breakCell: { width: 52, fontSize: 12, textAlign: 'center' },
  breakGrade: { width: 44, alignItems: 'flex-end' },
  listCard: { paddingHorizontal: 14 },
  detailTrailing: { alignItems: 'flex-end', gap: 4 },
  detailMarks: { fontSize: 13, fontWeight: '700' },
});
