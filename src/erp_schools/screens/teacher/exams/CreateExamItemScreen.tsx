/**
 * Create / Edit Exam Item — web ExamGroupsSubView "New/Edit Exam" drawer parity.
 * Fields: name*, session, passing_percentage, roll_number_type, description,
 * is_published, is_result_published.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
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
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherExamsData } from '../../../hooks/useTeacherExamsData';
import { ROLL_NUMBER_TYPES } from '../../../utils/examMeta';
import type { TeacherStackParamList } from '../../../types/navigation';
import { extractErrorMessage, pickString } from '../../../utils/apiHelpers';

const ROLL_TYPE_OPTIONS = ROLL_NUMBER_TYPES.map((t) => ({ label: t.label, value: t.value }));

export default function CreateExamItemScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'CreateExamItem'>>();
  const navigation = useTeacherNavigation();
  const groupId = route.params?.groupId;
  const exams = useTeacherExamsData('exams');

  const editingId = route.params?.itemId;
  const isEdit = editingId != null && editingId > 0;

  const [loading, setLoading] = useState(Boolean(isEdit));
  const [name, setName] = useState('');
  const [session, setSession] = useState(String(new Date().getFullYear()));
  const [passingPercentage, setPassingPercentage] = useState('35');
  const [rollNumberType, setRollNumberType] = useState<string>('admit_card');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [isResultPublished, setIsResultPublished] = useState(false);

  useEffect(() => {
    if (!isEdit || !editingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const raw = (await exams.apis.itemsApi.get(groupId, editingId)) as Record<string, unknown>;
        if (!cancelled && raw) {
          setName(pickString(raw.name));
          setSession(pickString(raw.session));
          setPassingPercentage(
            raw.passing_percentage != null ? String(raw.passing_percentage) : '',
          );
          setRollNumberType(pickString(raw.roll_number_type, 'admit_card'));
          setDescription(pickString(raw.description));
          setIsPublished(raw.is_published === true);
          setIsResultPublished(raw.is_result_published === true);
        }
      } catch (e) {
        if (!cancelled) Alert.alert('Load failed', extractErrorMessage(e));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, editingId, groupId]);

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Exam name is required.');
      return;
    }
    const payload = {
      name: name.trim(),
      session: session.trim() || undefined,
      is_published: isPublished,
      is_result_published: isResultPublished,
      roll_number_type: rollNumberType,
      passing_percentage:
        passingPercentage.trim() !== '' ? Number(passingPercentage) : undefined,
      description: description.trim() || undefined,
    };
    try {
      const ok = await exams.saveItem(groupId, payload, editingId);
      if (!ok) {
        Alert.alert('Save failed', exams.error || 'Could not save exam.');
        return;
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', extractErrorMessage(e));
    }
  };

  if (loading) {
    return (
      <TeacherScreen header={<ScreenHeader title={isEdit ? 'Edit Exam' : 'New Exam'} />}>
        <ScreenLoader message="Loading exam…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title={isEdit ? 'Edit Exam' : 'New Exam'} />}
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
          <FormField label="Exam Name" required>
            <TextField value={name} onChangeText={setName} placeholder="e.g. Mid-Term Exam" />
          </FormField>
          <FormField label="Session">
            <TextField value={session} onChangeText={setSession} placeholder="e.g. 2026" />
          </FormField>
          <FormField label="Passing %">
            <TextField
              value={passingPercentage}
              onChangeText={setPassingPercentage}
              keyboardType="decimal-pad"
              placeholder="e.g. 35"
            />
          </FormField>
          <FormField label="Roll Number Type">
            <SelectField
              options={ROLL_TYPE_OPTIONS}
              value={rollNumberType}
              onChange={setRollNumberType}
            />
          </FormField>
          <FormField label="Description">
            <TextField
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description…"
              multiline
            />
          </FormField>

          <View style={[styles.toggleRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.toggleLabel, { color: theme.colors.textPrimary }]}>
              Publish exam
            </Text>
            <Switch
              value={isPublished}
              onValueChange={setIsPublished}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.colors.textPrimary }]}>
              Publish result
            </Text>
            <Switch
              value={isResultPublished}
              onValueChange={setIsResultPublished}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  form: { gap: 14 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  footerRow: { flexDirection: 'row', gap: 10 },
});
