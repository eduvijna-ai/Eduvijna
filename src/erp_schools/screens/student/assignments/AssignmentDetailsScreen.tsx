/**
 * Assignment Details — full brief, status, attachments and submit CTA.
 * Derived from the Assignments list card.
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
  StatusPill,
  InfoBanner,
  PrimaryButton,
  ListItem,
  type PillStatus,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentData } from '../../../hooks/useStudentData';
import type { StudentStackParamList } from '../../../types/navigation';
import type { StudentAssignmentStatus } from '../../../types/student';

const STATUS_PILL: Record<StudentAssignmentStatus, PillStatus> = {
  pending: 'pending',
  submitted: 'submitted',
  overdue: 'rejected',
  graded: 'graded',
};

export default function AssignmentDetailsScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const route = useRoute<RouteProp<StudentStackParamList, 'AssignmentDetails'>>();
  const { profile, getAssignmentById } = useStudentData();
  const assignment = getAssignmentById(route.params?.assignmentId);
  if (!assignment) return null;

  const accent = accentColors(theme.colors, assignment.accent);
  const canSubmit = assignment.status === 'pending' || assignment.status === 'overdue';

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Assignment"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
        />
      }
      contentStyle={styles.content}
      footer={canSubmit ? (
        <PrimaryButton label="Submit Assignment" icon="cloud-upload-outline" variant="gradient" onPress={() => navigation.navigate('AssignmentSubmission', { assignmentId: assignment.id })} />
      ) : undefined}
    >
      <SurfaceCard>
        <View style={styles.head}>
          <View style={[styles.icon, { backgroundColor: accent.bg }]}>
            <Ionicons name={assignment.icon as keyof typeof Ionicons.glyphMap} size={24} color={accent.fg} />
          </View>
          <View style={styles.headInfo}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{assignment.title}</Text>
            <Text style={[styles.subject, { color: theme.colors.textSecondary }]}>{assignment.subject}</Text>
          </View>
          <StatusPill status={STATUS_PILL[assignment.status]} label={assignment.status === 'overdue' ? 'Overdue' : undefined} />
        </View>
        <View style={[styles.metaRow, { borderTopColor: theme.colors.border }]}>
          <Ionicons name="calendar-outline" size={15} color={theme.colors.textSecondary} />
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{assignment.dueLabel}</Text>
        </View>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Instructions" />
        <SurfaceCard>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{assignment.description}</Text>
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Attachments" />
        <SurfaceCard padded={false} style={styles.listCard}>
          <ListItem icon="document-attach-outline" iconAccent="blue" title="Worksheet.pdf" subtitle="240 KB" showChevron divider={false} />
        </SurfaceCard>
      </View>

      {assignment.status === 'graded' ? (
        <InfoBanner tone="tip" icon="ribbon-outline" title={`Graded: ${assignment.marks}/${assignment.maxMarks}`} text="Well done! Your submission has been evaluated by the teacher." />
      ) : assignment.status === 'submitted' ? (
        <InfoBanner icon="cloud-done-outline" title="Submitted" text={assignment.submittedLabel ?? 'Your submission was received.'} />
      ) : (
        <InfoBanner tone="tip" text="Submit before the due date to avoid being marked overdue." />
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headInfo: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '700' },
  subject: { fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  metaText: { fontSize: 13 },
  section: { gap: 0 },
  body: { fontSize: 14, lineHeight: 21 },
  listCard: { paddingHorizontal: 14 },
});
