/**
 * Exam Students — web ExamGroupsSubView "Assign Students" drawer parity.
 * Pick a class, multi-select students, bulk-assign to the exam item.
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
  SelectField,
  ListItem,
  EmptyState,
  ScreenLoader,
  PrimaryButton,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherExamsData } from '../../../hooks/useTeacherExamsData';
import type { TeacherStackParamList } from '../../../types/navigation';
import { extractErrorMessage, pickNumber, pickString, safeList } from '../../../utils/apiHelpers';

type AssignedRow = {
  id: number;
  studentId: number;
  name: string;
  admissionNumber: string;
  rollNumber: string;
  className: string;
  sectionName: string;
};

type CandidateRow = {
  studentId: number;
  name: string;
  admissionNumber: string;
  sectionName: string;
  isAssigned: boolean;
};

export default function ExamStudentsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'ExamStudents'>>();
  const { itemId } = route.params;
  const exams = useTeacherExamsData('exams');

  const [assigned, setAssigned] = useState<AssignedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [classId, setClassId] = useState('');
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const loadAssigned = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await exams.apis.students.list(itemId);
      const list = safeList<Record<string, unknown>>(data);
      setAssigned(
        list.map((r) => ({
          id: pickNumber(r.id),
          studentId: pickNumber(r.student_id),
          name: pickString(r.student_name, `Student #${pickNumber(r.student_id)}`),
          admissionNumber: pickString(r.admission_number),
          rollNumber: pickString(r.roll_number),
          className: pickString(r.class_name),
          sectionName: pickString(r.section_name),
        })),
      );
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  useFocusEffect(
    useCallback(() => {
      void loadAssigned();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId]),
  );

  const classOptions = useMemo(
    () => [
      { label: 'Select class…', value: '' },
      ...exams.schoolClasses.map((c) => ({
        label: c.name,
        value: String(c.id),
      })),
    ],
    [exams.schoolClasses],
  );

  const onClassChange = async (value: string) => {
    setClassId(value);
    setSelected(new Set());
    setCandidates([]);
    if (!value) return;
    setCandidatesLoading(true);
    try {
      const data = await exams.apis.students.byClass(itemId, Number(value));
      setCandidates(
        safeList<Record<string, unknown>>(data).map((r) => ({
          studentId: pickNumber(r.student_id),
          name: pickString(r.student_name, `Student #${pickNumber(r.student_id)}`),
          admissionNumber: pickString(r.admission_number),
          sectionName: pickString(r.section_name),
          isAssigned: r.is_assigned === true,
        })),
      );
    } catch (e) {
      Alert.alert('Load failed', extractErrorMessage(e));
    } finally {
      setCandidatesLoading(false);
    }
  };

  const toggleSelect = (studentId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const onAssign = async () => {
    if (!classId) {
      Alert.alert('Required', 'Select a class first.');
      return;
    }
    if (selected.size === 0) {
      Alert.alert('Required', 'Select at least one student.');
      return;
    }
    setSaving(true);
    try {
      await exams.apis.students.bulkAssign(itemId, {
        student_ids: [...selected],
        class_id: Number(classId),
      });
      setSelected(new Set());
      await onClassChange(classId);
      await loadAssigned();
    } catch (e) {
      Alert.alert('Assign failed', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onRemoveOne = (row: AssignedRow) => {
    Alert.alert('Remove student?', `Remove “${row.name}” from this exam?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await exams.apis.students.bulkRemove(itemId, { student_ids: [row.studentId] });
              await loadAssigned();
            } catch (e) {
              Alert.alert('Failed', extractErrorMessage(e));
            }
          })();
        },
      },
    ]);
  };

  const onRemoveAll = () => {
    if (assigned.length === 0) return;
    Alert.alert('Remove all students?', 'This clears every student assigned to this exam.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove All',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await exams.apis.students.removeAll(itemId);
              await loadAssigned();
            } catch (e) {
              Alert.alert('Failed', extractErrorMessage(e));
            }
          })();
        },
      },
    ]);
  };

  if (loading && assigned.length === 0) {
    return (
      <TeacherScreen header={<ScreenHeader title="Exam Students" />}>
        <ScreenLoader message="Loading students…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title="Exam Students" />}
      contentStyle={styles.content}
      footer={
        candidates.length > 0 ? (
          <PrimaryButton
            label={saving ? 'Assigning…' : `Assign Selected (${selected.size})`}
            icon="checkmark-circle-outline"
            variant="gradient"
            disabled={saving || selected.size === 0}
            onPress={() => void onAssign()}
          />
        ) : undefined
      }
    >
      {error ? <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <SurfaceCard>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Assign from Class
        </Text>
        <SelectField options={classOptions} value={classId} onChange={onClassChange} />
        {candidatesLoading ? (
          <ScreenLoader message="Loading class roster…" fill={false} />
        ) : candidates.length > 0 ? (
          <View style={styles.candidateList}>
            {candidates.map((c) => {
              const checked = c.isAssigned || selected.has(c.studentId);
              return (
                <TouchableOpacity
                  key={c.studentId}
                  style={[styles.candidateRow, { borderBottomColor: theme.colors.border }]}
                  onPress={() => (!c.isAssigned ? toggleSelect(c.studentId) : undefined)}
                  disabled={c.isAssigned}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={
                      c.isAssigned
                        ? theme.colors.textSecondary
                        : checked
                          ? theme.colors.primary
                          : theme.colors.textSecondary
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                      {c.name}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                      {c.admissionNumber}
                      {c.sectionName ? ` · Sec ${c.sectionName}` : ''}
                      {c.isAssigned ? ' · Already assigned' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : classId ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 8 }}>
            No students found in this class.
          </Text>
        ) : null}
      </SurfaceCard>

      <View style={styles.assignedHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Assigned ({assigned.length})
        </Text>
        {assigned.length > 0 ? (
          <TouchableOpacity onPress={onRemoveAll}>
            <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '700' }}>
              Remove All
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {assigned.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No students assigned"
          message="Pick a class above and assign students to this exam."
        />
      ) : (
        <SurfaceCard padded={false} style={styles.listCard}>
          {assigned.map((row, index) => (
            <ListItem
              key={row.id}
              avatarName={row.name}
              title={row.name}
              subtitle={`${row.admissionNumber}${row.rollNumber ? ` · Roll ${row.rollNumber}` : ''}${row.sectionName ? ` · ${row.sectionName}` : ''}`}
              divider={index < assigned.length - 1}
              trailing={
                <TouchableOpacity onPress={() => onRemoveOne(row)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              }
            />
          ))}
        </SurfaceCard>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  candidateList: { marginTop: 8, maxHeight: 320 },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  assignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listCard: { paddingHorizontal: 14 },
});
