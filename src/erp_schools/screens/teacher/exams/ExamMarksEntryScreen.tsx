/**
 * Exam Marks Entry — web ExamGroupsSubView marks grid parity.
 * Pick a subject paper, enter marks + attendance, save via bulk-save.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  EmptyState,
  ScreenLoader,
  PrimaryButton,
  ProgressBar,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherExamsData } from '../../../hooks/useTeacherExamsData';
import type { TeacherStackParamList } from '../../../types/navigation';
import { extractErrorMessage, pickNumber, pickString, safeList } from '../../../utils/apiHelpers';

type SubjectOption = {
  id: number;
  subjectName: string;
  maxMarks: number;
  minMarks: number;
};

type GridRow = {
  studentId: number;
  studentName: string;
  admissionNumber: string;
  rollNumber: string;
};

type EditState = { marks: string; absent: boolean };

export default function ExamMarksEntryScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'ExamMarksEntry'>>();
  const { itemId } = route.params;
  const exams = useTeacherExamsData('marks');

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);

  const [gridRows, setGridRows] = useState<GridRow[]>([]);
  const [gridMeta, setGridMeta] = useState<{ maxMarks: number; minMarks: number } | null>(null);
  const [edits, setEdits] = useState<Record<number, EditState>>({});
  const [gridLoading, setGridLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [progress, setProgress] = useState<{
    total: number;
    entered: number;
    bySubject: Record<number, { entered: number; total: number }>;
  } | null>(null);

  const loadSubjects = useCallback(async () => {
    setSubjectsLoading(true);
    setError(null);
    try {
      const data = await exams.apis.subjects.list(itemId);
      const rows = safeList<Record<string, unknown>>(data)
        .filter((r) => r.is_active !== false)
        .map((r) => ({
          id: pickNumber(r.id),
          subjectName: pickString(r.subject_name, 'Subject'),
          maxMarks: pickNumber(r.max_marks, 100),
          minMarks: pickNumber(r.min_marks, 0),
        }));
      setSubjects(rows);
      if (rows.length > 0) setActiveSubjectId((cur) => cur ?? rows[0].id);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSubjectsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const loadProgress = useCallback(async () => {
    try {
      const data = (await exams.apis.marks.getProgress(itemId)) as Record<string, unknown>;
      const bySubject: Record<number, { entered: number; total: number }> = {};
      safeList<Record<string, unknown>>(data.by_subject).forEach((s) => {
        bySubject[pickNumber(s.exam_subject_id)] = {
          entered: pickNumber(s.entered),
          total: pickNumber(s.total),
        };
      });
      setProgress({
        total: pickNumber(data.total_students),
        entered: pickNumber(data.total_entered),
        bySubject,
      });
    } catch {
      setProgress(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  useFocusEffect(
    useCallback(() => {
      void loadSubjects();
      void loadProgress();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId]),
  );

  const loadGrid = useCallback(
    async (subjectId: number) => {
      setGridLoading(true);
      setError(null);
      try {
        const data = (await exams.apis.marks.getGrid(itemId, subjectId)) as Record<string, unknown>;
        const rows = safeList<Record<string, unknown>>(data.rows);
        setGridMeta({ maxMarks: pickNumber(data.max_marks, 100), minMarks: pickNumber(data.min_marks, 0) });
        setGridRows(
          rows.map((r) => ({
            studentId: pickNumber(r.student_id),
            studentName: pickString(r.student_name, `Student #${pickNumber(r.student_id)}`),
            admissionNumber: pickString(r.admission_number),
            rollNumber: pickString(r.roll_number),
          })),
        );
        const nextEdits: Record<number, EditState> = {};
        rows.forEach((r) => {
          const sid = pickNumber(r.student_id);
          const status = pickString(r.attendance_status, 'present').toLowerCase();
          nextEdits[sid] = {
            marks: r.marks_obtained != null ? String(r.marks_obtained) : '',
            absent: status === 'absent',
          };
        });
        setEdits(nextEdits);
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setGridLoading(false);
      }
    },
    [itemId, exams.apis.marks],
  );

  useEffect(() => {
    if (activeSubjectId != null) void loadGrid(activeSubjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubjectId]);

  const activeSubject = useMemo(
    () => subjects.find((s) => s.id === activeSubjectId) || null,
    [subjects, activeSubjectId],
  );

  const setMarks = (studentId: number, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { marks: '', absent: false }), marks: value.replace(/[^0-9.]/g, '') },
    }));
  };

  const toggleAbsent = (studentId: number) => {
    setEdits((prev) => {
      const cur = prev[studentId] ?? { marks: '', absent: false };
      return { ...prev, [studentId]: { marks: cur.absent ? cur.marks : '', absent: !cur.absent } };
    });
  };

  const onSave = async () => {
    if (activeSubjectId == null) return;
    setSaving(true);
    try {
      const rows = gridRows.map((r) => {
        const edit = edits[r.studentId] ?? { marks: '', absent: false };
        return {
          student_id: r.studentId,
          marks_obtained: edit.absent || edit.marks === '' ? null : Number(edit.marks),
          attendance_status: edit.absent ? 'absent' : 'present',
        };
      });
      await exams.apis.marks.bulkSave(itemId, activeSubjectId, rows);
      Alert.alert('Saved', 'Marks updated successfully.');
      await loadGrid(activeSubjectId);
      await loadProgress();
    } catch (e) {
      Alert.alert('Save failed', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (subjectsLoading && subjects.length === 0) {
    return (
      <TeacherScreen header={<ScreenHeader title="Enter Marks" />}>
        <ScreenLoader message="Loading subjects…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title="Enter Marks" />}
      contentStyle={styles.content}
      footer={
        activeSubjectId != null ? (
          <PrimaryButton
            label={saving ? 'Saving…' : 'Save Marks'}
            icon="save-outline"
            variant="gradient"
            disabled={saving || gridLoading}
            onPress={() => void onSave()}
          />
        ) : undefined
      }
    >
      {error ? <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text> : null}

      {progress ? (
        <SurfaceCard style={styles.progressCard}>
          <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
            Overall Progress · {progress.entered}/{progress.total} entered
          </Text>
          <ProgressBar
            percent={progress.total ? (progress.entered / progress.total) * 100 : 0}
            color={theme.colors.success}
          />
        </SurfaceCard>
      ) : null}

      {subjects.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title="No subjects scheduled"
          message="Add subject papers to this exam before entering marks."
        />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {subjects.map((s) => {
              const active = s.id === activeSubjectId;
              const p = progress?.bySubject[s.id];
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.subjectChip,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setActiveSubjectId(s.id)}
                >
                  <Text
                    style={{
                      color: active ? '#fff' : theme.colors.textPrimary,
                      fontSize: 13,
                      fontWeight: '700',
                    }}
                  >
                    {s.subjectName}
                  </Text>
                  {p ? (
                    <Text
                      style={{
                        color: active ? 'rgba(255,255,255,0.85)' : theme.colors.textSecondary,
                        fontSize: 11,
                      }}
                    >
                      {p.entered}/{p.total}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {gridLoading ? (
            <ScreenLoader message="Loading marks grid…" fill={false} />
          ) : gridRows.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No students"
              message="Assign students to this exam before entering marks."
            />
          ) : (
            <SurfaceCard padded={false} style={styles.gridCard}>
              {activeSubject ? (
                <View style={[styles.gridHeadRow, { borderBottomColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                    Pass {activeSubject.minMarks} / Max {activeSubject.maxMarks}
                  </Text>
                </View>
              ) : null}
              {gridRows.map((r, index) => {
                const edit = edits[r.studentId] ?? { marks: '', absent: false };
                const marksNum = edit.marks !== '' ? Number(edit.marks) : null;
                const isOverMax = gridMeta && marksNum != null && marksNum > gridMeta.maxMarks;
                const isFail =
                  !edit.absent && marksNum != null && gridMeta != null && marksNum < gridMeta.minMarks;
                return (
                  <View
                    key={r.studentId}
                    style={[
                      styles.gridRow,
                      index < gridRows.length - 1 && {
                        borderBottomColor: theme.colors.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                        {r.studentName}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                        {r.admissionNumber}
                        {r.rollNumber ? ` · Roll ${r.rollNumber}` : ''}
                      </Text>
                      {isFail ? (
                        <Text style={{ color: theme.colors.danger, fontSize: 10, fontWeight: '700' }}>
                          FAIL &lt; {gridMeta?.minMarks}
                        </Text>
                      ) : null}
                      {isOverMax ? (
                        <Text style={{ color: theme.colors.danger, fontSize: 10 }}>
                          Max: {gridMeta?.maxMarks}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.absentToggle,
                        {
                          backgroundColor: edit.absent ? theme.colors.tintRed : theme.colors.tintGreen,
                        },
                      ]}
                      onPress={() => toggleAbsent(r.studentId)}
                    >
                      <Text
                        style={{
                          color: edit.absent ? theme.colors.onTintRed : theme.colors.onTintGreen,
                          fontWeight: '800',
                          fontSize: 11,
                        }}
                      >
                        {edit.absent ? 'Absent' : 'Present'}
                      </Text>
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.marksBox,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: edit.absent
                            ? theme.colors.surfaceAlt
                            : theme.colors.surface,
                          opacity: edit.absent ? 0.5 : 1,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.marksInput, { color: theme.colors.textPrimary }]}
                        value={edit.marks}
                        onChangeText={(v) => setMarks(r.studentId, v)}
                        editable={!edit.absent}
                        keyboardType="decimal-pad"
                        placeholder="--"
                        placeholderTextColor={theme.colors.textSecondary}
                      />
                    </View>
                  </View>
                );
              })}
            </SurfaceCard>
          )}
        </>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  progressCard: { gap: 8 },
  chipRow: { gap: 8, paddingVertical: 2 },
  subjectChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 2,
    minWidth: 96,
  },
  gridCard: { paddingHorizontal: 14, overflow: 'hidden' },
  gridHeadRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  absentToggle: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  marksBox: {
    width: 64,
    height: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marksInput: { fontSize: 15, fontWeight: '700', textAlign: 'center', width: '100%' },
});
