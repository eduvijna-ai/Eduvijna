/**
 * Create / Edit Exam Group — web ExamGroupsSubView "New/Edit Group" drawer parity.
 * Fields: name*, type, description.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  TextField,
  SelectField,
  PrimaryButton,
  ScreenLoader,
} from '../../../components';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherExamsData } from '../../../hooks/useTeacherExamsData';
import { EXAM_GROUP_TYPES } from '../../../utils/examMeta';
import type { TeacherStackParamList } from '../../../types/navigation';
import { extractErrorMessage, pickString } from '../../../utils/apiHelpers';

const TYPE_OPTIONS = EXAM_GROUP_TYPES.map((t) => ({ label: t, value: t }));

export default function CreateExamGroupScreen() {
  const route = useRoute<RouteProp<TeacherStackParamList, 'CreateExamGroup'>>();
  const navigation = useTeacherNavigation();
  const exams = useTeacherExamsData('groups');

  const editingId = route.params?.groupId;
  const isEdit = editingId != null && editingId > 0;

  const [loading, setLoading] = useState(Boolean(isEdit));
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('General');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isEdit || !editingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const existing = exams.groups.find((g) => g.id === editingId);
      if (existing) {
        if (!cancelled) {
          setName(existing.name);
          setType(existing.examType || 'General');
          setDescription(existing.description);
        }
      } else {
        try {
          const raw = (await exams.apis.groupsApi.get(editingId)) as Record<string, unknown>;
          if (!cancelled && raw) {
            setName(pickString(raw.name));
            setType(pickString(raw.exam_type, 'General'));
            setDescription(pickString(raw.description));
          }
        } catch {
          // ignore — form stays blank, save will still work as create-fallback is unlikely
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, editingId]);

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Group name is required.');
      return;
    }
    const payload = {
      name: name.trim(),
      exam_type: type,
      description: description.trim() || undefined,
    };
    try {
      const ok = await exams.saveGroup(payload, editingId);
      if (!ok) {
        Alert.alert('Save failed', exams.error || 'Could not save exam group.');
        return;
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', extractErrorMessage(e));
    }
  };

  if (loading) {
    return (
      <TeacherScreen header={<ScreenHeader title={isEdit ? 'Edit Exam Group' : 'New Exam Group'} />}>
        <ScreenLoader message="Loading exam group…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title={isEdit ? 'Edit Exam Group' : 'New Exam Group'} />}
      contentStyle={styles.content}
      footer={
        <View style={styles.footerRow}>
          <PrimaryButton
            label="Cancel"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label={exams.saving ? 'Saving…' : 'Save'}
            icon="checkmark-outline"
            disabled={exams.saving}
            onPress={() => void onSave()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Group Name" required>
            <TextField value={name} onChangeText={setName} placeholder="e.g. Term 1 Examinations" />
          </FormField>
          <FormField label="Type">
            <SelectField options={TYPE_OPTIONS} value={type} onChange={setType} />
          </FormField>
          <FormField label="Description">
            <TextField
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description…"
              multiline
            />
          </FormField>
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  form: { gap: 14 },
  footerRow: { flexDirection: 'row', gap: 10 },
});
