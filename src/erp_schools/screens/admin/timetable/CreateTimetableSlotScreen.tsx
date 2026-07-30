/**
 * Create / Edit Timetable Slot — web TimetableTab SlotFormModal parity.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
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
import { TT_DAY_FULL, TT_SLOT_TYPES } from '../../../utils/timetableMeta';
import type { AdminStackParamList } from '../../../types/navigation';

export default function CreateTimetableSlotScreen() {
  const route = useRoute<RouteProp<AdminStackParamList, 'CreateTimetableSlot'>>();
  const navigation = useAdminNavigation();
  const tt = useAdminTimetableData('grid');

  const editingId = route.params?.slotId;
  const isEdit = editingId != null && editingId > 0;

  const [loading, setLoading] = useState(Boolean(isEdit));
  const [templateId, setTemplateId] = useState<number | undefined>(route.params?.templateId);
  const [dayOfWeek, setDayOfWeek] = useState(route.params?.dayOfWeek ?? 0);
  const [periodNumber, setPeriodNumber] = useState('1');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:45');
  const [classId, setClassId] = useState<number | undefined>();
  const [sectionId, setSectionId] = useState<number | undefined>();
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [teacherId, setTeacherId] = useState<number | undefined>();
  const [room, setRoom] = useState('');
  const [slotType, setSlotType] = useState('lecture');

  useEffect(() => {
    if (!isEdit || !editingId) {
      const tmpl = templateId ? tt.templates.find((t) => t.id === templateId) : tt.selectedTemplate;
      if (tmpl) {
        setTemplateId(tmpl.id);
        setClassId(tmpl.classId);
        setSectionId(tmpl.sectionId);
        if (tmpl.classId) {
          void tt.loadSections(tmpl.classId);
          void tt.loadSubjectsTeachers(tmpl.classId, tmpl.sectionId);
        }
      }
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await tt.getSlot(editingId);
      if (!cancelled && s) {
        setTemplateId(s.templateId);
        setDayOfWeek(s.dayOfWeek);
        setPeriodNumber(String(s.periodNumber || 1));
        setStartTime(s.startTime.slice(0, 5) || '08:00');
        setEndTime(s.endTime.slice(0, 5) || '08:45');
        setClassId(s.classId);
        setSectionId(s.sectionId);
        setSubjectId(s.subjectId);
        setTeacherId(s.teacherId);
        setRoom(s.room === '—' ? '' : s.room);
        setSlotType(s.slotType || 'lecture');
        if (s.classId) {
          await tt.loadSections(s.classId);
          await tt.loadSubjectsTeachers(s.classId, s.sectionId);
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
    if (!templateId) {
      Alert.alert('Required', 'Select a template.');
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      Alert.alert('Required', 'Start and end time are required.');
      return;
    }
    const payload: Record<string, unknown> = {
      template_id: templateId,
      day_of_week: dayOfWeek,
      period_number: Number(periodNumber) || 1,
      start_time: startTime.trim(),
      end_time: endTime.trim(),
      class_id: classId,
      section_id: sectionId,
      subject_id: subjectId,
      teacher_id: teacherId,
      room: room.trim() || undefined,
      slot_type: slotType,
    };
    const ok = isEdit && editingId
      ? await tt.updateSlot(editingId, payload)
      : await tt.createSlot(payload);
    if (ok) {
      Alert.alert('Saved', isEdit ? 'Slot updated.' : 'Slot created.');
      navigation.goBack();
    } else {
      Alert.alert('Failed', tt.error || 'Could not save slot.');
    }
  };

  if (loading) {
    return (
      <TeacherScreen header={<ScreenHeader title={isEdit ? 'Edit Slot' : 'Add Slot'} />}>
        <ScreenLoader message="Loading…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title={isEdit ? 'Edit Slot' : 'Add Slot'} />}
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
        <FormField label="Template *">
          <SelectField
            options={tt.templates
              .filter((t) => t.isActive)
              .map((t) => ({ label: t.name, value: String(t.id) }))}
            value={templateId != null ? String(templateId) : null}
            onChange={(v) => {
              const id = v ? Number(v) : undefined;
              setTemplateId(id);
              const tmpl = tt.templates.find((t) => t.id === id);
              if (tmpl) {
                setClassId(tmpl.classId);
                setSectionId(tmpl.sectionId);
                if (tmpl.classId) {
                  void tt.loadSections(tmpl.classId);
                  void tt.loadSubjectsTeachers(tmpl.classId, tmpl.sectionId);
                }
              }
            }}
            placeholder="Select template"
          />
        </FormField>
        <FormField label="Day *">
          <SelectField
            options={TT_DAY_FULL.map((d, i) => ({ label: d, value: String(i) }))}
            value={String(dayOfWeek)}
            onChange={(v) => setDayOfWeek(Number(v))}
          />
        </FormField>
        <FormField label="Period number">
          <TextField
            value={periodNumber}
            onChangeText={setPeriodNumber}
            keyboardType="numeric"
            placeholder="1–15"
          />
        </FormField>
        <FormField label="Start time *">
          <TextField value={startTime} onChangeText={setStartTime} placeholder="HH:MM" />
        </FormField>
        <FormField label="End time *">
          <TextField value={endTime} onChangeText={setEndTime} placeholder="HH:MM" />
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
              setSubjectId(undefined);
              setTeacherId(undefined);
              void tt.loadSections(id);
              void tt.loadSubjectsTeachers(id, undefined);
            }}
          />
        </FormField>
        <FormField label="Section">
          <SelectField
            options={[
              { label: 'None', value: '' },
              ...tt.sections.map((s) => ({ label: s.name, value: String(s.id) })),
            ]}
            value={sectionId != null ? String(sectionId) : ''}
            onChange={(v) => {
              const id = v ? Number(v) : undefined;
              setSectionId(id);
              void tt.loadSubjectsTeachers(classId, id);
            }}
          />
        </FormField>
        <FormField label="Subject">
          <SelectField
            options={[
              { label: 'None', value: '' },
              ...tt.subjects.map((s) => ({ label: s.name, value: String(s.id) })),
            ]}
            value={subjectId != null ? String(subjectId) : ''}
            onChange={(v) => setSubjectId(v ? Number(v) : undefined)}
          />
        </FormField>
        <FormField label="Teacher">
          <SelectField
            options={[
              { label: 'None', value: '' },
              ...tt.teachers.map((t) => ({ label: t.name, value: String(t.id) })),
            ]}
            value={teacherId != null ? String(teacherId) : ''}
            onChange={(v) => setTeacherId(v ? Number(v) : undefined)}
          />
        </FormField>
        <FormField label="Room">
          <TextField value={room} onChangeText={setRoom} placeholder="e.g. 101" />
        </FormField>
        <FormField label="Type">
          <SelectField
            options={TT_SLOT_TYPES.map((t) => ({
              label: t.charAt(0).toUpperCase() + t.slice(1),
              value: t,
            }))}
            value={slotType}
            onChange={(v) => setSlotType(v || 'lecture')}
          />
        </FormField>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 12, paddingBottom: 24 },
  card: { gap: 8 },
});
