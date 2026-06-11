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
  StudentIdentityHeader,
  SurfaceCard,
  FormField,
  TextField,
  PrimaryButton,
  InfoBanner,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentData } from '../../../hooks/useStudentData';
import type { StudentStackParamList } from '../../../types/navigation';

export default function AssignmentSubmissionScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const route = useRoute<RouteProp<StudentStackParamList, 'AssignmentSubmission'>>();
  const { profile, getAssignmentById } = useStudentData();
  const assignment = getAssignmentById(route.params?.assignmentId);
  const [answer, setAnswer] = useState('');
  const [attached, setAttached] = useState(false);

  const handleSubmit = () => {
    Alert.alert('Submitted', 'Your assignment has been submitted successfully (demo).', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Submit Assignment"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
        />
      }
      contentStyle={styles.content}
      footer={<PrimaryButton label="Submit" icon="checkmark" variant="gradient" disabled={answer.trim().length === 0 && !attached} onPress={handleSubmit} />}
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
