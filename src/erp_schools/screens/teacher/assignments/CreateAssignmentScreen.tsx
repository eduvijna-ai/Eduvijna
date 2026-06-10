/** Create Assignment — single-column form (UI only, no submit API). */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  TextField,
  SelectField,
  PrimaryButton,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';

export default function CreateAssignmentScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { classes } = useTeacherData();

  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  const [subject, setSubject] = useState('Science');
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('20');
  const [description, setDescription] = useState('');

  const classOptions = classes.map((c) => ({ label: c.name, value: c.id }));
  const subjectOptions = ['Science', 'Mathematics', 'English', 'Social Science'].map((s) => ({ label: s, value: s }));

  const onSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter an assignment title.');
      return;
    }
    Alert.alert('Assignment created', `"${title}" has been created (demo).`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <TeacherScreen
      header={<ScreenHeader title="Create Assignment" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Create Assignment" icon="checkmark-circle-outline" onPress={onSubmit} />}
    >
      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Title" required>
            <TextField value={title} onChangeText={setTitle} placeholder="e.g. Cell Structure Worksheet" />
          </FormField>
          <FormField label="Class" required>
            <SelectField options={classOptions} value={classId} onChange={setClassId} />
          </FormField>
          <FormField label="Subject" required>
            <SelectField options={subjectOptions} value={subject} onChange={setSubject} />
          </FormField>
          <FormField label="Due Date" required>
            <TextField value={dueDate} onChangeText={setDueDate} placeholder="DD MMM YYYY" />
          </FormField>
          <FormField label="Maximum Marks">
            <TextField value={maxMarks} onChangeText={setMaxMarks} placeholder="20" keyboardType="number-pad" />
          </FormField>
          <FormField label="Description" hint="Add instructions for students">
            <TextField value={description} onChangeText={setDescription} placeholder="Describe the assignment…" multiline />
          </FormField>
          <TouchableOpacity style={[styles.attach, { borderColor: theme.colors.border }]} accessibilityLabel="Attach file">
            <Ionicons name="attach-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.attachText, { color: theme.colors.primary }]}>Attach Resource (optional)</Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4 },
  form: { gap: 16 },
  attach: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14 },
  attachText: { fontSize: 14, fontWeight: '600' },
});
