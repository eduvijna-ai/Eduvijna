/** Assessment Details — overview, grading progress + score distribution. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  HeroCard,
  SurfaceCard,
  SectionHeader,
  ProgressBar,
  BarChart,
  PrimaryButton,
  Badge,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { assessments, assessmentScoreBuckets } from '../../../data';
import type { TeacherStackParamList } from '../../../types/navigation';

export default function AssessmentDetailsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'AssessmentDetails'>>();
  const navigation = useTeacherNavigation();
  const assessment = assessments.find((a) => a.id === route.params?.assessmentId) ?? assessments[0];
  const gradedPercent = assessment.total > 0 ? Math.round((assessment.graded / assessment.total) * 100) : 0;

  return (
    <TeacherScreen
      header={<ScreenHeader title="Assessment Details" trailingIcon="ellipsis-horizontal" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Grade Students" icon="ribbon-outline" onPress={() => navigation.navigate('GradeStudents', { classId: undefined })} />}
    >
      <HeroCard>
        <Text style={styles.heroTitle}>{assessment.title}</Text>
        <Text style={styles.heroMeta}>Class {assessment.classCode} • {assessment.subject}</Text>
        <View style={styles.heroChips}>
          <View style={styles.heroChip}><Ionicons name="calendar-outline" size={13} color="#FFF" /><Text style={styles.heroChipText}>{assessment.date}</Text></View>
          <View style={styles.heroChip}><Ionicons name="school-outline" size={13} color="#FFF" /><Text style={styles.heroChipText}>Max {assessment.maxMarks}</Text></View>
        </View>
      </HeroCard>

      <SurfaceCard>
        <View style={styles.gradeHead}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Grading Progress</Text>
          <Badge label={`${assessment.graded}/${assessment.total}`} accent={gradedPercent === 100 ? 'green' : 'orange'} />
        </View>
        <ProgressBar percent={gradedPercent} height={8} />
        <Text style={[styles.gradeHint, { color: theme.colors.textSecondary }]}>{gradedPercent}% graded</Text>
      </SurfaceCard>

      {assessment.state === 'completed' ? (
        <View style={styles.section}>
          <SectionHeader title="Score Distribution" />
          <SurfaceCard>
            <BarChart data={assessmentScoreBuckets.map((bucket) => ({ label: bucket.range, value: bucket.count }))} />
          </SurfaceCard>
        </View>
      ) : null}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heroMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  heroChips: { flexDirection: 'row', gap: 10, marginTop: 14 },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  gradeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  gradeHint: { fontSize: 12, marginTop: 8 },
  section: { gap: 0 },
});
