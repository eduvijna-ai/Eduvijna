/**
 * Assignment Submission — answer text + attachment upload + submit.
 * Derived from the Assignment Details "Submit" action.
 */

import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  FormField,
  TextField,
  PrimaryButton,
  InfoBanner,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentData } from '../../../hooks/useStudentData';
import { useStudentAssignmentActions } from '../../../hooks/useStudentAssignmentActions';
import type { StudentStackParamList } from '../../../types/navigation';

export default function AssignmentSubmissionScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const route = useRoute<RouteProp<StudentStackParamList, 'AssignmentSubmission'>>();
  const { getAssignmentById, refetch } = useStudentData();
  const { submitAssignment, submitting } = useStudentAssignmentActions();
  const assignment = getAssignmentById(route.params?.assignmentId);
  const [answer, setAnswer] = useState('');
  const [attached, setAttached] = useState(false);

  const handleSubmit = async () => {
    if (!assignment?.id) {
      Alert.alert('Error', 'Assignment not found.');
      return;
    }
    const ok = await submitAssignment(assignment.id, {
      content: answer,
      remarks: attached ? 'attachment_indicated' : undefined,
    });
    if (ok) {
      await refetch();
      Alert.alert('Submitted', 'Your assignment has been submitted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Submit failed', 'Could not submit. Please try again.');
    }
  };

  return (
    <TeacherScreen
      header={<StudentModuleHeader title="Submit Assignment" />}
      contentStyle={styles.content}
      footer={
        <PrimaryButton
          label={submitting ? 'Submitting…' : 'Submit'}
          icon="checkmark"
          variant="gradient"
          disabled={submitting || (answer.trim().length === 0 && !attached)}
          onPress={handleSubmit}
        />
      }
    >
      <SurfaceCard>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{assignment?.title}</Text>
        <Text style={[styles.subject, { color: theme.colors.textSecondary }]}>{assignment?.subject} • {assignment?.dueLabel}</Text>
      </SurfaceCard>

      <SurfaceCard>
        <FormField label="Your Answer" hint="Type your response or notes for the teacher.">
          <TextField value={answer} onChangeText={setAnswer} placeholder="Write your answer here…" multiline />
        </FormField>
      </SurfaceCard>

      <FormField label="Attachment">
        <TouchableOpacity
          style={[styles.upload, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          onPress={() => setAttached((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="Attach file"
        >
          <Ionicons name={attached ? 'document-attach' : 'cloud-upload-outline'} size={28} color={theme.colors.primary} />
          <Text style={[styles.uploadText, { color: theme.colors.textPrimary }]}>
            {attached ? 'answer_aarav.pdf attached' : 'Tap to attach a file'}
          </Text>
          <Text style={[styles.uploadHint, { color: theme.colors.textSecondary }]}>PDF, JPG or PNG up to 10 MB</Text>
        </TouchableOpacity>
      </FormField>

      <InfoBanner tone="tip" text="Once submitted you cannot edit your answer. Review before submitting." />
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  title: { fontSize: 16, fontWeight: '700' },
  subject: { fontSize: 13, marginTop: 4 },
  upload: { alignItems: 'center', gap: 6, paddingVertical: 26, borderWidth: 1.5, borderRadius: 12, borderStyle: 'dashed' },
  uploadText: { fontSize: 14, fontWeight: '600' },
  uploadHint: { fontSize: 12 },
});
