/** Upload Material — material metadata form + upload dropzone (UI only). */

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

export default function UploadMaterialScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { classes } = useTeacherData();

  const [title, setTitle] = useState('');
  const [type, setType] = useState('pdf');
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  const [description, setDescription] = useState('');

  const typeOptions = [
    { label: 'Notes (PDF)', value: 'pdf' },
    { label: 'Presentation (PPT)', value: 'ppt' },
    { label: 'Worksheet (DOC)', value: 'doc' },
    { label: 'Video (MP4)', value: 'video' },
    { label: 'Link', value: 'link' },
  ];
  const classOptions = classes.map((c) => ({ label: c.name, value: c.id }));

  const onUpload = () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a material title.');
      return;
    }
    Alert.alert('Material uploaded', `"${title}" has been uploaded (demo).`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <TeacherScreen
      header={<ScreenHeader title="Upload Material" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Upload Material" icon="cloud-upload-outline" onPress={onUpload} />}
    >
      <TouchableOpacity style={[styles.dropzone, { borderColor: theme.colors.primary, backgroundColor: theme.colors.tintTeal }]} accessibilityLabel="Choose file">
        <Ionicons name="cloud-upload-outline" size={36} color={theme.colors.primary} />
        <Text style={[styles.dropTitle, { color: theme.colors.textPrimary }]}>Tap to choose a file</Text>
        <Text style={[styles.dropSub, { color: theme.colors.textSecondary }]}>PDF, DOCX, PPTX, MP4 up to 50 MB</Text>
      </TouchableOpacity>

      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Title" required>
            <TextField value={title} onChangeText={setTitle} placeholder="e.g. Cell Structure - Notes" />
          </FormField>
          <FormField label="Type" required>
            <SelectField options={typeOptions} value={type} onChange={setType} />
          </FormField>
          <FormField label="Share with Class" required>
            <SelectField options={classOptions} value={classId} onChange={setClassId} />
          </FormField>
          <FormField label="Description">
            <TextField value={description} onChangeText={setDescription} placeholder="Brief description…" multiline />
          </FormField>
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  dropzone: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 28, alignItems: 'center', gap: 6 },
  dropTitle: { fontSize: 15, fontWeight: '700' },
  dropSub: { fontSize: 12 },
  form: { gap: 16 },
});
