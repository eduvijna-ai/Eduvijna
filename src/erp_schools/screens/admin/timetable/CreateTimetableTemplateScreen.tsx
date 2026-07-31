/**
 * Create / Edit Timetable Template — web TimetableTab Templates form parity.
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
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useAdminTimetableData } from '../../../hooks/useAdminTimetableData';
import type { AdminStackParamList } from '../../../types/navigation';

export default function CreateTimetableTemplateScreen() {
  const route = useRoute<RouteProp<AdminStackParamList, 'CreateTimetableTemplate'>>();
  const navigation = useAdminNavigation();
  const tt = useAdminTimetableData('templates');

  const editingId = route.params?.templateId;
  const isEdit = editingId != null && editingId > 0;

  const [loading, setLoading] = useState(Boolean(isEdit));
  const [name, setName] = useState('');
  const [classId, setClassId] = useState<number | undefined>();
  const [sectionId, setSectionId] = useState<number | undefined>();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (!isEdit || !editingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const t = await tt.getTemplate(editingId);
      if (!cancelled && t) {
        setName(t.name);
        setClassId(t.classId);
        setSectionId(t.sectionId);
        setFrom(t.effectiveFrom || '');
        setTo(t.effectiveTo || '');
        if (t.classId) await tt.loadSections(t.classId);
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
      Alert.alert('Required', 'Template name is required.');
      return;
    }
    const payload = {
      template_name: name.trim(),
      class_id: classId,
      section_id: sectionId,
      effective_from: from.trim() || undefined,
      effective_to: to.trim() || undefined,
    };
    const ok = isEdit && editingId
      ? await tt.updateTemplate(editingId, payload)
      : await tt.createTemplate(payload);
    if (ok) {
      Alert.alert('Saved', isEdit ? 'Template updated.' : 'Template created.');
      navigation.goBack();
    } else {
      Alert.alert('Failed', tt.error || 'Could not save template.');
    }
  };

  if (loading) {
    return (
      <TeacherScreen header={<ScreenHeader title={isEdit ? 'Edit Template' : 'New Template'} />}>
        <ScreenLoader message="Loading…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title={isEdit ? 'Edit Template' : 'New Template'} />}
      contentStyle={styles.content}
      footer={
        <PrimaryButton
          label={tt.saving ? 'Saving…' : 'Save'}
          icon="save-outline"
          loading={tt.saving}
          onPress={() => void onSave()}
        />
      }
    >
      <SurfaceCard style={styles.card}>
        <FormField label="Template name *">
          <TextField value={name} onChangeText={setName} placeholder="e.g. Class 4 Weekly Template" />
        </FormField>
        <FormField label="Class">
          <SelectField
            options={[
              { label: 'None', value: '' },
              ...tt.classes.map((c) => ({ label: c.name, value: String(c.id) })),
            ]}
            value={classId != null ? String(classId) : ''}
            onChange={(v) => {
              const id = v ? Number(v) : undefined;
              setClassId(id);
              setSectionId(undefined);
              void tt.loadSections(id);
            }}
            placeholder="Select class"
          />
        </FormField>
        <FormField label="Section">
          <SelectField
            options={[
              { label: 'All Sections', value: '' },
              ...tt.sections.map((s) => ({ label: s.name, value: String(s.id) })),
            ]}
            value={sectionId != null ? String(sectionId) : ''}
            onChange={(v) => setSectionId(v ? Number(v) : undefined)}
            placeholder="All Sections"
          />
        </FormField>
        <FormField label="Effective from">
          <TextField value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" />
        </FormField>
        <FormField label="Effective to">
          <TextField value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" />
        </FormField>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 12, paddingBottom: 24 },
  card: { gap: 8 },
});
