/**
 * Exam Subjects (= schedule papers) — web ExamSubjectsTab parity.
 * Add / edit subject papers for an exam item, or import all subjects from a class.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  TextField,
  SelectField,
  PrimaryButton,
  EmptyState,
  ScreenLoader,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherExamsData } from '../../../hooks/useTeacherExamsData';
import type { TeacherStackParamList } from '../../../types/navigation';
import { extractErrorMessage, pickNumber, pickString, safeList } from '../../../utils/apiHelpers';
import { formatExamDateLabel, formatExamTime } from '../../../utils/examMeta';

type SubjectRow = {
  id: number;
  classId: number;
  subjectId: number;
  className: string;
  subjectName: string;
  examDate: string;
  startTime: string;
  durationMins: number;
  maxMarks: number;
  minMarks: number;
  roomNo: string;
};

type ClassOption = { label: string; value: string };

function mapSubjectRow(r: Record<string, unknown>): SubjectRow {
  return {
    id: pickNumber(r.id),
    classId: pickNumber(r.class_id),
    subjectId: pickNumber(r.subject_id),
    className: pickString(r.class_name, 'Class'),
    subjectName: pickString(r.subject_name, 'Subject'),
    examDate: pickString(r.exam_date).slice(0, 10),
    startTime: pickString(r.start_time),
    durationMins: pickNumber(r.duration_mins, 0),
    maxMarks: pickNumber(r.max_marks, 100),
    minMarks: pickNumber(r.min_marks, 0),
    roomNo: pickString(r.room_no),
  };
}

const emptyForm = {
  classId: '',
  subjectId: '',
  examDate: '',
  startTime: '',
  durationMins: '60',
  maxMarks: '100',
  minMarks: '35',
  roomNo: '',
};

export default function ExamSubjectsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'ExamSubjects'>>();
  const { itemId } = route.params;
  const exams = useTeacherExamsData('exams');

  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [classSubjects, setClassSubjects] = useState<ClassOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await exams.apis.subjects.list(itemId);
      setRows(safeList<Record<string, unknown>>(data).filter((r) => r.is_active !== false).map(mapSubjectRow));
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId]),
  );

  const classOptions: ClassOption[] = useMemo(
    () => [
      { label: 'Select class…', value: '' },
      ...exams.schoolClasses.map((c) => ({
        label: c.name,
        value: String(c.id),
      })),
    ],
    [exams.schoolClasses],
  );

  const onClassChange = async (classId: string) => {
    setForm((f) => ({ ...f, classId, subjectId: '' }));
    setClassSubjects([]);
    if (!classId) return;
    setSubjectsLoading(true);
    try {
      const data = await exams.apis.subjects.byClass(Number(classId));
      setClassSubjects(
        safeList<Record<string, unknown>>(data).map((s) => ({
          label: pickString(s.subject_name, `Subject #${pickNumber(s.subject_id)}`),
          value: String(pickNumber(s.subject_id)),
        })),
      );
    } catch {
      setClassSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const startNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setClassSubjects([]);
    setShowForm(true);
  };

  const startEdit = (row: SubjectRow) => {
    setEditingId(row.id);
    setForm({
      classId: String(row.classId || ''),
      subjectId: String(row.subjectId || ''),
      examDate: row.examDate,
      startTime: row.startTime.slice(0, 5),
      durationMins: String(row.durationMins || ''),
      maxMarks: String(row.maxMarks),
      minMarks: String(row.minMarks),
      roomNo: row.roomNo,
    });
    setShowForm(true);
    if (row.classId) {
      void exams.apis.subjects.byClass(row.classId).then((data) => {
        setClassSubjects(
          safeList<Record<string, unknown>>(data).map((s) => ({
            label: pickString(s.subject_name, `Subject #${pickNumber(s.subject_id)}`),
            value: String(pickNumber(s.subject_id)),
          })),
        );
      });
    }
  };

  const onSave = async () => {
    if (!form.classId) {
      Alert.alert('Required', 'Select a class.');
      return;
    }
    if (!form.subjectId) {
      Alert.alert('Required', 'Select a subject.');
      return;
    }
    if (Number(form.minMarks) >= Number(form.maxMarks)) {
      Alert.alert('Invalid', 'Min marks must be less than max marks.');
      return;
    }
    const payload = {
      class_id: Number(form.classId),
      subject_id: Number(form.subjectId),
      exam_date: form.examDate || undefined,
      start_time: form.startTime || undefined,
      duration_mins: form.durationMins ? Number(form.durationMins) : undefined,
      max_marks: Number(form.maxMarks),
      min_marks: Number(form.minMarks),
      room_no: form.roomNo || undefined,
    };
    setSaving(true);
    try {
      if (editingId) {
        await exams.apis.subjects.update(itemId, editingId, payload);
      } else {
        await exams.apis.subjects.create(itemId, payload);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      Alert.alert('Save failed', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (row: SubjectRow) => {
    Alert.alert('Remove subject?', `Remove “${row.subjectName}” from the schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await exams.apis.subjects.remove(itemId, row.id);
              await load();
            } catch (e) {
              Alert.alert('Failed', extractErrorMessage(e));
            }
          })();
        },
      },
    ]);
  };

  const onImportFromClass = (classId: string) => {
    if (!classId) return;
    Alert.alert(
      'Import subjects?',
      'Import all subjects for this class into the exam schedule (default marks 100 or 35)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: () => {
            void (async () => {
              setSaving(true);
              try {
                await exams.apis.subjects.importFromClass(itemId, {
                  class_id: Number(classId),
                  max_marks: 100,
                  min_marks: 35,
                });
                await load();
              } catch (e) {
                Alert.alert('Import failed', extractErrorMessage(e));
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (loading && rows.length === 0) {
    return (
      <TeacherScreen header={<ScreenHeader title="Exam Subjects" />}>
        <ScreenLoader message="Loading subjects…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title="Exam Subjects" />}
      contentStyle={styles.content}
      footer={
        !showForm ? (
          <PrimaryButton
            label="Add Subject"
            icon="add-circle-outline"
            variant="gradient"
            onPress={startNew}
          />
        ) : undefined
      }
    >
      {error ? <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <SurfaceCard>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Import from Class
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 6 }}>
          Quickly copy every subject taught to a class into this exam’s schedule.
        </Text>
        <SelectField
          options={classOptions}
          value=""
          onChange={onImportFromClass}
          placeholder="Import from Class…"
        />
      </SurfaceCard>

      {showForm ? (
        <SurfaceCard style={styles.formCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            {editingId ? 'Edit Subject Paper' : 'New Subject Paper'}
          </Text>
          <FormField label="Class" required>
            <SelectField options={classOptions} value={form.classId} onChange={onClassChange} />
          </FormField>
          <FormField label="Subject" required hint={subjectsLoading ? 'Loading subjects…' : undefined}>
            <SelectField
              options={[{ label: 'Select subject…', value: '' }, ...classSubjects]}
              value={form.subjectId}
              onChange={(v) => setForm((f) => ({ ...f, subjectId: v }))}
            />
          </FormField>
          <FormField label="Exam Date">
            <TextField
              value={form.examDate}
              onChangeText={(v) => setForm((f) => ({ ...f, examDate: v }))}
              placeholder="YYYY-MM-DD"
            />
          </FormField>
          <FormField label="Start Time">
            <TextField
              value={form.startTime}
              onChangeText={(v) => setForm((f) => ({ ...f, startTime: v }))}
              placeholder="HH:MM"
            />
          </FormField>
          <FormField label="Duration (mins)">
            <TextField
              value={form.durationMins}
              onChangeText={(v) => setForm((f) => ({ ...f, durationMins: v }))}
              keyboardType="number-pad"
              placeholder="e.g. 60"
            />
          </FormField>
          <FormField label="Room No">
            <TextField
              value={form.roomNo}
              onChangeText={(v) => setForm((f) => ({ ...f, roomNo: v }))}
              placeholder="e.g. 101"
            />
          </FormField>
          <FormField label="Max Marks" required>
            <TextField
              value={form.maxMarks}
              onChangeText={(v) => setForm((f) => ({ ...f, maxMarks: v }))}
              keyboardType="number-pad"
            />
          </FormField>
          <FormField label="Min Marks (pass)" required>
            <TextField
              value={form.minMarks}
              onChangeText={(v) => setForm((f) => ({ ...f, minMarks: v }))}
              keyboardType="number-pad"
            />
          </FormField>

          <View style={styles.footerRow}>
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={saving ? 'Saving…' : 'Save'}
              icon="checkmark-outline"
              disabled={saving}
              onPress={() => void onSave()}
              style={{ flex: 1 }}
            />
          </View>
        </SurfaceCard>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
        Schedule ({rows.length})
      </Text>

      {rows.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No subjects scheduled"
          message="Add a subject paper or import from a class."
        />
      ) : (
        rows.map((row) => (
          <SurfaceCard key={row.id} style={styles.rowCard}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>
                {row.subjectName}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                {row.className} · {formatExamDateLabel(row.examDate)}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                {formatExamTime(row.startTime, row.durationMins)} ·{' '}
                {row.roomNo ? `Room ${row.roomNo}` : 'Room —'} · Max {row.maxMarks} / Min{' '}
                {row.minMarks}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <TouchableOpacity onPress={() => startEdit(row)} hitSlop={8}>
                <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(row)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        ))
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  formCard: { gap: 12 },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rowCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowActions: { flexDirection: 'row', gap: 14, paddingTop: 2 },
});
